import { getThemeById } from "./theme-utils";
import { getThemeTokens, type ThemeTokens } from "./theme-tokens";
import type { DesignSystemDoc } from "@/lib/db/types";

/**
 * Resolve a theme id (preset slug OR custom uuid) to its display name + rail
 * swatches, falling back to the default preset for unknown ids (e.g. a screen
 * still pointing at a deleted custom system). `custom` is the user's fetched list
 * (useDesignSystems()); kept as an arg so these stay pure + testable.
 */
export interface ThemeDisplay {
  id: string;
  name: string;
  colors: [string, string, string];
}

export function resolveDisplayTheme(
  id: string,
  custom?: DesignSystemDoc[]
): ThemeDisplay {
  const preset = getThemeById(id);
  if (preset) return { id, name: preset.name, colors: preset.colors };
  const ds = custom?.find((d) => d._id === id);
  if (ds) return { id, name: ds.name, colors: ds.previewColors };
  const fallback = getThemeById("default")!;
  return { id: "default", name: fallback.name, colors: fallback.colors };
}

/** Full token set for a preset or custom id (for the preview), else undefined. */
export function resolveTokens(
  id: string,
  custom?: DesignSystemDoc[]
): ThemeTokens | undefined {
  return getThemeTokens(id) ?? custom?.find((d) => d._id === id)?.tokens;
}
