import type {
  ViewportState,
  ShapesState,
  EntityState,
  Shape,
} from "@/types/canvas";

export interface CanvasProjectData {
  viewport: {
    scale: number;
    translate: { x: number; y: number };
  };
  shapes: EntityState<Shape>;
  tool: ShapesState["tool"];
  selected: ShapesState["selected"];
  frameCounter: number;
  version: string;
  lastModified: number;
}

/**
 * Serialize canvas state to JSON
 */
export function serializeCanvasState(
  viewport: ViewportState,
  shapes: ShapesState
): CanvasProjectData {
  return {
    viewport: {
      scale: viewport.scale,
      translate: {
        x: viewport.translate.x,
        y: viewport.translate.y,
      },
    },
    shapes: shapes.shapes,
    tool: shapes.tool,
    selected: shapes.selected,
    frameCounter: shapes.frameCounter,
    version: "1.0.0",
    lastModified: Date.now(),
  };
}

/**
 * Deserialize canvas state from JSON
 */
export function deserializeCanvasState(data: CanvasProjectData): {
  viewport: { scale: number; translate: { x: number; y: number } };
  shapes: EntityState<Shape>;
  tool: ShapesState["tool"];
  selected: ShapesState["selected"];
  frameCounter: number;
} {
  return {
    viewport: {
      scale: data.viewport.scale,
      translate: {
        x: data.viewport.translate.x,
        y: data.viewport.translate.y,
      },
    },
    shapes: data.shapes,
    tool: data.tool,
    selected: data.selected,
    frameCounter: data.frameCounter,
  };
}

/**
 * Export canvas state as JSON string
 */
export function exportCanvasState(
  viewport: ViewportState,
  shapes: ShapesState
): string {
  const data = serializeCanvasState(viewport, shapes);
  return JSON.stringify(data, null, 2);
}

/**
 * Import canvas state from JSON string
 */
export function importCanvasState(jsonString: string): {
  viewport: { scale: number; translate: { x: number; y: number } };
  shapes: EntityState<Shape>;
  tool: ShapesState["tool"];
  selected: ShapesState["selected"];
  frameCounter: number;
} {
  const data = JSON.parse(jsonString) as CanvasProjectData;
  return deserializeCanvasState(data);
}

/**
 * Save canvas state to localStorage (for quick recovery)
 */
export function saveToLocalStorage(
  projectId: string,
  viewport: ViewportState,
  shapes: ShapesState
): void {
  try {
    const data = serializeCanvasState(viewport, shapes);
    localStorage.setItem(`canvas-project-${projectId}`, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
}

/**
 * Load canvas state from localStorage
 */
export function loadFromLocalStorage(projectId: string): {
  viewport: { scale: number; translate: { x: number; y: number } };
  shapes: EntityState<Shape>;
  tool: ShapesState["tool"];
  selected: ShapesState["selected"];
  frameCounter: number;
} | null {
  try {
    const stored = localStorage.getItem(`canvas-project-${projectId}`);
    if (!stored) return null;

    const data = JSON.parse(stored) as CanvasProjectData;
    return deserializeCanvasState(data);
  } catch (error) {
    console.error("Failed to load from localStorage:", error);
    return null;
  }
}

/**
 * Clear canvas state from localStorage
 */
export function clearLocalStorage(projectId: string): void {
  try {
    localStorage.removeItem(`canvas-project-${projectId}`);
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }
}
