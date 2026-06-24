import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ApiError } from "./errors";
import { isUuid } from "./uuid";
import { getProjectRole, ROLE_RANK } from "../db/queries/members";
import type { ProjectRole } from "./realtime-token";

export { ApiError, isUuid };

/** Resolve the authenticated Clerk user id, or throw 401. */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new ApiError(401, "Not authenticated");
  return userId;
}

/**
 * Assert the user has at least `minRole` on a project (owner OR member). Returns
 * the effective role. Throws 404 when the project doesn't exist / no access (we
 * avoid leaking existence) and 403 when the role is insufficient.
 */
export async function requireProjectAccess(
  userId: string,
  projectId: string,
  minRole: ProjectRole = "viewer"
): Promise<ProjectRole> {
  const role = await getProjectRole(userId, projectId);
  if (!role) throw new ApiError(404, "Project not found");
  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new ApiError(403, "Not authorized to perform this action");
  }
  return role;
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
