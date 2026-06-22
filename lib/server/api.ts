import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ApiError } from "./errors";
import { isUuid } from "./uuid";

export { ApiError, isUuid };

/** Resolve the authenticated Clerk user id, or throw 401. */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new ApiError(401, "Not authenticated");
  return userId;
}

/**
 * Resolve the Clerk user id if signed in, else null. For endpoints that mirror
 * Convex queries which returned null/[] (rather than throwing) when unauthed.
 */
export async function optionalUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/** Map a thrown error to a JSON error response. */
export function handleError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[api] unhandled error:", err);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
