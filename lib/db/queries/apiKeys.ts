import "server-only";
import { randomBytes, createHash } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { apiKeys } from "../schema";

/**
 * API keys for the MCP server. A key is minted by a signed-in user, shown ONCE
 * in plaintext, and stored only as a sha256 hash. The MCP auth layer hashes the
 * presented bearer token and matches it here to resolve the acting Clerk userId.
 */

const KEY_PREFIX = "oc_";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: number | null;
  createdAt: number;
}

/**
 * Mint a new key for `userId`. Returns the PLAINTEXT key exactly once — it is
 * never persisted, only its hash is. Caller must surface it immediately.
 */
export async function createApiKey(
  userId: string,
  name: string
): Promise<{ id: string; key: string; prefix: string }> {
  const label = ((name ?? "").trim() || "Untitled key").slice(0, 60);
  // 32 url-safe bytes of entropy; the "oc_" prefix makes keys recognizable.
  const key = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  const prefix = key.slice(0, 11);
  const now = Date.now();
  const [row] = await db
    .insert(apiKeys)
    .values({
      userId,
      name: label,
      hashedKey: hashKey(key),
      prefix,
      createdAt: now,
    })
    .returning({ id: apiKeys.id });
  return { id: row.id, key, prefix };
}

/**
 * Resolve a presented key to its owner's Clerk userId, or null when unknown.
 * Best-effort touches `lastUsedAt` (fire-and-forget; never blocks auth).
 */
export async function verifyApiKey(key: string): Promise<string | null> {
  if (!key || !key.startsWith(KEY_PREFIX)) return null;
  const [row] = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId })
    .from(apiKeys)
    .where(eq(apiKeys.hashedKey, hashKey(key)))
    .limit(1);
  if (!row) return null;
  void db
    .update(apiKeys)
    .set({ lastUsedAt: Date.now() })
    .where(eq(apiKeys.id, row.id))
    .catch(() => {});
  return row.userId;
}

/** All keys owned by a user (metadata only — never the secret), newest first. */
export async function listApiKeys(userId: string): Promise<ApiKeyInfo[]> {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

/** Revoke (delete) an owned key. No-op if it isn't the user's. */
export async function revokeApiKey(userId: string, id: string): Promise<void> {
  await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
}
