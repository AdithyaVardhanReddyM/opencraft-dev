import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { images } from "../schema";
import { toDocs } from "../serialize";
import { ApiError } from "../../server/errors";
import { isUuid } from "../../server/uuid";
import { getProjectRole, ROLE_RANK } from "./members";
import type { ProjectRole } from "../../server/realtime-token";
import type { ImageDoc } from "../types";

/**
 * Durable rows for MCP-placed image shapes (see schema `images`). The table is
 * additive and may not exist yet on a deployment that shipped this code before
 * the migration ran — so every function degrades gracefully: reads return [],
 * writes become no-ops, and the canvas falls back to prior (blob-only) behavior
 * instead of throwing. A genuinely missing table is the ONLY error we swallow;
 * access/validation errors still propagate.
 */

// Postgres "undefined_table" — the migration hasn't been applied yet.
function isMissingTable(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "42P01"
  );
}

async function projectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  return getProjectRole(userId, projectId);
}

async function assertProjectRole(
  userId: string,
  projectId: string,
  minRole: ProjectRole
) {
  if (!isUuid(projectId)) throw new ApiError(404, "Project not found");
  const role = await projectRole(userId, projectId);
  if (!role) throw new ApiError(404, "Project not found");
  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new ApiError(403, "Not authorized to access this project");
  }
}

/** Persist a durable row for an image shape. Returns the row id, or null if the
 *  table isn't there yet (caller treats persistence as best-effort). */
export async function createImageRow(
  userId: string,
  input: {
    shapeId: string;
    projectId: string;
    s3Key: string;
    name: string;
    w: number;
    h: number;
    naturalWidth: number;
    naturalHeight: number;
  }
): Promise<string | null> {
  await assertProjectRole(userId, input.projectId, "editor");
  const now = Date.now();
  try {
    const [row] = await db
      .insert(images)
      .values({
        shapeId: input.shapeId,
        projectId: input.projectId,
        s3Key: input.s3Key,
        name: input.name,
        w: Math.round(input.w),
        h: Math.round(input.h),
        naturalWidth: Math.round(input.naturalWidth),
        naturalHeight: Math.round(input.naturalHeight),
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: images.id });
    return row.id;
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
}

/** Image rows for a project (ownership-checked). [] if no access or no table. */
export async function getImagesByProject(
  userId: string,
  projectId: string
): Promise<ImageDoc[]> {
  if (!isUuid(projectId)) return [];
  if (!(await projectRole(userId, projectId))) return [];
  try {
    const rows = await db
      .select()
      .from(images)
      .where(eq(images.projectId, projectId));
    return toDocs(rows) as ImageDoc[];
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

/** Remove the durable row(s) for a shape (e.g. when the image is deleted). No-op
 *  if the table isn't there yet. */
export async function deleteImageByShapeId(
  userId: string,
  projectId: string,
  shapeId: string
): Promise<void> {
  await assertProjectRole(userId, projectId, "editor");
  try {
    await db
      .delete(images)
      .where(and(eq(images.projectId, projectId), eq(images.shapeId, shapeId)));
  } catch (err) {
    if (isMissingTable(err)) return;
    throw err;
  }
}
