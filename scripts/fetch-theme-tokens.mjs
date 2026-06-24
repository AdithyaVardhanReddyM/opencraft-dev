// Fetches the full token set for every preset design system from tweakcn and
// bakes it into lib/canvas/theme-tokens.ts for in-app PREVIEWS.
//
// Run once (or whenever presets change):  node scripts/fetch-theme-tokens.mjs
//
// The shadcn install command in lib/canvas/theme-utils.ts remains the source of
// truth for what gets installed into sandboxes. This data is preview-only.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "lib", "canvas", "theme-tokens.ts");

// Non-default preset ids. Keep in sync with THEMES in lib/canvas/theme-utils.ts.
// "default" is handled locally below — it isn't hosted on tweakcn.
const THEME_IDS = [
  "claude",
  "amber-minimal",
  "amethyst-haze",
  "bold-tech",
  "bubblegum",
  "caffeine",
  "candyland",
  "catppuccin",
  "claymorphism",
  "clean-slate",
  "cyberpunk",
  "neo-brutalism",
  "supabase",
  "t3-chat",
  "twitter",
  "vercel",
];

// The "default" preset mirrors DEFAULT_GLOBALS_CSS in lib/canvas/theme-utils.ts
// (the CSS actually written to sandboxes for the default theme), so the preview
// stays truthful to install behavior. Fonts use concrete families so the preview
// renders even though the sandbox aliases them to --font-geist-*.
const DEFAULT_TOKENS = {
  theme: {
    "font-sans": "Geist, ui-sans-serif, system-ui, sans-serif",
    "font-serif": "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
    "font-mono":
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    radius: "0.625rem",
  },
  light: {
    radius: "0.625rem",
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.145 0 0)",
    primary: "oklch(0.205 0 0)",
    "primary-foreground": "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    "secondary-foreground": "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.556 0 0)",
    accent: "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    destructive: "oklch(0.577 0.245 27.325)",
    "destructive-foreground": "oklch(0.985 0 0)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.708 0 0)",
    "chart-1": "oklch(0.646 0.222 41.116)",
    "chart-2": "oklch(0.6 0.118 184.704)",
    "chart-3": "oklch(0.398 0.07 227.392)",
    "chart-4": "oklch(0.828 0.189 84.429)",
    "chart-5": "oklch(0.769 0.188 70.08)",
    sidebar: "oklch(0.985 0 0)",
    "sidebar-foreground": "oklch(0.145 0 0)",
    "sidebar-primary": "oklch(0.205 0 0)",
    "sidebar-primary-foreground": "oklch(0.985 0 0)",
    "sidebar-accent": "oklch(0.97 0 0)",
    "sidebar-accent-foreground": "oklch(0.205 0 0)",
    "sidebar-border": "oklch(0.922 0 0)",
    "sidebar-ring": "oklch(0.708 0 0)",
  },
  dark: {
    radius: "0.625rem",
    background: "oklch(0.145 0 0)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.205 0 0)",
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.205 0 0)",
    "popover-foreground": "oklch(0.985 0 0)",
    primary: "oklch(0.922 0 0)",
    "primary-foreground": "oklch(0.205 0 0)",
    secondary: "oklch(0.269 0 0)",
    "secondary-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.269 0 0)",
    "muted-foreground": "oklch(0.708 0 0)",
    accent: "oklch(0.269 0 0)",
    "accent-foreground": "oklch(0.985 0 0)",
    destructive: "oklch(0.704 0.191 22.216)",
    "destructive-foreground": "oklch(0.985 0 0)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
    ring: "oklch(0.556 0 0)",
    "chart-1": "oklch(0.488 0.243 264.376)",
    "chart-2": "oklch(0.696 0.17 162.48)",
    "chart-3": "oklch(0.769 0.188 70.08)",
    "chart-4": "oklch(0.627 0.265 303.9)",
    "chart-5": "oklch(0.645 0.246 16.439)",
    sidebar: "oklch(0.205 0 0)",
    "sidebar-foreground": "oklch(0.985 0 0)",
    "sidebar-primary": "oklch(0.488 0.243 264.376)",
    "sidebar-primary-foreground": "oklch(0.985 0 0)",
    "sidebar-accent": "oklch(0.269 0 0)",
    "sidebar-accent-foreground": "oklch(0.985 0 0)",
    "sidebar-border": "oklch(1 0 0 / 10%)",
    "sidebar-ring": "oklch(0.556 0 0)",
  },
};

async function fetchTheme(id) {
  const url = `https://tweakcn.com/r/themes/${id}.json`;
  const res = await fetch(url, {
    headers: { "user-agent": "opencraft-theme-fetch" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const cssVars = json.cssVars ?? {};
  return {
    theme: cssVars.theme ?? {},
    light: cssVars.light ?? {},
    dark: cssVars.dark ?? {},
  };
}

const tokens = { default: DEFAULT_TOKENS };

for (const id of THEME_IDS) {
  try {
    tokens[id] = await fetchTheme(id);
    console.log(`✓ ${id}`);
  } catch (err) {
    console.warn(`✗ ${id}: ${err.message} (skipped)`);
  }
}

const file = `// AUTO-GENERATED by scripts/fetch-theme-tokens.mjs — do not edit by hand.
// Run \`node scripts/fetch-theme-tokens.mjs\` to refresh.
//
// Full design-system token data for in-app PREVIEWS only. The shadcn install
// command in lib/canvas/theme-utils.ts is the source of truth for sandboxes.
// Source: https://tweakcn.com/r/themes/<id>.json

export type ThemeTokens = {
  /** Font families, radius, tracking. */
  theme: Record<string, string>;
  /** Full light-mode token set (colors, radius, shadows, spacing). */
  light: Record<string, string>;
  /** Full dark-mode token set. */
  dark: Record<string, string>;
};

export const THEME_TOKENS: Record<string, ThemeTokens> = ${JSON.stringify(
  tokens,
  null,
  2
)};

export function getThemeTokens(id: string): ThemeTokens | undefined {
  return THEME_TOKENS[id];
}
`;

await writeFile(OUT, file, "utf8");
console.log(
  `\nWrote ${Object.keys(tokens).length} themes -> ${OUT}`
);
