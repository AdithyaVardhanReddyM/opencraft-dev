"use client";

import { useEffect, useRef } from "react";
import * as Y from "yjs";
import type { EntityState, Shape } from "@/types/canvas";
import {
  LOCAL_ORIGIN,
  projectToEntityState,
  pushEntityStateDelta,
  isDocEmpty,
  getDocFrameCounter,
} from "@/lib/realtime/canvas-doc";

const PUSH_THROTTLE_MS = 40; // coalesce rapid local edits (drag/resize)
const EMPTY: EntityState<Shape> = { ids: [], entities: {} };

interface Args {
  /** Shared doc from CollabContext, or null when realtime is off (single-player). */
  doc: Y.Doc | null;
  /** The reducer's current shape set (shapes.shapes). */
  shapes: EntityState<Shape>;
  frameCounter: number;
  /** Apply a remote snapshot into the reducer (dispatch SYNC_SHAPES_FROM_DOC). */
  applyRemote: (shapes: EntityState<Shape>, frameCounter: number) => void;
  /** When false (viewer role), adopt remote changes but never broadcast local ones. */
  canEdit?: boolean;
}

/**
 * Bridges the canvas reducer (local source of truth) with the shared Y.Doc:
 *   - local change → push the delta into the doc (throttled), tagged LOCAL_ORIGIN
 *   - remote change → project the doc and apply it into the reducer
 *
 * `syncedRef` tracks the last EntityState reconciled with the doc; it doubles as
 * the delta baseline and the echo guard (after applying a remote snapshot we set
 * it to that snapshot, so the immediately-following local effect is a no-op).
 *
 * When `doc` is null the hook does nothing — single-player is unchanged.
 */
export function useCanvasDocSync({
  doc,
  shapes,
  frameCounter,
  applyRemote,
  canEdit = true,
}: Args) {
  const syncedRef = useRef<EntityState<Shape>>(EMPTY);
  const frameCounterRef = useRef<number>(-1);

  const latestRef = useRef({ shapes, frameCounter });
  latestRef.current = { shapes, frameCounter };

  const applyRemoteRef = useRef(applyRemote);
  applyRemoteRef.current = applyRemote;

  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPush = useRef(0);

  // Observe the doc + adopt any state already present (late joiner). Re-runs when
  // the doc instance changes (project / user switch).
  useEffect(() => {
    if (!doc) return;

    // New doc: force the next local flush to seed our full state.
    syncedRef.current = EMPTY;
    frameCounterRef.current = -1;

    const onAfter = (txn: Y.Transaction) => {
      if (txn.origin === LOCAL_ORIGIN) return; // our own write — ignore
      const projected = projectToEntityState(doc);
      const fc = getDocFrameCounter(doc);

      // Data-loss guard: never let a remote update that empties the doc wipe a
      // canvas that still has shapes locally. This is where the "everything
      // vanished during collaboration" bug landed — a stale/empty snapshot from a
      // peer projected to {} and replaced our shapes, which autosave then made
      // permanent. We keep our shapes and reset the baseline so our next local
      // edit re-seeds the doc (self-heal). Trade-off: a deliberate delete-to-empty
      // by a peer won't reflect here until our next change — an intentional bias
      // toward preserving data over honoring an empty broadcast.
      if (projected.ids.length === 0 && latestRef.current.shapes.ids.length > 0) {
        syncedRef.current = EMPTY; // force a full re-seed on the next local flush
        frameCounterRef.current = -1;
        return;
      }

      syncedRef.current = projected; // echo guard for the upcoming local effect
      frameCounterRef.current = fc;
      applyRemoteRef.current(projected, fc);
    };
    doc.on("afterTransaction", onAfter);

    // Adopt existing shared state immediately if peers already populated it.
    if (!isDocEmpty(doc)) {
      const projected = projectToEntityState(doc);
      const fc = getDocFrameCounter(doc);
      syncedRef.current = projected;
      frameCounterRef.current = fc;
      applyRemoteRef.current(projected, fc);
    }

    return () => {
      doc.off("afterTransaction", onAfter);
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
    };
  }, [doc]);

  // Push local changes into the doc, throttled to bound message volume on drags.
  // Viewers never broadcast — their local fiddling stays local.
  useEffect(() => {
    if (!doc || !canEdit) return;

    const flush = () => {
      flushTimer.current = null;
      lastPush.current = Date.now();
      const { shapes: nextShapes, frameCounter: fc } = latestRef.current;
      if (nextShapes === syncedRef.current && fc === frameCounterRef.current) {
        return; // nothing new (e.g. just adopted a remote snapshot)
      }
      pushEntityStateDelta(doc, syncedRef.current, nextShapes, fc);
      syncedRef.current = nextShapes;
      frameCounterRef.current = fc;
    };

    const since = Date.now() - lastPush.current;
    if (since >= PUSH_THROTTLE_MS) {
      flush();
    } else if (!flushTimer.current) {
      flushTimer.current = setTimeout(flush, PUSH_THROTTLE_MS - since);
    }
  }, [doc, shapes, frameCounter, canEdit]);
}
