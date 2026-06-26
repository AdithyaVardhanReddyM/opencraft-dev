import "server-only";
import { Sandbox } from "@e2b/code-interpreter";

/**
 * E2B sandbox lifecycle for the MCP server. Tools are stateless across calls —
 * each connects to a sandbox by id (auto-resuming a paused one), acts, and
 * returns. Only `createSandbox` mints a new sandbox. Mirrors the patterns in
 * app/api/sandbox/{resume,theme}/route.ts and the Python harness (sandbox.py).
 */

const PREVIEW_PORT = 3000;
// Keep the sandbox alive 15 min between calls; with autoPause it then pauses
// (fs + memory preserved) and `connect` auto-resumes it on the next tool call.
const SANDBOX_TIMEOUT_MS = 15 * 60 * 1000;
// No SANDBOX_TEMPLATE exists on the TS side (only the Python config had it), so
// add E2B_TEMPLATE; fall back to the known baked template.
const TEMPLATE = process.env.E2B_TEMPLATE || "unitset-sandbox-v1";

export type ConnectedSandbox = Awaited<ReturnType<typeof Sandbox.connect>>;

/** Public preview URL for the baked Next.js dev server (port 3000). */
export function previewUrl(sandbox: ConnectedSandbox): string {
  return `https://${sandbox.getHost(PREVIEW_PORT)}`;
}

/**
 * Create a fresh sandbox from the baked template. `betaCreate` + `autoPause`
 * gives the on-timeout-pause / auto-resume-on-connect lifecycle (the TS analog
 * of the Python `lifecycle={on_timeout:"pause", auto_resume:true}`).
 */
export async function createSandbox(): Promise<{
  sandbox: ConnectedSandbox;
  sandboxId: string;
  url: string;
}> {
  const sandbox = await Sandbox.betaCreate(TEMPLATE, {
    timeoutMs: SANDBOX_TIMEOUT_MS,
    autoPause: true,
  });
  return { sandbox, sandboxId: sandbox.sandboxId, url: previewUrl(sandbox) };
}

/** Connect to an existing sandbox (auto-resumes if paused). */
export async function connectSandbox(
  sandboxId: string
): Promise<ConnectedSandbox> {
  return Sandbox.connect(sandboxId, { timeoutMs: SANDBOX_TIMEOUT_MS });
}

/**
 * Mandatory guardrail for `run_command`. The dev server is ALREADY running on
 * port 3000 with hot reload — building or restarting it breaks the live preview.
 * The external agent is untrusted across the MCP boundary, so this denylist is
 * enforced server-side (not merely documented like the internal `terminal` tool).
 * Returns a human-readable reason when blocked, or null when the command is allowed.
 */
export function guardCommand(command: string): string | null {
  const c = command.toLowerCase();

  // npm/pnpm/yarn/bun run dev|build|start  (and bare `<pm> start`)
  if (
    /\b(npm|pnpm|yarn|bun)\s+(run\s+)?(dev|build|start)\b/.test(c) ||
    /\bnext\s+(dev|build|start)\b/.test(c)
  ) {
    return "Blocked: the dev server is already running on port 3000 with hot reload — never run dev/build/start. File writes hot-reload automatically.";
  }

  // Killing / restarting the dev server or anything on port 3000.
  if (
    /\b(kill|pkill|killall|fuser)\b/.test(c) &&
    /(3000|node|next|npm|dev)/.test(c)
  ) {
    return "Blocked: do not stop, kill, or restart the dev server (port 3000).";
  }
  if (/\blsof\b[^\n]*:3000/.test(c) || /\bfuser\b[^\n]*3000/.test(c)) {
    return "Blocked: do not target the dev server on port 3000.";
  }

  return null;
}
