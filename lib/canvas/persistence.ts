import type {
  ViewportState,
  ShapesState,
  EntityState,
  Shape,
  HistoryEntry,
} from "@/types/canvas";
import { HISTORY_CONFIG } from "./history-manager";

export interface CanvasProjectData {
  viewport: {
    scale: number;
    translate: { x: number; y: number };
  };
  shapes: EntityState<Shape>;
  tool: ShapesState["tool"];
  selected: ShapesState["selected"];
  frameCounter: number;
  history?: HistoryEntry[];
  historyPointer?: number;
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
  // Limit persisted history to most recent entries
  let persistedHistory: HistoryEntry[] | undefined;
  let persistedPointer: number | undefined;

  if (shapes.history.length > 0) {
    const maxSize = HISTORY_CONFIG.PERSISTED_HISTORY_SIZE;
    const pointer = shapes.historyPointer;

    if (shapes.history.length <= maxSize) {
      // History fits within limit, persist all
      persistedHistory = shapes.history;
      persistedPointer = pointer;
    } else {
      // Calculate slice range to preserve relevant history around current pointer
      const halfSize = Math.floor(maxSize / 2);
      let startIdx = Math.max(0, pointer - halfSize);
      let endIdx = Math.min(shapes.history.length, startIdx + maxSize);

      // Adjust if we're near the end
      if (endIdx - startIdx < maxSize) {
        startIdx = Math.max(0, endIdx - maxSize);
      }

      persistedHistory = shapes.history.slice(startIdx, endIdx);
      persistedPointer = pointer - startIdx;
    }
  }

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
    history: persistedHistory,
    historyPointer: persistedPointer,
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
  history: HistoryEntry[];
  historyPointer: number;
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
    history: data.history || [],
    historyPointer: data.historyPointer ?? -1,
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
  history: HistoryEntry[];
  historyPointer: number;
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
  history: HistoryEntry[];
  historyPointer: number;
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
