import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { projects } from "../schema";
import { toDocs } from "../serialize";
import { ApiError } from "../../server/errors";
import { isUuid } from "../../server/uuid";
import type { CanvasStateData, ProjectDoc } from "../types";

/** All projects owned by the user, newest first. */
export async function getAllProjects(userId: string): Promise<ProjectDoc[]> {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));
  return toDocs(rows) as ProjectDoc[];
}

/** Create a project; returns the new id. Project number = existing count + 1. */
export async function createProject(
  userId: string,
  name: string,
  description?: string
): Promise<string> {
  if (name.length < 1 || name.length > 100) {
    throw new ApiError(400, "Project name must be between 1 and 100 characters");
  }

  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.userId, userId));
  const projectNumber = existing.length + 1;

  const now = Date.now();
  const [row] = await db
    .insert(projects)
    .values({
      userId,
      name,
      description: description ?? null,
      sketchesData: { shapes: [], selectedIds: [] },
      createdAt: now,
      lastModified: now,
      projectNumber,
    })
    .returning({ id: projects.id });

  return row.id;
}

async function requireOwnedProject(userId: string, projectId: string) {
  if (!isUuid(projectId)) throw new ApiError(404, "Project not found");
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) throw new ApiError(404, "Project not found");
  if (project.userId !== userId) {
    throw new ApiError(403, "Not authorized to access this project");
  }
  return project;
}

/** Delete a project (cascades to screens + messages via FK). */
export async function deleteProject(
  userId: string,
  projectId: string
): Promise<void> {
  await requireOwnedProject(userId, projectId);
  await db.delete(projects).where(eq(projects.id, projectId));
}

/** Persist canvas state (autosave). */
export async function saveCanvasState(
  userId: string,
  projectId: string,
  canvasData: CanvasStateData
): Promise<{ success: boolean }> {
  await requireOwnedProject(userId, projectId);
  await db
    .update(projects)
    .set({
      sketchesData: canvasData.shapes,
      viewportData: canvasData.viewport,
      selectedIds: canvasData.selected,
      tool: canvasData.tool,
      frameCounter: canvasData.frameCounter,
      canvasVersion: canvasData.version,
      lastModified: canvasData.lastModified,
    })
    .where(eq(projects.id, projectId));
  return { success: true };
}

/**
 * Canvas state for a project, or null (not found / not owner / no state yet) —
 * the frontend handles null gracefully during auth loading.
 */
export async function getCanvasState(
  userId: string,
  projectId: string
): Promise<CanvasStateData | null> {
  if (!isUuid(projectId)) return null;
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (!project || !project.sketchesData) return null;

  return {
    viewport:
      (project.viewportData as CanvasStateData["viewport"]) || {
        scale: 1,
        translate: { x: 0, y: 0 },
      },
    shapes: project.sketchesData,
    tool: project.tool || "select",
    selected: project.selectedIds || {},
    frameCounter: project.frameCounter || 0,
    version: project.canvasVersion || "1.0.0",
    lastModified: project.lastModified,
  };
}

/** Internal: fetch the owning project's userId for a screen-less ownership check. */
export async function getProjectOwner(projectId: string): Promise<string | null> {
  if (!isUuid(projectId)) return null;
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return project?.userId ?? null;
}
