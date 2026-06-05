import type { CanvasProjectData } from "./persistence";

// Save status types
export type SaveStatus = "saved" | "saving" | "offline" | "error";

// Autosave error types
export interface AutosaveError {
  type: "localStorage" | "network" | "auth" | "validation";
  message: string;
  timestamp: number;
}

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
} as const;

// Debounce configuration
export const DEBOUNCE_CONFIG = {
  localSaveMs: 1000, // 1 second for localStorage
  cloudSyncMs: 2000, // 2 seconds for cloud sync
} as const;

/**
 * Resolve conflict between local and cloud canvas states
 * Uses timestamp-based resolution: newer state wins
 *
 * @param local - Local canvas state (from localStorage)
 * @param cloud - Cloud canvas state (from Convex)
 * @returns The state with the higher (more recent) timestamp, or null if both are null
 */
export function resolveConflict(
  local: CanvasProjectData | null,
  cloud: CanvasProjectData | null
): CanvasProjectData | null {
  // Both null - no state exists
  if (!local && !cloud) {
    return null;
  }

  // Only cloud exists
  if (!local) {
    return cloud;
  }

  // Only local exists
  if (!cloud) {
    return local;
  }

  // Both exist - compare timestamps, prefer newer
  // If timestamps are equal, prefer local (user's most recent action)
  return local.lastModified >= cloud.lastModified ? local : cloud;
}

/**
 * Derive save status from state flags
 * Priority: error > offline > saving > saved
 *
 * @param isDirty - Whether there are unsaved local changes
 * @param isSyncing - Whether a cloud sync is in progress
 * @param hasError - Whether there was a sync error
 * @param isOffline - Whether the app is offline
 * @returns The derived SaveStatus
 */
export function deriveSaveStatus(
  isDirty: boolean,
  isSyncing: boolean,
  hasError: boolean,
  isOffline: boolean
): SaveStatus {
  // Error takes highest priority
  if (hasError) {
    return "error";
  }

  // Offline with pending changes
  if (isOffline && isDirty) {
    return "offline";
  }

  // Currently syncing
  if (isSyncing) {
    return "saving";
  }

  // Has local changes pending sync
  if (isDirty) {
    return "saving";
  }

  // All synced
  return "saved";
}

/**
 * Calculate exponential backoff delay for retries
 *
 * @param attempt - Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(attempt: number): number {
  const delay =
    RETRY_CONFIG.baseDelayMs *
    Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Check if an error is retryable
 *
 * @param error - The error to check
 * @returns Whether the error should trigger a retry
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  // Check for specific error types
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Auth errors are not retryable
    if (
      message.includes("not authenticated") ||
      message.includes("not authorized")
    ) {
      return false;
    }

    // Validation errors are not retryable
    if (message.includes("validation") || message.includes("invalid")) {
      return false;
    }

    // Network-related errors are retryable
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("connection")
    ) {
      return true;
    }
  }

  // Default to retryable for unknown errors
  return true;
}

/**
 * Classify an error into an AutosaveError type
 *
 * @param error - The error to classify
 * @returns Classified AutosaveError
 */
export function classifyError(error: unknown): AutosaveError {
  const timestamp = Date.now();

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("not authenticated") ||
      message.includes("not authorized")
    ) {
      return {
        type: "auth",
        message: error.message,
        timestamp,
      };
    }

    if (message.includes("validation") || message.includes("invalid")) {
      return {
        type: "validation",
        message: error.message,
        timestamp,
      };
    }

    if (message.includes("quota") || message.includes("storage")) {
      return {
        type: "localStorage",
        message: error.message,
        timestamp,
      };
    }

    // Default to network error
    return {
      type: "network",
      message: error.message,
      timestamp,
    };
  }

  return {
    type: "network",
    message: String(error),
    timestamp,
  };
}

/**
 * Format relative time for "last saved" display
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 5000) {
    return "just now";
  }

  if (diff < 60000) {
    const seconds = Math.floor(diff / 1000);
    return `${seconds}s ago`;
  }

  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }

  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  const days = Math.floor(diff / 86400000);
  return `${days}d ago`;
}
