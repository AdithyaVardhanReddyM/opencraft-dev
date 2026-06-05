import type {
  ViewportState,
  ShapesState,
  EntityState,
  Shape,
  HistoryEntry,
  Tool,
  SelectionMap,
} from "@/types/canvas";
import { HISTORY_CONFIG } from "./history-manager";

// Current schema version
export const CANVAS_VERSION = "1.0.0";

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

// Deserialized canvas state type
export interface DeserializedCanvasState {
  viewport: { scale: number; translate: { x: number; y: number } };
  shapes: EntityState<Shape>;
  tool: Tool;
  selected: SelectionMap;
  frameCounter: number;
  history: HistoryEntry[];
  historyPointer: number;
}

// Save result type for error handling
export interface SaveResult {
  success: boolean;
  error?: string;
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
    version: CANVAS_VERSION,
    lastModified: Date.now(),
  };
}

/**
 * Migrate canvas data from older versions to current schema
 */
export function migrateCanvasData(data: CanvasProjectData): CanvasProjectData {
  const version = data.version || "0.0.0";

  // Migration from pre-1.0.0 (no version field)
  if (version === "0.0.0") {
    // Ensure shapes has proper EntityState structure
    if (!data.shapes || !data.shapes.ids || !data.shapes.entities) {
      data.shapes = { ids: [], entities: {} };
    }
    // Ensure selected is a proper SelectionMap
    if (!data.selected || typeof data.selected !== "object") {
      data.selected = {};
    }
    data.version = "1.0.0";
  }

  // Future migrations can be added here:
  // if (version === "1.0.0") { ... migrate to 1.1.0 ... }

  return data;
}

/**
 * Deserialize canvas state from JSON with migration support
 */
export function deserializeCanvasState(
  data: CanvasProjectData
): DeserializedCanvasState {
  // Apply migrations if needed
  const migratedData = migrateCanvasData(data);

  return {
    viewport: {
      scale: migratedData.viewport?.scale ?? 1,
      translate: {
        x: migratedData.viewport?.translate?.x ?? 0,
        y: migratedData.viewport?.translate?.y ?? 0,
      },
    },
    shapes: migratedData.shapes || { ids: [], entities: {} },
    tool: migratedData.tool || "select",
    selected: migratedData.selected || {},
    frameCounter: migratedData.frameCounter || 0,
    history: migratedData.history || [],
    historyPointer: migratedData.historyPointer ?? -1,
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
export function importCanvasState(jsonString: string): DeserializedCanvasState {
  const data = JSON.parse(jsonString) as CanvasProjectData;
  return deserializeCanvasState(data);
}

/**
 * Get the lastModified timestamp from localStorage for a project
 */
export function getLocalStorageTimestamp(projectId: string): number | null {
  try {
    const stored = localStorage.getItem(`canvas-project-${projectId}`);
    if (!stored) return null;
    const data = JSON.parse(stored) as CanvasProjectData;
    return data.lastModified || null;
  } catch {
    return null;
  }
}

/**
 * Save canvas state to localStorage (for quick recovery)
 * Returns a SaveResult indicating success or failure
 */
export function saveToLocalStorage(
  projectId: string,
  viewport: ViewportState,
  shapes: ShapesState
): SaveResult {
  try {
    const data = serializeCanvasState(viewport, shapes);
    localStorage.setItem(`canvas-project-${projectId}`, JSON.stringify(data));
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check for quota exceeded error
    if (
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      console.error("localStorage quota exceeded:", error);
      return { success: false, error: "quota_exceeded" };
    }

    console.error("Failed to save to localStorage:", error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Load canvas state from localStorage
 */
export function loadFromLocalStorage(
  projectId: string
): DeserializedCanvasState | null {
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
 * Load raw canvas project data from localStorage (with lastModified)
 */
export function loadRawFromLocalStorage(
  projectId: string
): CanvasProjectData | null {
  try {
    const stored = localStorage.getItem(`canvas-project-${projectId}`);
    if (!stored) return null;
    return JSON.parse(stored) as CanvasProjectData;
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

/**
 * Clear old project data from localStorage to free up space
 * Keeps the most recent N projects
 */
export function clearOldLocalStorageData(keepCount: number = 5): void {
  try {
    const projectKeys: { key: string; timestamp: number }[] = [];

    // Find all canvas project keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("canvas-project-")) {
        try {
          const data = JSON.parse(
            localStorage.getItem(key) || "{}"
          ) as CanvasProjectData;
          projectKeys.push({ key, timestamp: data.lastModified || 0 });
        } catch {
          // Invalid data, mark for removal
          projectKeys.push({ key, timestamp: 0 });
        }
      }
    }

    // Sort by timestamp (oldest first)
    projectKeys.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest projects beyond keepCount
    const toRemove = projectKeys.slice(
      0,
      Math.max(0, projectKeys.length - keepCount)
    );
    for (const { key } of toRemove) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error("Failed to clear old localStorage data:", error);
  }
}
