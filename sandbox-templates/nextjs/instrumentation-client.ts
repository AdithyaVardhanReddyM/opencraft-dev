/**
 * OpenCraft → Figma export bridge (runs INSIDE the E2B preview sandbox).
 *
 * Next.js 15.3 executes this file on the client for every route, so the listener
 * is present on whatever page the canvas iframe is showing — without the AI
 * agent's generated `app/` code ever needing to know about it. (This is why we
 * inject here instead of in `app/layout.tsx`, which the agent may overwrite.)
 *
 * When the parent canvas posts a REQUEST message, we lazily load Figit
 * (@figit/dom-to-figma), serialize the rendered DOM into Figma's native
 * clipboard payload (figmeta + fig-kiwi, wrapped as text/html) and post the HTML
 * string back. The parent writes that to the clipboard inside the user's click
 * gesture, so a plain ⌘V in Figma rebuilds editable layers — no Figma plugin.
 *
 * Safe for the running app: Figit only READS layout + computed styles; it does
 * not mutate the page, write files, or leave anything behind between requests.
 */

// Keep these two strings byte-for-byte in sync with hooks/use-figma-export.ts.
const REQUEST = "opencraft/figma-export-request";
const RESPONSE = "opencraft/figma-export-response";

interface ExportRequest {
  type: typeof REQUEST;
  requestId: string;
  /** Optional CSS selector for the export root; defaults to <body>. */
  selector?: string;
}

function isExportRequest(value: unknown): value is ExportRequest {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.type === REQUEST && typeof v.requestId === "string";
}

// Minimal shape of the bits of @figit/dom-to-figma we use (the package ships
// full types, but it isn't installed in the *main* app's tsconfig program).
interface FigitImageFile {
  bytes: ArrayBuffer;
  mimeType: string;
}
type FigitImageLoader = (req: {
  src: string;
  element: HTMLImageElement;
}) => Promise<FigitImageFile>;
type FigitFontRequest = {
  family: string;
  weight: number;
  [key: string]: unknown;
};
type FigitFontLoader = (req: FigitFontRequest) => Promise<unknown>;
// A single nested frame (full-fidelity path) …
type FigitSingleFrame = {
  element: Element;
  width: number;
  height: number;
  name?: string;
};
// … or many positioned frames assembled onto one canvas (degrade path).
type FigitFrame = {
  element: Element;
  width: number;
  height: number;
  x: number;
  y: number;
  name: string;
};
type FigitCanvas = { frames: ReadonlyArray<FigitFrame>; canvasName?: string };
interface FigitConverter {
  convert(
    input: FigitSingleFrame | FigitCanvas
  ): Promise<{ toClipboardHtml(): string }>;
}
interface FigitModule {
  createFigmaConverter(config?: {
    imageLoader?: FigitImageLoader;
    fontLoader?: FigitFontLoader;
  }): FigitConverter;
  createFontsourceLoader(options?: {
    subset?: string;
    fallbackFamily?: string | null;
  }): FigitFontLoader;
}

async function loadFigit(): Promise<FigitModule> {
  // Literal specifier so Turbopack code-splits it into its own chunk; the chunk
  // is only fetched the first time someone clicks "Copy to Figma".
  // @ts-ignore - @figit/dom-to-figma is installed in the sandbox; its types are
  // resolved at runtime, not during the agent's tsc validation.
  return import("@figit/dom-to-figma");
}

// 1×1 transparent PNG. Figit's default image loader does a direct fetch(src)
// and THROWS on a cross-origin image without permissive CORS — which would fail
// the entire copy. This loader degrades a single unreachable image to a blank
// pixel so the rest of the screen still converts.
const TRANSPARENT_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
function fallbackPngBytes(): ArrayBuffer {
  const bin = atob(TRANSPARENT_PNG);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
// Per-image hard timeout: without it, one hung request (slow CDN, a host that
// never responds) would stall the whole conversion until the parent's timeout.
// We abort at 6s and fall back to the blank pixel.
const IMAGE_FETCH_TIMEOUT_MS = 6000;
const resilientImageLoader: FigitImageLoader = async ({ src }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(src, { mode: "cors", signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return {
      bytes: await res.arrayBuffer(),
      mimeType: res.headers.get("content-type") || "image/png",
    };
  } catch {
    return { bytes: fallbackPngBytes(), mimeType: "image/png" };
  } finally {
    clearTimeout(timer);
  }
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Convert only once the layout is *settled*. Snapshotting mid-load is the single
 * biggest source of "styles slightly off" — unfinished web fonts give wrong text
 * metrics and undecoded images report 0×0 boxes, so every measured rect (and
 * thus every centered element) shifts.
 */
async function waitForStableLayout(timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  // Web fonts: wrong glyph metrics here cascade into mis-sized/decentered text.
  try {
    await Promise.race([document.fonts.ready, delay(timeoutMs)]);
  } catch {
    /* document.fonts unsupported — ignore */
  }

  // Images: an in-flight decode measures as 0×0 and collapses its container.
  const pending = Array.from(document.images).filter((img) => !img.complete);
  if (pending.length) {
    await Promise.race([
      Promise.all(
        pending.map(
          (img) =>
            new Promise<void>((res) => {
              img.addEventListener("load", () => res(), { once: true });
              img.addEventListener("error", () => res(), { once: true });
            })
        )
      ),
      delay(Math.max(0, deadline - Date.now())),
    ]);
  }

  // Two frames so any font/image-driven reflow has painted before we measure.
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r()))
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(label)), ms)
    ),
  ]);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 2,
  backoffMs = 250
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) await delay(backoffMs);
    }
  }
  throw lastError;
}

// Wrap Figit's fontsource loader: bound each fetch and fall back to Inter
// metrics if the real font is unreachable, so a flaky font CDN degrades to a
// slightly-off glyph width instead of a stalled copy or a dropped text node.
function makeResilientFontLoader(figit: FigitModule): FigitFontLoader {
  const base = figit.createFontsourceLoader({ fallbackFamily: "Inter" });
  return async (req) => {
    try {
      return await withTimeout(base(req), 5000, "font load timed out");
    } catch {
      return withTimeout(
        base({ ...req, family: "Inter" }),
        5000,
        "font load timed out"
      );
    }
  };
}

// One converter instance, reused across copies so its font/image caches persist
// (repeat copies of the same screen are far faster). Built lazily on first use;
// a failed load isn't cached, so the next attempt retries the dynamic import.
let converterPromise: Promise<FigitConverter> | null = null;
function getConverter(): Promise<FigitConverter> {
  if (!converterPromise) {
    converterPromise = loadFigit()
      .then((figit) =>
        figit.createFigmaConverter({
          imageLoader: resilientImageLoader,
          fontLoader: makeResilientFontLoader(figit),
        })
      )
      .catch((error) => {
        converterPromise = null;
        throw error;
      });
  }
  return converterPromise;
}

// Single-flight: two quick clicks (or a hover-prefetch racing the click) must
// not run Figit twice in parallel and thrash the shared caches.
let conversionChain: Promise<unknown> = Promise.resolve();
function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = conversionChain.then(task, task);
  conversionChain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

const screenName = () => document.title || "OpenCraft screen";

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  const style = getComputedStyle(el);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

/**
 * Greedily collect the largest convertible subtrees: try a node whole; if Figit
 * throws on it, descend and try each visible child instead. A node that
 * converts is kept and NOT descended into (so frames never overlap), so one
 * broken element costs only its own subtree — everything else still copies.
 * Bounded by a test budget and a wall-clock deadline so a huge page can't run
 * past the parent's timeout.
 */
async function collectConvertibleFrames(
  converter: FigitConverter,
  node: Element,
  rootRect: DOMRect,
  budget: { tests: number; deadline: number },
  depth: number
): Promise<FigitFrame[]> {
  if (budget.tests <= 0 || Date.now() > budget.deadline) return [];
  budget.tests -= 1;

  const rect = node.getBoundingClientRect();
  const frame: FigitFrame = {
    element: node,
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
    x: Math.round(rect.left - rootRect.left),
    y: Math.round(rect.top - rootRect.top),
    name: node.tagName.toLowerCase(),
  };

  try {
    await converter.convert({
      element: node,
      width: frame.width,
      height: frame.height,
      name: frame.name,
    });
    return [frame];
  } catch {
    if (depth <= 0) return [];
    const out: FigitFrame[] = [];
    for (const child of Array.from(node.children)) {
      if (!isVisible(child)) continue;
      out.push(
        ...(await collectConvertibleFrames(
          converter,
          child,
          rootRect,
          budget,
          depth - 1
        ))
      );
    }
    return out;
  }
}

/**
 * Convert with full fidelity when possible; otherwise copy whatever converts.
 * Never throws for partial content — only when literally nothing is convertible.
 */
async function convertBestEffort(
  converter: FigitConverter,
  element: HTMLElement,
  width: number,
  height: number
): Promise<{ html: string; degraded: boolean }> {
  // Fast path: the whole screen, fully nested, retried once on a transient blip.
  try {
    const result = await withRetry(() =>
      converter.convert({ element, width, height, name: screenName() })
    );
    return { html: result.toClipboardHtml(), degraded: false };
  } catch {
    // Degrade: assemble the convertible subtrees at their real positions.
    const rootRect = element.getBoundingClientRect();
    const frames = await collectConvertibleFrames(
      converter,
      element,
      rootRect,
      { tests: 60, deadline: Date.now() + 22000 },
      4
    );
    if (frames.length === 0) {
      throw new Error("This screen couldn't be converted");
    }
    const result = await converter.convert({
      frames,
      canvasName: screenName(),
    });
    return { html: result.toClipboardHtml(), degraded: true };
  }
}

async function serializeToFigmaHtml(
  selector?: string
): Promise<{ html: string; degraded: boolean }> {
  const element =
    (selector ? document.querySelector<HTMLElement>(selector) : null) ||
    document.querySelector<HTMLElement>("[data-figma-export-root]") ||
    document.body;

  await waitForStableLayout();

  if (element.childElementCount === 0) {
    throw new Error("Nothing to export on this screen yet");
  }

  // Frame width = the real CSS viewport the page laid out against. scrollWidth
  // inflates with horizontal overflow, which pushes centered content off-axis;
  // the rendered root width (or clientWidth) is what alignment is relative to.
  const rect = element.getBoundingClientRect();
  const width = Math.max(
    1,
    Math.round(rect.width || document.documentElement.clientWidth)
  );
  const height = Math.max(
    1,
    Math.round(element.scrollHeight || document.documentElement.scrollHeight)
  );

  const converter = await getConverter();
  // Single-flight so concurrent clicks don't run Figit (and the degrade walk)
  // in parallel and thrash the shared caches.
  return runExclusive(() => convertBestEffort(converter, element, width, height));
}

if (typeof window !== "undefined") {
  window.addEventListener("message", (event: MessageEvent) => {
    if (!isExportRequest(event.data)) return;
    const { requestId, selector } = event.data;

    const reply = (payload: Record<string, unknown>) => {
      // Reply only to the window that asked, scoped to its own origin.
      const source = event.source as Window | null;
      source?.postMessage(
        { type: RESPONSE, requestId, ...payload },
        event.origin || "*"
      );
    };

    serializeToFigmaHtml(selector)
      .then(({ html, degraded }) => reply({ ok: true, html, degraded }))
      .catch((error: unknown) =>
        reply({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      );
  });
}

export {};
