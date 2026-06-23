import "server-only";

/**
 * One seam for reaching the agent compute layer, with two backends:
 *
 *  - Prod (AgentCore Runtime): when `AGENT_RUNTIME_ARN` is set, call the
 *    SigV4-signed `InvokeAgentRuntime` data-plane API. The runtime streams the
 *    same SSE frames back, which we relay to the browser verbatim.
 *  - Dev / self-hosted: otherwise POST to the FastAPI service at
 *    `AGENT_SERVICE_URL` (defaults to localhost:8080), exactly as before.
 *
 * The agent-service is stateless and identical across both — the only thing that
 * changes is transport. Durable persistence is unaffected: the service fires the
 * `callback` webhook from a decoupled task in either case.
 */

const AGENT_RUNTIME_ARN = process.env.AGENT_RUNTIME_ARN || "";
// Endpoint qualifier (version alias) on the runtime. "DEFAULT" is the live one.
const AGENT_RUNTIME_QUALIFIER = process.env.AGENT_RUNTIME_QUALIFIER || "DEFAULT";
const AGENT_SERVICE_URL =
  process.env.AGENT_SERVICE_URL || "http://localhost:8080";
const AGENT_SHARED_SECRET = process.env.AGENT_SHARED_SECRET || "";

export interface AgentInvokeResult {
  ok: boolean;
  status: number;
  /** SSE byte stream of turn frames, or null when the call failed to open.
   * Typed as `Response["body"]` so the route relays either backend identically
   * (and the TextDecoderStream pipe in the relay type-checks unchanged). */
  body: Response["body"];
}

/**
 * AgentCore runtime session id for a screen. Stable per screen so consecutive
 * turns reuse the same warm microVM, while different screens map to different
 * sessions and therefore run in PARALLEL (separate isolated microVMs). Must be
 * 33–128 chars of [A-Za-z0-9_-]; `screen-${uuid}` is always 43 and url-safe.
 */
export function runtimeSessionIdForScreen(screenId: string): string {
  return `screen-${screenId}`;
}

/** True when the prod AgentCore path is configured. */
export function usesAgentRuntime(): boolean {
  return Boolean(AGENT_RUNTIME_ARN);
}

export async function invokeAgentService(
  payload: Record<string, unknown>,
  opts: { screenId: string; signal?: AbortSignal }
): Promise<AgentInvokeResult> {
  if (AGENT_RUNTIME_ARN) {
    // Lazy import so the AWS SDK isn't pulled into builds that never deploy to
    // AgentCore. Credentials resolve via the default provider chain (task/IAM
    // role in prod, AWS_* env locally).
    const { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } = await import(
      "@aws-sdk/client-bedrock-agentcore"
    );
    const client = new BedrockAgentCoreClient({ region: process.env.AWS_REGION });
    try {
      const resp = await client.send(
        new InvokeAgentRuntimeCommand({
          agentRuntimeArn: AGENT_RUNTIME_ARN,
          qualifier: AGENT_RUNTIME_QUALIFIER,
          runtimeSessionId: runtimeSessionIdForScreen(opts.screenId),
          contentType: "application/json",
          accept: "text/event-stream",
          payload: new TextEncoder().encode(JSON.stringify(payload)),
        }),
        { abortSignal: opts.signal }
      );
      // The streaming response blob exposes SdkStream helpers in Node.
      const stream = resp.response as
        | { transformToWebStream?: () => Response["body"] }
        | undefined;
      const body = stream?.transformToWebStream?.() ?? null;
      return { ok: Boolean(body), status: resp.statusCode ?? 200, body };
    } catch {
      return { ok: false, status: 502, body: null };
    }
  }

  // Dev / self-hosted: direct HTTP to the FastAPI service.
  const upstream = await fetch(`${AGENT_SERVICE_URL}/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(AGENT_SHARED_SECRET ? { "x-agent-secret": AGENT_SHARED_SECRET } : {}),
    },
    body: JSON.stringify(payload),
    // Abort the live relay if the browser disconnects — the agent-service runs
    // its turn in a decoupled task and still fires the callback, so persistence
    // is unaffected and we stop wasting this function's time budget.
    signal: opts.signal,
  });
  return { ok: upstream.ok, status: upstream.status, body: upstream.body };
}
