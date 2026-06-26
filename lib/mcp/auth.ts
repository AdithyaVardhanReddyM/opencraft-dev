import "server-only";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { verifyApiKey } from "@/lib/db/queries/apiKeys";

/**
 * MCP authentication: external agents present a bearer token (an OpenCraft API
 * key minted by a signed-in user). We resolve it to that user's Clerk id, which
 * every tool then uses exactly like `requireUserId()` does for browser routes.
 *
 * Quick-demo fallback: a single `MCP_SHARED_TOKEN` mapped to `MCP_SHARED_USER_ID`
 * (a Clerk user id), so the server is usable without minting a key. Leave both
 * unset in production to disable it.
 */

const SHARED_TOKEN = process.env.MCP_SHARED_TOKEN || "";
const SHARED_USER_ID = process.env.MCP_SHARED_USER_ID || "";

/** Resolve a bearer token to a Clerk userId, or null when invalid. */
export async function resolveToken(
  token: string | undefined
): Promise<string | null> {
  if (!token) return null;
  if (SHARED_TOKEN && SHARED_USER_ID && token === SHARED_TOKEN) {
    return SHARED_USER_ID;
  }
  return verifyApiKey(token);
}

/**
 * `verifyToken` for mcp-handler's `withMcpAuth`. Returns an AuthInfo carrying the
 * resolved userId (in `extra.userId`) on success, or undefined to 401.
 */
export async function verifyMcpToken(
  _req: Request,
  bearer?: string
): Promise<AuthInfo | undefined> {
  const userId = await resolveToken(bearer);
  if (!userId) return undefined;
  return {
    token: bearer as string,
    clientId: userId,
    scopes: [],
    extra: { userId },
  };
}

/** Pull the authenticated userId out of a tool's `extra`. */
export function userIdFromExtra(extra: { authInfo?: AuthInfo }): string {
  const userId = extra.authInfo?.extra?.userId;
  if (typeof userId !== "string" || !userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}
