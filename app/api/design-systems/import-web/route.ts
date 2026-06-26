import { NextRequest } from "next/server";
import { z } from "zod";
import { json, requireUserId, handleError, ApiError } from "@/lib/server/api";
import { invokeAgentService } from "@/lib/agent-service";

// Streams progress + the final design system from the agent-service (Firecrawl +
// Gemini) as SSE — relayed verbatim, so the same `op` transport works in dev
// (FastAPI) and prod (AgentCore). Give it room beyond the default.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({ url: z.string().min(3) });

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

export async function POST(req: NextRequest) {
  try {
    await requireUserId();
    const { url } = schema.parse(await req.json());
    const res = await invokeAgentService(
      { op: "extract_design_system", url },
      { screenId: crypto.randomUUID(), signal: req.signal }
    );
    if (!res.ok || !res.body) {
      return json({ error: "Extraction service unavailable." }, { status: 502 });
    }
    // Relay the agent-service SSE (progress frames + the final design_system
    // frame) straight to the browser, which renders the live step checklist.
    return new Response(res.body, { headers: SSE_HEADERS });
  } catch (err) {
    if (err instanceof ApiError) return handleError(err);
    if (err instanceof z.ZodError) {
      return json({ error: "Enter a valid URL." }, { status: 400 });
    }
    return json(
      { error: err instanceof Error ? err.message : "Extraction failed." },
      { status: 502 }
    );
  }
}
