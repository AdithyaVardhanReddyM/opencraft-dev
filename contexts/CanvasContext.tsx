"use client";

import React, { createContext, useContext, useReducer, useMemo } from "react";
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

interface CanvasContextValue {
  // Viewport state
  viewport: ViewportState;
  dispatchViewport: React.Dispatch<ViewportAction>;

  // Shapes state
  shapes: ShapesState;
  dispatchShapes: React.Dispatch<ShapesAction>;

  // Computed values
  shapesList: Shape[];
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

  // Compute shapes list from entity state
  const shapesList = useMemo(() => {
    return shapes.shapes.ids
      .map((id) => shapes.shapes.entities[id])
      .filter((shape): shape is Shape => Boolean(shape));
  }, [shapes.shapes]);

  const value: CanvasContextValue = {
    viewport,
    dispatchViewport,
    shapes,
    dispatchShapes,
    shapesList,
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
