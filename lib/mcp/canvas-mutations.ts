import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import {
  createScreen as makeScreenShape,
  createImage as makeImageShape,
  SCREEN_DEFAULTS,
  IMAGE_DEFAULTS,
} from "@/lib/canvas/shape-factories";
import type {
  EntityState,
  Shape,
  ScreenShape,
  ImageShape,
} from "@/types/canvas";

/**
 * Append-only writes to a project's canvas snapshot (`projects.sketches_data`,
 * a normalized EntityState<Shape>). The MCP server is not a Yjs peer, so new
 * shapes land in the durable Aurora snapshot and surface the next time the
 * canvas opens/reloads. We only ever ADD an entity + its id — never rewrite or
 * drop existing shapes — so an open collaborator's autosave is the only thing
 * that can race, and it can only lose the just-added shape. That loss is
 * recovered by the canvas's screen-row reconciliation (see the self-heal effect
 * in app/dashboard/[projectId]/canvas/page.tsx), which re-adds a shape for any
 * `screens` row whose shapeId is missing from the blob after hydration.
 */

const GAP = 80;

function emptyState(): EntityState<Shape> {
  return { ids: [], entities: {} };
}

async function readState(projectId: string): Promise<EntityState<Shape>> {
  const [row] = await db
    .select({ sketchesData: projects.sketchesData })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  const data = row?.sketchesData as EntityState<Shape> | null | undefined;
  if (data && Array.isArray(data.ids) && data.entities) return data;
  return emptyState();
}

async function writeState(
  projectId: string,
  state: EntityState<Shape>
): Promise<void> {
  await db
    .update(projects)
    .set({ sketchesData: state, lastModified: Date.now() })
    .where(eq(projects.id, projectId));
}

function appendShape(
  state: EntityState<Shape>,
  shape: Shape
): EntityState<Shape> {
  return {
    ids: [...state.ids, shape.id],
    entities: { ...state.entities, [shape.id]: shape },
  };
}

function shapesOfType<T extends Shape>(
  state: EntityState<Shape>,
  type: T["type"]
): T[] {
  return state.ids
    .map((id) => state.entities[id])
    .filter((s): s is T => !!s && s.type === type);
}

/** Place a new screen to the right of the rightmost existing screen. */
function nextScreenPosition(state: EntityState<Shape>): { x: number; y: number } {
  const screens = shapesOfType<ScreenShape>(state, "screen");
  if (screens.length === 0) return { x: 0, y: 0 };
  const rightmost = Math.max(...screens.map((s) => s.x + s.w));
  return { x: rightmost + GAP, y: 0 };
}

/**
 * Add a ScreenShape bound to a screen row. `shapeId` MUST equal the screen
 * row's `shapeId` (the canvas looks the screen up by it).
 */
export async function appendScreenShape(
  projectId: string,
  shapeId: string,
  screenId: string,
  position?: { x: number; y: number }
): Promise<ScreenShape> {
  const state = await readState(projectId);
  const pos = position ?? nextScreenPosition(state);
  const shape = makeScreenShape({
    id: shapeId,
    screenId,
    x: pos.x,
    y: pos.y,
    w: SCREEN_DEFAULTS.width,
    h: SCREEN_DEFAULTS.height,
  });
  await writeState(projectId, appendShape(state, shape));
  return shape;
}

/** Place a new image below existing images so they don't stack exactly. */
function nextImagePosition(state: EntityState<Shape>): { x: number; y: number } {
  const images = shapesOfType<ImageShape>(state, "image");
  return { x: 0, y: images.length * (IMAGE_DEFAULTS.maxHeight + GAP) };
}

/**
 * Add an ImageShape referencing an already-uploaded S3 object. Natural
 * dimensions default to the display box when unknown.
 */
export async function appendImageShape(
  projectId: string,
  input: {
    s3Key: string;
    name: string;
    width?: number;
    height?: number;
    position?: { x: number; y: number };
    /** Reuse a specific shape id so a durable `images` row can link to it. */
    id?: string;
  }
): Promise<ImageShape> {
  const state = await readState(projectId);
  const pos = input.position ?? nextImagePosition(state);
  const w = input.width ?? IMAGE_DEFAULTS.maxWidth;
  const h = input.height ?? Math.round(IMAGE_DEFAULTS.maxWidth * 0.66);
  const shape = makeImageShape({
    id: input.id,
    x: pos.x,
    y: pos.y,
    w,
    h,
    s3Key: input.s3Key,
    name: input.name,
    naturalWidth: input.width ?? w,
    naturalHeight: input.height ?? h,
    status: "ready",
  });
  await writeState(projectId, appendShape(state, shape));
  return shape;
}

/** Image shapes currently on a project's canvas (name + S3 key). */
export async function listImageShapes(
  projectId: string
): Promise<{ name: string; s3Key: string }[]> {
  const state = await readState(projectId);
  return shapesOfType<ImageShape>(state, "image").map((s) => ({
    name: s.name,
    s3Key: s.s3Key,
  }));
}
