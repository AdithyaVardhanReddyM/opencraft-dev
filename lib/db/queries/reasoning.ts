import "server-only";
import { eq, lt } from "drizzle-orm";
import { db } from "../index";
import { reasoningTokens } from "../schema";

// A single agent run re-sends each assistant tool-call message (and its
// reasoning_details) on every subsequent inference, so we can't delete on read.
// Two hours is far longer than any run.
const TTL_MS = 2 * 60 * 60 * 1000;
const CLEANUP_BATCH = 50;

/**
 * Upsert reasoning_details for one or more tool_call_ids, then opportunistically
 * prune a bounded batch of stale rows so the table can't grow unbounded.
 */
export async function storeReasoning(
  toolCallIds: string[],
  details: unknown
): Promise<{ success: boolean; stored: number }> {
  const now = Date.now();

  for (const toolCallId of toolCallIds) {
    const [existing] = await db
      .select({ id: reasoningTokens.id })
      .from(reasoningTokens)
      .where(eq(reasoningTokens.toolCallId, toolCallId))
      .limit(1);

    if (existing) {
      await db
        .update(reasoningTokens)
        .set({ details, createdAt: now })
        .where(eq(reasoningTokens.id, existing.id));
    } else {
      await db
        .insert(reasoningTokens)
        .values({ toolCallId, details, createdAt: now });
    }
  }

  // Best-effort, bounded cleanup of stale entries.
  const cutoff = now - TTL_MS;
  const stale = await db
    .select({ id: reasoningTokens.id })
    .from(reasoningTokens)
    .where(lt(reasoningTokens.createdAt, cutoff))
    .limit(CLEANUP_BATCH);
  for (const row of stale) {
    await db.delete(reasoningTokens).where(eq(reasoningTokens.id, row.id));
  }

  return { success: true, stored: toolCallIds.length };
}

/**
 * Fetch stored reasoning_details for the first matching tool_call_id. Returns
 * `{ details: null }` when nothing is stored (signals the proxy to gracefully
 * disable reasoning rather than letting OpenRouter hard-fail).
 */
export async function getReasoning(
  toolCallIds: string[]
): Promise<{ details: unknown }> {
  for (const toolCallId of toolCallIds) {
    const [row] = await db
      .select({ details: reasoningTokens.details })
      .from(reasoningTokens)
      .where(eq(reasoningTokens.toolCallId, toolCallId))
      .limit(1);
    if (row) return { details: row.details };
  }
  return { details: null };
}
