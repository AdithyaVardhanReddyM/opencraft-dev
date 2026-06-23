import "server-only";
import { eq } from "drizzle-orm";
import { db } from "../index";
import { projects, screens } from "../schema";
import { toDoc, toDocs } from "../serialize";
import { ApiError } from "../../server/errors";
import { isUuid } from "../../server/uuid";
import type { ScreenDoc } from "../types";

async function getScreenRow(screenId: string) {
  if (!isUuid(screenId)) return null;
  const [row] = await db
    .select()
    .from(screens)
    .where(eq(screens.id, screenId))
    .limit(1);
  return row ?? null;
}

/** Throw unless the user owns the project the screen belongs to. */
async function assertScreenOwner(userId: string, screenId: string) {
  const screen = await getScreenRow(screenId);
  if (!screen) throw new ApiError(404, "Screen not found");
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, screen.projectId))
    .limit(1);
  if (!project || project.userId !== userId) {
    throw new ApiError(403, "Not authorized to access this screen");
  }
  return screen;
}

async function assertProjectOwner(userId: string, projectId: string) {
  if (!isUuid(projectId)) throw new ApiError(404, "Project not found");
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) throw new ApiError(404, "Project not found");
  if (project.userId !== userId) {
    throw new ApiError(403, "Not authorized to access this project");
  }
}

/** Create a screen record (a Screen shape added to the canvas). */
export async function createScreen(
  userId: string,
  shapeId: string,
  projectId: string
): Promise<string> {
  await assertProjectOwner(userId, projectId);
  const now = Date.now();
  const [row] = await db
    .insert(screens)
    .values({ shapeId, projectId, createdAt: now, updatedAt: now })
    .returning({ id: screens.id });
  return row.id;
}

/**
 * Create a flow-child screen that reuses its parent's sandbox + theme so the
 * agent builds a new route inside the same app.
 */
export async function createFlowScreen(
  userId: string,
  shapeId: string,
  projectId: string,
  parentScreenId: string
): Promise<string> {
  await assertProjectOwner(userId, projectId);

  const parent = await getScreenRow(parentScreenId);
  if (!parent) throw new ApiError(404, "Parent screen not found");
  if (parent.projectId !== projectId) {
    throw new ApiError(400, "Parent screen does not belong to this project");
  }

  const now = Date.now();
  const [row] = await db
    .insert(screens)
    .values({
      shapeId,
      projectId,
      parentScreenId,
      sandboxId: parent.sandboxId,
      theme: parent.theme,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: screens.id });
  return row.id;
}

export interface ScreenPatch {
  sandboxUrl?: string;
  sandboxId?: string;
  files?: unknown;
  title?: string;
  theme?: string;
  route?: string;
  // Repo-map state the agent returns each turn (snake_case columns file_meta /
  // recent_edits). Without these in the allow-list buildPatch silently drops
  // them and the next turn's repo-map goes stale.
  fileMeta?: unknown;
  recentEdits?: string[];
}

function buildPatch(input: ScreenPatch) {
  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  for (const key of [
    "sandboxUrl",
    "sandboxId",
    "files",
    "title",
    "theme",
    "route",
    "fileMeta",
    "recentEdits",
  ] as const) {
    if (input[key] !== undefined) patch[key] = input[key];
  }
  return patch;
}

/** Update a screen (ownership-checked). Used by the screen toolbar. */
export async function updateScreen(
  userId: string,
  screenId: string,
  input: ScreenPatch
): Promise<{ success: boolean }> {
  await assertScreenOwner(userId, screenId);
  await db
    .update(screens)
    .set(buildPatch(input))
    .where(eq(screens.id, screenId));
  return { success: true };
}

/** Delete a screen and its messages (messages also cascade via FK). */
export async function deleteScreen(
  userId: string,
  screenId: string
): Promise<{ success: boolean }> {
  await assertScreenOwner(userId, screenId);
  await db.delete(screens).where(eq(screens.id, screenId));
  return { success: true };
}

/** Screen by canvas shape id, or null (not found / not owner). */
export async function getScreenByShapeId(
  userId: string,
  shapeId: string
): Promise<ScreenDoc | null> {
  const [screen] = await db
    .select()
    .from(screens)
    .where(eq(screens.shapeId, shapeId))
    .limit(1);
  if (!screen) return null;

  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, screen.projectId))
    .limit(1);
  if (!project || project.userId !== userId) return null;

  return toDoc(screen) as ScreenDoc;
}

/**
 * All screens for a project (empty if not found / not owner). Returns a LIGHT
 * row — every column the canvas reads EXCEPT the heavy `files` / `file_meta` /
 * `recent_edits` jsonb (the full generated source tree, up to MBs per screen).
 * This list is polled on an interval, so a bare `select()` made every poll drag
 * the whole tree across the wire for every screen — the same anti-pattern
 * already removed from the message ownership check. The selected screen's
 * `files` is fetched on demand via getScreenFiles(); the agent's generation
 * context reads the full row separately through internalGetScreen(), so it is
 * unaffected by this trim.
 */
export async function getScreensByProject(
  userId: string,
  projectId: string
): Promise<ScreenDoc[]> {
  if (!isUuid(projectId)) return [];
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project || project.userId !== userId) return [];

  const rows = await db
    .select({
      id: screens.id,
      shapeId: screens.shapeId,
      projectId: screens.projectId,
      title: screens.title,
      sandboxUrl: screens.sandboxUrl,
      sandboxId: screens.sandboxId,
      theme: screens.theme,
      parentScreenId: screens.parentScreenId,
      route: screens.route,
      createdAt: screens.createdAt,
      updatedAt: screens.updatedAt,
    })
    .from(screens)
    .where(eq(screens.projectId, projectId));
  return toDocs(rows) as ScreenDoc[];
}

/**
 * Just the `files` blob for one screen (ownership-checked), or null. Heavy, so
 * it is fetched on demand for the selected screen — keeping it out of the polled
 * getScreensByProject() list. Mirrors that function's two-step ownership check.
 */
export async function getScreenFiles(
  userId: string,
  screenId: string
): Promise<Record<string, string> | null> {
  if (!isUuid(screenId)) return null;
  const [screen] = await db
    .select({ projectId: screens.projectId, files: screens.files })
    .from(screens)
    .where(eq(screens.id, screenId))
    .limit(1);
  if (!screen) return null;
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, screen.projectId))
    .limit(1);
  if (!project || project.userId !== userId) return null;
  return (screen.files as Record<string, string> | null) ?? null;
}

// ---- Internal (server-to-server; used by the Inngest workflow) -------------

/** Internal: get a screen by id, no auth. */
export async function internalGetScreen(
  screenId: string
): Promise<ScreenDoc | null> {
  const screen = await getScreenRow(screenId);
  return screen ? (toDoc(screen) as ScreenDoc) : null;
}

/** Internal: patch a screen by id, no auth (Inngest also sets sandboxId). */
export async function internalUpdateScreen(
  screenId: string,
  input: ScreenPatch
): Promise<{ success: boolean }> {
  const screen = await getScreenRow(screenId);
  if (!screen) throw new ApiError(404, "Screen not found");
  await db
    .update(screens)
    .set(buildPatch(input))
    .where(eq(screens.id, screenId));
  return { success: true };
}
