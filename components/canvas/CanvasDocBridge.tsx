"use client";

import { useCallback } from "react";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { useCollab } from "@/contexts/CollabContext";
import { useCanvasDocSync } from "@/hooks/use-canvas-doc-sync";
import type { EntityState, Shape } from "@/types/canvas";

/**
 * Headless bridge: connects the canvas reducer (CanvasContext) to the shared
 * Y.Doc (CollabContext) so shape edits sync across collaborators. Renders
 * nothing. Must sit inside both providers. No-ops when realtime is off.
 */
export function CanvasDocBridge() {
  const { shapes, dispatchShapes } = useCanvasContext();
  const { doc, canEdit } = useCollab();

  const applyRemote = useCallback(
    (incoming: EntityState<Shape>, frameCounter: number) => {
      dispatchShapes({
        type: "SYNC_SHAPES_FROM_DOC",
        payload: { shapes: incoming, frameCounter },
      });
    },
    [dispatchShapes]
  );

  useCanvasDocSync({
    doc,
    shapes: shapes.shapes,
    frameCounter: shapes.frameCounter,
    applyRemote,
    canEdit,
  });

  return null;
}
