import type { EntityState, Shape, SelectionMap } from "@/types/canvas";

// History configuration constants
export const HISTORY_CONFIG = {
  MAX_HISTORY_SIZE: 50, // Maximum entries in memory
  PERSISTED_HISTORY_SIZE: 20, // Maximum entries in localStorage
  DEBOUNCE_DELAY: 0, // Debounce delay for history recording (0 = disabled)
  ENABLE_HISTORY_LOGGING: false, // Enable console logging for debugging
};

// History entry representing a snapshot of canvas state
export interface HistoryEntry {
  shapes: EntityState<Shape>;
  selected: SelectionMap;
  frameCounter: number;
  timestamp: number;
}

/**
 * Create a history entry from current state
 */
export function createHistoryEntry(
  shapes: EntityState<Shape>,
  selected: SelectionMap,
  frameCounter: number
): HistoryEntry {
  return {
    shapes: {
      ids: [...shapes.ids],
      entities: { ...shapes.entities },
    },
    selected: { ...selected },
    frameCounter,
    timestamp: Date.now(),
  };
}

/**
 * Add entry to history stack
 * Handles truncation of forward history and max size limiting
 */
export function addToHistory(
  history: HistoryEntry[],
  pointer: number,
  entry: HistoryEntry,
  maxSize: number = HISTORY_CONFIG.MAX_HISTORY_SIZE
): { history: HistoryEntry[]; pointer: number } {
  // If pointer is not at the end, truncate forward history
  const truncatedHistory =
    pointer < history.length - 1 ? history.slice(0, pointer + 1) : history;

  // Add new entry
  const newHistory = [...truncatedHistory, entry];

  // If exceeds max size, remove oldest entries
  const finalHistory =
    newHistory.length > maxSize
      ? newHistory.slice(newHistory.length - maxSize)
      : newHistory;

  // New pointer is at the end
  const newPointer = finalHistory.length - 1;

  if (HISTORY_CONFIG.ENABLE_HISTORY_LOGGING) {
    console.log("[History] Added entry", {
      pointer: newPointer,
      historyLength: finalHistory.length,
      timestamp: entry.timestamp,
    });
  }

  return {
    history: finalHistory,
    pointer: newPointer,
  };
}

/**
 * Navigate to previous state (undo)
 */
export function undo(
  history: HistoryEntry[],
  pointer: number
): { entry: HistoryEntry | null; pointer: number } {
  if (!canUndo(pointer)) {
    if (HISTORY_CONFIG.ENABLE_HISTORY_LOGGING) {
      console.log("[History] Cannot undo - at beginning");
    }
    return { entry: null, pointer };
  }

  const newPointer = pointer - 1;
  const entry = history[newPointer];

  if (HISTORY_CONFIG.ENABLE_HISTORY_LOGGING) {
    console.log("[History] Undo", {
      fromPointer: pointer,
      toPointer: newPointer,
      timestamp: entry?.timestamp,
    });
  }

  return {
    entry: entry || null,
    pointer: newPointer,
  };
}

/**
 * Navigate to next state (redo)
 */
export function redo(
  history: HistoryEntry[],
  pointer: number
): { entry: HistoryEntry | null; pointer: number } {
  if (!canRedo(history, pointer)) {
    if (HISTORY_CONFIG.ENABLE_HISTORY_LOGGING) {
      console.log("[History] Cannot redo - at end");
    }
    return { entry: null, pointer };
  }

  const newPointer = pointer + 1;
  const entry = history[newPointer];

  if (HISTORY_CONFIG.ENABLE_HISTORY_LOGGING) {
    console.log("[History] Redo", {
      fromPointer: pointer,
      toPointer: newPointer,
      timestamp: entry?.timestamp,
    });
  }

  return {
    entry: entry || null,
    pointer: newPointer,
  };
}

/**
 * Check if undo is available
 */
export function canUndo(pointer: number): boolean {
  return pointer > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(history: HistoryEntry[], pointer: number): boolean {
  return pointer < history.length - 1;
}
