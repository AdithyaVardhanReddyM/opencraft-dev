import type { ThemeTokens } from "./theme-tokens";

/**
 * Build a complete `globals.css` from a design system's tokens — the same shape a
 * tweakcn preset produces once shadcn installs it, so a CUSTOM (command-less)
 * system renders identically. This is the apply mechanism for custom systems:
 * the string is written straight into the sandbox's `app/globals.css` by the
 * sandbox theme route (toolbar) and the Python `apply_theme` (fresh sandbox).
 * Presets keep their remote `npx shadcn add …` command and never come through here.
 *
 * Mirrors lib/canvas/theme-utils.ts:DEFAULT_GLOBALS_CSS, but emits the full
 * `@theme inline` superset (shadows / tracking / spacing / fonts) so those tokens
 * actually resolve — the e2b template only maps colors + radius.
 */

// Canonical shadcn/Tailwind-v4 color tokens, emitted UNCONDITIONALLY so the
// `border-border` / `outline-ring` / `bg-background` utilities in `@layer base`
// always exist (a missing mapping would make `@apply` fail the sandbox build).
// A token whose value is absent from :root simply resolves to nothing.
export const COLOR_KEYS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;

const SHADOW_KEYS = [
  "shadow-2xs",
  "shadow-xs",
  "shadow-sm",
  "shadow",
  "shadow-md",
  "shadow-lg",
  "shadow-xl",
  "shadow-2xl",
] as const;

const TRACKING_KEYS = [
  "tracking-tighter",
  "tracking-tight",
  "tracking-normal",
  "tracking-wide",
  "tracking-wider",
  "tracking-widest",
] as const;

const FONT_KEYS = ["font-sans", "font-serif", "font-mono"] as const;

/** "  --key: value;" lines for each non-empty entry, in insertion order. */
function serializeVars(rec: Record<string, string>): string {
  return Object.entries(rec)
    .filter(([, v]) => typeof v === "string" && v.trim() !== "")
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n");
}

export function buildGlobalsCss(tokens: ThemeTokens): string {
  const theme = tokens.theme ?? {};
  const light = tokens.light ?? {};
  const dark = tokens.dark ?? {};
  // :root = shared (theme) vars + full light set; light wins on shared keys like
  // `radius`, matching the in-app ThemePreviewScope precedence.
  const root: Record<string, string> = { ...theme, ...light };
  const has = (k: string) => typeof root[k] === "string" && root[k].trim() !== "";

  const mappings: string[] = [];
  for (const k of COLOR_KEYS) mappings.push(`  --color-${k}: var(--${k});`);
  for (const k of FONT_KEYS) if (has(k)) mappings.push(`  --${k}: var(--${k});`);
  mappings.push(
    "  --radius-sm: calc(var(--radius) - 4px);",
    "  --radius-md: calc(var(--radius) - 2px);",
    "  --radius-lg: var(--radius);",
    "  --radius-xl: calc(var(--radius) + 4px);"
  );
  for (const k of SHADOW_KEYS) if (has(k)) mappings.push(`  --${k}: var(--${k});`);
  for (const k of TRACKING_KEYS)
    if (has(k)) mappings.push(`  --${k}: var(--${k});`);
  if (has("spacing")) mappings.push("  --spacing: var(--spacing);");

  const bodyLetterSpacing = has("tracking-normal")
    ? "\n    letter-spacing: var(--tracking-normal);"
    : "";

  return `@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
${mappings.join("\n")}
}

:root {
${serializeVars(root)}
}

.dark {
${serializeVars(dark)}
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;${bodyLetterSpacing}
  }
}
`;
}
