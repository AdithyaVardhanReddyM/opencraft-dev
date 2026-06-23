import { NextRequest } from "next/server";
import { internalUpdateScreen } from "@/lib/db/queries/screens";
import {
  internalCreateMessage,
  internalGetMessages,
} from "@/lib/db/queries/messages";
import { incrementGeneration } from "@/lib/db/queries/users";

// Durable terminal persistence. The agent-service POSTs the final `result`/`error`
// frame here when a turn finishes — independent of the /api/chat streaming
// function, so it survives a serverless timeout or a closed browser tab. This is
// the SOLE terminal write path (the proxy only relays + early-persists sandbox).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGENT_SHARED_SECRET = process.env.AGENT_SHARED_SECRET || "";

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface ResultFrame {
  type: "result" | "error";
  sandboxId?: string;
  sandboxUrl?: string;
  title?: string | null;
  route?: string | null;
  summary?: string;
  narration?: string; // the agent's full streamed text (for user display)
  reasoning?: string; // the agent's thinking (when extended-thinking was on)
  files?: unknown;
  fileMeta?: unknown;
  recentEdits?: string[];
  message?: string; // error frames
}

export async function POST(req: NextRequest) {
  if (AGENT_SHARED_SECRET) {
    if (req.headers.get("x-agent-secret") !== AGENT_SHARED_SECRET) {
      return json(401, { error: "Invalid agent secret" });
    }
  }

  let payload: {
    context?: { screenId?: string; clerkId?: string; modelId?: string };
    result?: ResultFrame;
  };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const screenId = payload.context?.screenId;
  const clerkId = payload.context?.clerkId;
  const modelId = payload.context?.modelId;
  const result = payload.result;
  if (!screenId || !result) {
    return json(400, { error: "Missing screenId or result" });
  }

  // Idempotency: a retried callback must not double-write the assistant turn.
  // /api/chat always inserts the USER message before the run, so the newest
  // message being an assistant turn means this callback already persisted.
  const last = await internalGetMessages(screenId, 1);
  const alreadyPersisted = last.length > 0 && last[last.length - 1].role === "assistant";

  try {
    if (result.type === "error") {
      if (!alreadyPersisted) {
        await internalCreateMessage({
          screenId,
          role: "assistant",
          content: `⚠️ Sorry, something went wrong: ${
            result.message || "the agent run failed."
          }`,
          modelId,
        });
      }
      return json(200, { ok: true, persisted: !alreadyPersisted, kind: "error" });
    }

    // Success — write the screen state (idempotent overwrite) always; guard the
    // assistant message + generation increment behind the idempotency check.
    await internalUpdateScreen(screenId, {
      sandboxId: result.sandboxId,
      sandboxUrl: result.sandboxUrl,
      files: result.files,
      fileMeta: result.fileMeta,
      recentEdits: result.recentEdits,
      ...(result.route ? { route: result.route } : {}),
      ...(result.title ? { title: result.title } : {}),
    });

    if (!alreadyPersisted) {
      // Display the full streamed narration; fall back to the summary if the run
      // produced no prose. Keep the terse summary in `summary` for history/context.
      const summary = result.summary || "Done.";
      await internalCreateMessage({
        screenId,
        role: "assistant",
        content: (result.narration && result.narration.trim()) || summary,
        summary,
        modelId,
        reasoningDetails:
          result.reasoning && result.reasoning.trim()
            ? { content: result.reasoning.trim() }
            : undefined,
      });
      if (clerkId) await incrementGeneration(clerkId);
    }

    return json(200, { ok: true, persisted: !alreadyPersisted, kind: "result" });
  } catch (err) {
    return json(500, {
      error: err instanceof Error ? err.message : "Persistence failed",
    });
  }
}
