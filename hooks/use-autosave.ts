"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { saveCanvasState as saveCanvasStateRequest } from "@/lib/api/mutations";
import { useCanvasState } from "@/lib/api/hooks";
import { useCanvasContext } from "@/contexts/CanvasContext";
import {
  serializeCanvasState,
  deserializeCanvasState,
  saveToLocalStorage,
  loadRawFromLocalStorage,
  clearOldLocalStorageData,
  type CanvasProjectData,
} from "@/lib/canvas/persistence";
import {
  resolveConflict,
  deriveSaveStatus,
  calculateBackoffDelay,
  isRetryableError,
  classifyError,
  DEBOUNCE_CONFIG,
  RETRY_CONFIG,
  type SaveStatus,
  type AutosaveError,
} from "@/lib/canvas/autosave-utils";
import type * as Y from "yjs";
import { isDocEmpty } from "@/lib/realtime/canvas-doc";

export interface UseAutosaveOptions {
  localDebounceMs?: number;
  cloudDebounceMs?: number;
  maxRetries?: number;
  /** When false (viewer role), persist locally but never push to the cloud. */
  canEdit?: boolean;
  /**
   * The live collaboration doc (or null when realtime is off). When this doc
   * already holds shapes at load time it is authoritative, and the persisted
   * blob is NOT loaded — this prevents a stale snapshot from clobbering a peer's
   * live state (which the doc-sync bridge would then re-broadcast as deletions).
   */
  doc?: Y.Doc | null;
}

export interface UseAutosaveReturn {
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  isLoading: boolean;
  error: AutosaveError | null;
  forceSave: () => Promise<void>;
  clearLocalData: () => void;
}

export function useAutosave(
  projectId: string,
  options: UseAutosaveOptions = {}
): UseAutosaveReturn {
  const {
    localDebounceMs = DEBOUNCE_CONFIG.localSaveMs,
    cloudDebounceMs = DEBOUNCE_CONFIG.cloudSyncMs,
    maxRetries = RETRY_CONFIG.maxRetries,
    canEdit = true,
    doc = null,
  } = options;

  const { viewport, dispatchViewport, shapes, dispatchShapes } =
    useCanvasContext();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<AutosaveError | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Refs for debouncing and retry
  const localSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cloudSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDoneRef = useRef(false);
  const pendingCloudSyncRef = useRef(false);
  // The last server-acked lastModified. Local saves stamp max(now, this+1) so a
  // device whose clock lags can't write an edit that reads older than the cloud
  // and get it discarded on reload. Seeded from the cloud state at load and
  // advanced on every successful cloud sync (the server returns its stamp).
  const lastServerTsRef = useRef(0);
  const nextLocalTs = useCallback(
    () => Math.max(Date.now(), lastServerTsRef.current + 1),
    []
  );
  // Live handle to the collab doc, read inside the one-shot load effect without
  // making the doc a dependency of that effect.
  const docRef = useRef(doc);
  docRef.current = doc;

  // Flush pending changes immediately — used on unmount / tab-hide so a debounced
  // save isn't lost when leaving within the debounce window. Reassigned each
  // render so it captures the latest state (not a stale closure).
  const flushRef = useRef<() => void>(() => {});
  flushRef.current = () => {
    // Only flush real post-load changes; never write a pre-load empty/stale state
    // (the clobber guarded against in the load effect).
    if (!initialLoadDoneRef.current || !isDirty) return;

    // localStorage is synchronous and survives both unmount and tab close.
    const ts = nextLocalTs();
    saveToLocalStorage(projectId, viewport, shapes, ts);

    // Best-effort cloud flush (fire-and-forget; no setState, so it's safe after
    // unmount). Completes normally on client-side nav; on a hard tab close it may
    // be cut off, but localStorage already holds the state for the next open.
    if (canEdit && !isOffline) {
      const data = serializeCanvasState(viewport, shapes, ts);
      void saveCanvasStateRequest({
        projectId,
        canvasData: {
          viewport: data.viewport,
          shapes: data.shapes,
          tool: data.tool,
          selected: data.selected,
          frameCounter: data.frameCounter,
          version: data.version,
          lastModified: data.lastModified,
        },
      }).catch(() => {});
    }
  };

  // One-shot load of cloud canvas state (SWR: `undefined` while loading, then
  // the state object or `null`). The cloud save is a request to our API.
  const { data: cloudState } = useCanvasState(projectId);

  // Derive save status
  const saveStatus = deriveSaveStatus(isDirty, isSyncing, !!error, isOffline);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Trigger sync if there are pending changes
      if (pendingCloudSyncRef.current) {
        syncToCloud();
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial status
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync to cloud with retry logic
  const syncToCloud = useCallback(async () => {
    // Viewers have read-only access — saving would 403. Local persistence still
    // runs so their view survives a refresh; it just never reaches the cloud.
    if (!canEdit) {
      setIsDirty(false);
      return;
    }
    if (isOffline) {
      pendingCloudSyncRef.current = true;
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const data = serializeCanvasState(viewport, shapes, nextLocalTs());

      const result = await saveCanvasStateRequest({
        projectId,
        canvasData: {
          viewport: data.viewport,
          shapes: data.shapes,
          tool: data.tool,
          selected: data.selected,
          frameCounter: data.frameCounter,
          version: data.version,
          lastModified: data.lastModified,
        },
      });

      // Success — adopt the server's authoritative timestamp as our baseline so
      // subsequent local saves stay monotonic against the cloud.
      const serverTs = result?.lastModified ?? data.lastModified;
      lastServerTsRef.current = Math.max(lastServerTsRef.current, serverTs);
      setLastSavedAt(serverTs);
      setIsDirty(false);
      setError(null);
      retryCountRef.current = 0;
      pendingCloudSyncRef.current = false;

      pendo.track("canvas_state_saved", {
        project_id: projectId,
        shapes_count: data.shapes.ids.length,
        canvas_version: data.version,
      });
    } catch (err) {
      console.error("Cloud sync failed:", err);

      if (isRetryableError(err) && retryCountRef.current < maxRetries) {
        // Schedule retry with exponential backoff
        const delay = calculateBackoffDelay(retryCountRef.current);
        retryCountRef.current++;

        retryTimeoutRef.current = setTimeout(() => {
          syncToCloud();
        }, delay);
      } else {
        // Max retries reached or non-retryable error
        const classifiedError = classifyError(err);
        setError(classifiedError);
        pendingCloudSyncRef.current = true;

        // If auth error, don't mark as offline
        if (classifiedError.type !== "auth") {
          setIsOffline(true);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [viewport, shapes, projectId, isOffline, maxRetries, canEdit, nextLocalTs]);

  // Save to localStorage (debounced)
  const saveToLocal = useCallback(() => {
    const ts = nextLocalTs();
    const result = saveToLocalStorage(projectId, viewport, shapes, ts);

    if (!result.success) {
      if (result.error === "quota_exceeded") {
        // Try to clear old data and retry
        clearOldLocalStorageData(5);
        const retryResult = saveToLocalStorage(projectId, viewport, shapes, ts);
        if (!retryResult.success) {
          setError({
            type: "localStorage",
            message:
              "Storage quota exceeded. Some data may not be saved locally.",
            timestamp: Date.now(),
          });
        }
      }
    }

    // Mark as dirty (needs cloud sync)
    setIsDirty(true);
  }, [projectId, viewport, shapes, nextLocalTs]);

  // Debounced local save effect
  useEffect(() => {
    // Skip during initial load
    if (!initialLoadDoneRef.current) return;

    // Clear existing timeout
    if (localSaveTimeoutRef.current) {
      clearTimeout(localSaveTimeoutRef.current);
    }

    // Schedule new save
    localSaveTimeoutRef.current = setTimeout(() => {
      saveToLocal();
    }, localDebounceMs);

    return () => {
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current);
      }
    };
  }, [viewport, shapes, localDebounceMs, saveToLocal]);

  // Debounced cloud sync effect (triggered after local save)
  useEffect(() => {
    // Skip during initial load or if not dirty
    if (!initialLoadDoneRef.current || !isDirty) return;

    // Clear existing timeout
    if (cloudSyncTimeoutRef.current) {
      clearTimeout(cloudSyncTimeoutRef.current);
    }

    // Schedule cloud sync
    cloudSyncTimeoutRef.current = setTimeout(() => {
      syncToCloud();
    }, cloudDebounceMs);

    return () => {
      if (cloudSyncTimeoutRef.current) {
        clearTimeout(cloudSyncTimeoutRef.current);
      }
    };
  }, [isDirty, cloudDebounceMs, syncToCloud]);

  // Initial load effect - resolve conflict between local and cloud
  useEffect(() => {
    // Wait for cloud query to complete
    if (cloudState === undefined) return;
    if (initialLoadDoneRef.current) return;

    const loadInitialState = () => {
      // Collab guard: if the shared doc already holds shapes, a peer's live
      // state was adopted into the reducer before our persisted blob resolved.
      // The doc is authoritative now — loading the (possibly stale) blob would
      // wholesale-replace those live shapes, and the doc-sync bridge would then
      // diff the shrink and broadcast it as deletions, wiping the canvas for
      // everyone. Skip the restore; the adopted state already populated state.
      if (docRef.current && !isDocEmpty(docRef.current)) {
        initialLoadDoneRef.current = true;
        setIsLoading(false);
        return;
      }

      const localData = loadRawFromLocalStorage(projectId);

      // Convert cloud state to CanvasProjectData format
      const cloudData: CanvasProjectData | null = cloudState
        ? {
            viewport: cloudState.viewport,
            shapes: cloudState.shapes as CanvasProjectData["shapes"],
            tool: cloudState.tool as CanvasProjectData["tool"],
            selected: cloudState.selected as CanvasProjectData["selected"],
            frameCounter: cloudState.frameCounter,
            version: cloudState.version,
            lastModified: cloudState.lastModified,
          }
        : null;

      // Seed the monotonic baseline from the cloud's authoritative timestamp so
      // the first local edits this session stamp above it (never below).
      if (cloudData) {
        lastServerTsRef.current = Math.max(
          lastServerTsRef.current,
          cloudData.lastModified
        );
      }

      // Resolve conflict
      const resolvedData = resolveConflict(localData, cloudData);

      if (resolvedData) {
        const deserialized = deserializeCanvasState(resolvedData);

        // Restore viewport
        dispatchViewport({
          type: "RESTORE_VIEWPORT",
          payload: deserialized.viewport,
        });

        // Restore shapes
        dispatchShapes({
          type: "LOAD_PROJECT",
          payload: {
            shapes: deserialized.shapes,
            tool: deserialized.tool,
            selected: deserialized.selected,
            frameCounter: deserialized.frameCounter,
            history: deserialized.history,
            historyPointer: deserialized.historyPointer,
          },
        });

        setLastSavedAt(resolvedData.lastModified);

        // If local was newer, queue cloud sync
        if (
          localData &&
          (!cloudData || localData.lastModified > cloudData.lastModified)
        ) {
          setIsDirty(true);
        }
      }

      initialLoadDoneRef.current = true;
      setIsLoading(false);
    };

    loadInitialState();
  }, [cloudState, projectId, dispatchViewport, dispatchShapes]);

  // Beforeunload warning + pagehide flush
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    // pagehide fires on tab close / refresh / bfcache — flush pending changes
    // (localStorage synchronously; cloud best-effort) so they aren't lost.
    const handlePageHide = () => flushRef.current();

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [isDirty]);

  // Cleanup on unmount — flush pending changes (covers client-side navigation,
  // which fires no pagehide) before tearing down the debounce timers.
  useEffect(() => {
    return () => {
      flushRef.current();
      if (localSaveTimeoutRef.current)
        clearTimeout(localSaveTimeoutRef.current);
      if (cloudSyncTimeoutRef.current)
        clearTimeout(cloudSyncTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Force save function
  const forceSave = useCallback(async () => {
    saveToLocal();
    await syncToCloud();
  }, [saveToLocal, syncToCloud]);

  // Clear local data function
  const clearLocalData = useCallback(() => {
    localStorage.removeItem(`canvas-project-${projectId}`);
  }, [projectId]);

  return {
    saveStatus,
    lastSavedAt,
    isLoading,
    error,
    forceSave,
    clearLocalData,
  };
}
