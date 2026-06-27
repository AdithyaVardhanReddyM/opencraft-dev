import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema";
import { toDoc } from "../serialize";
import type { GenerationStats, UserDoc } from "../types";

export const DEFAULT_GENERATION_LIMIT = 10;

/**
 * Per-user generation limit toggle. When enabled, each user is capped at
 * `generationsLimit` generations (default 10). Set to `false` to lift the cap in
 * dev — `canGenerate` and `getGenerationStats` both honor this flag, so the
 * server block and the client credit-bar UI toggle together.
 *
 * The cap counts only SUCCESSFUL generations: `incrementGeneration` runs solely
 * in the agent-result success path (after the error-frame early return, behind
 * the idempotency guard), so a failed/errored run is never charged against the
 * user's quota.
 */
export const GENERATION_LIMIT_ENABLED = true;

async function findByClerkId(clerkId: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return row ?? null;
}

/**
 * Get or create the user record for a Clerk id. Race-safe: `/api/users/ensure`
 * (fired on sign-in) can run concurrently with the first generation's
 * `incrementGeneration`; a plain check-then-insert would hit the `clerkId`
 * unique index and 500. `onConflictDoNothing` makes the insert idempotent, then
 * we read the row back (Convex's `getOrCreateUser` was an atomic mutation).
 */
export async function getOrCreateUser(clerkId: string): Promise<UserDoc> {
  const now = Date.now();
  await db
    .insert(users)
    .values({
      clerkId,
      generationsUsed: 0,
      generationsLimit: DEFAULT_GENERATION_LIMIT,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: users.clerkId });

  const row = await findByClerkId(clerkId);
  return toDoc(row!) as UserDoc;
}

/** Generation stats; defaults for a user with no row yet. */
export async function getGenerationStats(
  clerkId: string
): Promise<GenerationStats> {
  const user = await findByClerkId(clerkId);
  const used = user?.generationsUsed ?? 0;
  const limit = user?.generationsLimit ?? DEFAULT_GENERATION_LIMIT;
  // Limit disabled (dev): always report full remaining so the credit bar never
  // hits "exhausted" and the composer stays enabled.
  if (!GENERATION_LIMIT_ENABLED) {
    return {
      generationsUsed: used,
      generationsLimit: limit,
      generationsRemaining: limit,
    };
  }
  return {
    generationsUsed: used,
    generationsLimit: limit,
    generationsRemaining: Math.max(0, limit - used),
  };
}

export interface CanGenerateResult {
  canGenerate: boolean;
  reason?: string;
  remaining?: number;
}

/** Whether the user has remaining generations (new users may generate). */
export async function canGenerate(clerkId: string): Promise<CanGenerateResult> {
  // Limit disabled (dev): never block a generation.
  if (!GENERATION_LIMIT_ENABLED) {
    return { canGenerate: true };
  }
  const user = await findByClerkId(clerkId);
  if (!user) {
    return { canGenerate: true, remaining: DEFAULT_GENERATION_LIMIT };
  }
  const remaining = user.generationsLimit - user.generationsUsed;
  if (remaining <= 0) {
    return { canGenerate: false, reason: "Generation limit reached", remaining: 0 };
  }
  return { canGenerate: true, remaining };
}

/**
 * Increment a user's generation count (creates the row if missing). Race-safe:
 * the row is ensured idempotently, then incremented with a SQL expression so two
 * concurrent generations each apply `+1` atomically (no lost-update from a
 * read-modify-write).
 */
export async function incrementGeneration(
  clerkId: string
): Promise<{ success: boolean; generationsUsed: number }> {
  const now = Date.now();
  await db
    .insert(users)
    .values({
      clerkId,
      generationsUsed: 0,
      generationsLimit: DEFAULT_GENERATION_LIMIT,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: users.clerkId });

  const [row] = await db
    .update(users)
    .set({
      generationsUsed: sql`${users.generationsUsed} + 1`,
      updatedAt: now,
    })
    .where(eq(users.clerkId, clerkId))
    .returning({ generationsUsed: users.generationsUsed });

  return { success: true, generationsUsed: row.generationsUsed };
}

/** Metadata for analytics (Pendo). Null when no row exists. */
export async function getUserMetadata(clerkId: string): Promise<{
  generationsUsed: number;
  generationsLimit: number;
  createdAt: number;
  updatedAt: number;
} | null> {
  const user = await findByClerkId(clerkId);
  if (!user) return null;
  return {
    generationsUsed: user.generationsUsed,
    generationsLimit: user.generationsLimit,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
