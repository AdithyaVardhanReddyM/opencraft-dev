import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";

// Default generation limit for all users
const DEFAULT_GENERATION_LIMIT = 10;

/**
 * Get or create user record for the authenticated user
 */
export const getOrCreateUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkId = identity.subject;

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      clerkId,
      generationsUsed: 0,
      generationsLimit: DEFAULT_GENERATION_LIMIT,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(userId);
  },
});

/**
 * Get user's generation stats
 */
export const getGenerationStats = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      // Return default stats for new users
      return {
        generationsUsed: 0,
        generationsLimit: DEFAULT_GENERATION_LIMIT,
        generationsRemaining: DEFAULT_GENERATION_LIMIT,
      };
    }

    return {
      generationsUsed: user.generationsUsed,
      generationsLimit: user.generationsLimit,
      generationsRemaining: Math.max(
        0,
        user.generationsLimit - user.generationsUsed
      ),
    };
  },
});

/**
 * Check if user can generate (has remaining generations)
 */
export const canGenerate = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { canGenerate: false, reason: "Not authenticated" };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      // New users can generate
      return { canGenerate: true, remaining: DEFAULT_GENERATION_LIMIT };
    }

    const remaining = user.generationsLimit - user.generationsUsed;
    if (remaining <= 0) {
      return {
        canGenerate: false,
        reason: "Generation limit reached",
        remaining: 0,
      };
    }

    return { canGenerate: true, remaining };
  },
});

/**
 * Internal query to check if user can generate (called by Inngest)
 */
export const internalCanGenerate = internalQuery({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      // New users can generate
      return { canGenerate: true, remaining: DEFAULT_GENERATION_LIMIT };
    }

    const remaining = user.generationsLimit - user.generationsUsed;
    if (remaining <= 0) {
      return {
        canGenerate: false,
        reason: "Generation limit reached",
        remaining: 0,
      };
    }

    return { canGenerate: true, remaining };
  },
});

/**
 * Internal mutation to increment generation count (called by Inngest on success)
 */
export const internalIncrementGeneration = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const now = Date.now();

    if (!user) {
      // Create user with 1 generation used
      await ctx.db.insert("users", {
        clerkId: args.clerkId,
        generationsUsed: 1,
        generationsLimit: DEFAULT_GENERATION_LIMIT,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, generationsUsed: 1 };
    }

    // Increment generation count
    const newCount = user.generationsUsed + 1;
    await ctx.db.patch(user._id, {
      generationsUsed: newCount,
      updatedAt: now,
    });

    return { success: true, generationsUsed: newCount };
  },
});

/**
 * Get user metadata for analytics (Pendo)
 */
export const getUserMetadata = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    return {
      generationsUsed: user.generationsUsed,
      generationsLimit: user.generationsLimit,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
});
