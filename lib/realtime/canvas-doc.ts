import * as Y from "yjs";
import type { Shape, EntityState } from "@/types/canvas";

/**
 * Y.Doc shape model + projection for canvas collaboration.
 *
 * The shared document holds:
 *   - Y.Map("shapes")    id -> Shape (plain object; whole-object replace ⇒ per-shape LWW)
 *   - Y.Array("shapeIds") z-order
 *   - Y.Map("meta")      { frameCounter }
 *
 * Local writes are tagged with LOCAL_ORIGIN so the sync bridge can tell its own
 * transactions apart from remote-applied ones (no echo loops). Reads project the
 * doc back into the reducer's normalized EntityState, reconciling any id/entity
 * drift so a shape is never lost from rendering even under concurrent edits.
 */

export const LOCAL_ORIGIN = Symbol("canvas-local-write");

export function getShapesMap(doc: Y.Doc): Y.Map<Shape> {
  return doc.getMap<Shape>("shapes");
}
export function getIdsArray(doc: Y.Doc): Y.Array<string> {
  return doc.getArray<string>("shapeIds");
}
export function getMeta(doc: Y.Doc): Y.Map<number> {
  return doc.getMap<number>("meta");
}

export function isDocEmpty(doc: Y.Doc): boolean {
  return getShapesMap(doc).size === 0;
}

export function getDocFrameCounter(doc: Y.Doc): number {
  const v = getMeta(doc).get("frameCounter");
  return typeof v === "number" ? v : 0;
}

/** Project the Y.Doc into a normalized EntityState, reconciling id/entity drift. */
export function projectToEntityState(doc: Y.Doc): EntityState<Shape> {
  const yShapes = getShapesMap(doc);
  const yIds = getIdsArray(doc);

  const entities: Record<string, Shape> = {};
  yShapes.forEach((shape, id) => {
    entities[id] = shape;
  });

  const ids: string[] = [];
  const seen = new Set<string>();
  // Preserve the shared z-order for entities that still exist…
  for (const id of yIds.toArray()) {
    if (entities[id] && !seen.has(id)) {
      ids.push(id);
      seen.add(id);
    }
  }
  // …then append any entity missing from the order array (concurrent-add edge),
  // so a shape that exists is always rendered even if ordering lagged.
  yShapes.forEach((_shape, id) => {
    if (!seen.has(id)) {
      ids.push(id);
      seen.add(id);
    }
  });

  return { ids, entities };
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Reconcile a local EntityState change (prev → next) into the Y.Doc in one
 * LOCAL_ORIGIN transaction. Only the actual delta is written:
 *   - entities whose object reference changed (reducer is immutable) are upserted
 *   - entities removed locally are deleted
 *   - the id order is replaced only when it actually changed
 * This preserves CRDT granularity so concurrent remote edits to *other* shapes
 * are not clobbered.
 */
export function pushEntityStateDelta(
  doc: Y.Doc,
  prev: EntityState<Shape>,
  next: EntityState<Shape>,
  frameCounter: number
): void {
  const yShapes = getShapesMap(doc);
  const yIds = getIdsArray(doc);
  const yMeta = getMeta(doc);

  doc.transact(() => {
    // Upserts: any entity whose reference differs from the last synced one.
    for (const id in next.entities) {
      const shape = next.entities[id];
      if (prev.entities[id] !== shape) yShapes.set(id, shape);
    }
    // Deletions: entities that were present before but not now.
    for (const id in prev.entities) {
      if (!next.entities[id]) yShapes.delete(id);
    }
    // Z-order: replace wholesale only on change (adds/removes/reorders). Updates
    // during a drag don't change ids, so this is rare. The projection's
    // orphan-append keeps shapes visible even if a concurrent reorder is lost.
    if (!arraysEqual(prev.ids, next.ids)) {
      const desired = next.ids.filter((id) => next.entities[id]);
      if (!arraysEqual(yIds.toArray(), desired)) {
        yIds.delete(0, yIds.length);
        yIds.insert(0, desired);
      }
    }
    if (yMeta.get("frameCounter") !== frameCounter) {
      yMeta.set("frameCounter", frameCounter);
    }
  }, LOCAL_ORIGIN);
}

/** Seed an empty doc from an EntityState (used when this client is the first in). */
export function seedDoc(
  doc: Y.Doc,
  state: EntityState<Shape>,
  frameCounter: number
): void {
  pushEntityStateDelta(doc, { ids: [], entities: {} }, state, frameCounter);
}
