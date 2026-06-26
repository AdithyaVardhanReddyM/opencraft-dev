import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { internalGetScreen, internalUpdateScreen } from "@/lib/db/queries/screens";
import {
  internalGetMessages,
  internalCreateMessage,
} from "@/lib/db/queries/messages";
import { canGenerate } from "@/lib/db/queries/users";
import { internalGetDesignSystem } from "@/lib/db/queries/designSystems";
import { invokeAgentService } from "@/lib/agent-service";
import { parseScreenTheme, isPresetThemeId } from "@/lib/canvas/theme-utils";
import { buildGlobalsCss } from "@/lib/canvas/build-globals-css";
import type { ScreenDoc, MessageDoc } from "@/lib/db/types";

// Needs pg (DB queries) + a long-lived stream → Node runtime, never cached.
// maxDuration bounds the LIVE stream on serverless; terminal persistence does
// NOT depend on it — the agent-service callback (/api/internal/agent-result)
// owns that and survives this function timing out.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Transport to the agent compute layer lives in lib/agent-service (FastAPI in
// dev, SigV4 InvokeAgentRuntime in prod when AGENT_RUNTIME_ARN is set).
const AGENT_SHARED_SECRET = process.env.AGENT_SHARED_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const bodySchema = z.object({
  screenId: z.string(),
  projectId: z.string().optional(),
  message: z.string().min(1),
  modelId: z.string().optional(),
  thinking: z.boolean().optional(),
  imageUrls: z.array(z.string()).optional(),
  imageIds: z.array(z.string()).optional(),
  // Design system chosen in the composer before the sandbox exists, encoded as
  // "<id>" or "<id>:dark". Persisted as the screen's theme and forwarded so the
  // agent-service themes a freshly-created sandbox before it generates.
  designSystem: z.string().optional(),
  // Visual Mode — per-run flag (like `thinking`); when on, the agent screenshots
  // the live preview and self-corrects before finishing. Not persisted.
  visualMode: z.boolean().optional(),
});

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

function sse(frame: Record<string, unknown>): string {
  const type = (frame.type as string) || "message";
  return `event: ${type}\ndata: ${JSON.stringify(frame)}\n\n`;
}

/** One-frame SSE 200 response (used for pre-stream rejections like the limit). */
function sseError(message: string): Response {
  return new Response(sse({ type: "error", message }), { headers: SSE_HEADERS });
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** camelCase ScreenDoc → snake_case keys the agent-service reads. */
function toScreenPayload(s: ScreenDoc, themeCss?: string) {
  return {
    sandbox_id: s.sandboxId,
    sandbox_url: s.sandboxUrl,
    files: s.files ?? {},
    file_meta: s.fileMeta ?? {},
    recent_edits: s.recentEdits ?? [],
    route: s.route,
    title: s.title,
    parent_screen_id: s.parentScreenId,
    theme: s.theme,
    // Prebuilt globals.css for a CUSTOM design system — the Python harness can't
    // run our TS generator, so we resolve + build it here and it writes the CSS
    // straight in (skipping shadcn). Absent for presets (they run their command).
    theme_css: themeCss,
  };
}

/** Parse one SSE frame ("event: ...\ndata: {json}") into its JSON payload. */
function parseSseFrame(
  raw: string
): ({ type: string } & Record<string, unknown>) | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  try {
    const obj = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
    return { type: (obj.type as string) ?? event, ...obj };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return json(401, { error: "Unauthorized" });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return json(400, { error: "Invalid request" });
  }
  const {
    screenId,
    message,
    modelId,
    thinking,
    imageUrls,
    imageIds,
    designSystem,
    visualMode,
  } = body;

  // Generation limit → SSE error frame so the client's single streaming path
  // renders it (the composer already flipped to "streaming"). No user msg, no run.
  const gen = await canGenerate(userId);
  if (!gen.canGenerate) {
    return sseError(gen.reason || "Generation limit reached");
  }

  const screen = await internalGetScreen(screenId);
  if (!screen) return json(404, { error: "Screen not found" });

  // A design system chosen in the composer becomes the screen's theme: persist
  // it and hand it to the agent (in the screen payload) so a freshly-created
  // sandbox is themed before generation.
  if (designSystem && designSystem !== screen.theme) {
    screen.theme = designSystem;
    void internalUpdateScreen(screenId, { theme: designSystem }).catch(() => {});
  }

  // If the screen's theme is a CUSTOM design system (a uuid, not a preset),
  // resolve it once and build its globals.css here — the Python harness writes
  // that string into a fresh sandbox (it can't run our TS generator). Presets
  // ship no theme_css and keep their fast remote shadcn command.
  let themeCss: string | undefined;
  const themeId = parseScreenTheme(screen.theme).id;
  if (themeId && !isPresetThemeId(themeId)) {
    const ds = await internalGetDesignSystem(themeId);
    if (ds) themeCss = buildGlobalsCss(ds.tokens);
  }

  // Load prior history BEFORE inserting the new turn (the new message is sent
  // separately as `message`; including it in history would duplicate it). Use the
  // terse `summary` for assistant turns (token-lean context) and fall back to the
  // full `content` for user turns / legacy rows without a summary.
  const toHistory = (msgs: MessageDoc[]) =>
    msgs.map((m) => ({ role: m.role, content: m.summary ?? m.content }));
  let history = toHistory(await internalGetMessages(screenId, 10));

  // Flow child: it shares the parent's sandbox but its own files/history start
  // empty, so the agent would see an empty repo-map (contradicting the flow
  // prompt's "reuse the existing app") and build from scratch. Inherit the
  // parent's file map — child wins on conflicts — so the repo-map + seed files
  // reflect the existing app, and prepend the parent's recent turns for design
  // intent. Re-applied every turn, so later parent edits are picked up.
  if (screen.parentScreenId) {
    const parent = await internalGetScreen(screen.parentScreenId);
    if (parent) {
      screen.files = { ...(parent.files ?? {}), ...(screen.files ?? {}) };
      screen.fileMeta = {
        ...(parent.fileMeta ?? {}),
        ...(screen.fileMeta ?? {}),
      };
      history = [...toHistory(await internalGetMessages(parent._id, 6)), ...history];
    }
  }

  // Persist the user turn (client renders it optimistically; SWR reconciles).
  await internalCreateMessage({
    screenId,
    role: "user",
    content: message,
    modelId,
    imageIds: imageIds && imageIds.length > 0 ? imageIds : undefined,
  });

  // Call the agent compute layer, handing it a durable callback for terminal
  // persistence. The callback fires even if this stream/relay is aborted.
  let upstream;
  try {
    upstream = await invokeAgentService(
      {
        message,
        screen: toScreenPayload(screen, themeCss),
        history,
        modelId,
        thinking: thinking ?? false,
        imageUrls,
        visualMode: visualMode ?? false,
        callback: {
          url: `${APP_URL}/api/internal/agent-result`,
          secret: AGENT_SHARED_SECRET || undefined,
          context: { screenId, clerkId: userId, modelId },
        },
      },
      { screenId, signal: req.signal }
    );
  } catch {
    return sseError("Could not reach the agent service");
  }

  if (!upstream.ok || !upstream.body) {
    return sseError(`Agent service error (${upstream.status})`);
  }

  // Relay SSE verbatim to the browser; parse only to early-persist the sandbox
  // frame (so the canvas iframe can show before the run finishes).
  const encoder = new TextEncoder();
  const upstreamBody = upstream.body;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstreamBody
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let buffer = "";
      const safeEnqueue = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          /* client gone — ignore */
        }
      };
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const raw of parts) {
            if (!raw.trim()) continue;
            safeEnqueue(raw + "\n\n");
            const frame = parseSseFrame(raw);
            if (frame?.type === "sandbox") {
              void internalUpdateScreen(screenId, {
                sandboxId: frame.sandboxId as string | undefined,
                sandboxUrl: frame.sandboxUrl as string | undefined,
              }).catch(() => {});
            }
          }
        }
        if (buffer.trim()) safeEnqueue(buffer.endsWith("\n\n") ? buffer : buffer + "\n\n");
      } catch {
        safeEnqueue(sse({ type: "error", message: "stream interrupted" }));
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
