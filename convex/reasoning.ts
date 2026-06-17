import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// How long a stored reasoning_details entry is kept before it's eligible for
// best-effort cleanup. A single agent run re-sends each assistant tool-call
// message (and thus needs its reasoning_details) on every subsequent inference,
// so we can't delete on read — but two hours is far longer than any run.
const TTL_MS = 2 * 60 * 60 * 1000;
const CLEANUP_BATCH = 50;

/**
 * Store reasoning_details for one or more tool_call_ids (called by the
 * OpenRouter proxy after an inference that produced tool calls). Upserts so a
 * retried/replayed inference doesn't create duplicates, and opportunistically
 * prunes a bounded batch of stale rows so the table can't grow unbounded.
 *
 * Server-to-server only (no auth) — the proxy reaches this via an HTTP action.
 */
export const internalStoreReasoning = internalMutation({
  args: {
    toolCallIds: v.array(v.string()),
    details: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const toolCallId of args.toolCallIds) {
      const existing = await ctx.db
        .query("reasoningTokens")
        .withIndex("by_toolCallId", (q) => q.eq("toolCallId", toolCallId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          details: args.details,
          createdAt: now,
        });
      } else {
        await ctx.db.insert("reasoningTokens", {
          toolCallId,
          details: args.details,
          createdAt: now,
        });
      }
    }

    // Best-effort, bounded cleanup of stale entries.
    const cutoff = now - TTL_MS;
    const stale = await ctx.db
      .query("reasoningTokens")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(CLEANUP_BATCH);
    for (const row of stale) {
      await ctx.db.delete(row._id);
    }

    return { success: true, stored: args.toolCallIds.length };
  },
});

/**
 * Fetch stored reasoning_details for any of the given tool_call_ids. Returns the
 * first match (one assistant message's reasoning_details applies to all of its
 * tool calls). Returns `{ details: null }` when nothing is stored, which signals
 * the proxy to gracefully disable reasoning for that request instead of letting
 * OpenRouter hard-fail.
 */
export const internalGetReasoning = internalQuery({
  args: {
    toolCallIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    for (const toolCallId of args.toolCallIds) {
      const row = await ctx.db
        .query("reasoningTokens")
        .withIndex("by_toolCallId", (q) => q.eq("toolCallId", toolCallId))
        .first();
      if (row) {
        return { details: row.details };
      }
    }
    return { details: null };
  },
});
