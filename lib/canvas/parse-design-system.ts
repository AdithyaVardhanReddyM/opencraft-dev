import { getThemeTokens, type ThemeTokens } from "./theme-tokens";
import { COLOR_KEYS } from "./build-globals-css";

/**
 * Parse a user's pasted design-system input into a complete ThemeTokens set.
 * Pure + client-side (no secrets). Handles, in priority order:
 *   1. shadcn CSS  — `:root { --primary: … }` / `.dark { … }` (most robust; what
 *      tweakcn exports and what most pastes will be). Bare `--x: y` lists too.
 *   2. tweakcn registry JSON — `{ cssVars: { theme, light, dark } }`.
 *   3. Tailwind config — best-effort color/radius extraction (weakest path).
 * Missing tokens are filled from the default theme so the result is always a
 * complete, previewable, build-safe system; `warnings` explains what was filled.
 */

export interface ParseSuccess {
  tokens: ThemeTokens;
  warnings: string[];
}
export interface ParseFailure {
  error: string;
}
export type ParseResult = ParseSuccess | ParseFailure;

export function isParseError(r: ParseResult): r is ParseFailure {
  return "error" in r;
}

// Shared (non-color) keys we promote into `tokens.theme` so the preview's
// typography / spacing sections reflect them.
const SHARED_THEME_KEYS = ["font-sans", "font-serif", "font-mono", "radius"];

// Common Tailwind color-name → shadcn token mappings (best-effort).
const TAILWIND_NAME_MAP: Record<string, string> = {
  background: "background",
  bg: "background",
  foreground: "foreground",
  fg: "foreground",
  text: "foreground",
  primary: "primary",
  secondary: "secondary",
  accent: "accent",
  muted: "muted",
  destructive: "destructive",
  border: "border",
  input: "input",
  ring: "ring",
  card: "card",
  popover: "popover",
};

function cloneDefaultTokens(): ThemeTokens {
  const base = getThemeTokens("default");
  // Deep clone so callers never mutate the shared generated THEME_TOKENS object.
  return base
    ? (JSON.parse(JSON.stringify(base)) as ThemeTokens)
    : { theme: {}, light: {}, dark: {} };
}

/** Match every `--key: value;` declaration in a CSS block. */
function parseVarBlock(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /--([\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) out[m[1].trim()] = m[2].trim();
  return out;
}

/** Extract the body of the first flat `selector { … }` block (no nested braces). */
function extractBlock(css: string, selector: string): string | null {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(esc + "\\s*\\{([^}]*)\\}"));
  return m ? m[1] : null;
}

/** tweakcn-style derived tracking scale from a base tracking-normal value. */
function deriveTracking(): Record<string, string> {
  return {
    "tracking-tighter": "calc(var(--tracking-normal) - 0.05em)",
    "tracking-tight": "calc(var(--tracking-normal) - 0.025em)",
    "tracking-wide": "calc(var(--tracking-normal) + 0.025em)",
    "tracking-wider": "calc(var(--tracking-normal) + 0.05em)",
    "tracking-widest": "calc(var(--tracking-normal) + 0.1em)",
  };
}

/** Merge parsed vars over the default token set → a complete ThemeTokens. */
function buildTokens(
  themeVars: Record<string, string>,
  lightVars: Record<string, string>,
  darkVars: Record<string, string>
): ParseSuccess {
  const base = cloneDefaultTokens();
  const warnings: string[] = [];

  const theme = { ...base.theme, ...themeVars };
  for (const k of SHARED_THEME_KEYS) if (lightVars[k]) theme[k] = lightVars[k];
  if (lightVars["tracking-normal"]) Object.assign(theme, deriveTracking());

  const light = { ...base.light, ...themeVars, ...lightVars };

  let dark: Record<string, string>;
  if (Object.keys(darkVars).length > 0) {
    dark = { ...base.dark, ...themeVars, ...darkVars };
  } else {
    dark = { ...light };
    warnings.push(
      "No dark-mode block found — copied the light values into dark. Adjust them under the Dark tab."
    );
  }

  const provided = COLOR_KEYS.filter(
    (k) => k in lightVars || k in darkVars
  ).length;
  if (provided > 0 && provided < COLOR_KEYS.length) {
    warnings.push(
      `Filled ${COLOR_KEYS.length - provided} missing color token(s) from the default theme.`
    );
  }
  return { tokens: { theme, light, dark }, warnings };
}

function tryShadcnCss(css: string): ParseSuccess | null {
  const rootBlock = extractBlock(css, ":root");
  const darkBlock = extractBlock(css, ".dark");
  let lightVars: Record<string, string>;
  if (rootBlock || darkBlock) {
    lightVars = rootBlock ? parseVarBlock(rootBlock) : {};
  } else if (/--[\w-]+\s*:/.test(css)) {
    lightVars = parseVarBlock(css); // bare variable list, no selector wrapper
  } else {
    return null;
  }
  const darkVars = darkBlock ? parseVarBlock(darkBlock) : {};
  if (!Object.keys(lightVars).length && !Object.keys(darkVars).length) {
    return null;
  }
  return buildTokens({}, lightVars, darkVars);
}

function tryTweakcnJson(raw: string): ParseSuccess | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const cssVars = (data as { cssVars?: Record<string, Record<string, string>> })
    ?.cssVars;
  if (!cssVars || typeof cssVars !== "object") return null;
  return buildTokens(
    cssVars.theme ?? {},
    cssVars.light ?? {},
    cssVars.dark ?? {}
  );
}

function tryTailwind(raw: string): ParseResult | null {
  if (!/tailwind|module\.exports|export\s+default|theme\s*:/.test(raw)) {
    return null;
  }
  const colorLike =
    /([a-zA-Z][\w-]*)\s*:\s*["'`]?(#[0-9a-fA-F]{3,8}|oklch\([^)'"`]+\)|hsla?\([^)'"`]+\)|rgba?\([^)'"`]+\))["'`]?/g;
  const found: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = colorLike.exec(raw))) {
    const mapped = TAILWIND_NAME_MAP[m[1].toLowerCase()];
    if (mapped && !found[mapped]) found[mapped] = m[2];
  }
  const themeVars: Record<string, string> = {};
  const radiusMatch = raw.match(
    /(?:borderRadius|radius)[\s\S]{0,60}?(\d*\.?\d+rem|\d+px)/
  );
  if (radiusMatch) themeVars["radius"] = radiusMatch[1];

  if (Object.keys(found).length === 0) {
    return {
      error:
        "Couldn't read a color palette from that Tailwind config. Paste your shadcn CSS variables (the :root / .dark blocks) instead.",
    };
  }
  return buildTokens(themeVars, found, {});
}

export function parseDesignSystemInput(raw: string): ParseResult {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { error: "Paste CSS variables or a config to import." };

  // tweakcn JSON (when it clearly looks like JSON)
  if (trimmed.startsWith("{")) {
    const r = tryTweakcnJson(trimmed);
    if (r) return r;
  }
  // shadcn CSS (the dominant case)
  if (/:root|\.dark|--[\w-]+\s*:/.test(trimmed)) {
    const r = tryShadcnCss(trimmed);
    if (r) return r;
  }
  // tweakcn JSON fallback (not leading with `{`)
  const json = tryTweakcnJson(trimmed);
  if (json) return json;
  // Tailwind config (weakest)
  const tw = tryTailwind(trimmed);
  if (tw) return tw;

  return {
    error:
      "Unrecognized format. Paste shadcn CSS variables (:root { --primary: … }), a tweakcn theme JSON, or a Tailwind config.",
  };
}
