"use client";

import { useEffect, useCallback } from "react";
import { useCanvasContext } from "@/contexts/CanvasContext";
import {
  serializeCanvasState,
  deserializeCanvasState,
  saveToLocalStorage,
  loadFromLocalStorage,
  type CanvasProjectData,
} from "@/lib/canvas/persistence";

/**
 * Hook to handle canvas state persistence
 * Integrates with localStorage for quick recovery and Convex for permanent storage
 */
export function useCanvasPersistence(projectId: string) {
  const { viewport, dispatchViewport, shapes, dispatchShapes } =
    useCanvasContext();

  // Auto-save to localStorage on state changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToLocalStorage(projectId, viewport, shapes);
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [projectId, viewport, shapes]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromLocalStorage(projectId);
    if (stored) {
      dispatchViewport({
        type: "RESTORE_VIEWPORT",
        payload: stored.viewport,
      });
      dispatchShapes({
        type: "LOAD_PROJECT",
        payload: {
          shapes: stored.shapes,
          tool: stored.tool,
          selected: stored.selected,
          frameCounter: stored.frameCounter,
        },
      });
    }
  }, [projectId, dispatchViewport, dispatchShapes]);

  // Export current state
  const exportState = useCallback((): CanvasProjectData => {
    return serializeCanvasState(viewport, shapes);
  }, [viewport, shapes]);

  // Import state
  const importState = useCallback(
    (data: CanvasProjectData) => {
      const deserialized = deserializeCanvasState(data);
      dispatchViewport({
        type: "RESTORE_VIEWPORT",
        payload: deserialized.viewport,
      });
      dispatchShapes({
        type: "LOAD_PROJECT",
        payload: {
          shapes: deserialized.shapes,
          tool: deserialized.tool,
          selected: deserialized.selected,
          frameCounter: deserialized.frameCounter,
        },
      });
    },
    [dispatchViewport, dispatchShapes]
  );

  // Save to Convex (to be implemented with actual Convex mutation)
  const saveToConvex = useCallback(async () => {
    const data = exportState();
    // TODO: Implement Convex mutation
    // await convex.mutation(api.projects.saveCanvas, { projectId, data });
    console.log("Save to Convex:", data);
  }, [exportState]);

  // Load from Convex (to be implemented with actual Convex query)
  const loadFromConvex = useCallback(async () => {
    // TODO: Implement Convex query
    // const data = await convex.query(api.projects.getCanvas, { projectId });
    // if (data) importState(data);
    console.log("Load from Convex");
  }, []);

  return {
    exportState,
    importState,
    saveToConvex,
    loadFromConvex,
  };
}
