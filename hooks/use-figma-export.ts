"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "Copy to Figma" for a generated screen — no Figma plugin required.
 *
 * The rendered UI lives in a cross-origin E2B iframe, so the conversion has to
 * run *inside* that iframe (the parent can't read its DOM). We postMessage the
 * sandbox's bridge (sandbox-templates/nextjs/instrumentation-client.ts), which
 * uses Figit to serialize the DOM into Figma's native clipboard payload and
 * sends back the `text/html` string. We then write it to the clipboard so a
 * plain ⌘V in Figma reconstructs editable layers.
 *
 * Keep these message types in sync with the sandbox bridge.
 */
const REQUEST = "opencraft/figma-export-request";
const RESPONSE = "opencraft/figma-export-response";

// Generous: the bridge waits for fonts/images to settle (~up to 3s) and bounds
// each font/image fetch (~5–6s) before converting, so allow real headroom.
const SERIALIZE_TIMEOUT_MS = 30_000;

export type FigmaExportState =
  | "idle"
  | "preparing"
  | "ready"
  | "copying"
  | "copied"
  | "error";

function findSandboxWindow(sandboxId: string): Window | null {
  const iframe = document.querySelector<HTMLIFrameElement>(
    `iframe[data-sandbox-id="${CSS.escape(sandboxId)}"]`
  );
  return iframe?.contentWindow ?? null;
}

/** A serialized payload. `degraded` = some subtrees were skipped/simplified. */
type SerializeResult = { html: string; degraded: boolean };

export function useFigmaExport(sandboxId?: string) {
  const [state, setState] = useState<FigmaExportState>("idle");
  // Cached payload from a prefetch (e.g. on hover) so the click can write
  // instantly inside the user gesture.
  const cacheRef = useRef<SerializeResult | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // A new sandbox invalidates any cached payload.
    cacheRef.current = null;
    setState("idle");
  }, [sandboxId]);

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    []
  );

  const requestSerialize = useCallback((): Promise<SerializeResult> => {
    return new Promise<SerializeResult>((resolve, reject) => {
      if (!sandboxId) {
        reject(new Error("No sandbox for this screen yet"));
        return;
      }
      const target = findSandboxWindow(sandboxId);
      if (!target) {
        reject(new Error("Preview isn't loaded yet — open the screen first"));
        return;
      }

      const requestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Math.round(performance.now())) + Math.random();

      const timer = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("Timed out converting the preview"));
      }, SERIALIZE_TIMEOUT_MS);

      function onMessage(event: MessageEvent) {
        const data = event.data;
        if (
          !data ||
          data.type !== RESPONSE ||
          data.requestId !== requestId
        ) {
          return;
        }
        window.removeEventListener("message", onMessage);
        clearTimeout(timer);
        if (data.ok && typeof data.html === "string") {
          resolve({ html: data.html, degraded: Boolean(data.degraded) });
        } else {
          reject(new Error(data.error || "Couldn't convert this screen"));
        }
      }

      window.addEventListener("message", onMessage);
      target.postMessage({ type: REQUEST, requestId }, "*");
    });
  }, [sandboxId]);

  /** Prefetch the payload (call on hover/focus) so copy() is instant. */
  const prepare = useCallback(async () => {
    if (!sandboxId || cacheRef.current || state === "preparing") return;
    try {
      setState("preparing");
      cacheRef.current = await requestSerialize();
      setState("ready");
    } catch {
      // Stay quiet on prefetch failures — copy() surfaces the real error.
      cacheRef.current = null;
      setState("idle");
    }
  }, [sandboxId, state, requestSerialize]);

  const copy = useCallback(async () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setState("copying");
    try {
      // Resolve the payload as a Promise<Blob> so the async iframe round-trip
      // can complete *within* the clipboard write — Safari and Chromium accept
      // a pending value for a ClipboardItem when it's started in a user gesture.
      const dataPromise: Promise<SerializeResult> = cacheRef.current
        ? Promise.resolve(cacheRef.current)
        : requestSerialize();
      const blobPromise = dataPromise.then(
        (data) => new Blob([data.html], { type: "text/html" })
      );

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "text/html": blobPromise }),
        ]);
      } catch {
        // Fallback for engines that reject a pending ClipboardItem value:
        // resolve first (fast when prefetched), then write the concrete blob.
        const blob = await blobPromise;
        await navigator.clipboard.write([
          new ClipboardItem({ "text/html": blob }),
        ]);
      }

      const { degraded } = await dataPromise;
      cacheRef.current = null;
      setState("copied");
      resetTimerRef.current = setTimeout(() => setState("idle"), 2_000);
      return degraded;
    } catch (error) {
      setState("error");
      resetTimerRef.current = setTimeout(() => setState("idle"), 2_500);
      throw error;
    }
  }, [requestSerialize]);

  return { state, prepare, copy };
}
