"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useState,
  useCallback,
} from "react";
import type { ViewportState, ShapesState, Shape } from "@/types/canvas";
import {
  viewportReducer,
  initialViewportState,
  type ViewportAction,
} from "@/lib/canvas/viewport-reducer";
import {
  shapesReducer,
  initialShapesState,
  type ShapesAction,
} from "@/lib/canvas/shapes-reducer";
import {
  type ShapeDefaultProperties,
  DEFAULT_SHAPE_PROPERTIES,
} from "@/lib/canvas/properties-utils";

interface CanvasContextValue {
  // Viewport state
  viewport: ViewportState;
  dispatchViewport: React.Dispatch<ViewportAction>;

  // Shapes state
  shapes: ShapesState;
  dispatchShapes: React.Dispatch<ShapesAction>;

  // Computed values
  shapesList: Shape[];

  // Default shape properties
  defaultProperties: ShapeDefaultProperties;
  setDefaultProperty: (property: string, value: unknown) => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [viewport, dispatchViewport] = useReducer(
    viewportReducer,
    initialViewportState
  );

  const [shapes, dispatchShapes] = useReducer(
    shapesReducer,
    initialShapesState
  );

  // Default shape properties state
  const [defaultProperties, setDefaultProperties] =
    useState<ShapeDefaultProperties>(DEFAULT_SHAPE_PROPERTIES);

  // Update a single default property
  const setDefaultProperty = useCallback((property: string, value: unknown) => {
    setDefaultProperties((prev) => ({
      ...prev,
      [property]: value,
    }));
  }, []);

  // Compute shapes list from entity state with safety checks
  const shapesList = useMemo(() => {
    // Safety check for invalid shapes state
    if (
      !shapes.shapes ||
      !Array.isArray(shapes.shapes.ids) ||
      !shapes.shapes.entities
    ) {
      return [];
    }

    // Dedupe by id before rendering. `shapes.shapes.ids` can transiently hold the
    // same id twice (e.g. a local ADD racing a Yjs echo when a shape is placed),
    // which would render two elements with the same React key and crash the canvas.
    // RENDER-ONLY guard — keep it that way: shapesList feeds rendering, hit-testing
    // and selection, never persistence. Autosave and the Yjs push serialize the raw
    // `shapes.shapes` EntityState (see use-autosave.ts / use-canvas-doc-sync.ts), so
    // collapsing a duplicate here cannot drop a real shape or change what's saved.
    // (Do NOT "fix the root" by making addEntity idempotent — that touches the
    // self-heal/Yjs mutation path and dropped real screens. Keep the guard here.)
    const seen = new Set<string>();
    return shapes.shapes.ids
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((id) => shapes.shapes.entities[id])
      .filter((shape): shape is Shape => Boolean(shape));
  }, [shapes.shapes]);

  const value: CanvasContextValue = {
    viewport,
    dispatchViewport,
    shapes,
    dispatchShapes,
    shapesList,
    defaultProperties,
    setDefaultProperty,
  };

  return (
    <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>
  );
}

export function useCanvasContext() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvasContext must be used within a CanvasProvider");
  }
  return context;
}
