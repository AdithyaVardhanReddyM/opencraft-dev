/**
 * Style Mapper Utilities
 *
 * Functions for converting CSS property values to Tailwind CSS classes.
 * Handles font sizes, colors, spacing, border radius, and arbitrary values.
 */

import type { StyleChanges, SelectedElementInfo } from "./types";
import {
  findElementInSource,
  updateClassNameAtLocation,
  getConflictingClasses,
} from "./element-finder-temp";

// ============================================================================
// Mapping Tables
// ============================================================================

/**
 * Font size mapping (px to Tailwind text-* classes)
 */
export const FONT_SIZE_MAP: Record<string, string> = {
  "12": "text-xs",
  "14": "text-sm",
  "16": "text-base",
  "18": "text-lg",
  "20": "text-xl",
  "24": "text-2xl",
  "30": "text-3xl",
  "36": "text-4xl",
  "48": "text-5xl",
  "60": "text-6xl",
  "72": "text-7xl",
  "96": "text-8xl",
  "128": "text-9xl",
};

/**
 * Font size values in ascending order for nearest match
 */
const FONT_SIZE_VALUES = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96, 128];

/**
 * Spacing mapping (px to Tailwind scale values)
 * Maps pixel values to Tailwind spacing scale numbers
 */
export const SPACING_MAP: Record<string, string> = {
  "0": "0",
  "1": "px",
  "2": "0.5",
  "4": "1",
  "6": "1.5",
  "8": "2",
  "10": "2.5",
  "12": "3",
  "14": "3.5",
  "16": "4",
  "20": "5",
  "24": "6",
  "28": "7",
  "32": "8",
  "36": "9",
  "40": "10",
  "44": "11",
  "48": "12",
  "52": "13",
  "56": "14",
  "60": "15",
  "64": "16",
  "72": "18",
  "80": "20",
  "96": "24",
  "112": "28",
  "128": "32",
  "144": "36",
  "160": "40",
  "176": "44",
  "192": "48",
  "208": "52",
  "224": "56",
  "240": "60",
  "256": "64",
  "288": "72",
  "320": "80",
  "384": "96",
};

/**
 * Spacing values in ascending order for nearest match
 */
const SPACING_VALUES = Object.keys(SPACING_MAP)
  .map(Number)
  .sort((a, b) => a - b);

/**
 * Border radius mapping (px to Tailwind rounded-* classes)
 */
export const BORDER_RADIUS_MAP: Record<string, string> = {
  "0": "rounded-none",
  "2": "rounded-sm",
  "4": "rounded",
  "6": "rounded-md",
  "8": "rounded-lg",
  "12": "rounded-xl",
  "16": "rounded-2xl",
  "24": "rounded-3xl",
  "9999": "rounded-full",
};

/**
 * Border radius values in ascending order for nearest match
 */
const BORDER_RADIUS_VALUES = [0, 2, 4, 6, 8, 12, 16, 24, 9999];

/**
 * Border radius suffixes (px to the Tailwind size token). An empty string maps
 * to the bare prefix (e.g. `rounded` / `rounded-tl`).
 */
const BORDER_RADIUS_SUFFIX: Record<string, string> = {
  "0": "none",
  "2": "sm",
  "4": "",
  "6": "md",
  "8": "lg",
  "12": "xl",
  "16": "2xl",
  "24": "3xl",
  "9999": "full",
};

/**
 * Font weight mapping (numeric to Tailwind font-* classes)
 */
export const FONT_WEIGHT_MAP: Record<string, string> = {
  "100": "font-thin",
  "200": "font-extralight",
  "300": "font-light",
  "400": "font-normal",
  "500": "font-medium",
  "600": "font-semibold",
  "700": "font-bold",
  "800": "font-extrabold",
  "900": "font-black",
};

/**
 * Common Tailwind color palette for matching
 * Maps hex values to Tailwind color classes
 */
export const COLOR_MAP: Record<string, string> = {
  // Whites and blacks
  "#ffffff": "white",
  "#000000": "black",
  transparent: "transparent",
  // Grays
  "#f9fafb": "gray-50",
  "#f3f4f6": "gray-100",
  "#e5e7eb": "gray-200",
  "#d1d5db": "gray-300",
  "#9ca3af": "gray-400",
  "#6b7280": "gray-500",
  "#4b5563": "gray-600",
  "#374151": "gray-700",
  "#1f2937": "gray-800",
  "#111827": "gray-900",
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse a CSS value and extract the numeric part
 */
export function parseNumericValue(value: string): number | null {
  const match = value.match(/^(-?\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Find the nearest value in a sorted array
 */
function findNearestValue(target: number, values: number[]): number {
  let nearest = values[0];
  let minDiff = Math.abs(target - nearest);

  for (const value of values) {
    const diff = Math.abs(target - value);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = value;
    }
  }

  return nearest;
}

/**
 * Convert RGB/RGBA color to hex format.
 */
export function rgbToHex(rgb: string): string {
  const trimmed = rgb.trim().toLowerCase();

  const preservedKeywords = [
    "transparent",
    "inherit",
    "initial",
    "unset",
    "currentcolor",
    "revert",
    "revert-layer",
  ];

  if (preservedKeywords.includes(trimmed)) {
    return trimmed;
  }

  if (trimmed === "rgba(0, 0, 0, 0)" || trimmed === "rgba(0,0,0,0)") {
    return "transparent";
  }

  if (trimmed.startsWith("#")) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    if (trimmed.length === 9) {
      return trimmed.slice(0, 7);
    }
    return trimmed;
  }

  const rgbMatch = trimmed.match(
    /rgba?\(\s*(\d+(?:\.\d+)?)\s*[,\s]\s*(\d+(?:\.\d+)?)\s*[,\s]\s*(\d+(?:\.\d+)?)/
  );

  if (!rgbMatch) {
    return rgb;
  }

  const r = Math.min(255, Math.max(0, Math.round(parseFloat(rgbMatch[1]))));
  const g = Math.min(255, Math.max(0, Math.round(parseFloat(rgbMatch[2]))));
  const b = Math.min(255, Math.max(0, Math.round(parseFloat(rgbMatch[3]))));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ============================================================================
// CSS Property Name Conversion
// ============================================================================

const VENDOR_PREFIXES = ["-webkit-", "-moz-", "-ms-", "-o-"];

export function kebabToCamelCase(property: string): string {
  const trimmed = property.trim();
  if (!trimmed) return trimmed;

  let prefix = "";
  let rest = trimmed;

  for (const vendorPrefix of VENDOR_PREFIXES) {
    if (trimmed.startsWith(vendorPrefix)) {
      prefix = vendorPrefix.slice(1, -1);
      rest = trimmed.slice(vendorPrefix.length);
      break;
    }
  }

  const camelCaseRest = rest.replace(/-([a-z])/g, (_, letter) =>
    letter.toUpperCase()
  );

  if (prefix) {
    if (prefix === "moz") {
      return (
        "Moz" + camelCaseRest.charAt(0).toUpperCase() + camelCaseRest.slice(1)
      );
    }
    return (
      prefix + camelCaseRest.charAt(0).toUpperCase() + camelCaseRest.slice(1)
    );
  }

  return camelCaseRest;
}

export function camelToKebabCase(property: string): string {
  const trimmed = property.trim();
  if (!trimmed) return trimmed;

  const vendorPrefixMatch = trimmed.match(/^(webkit|Moz|ms|o)([A-Z])/);

  if (vendorPrefixMatch) {
    const [, prefix] = vendorPrefixMatch;
    const rest = trimmed.slice(prefix.length);
    const kebabRest = rest.replace(/([A-Z])/g, "-$1").toLowerCase();
    return `-${prefix.toLowerCase()}${kebabRest}`;
  }

  return trimmed.replace(/([A-Z])/g, "-$1").toLowerCase();
}

export function normalizeColor(value: string): string {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.startsWith("rgb")) {
    return rgbToHex(trimmed);
  }

  if (trimmed.startsWith("#")) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return trimmed;
  }

  return trimmed;
}

// ============================================================================
// Arbitrary Value Handling
// ============================================================================

export function escapeArbitraryValue(value: string): string {
  let escaped = value.replace(/\s+/g, "_");
  escaped = escaped.replace(/([(),])/g, "\\$1");
  return escaped;
}

export function formatRgbaForTailwind(rgba: string): string {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return escapeArbitraryValue(rgba);

  const [, r, g, b, a] = match;

  if (!a || parseFloat(a) === 1) {
    const rNum = parseInt(r, 10);
    const gNum = parseInt(g, 10);
    const bNum = parseInt(b, 10);
    return `#${((1 << 24) + (rNum << 16) + (gNum << 8) + bNum)
      .toString(16)
      .slice(1)}`;
  }

  const alphaPercent = Math.round(parseFloat(a) * 100);
  return `rgb\\(${r}_${g}_${b}_\\/_${alphaPercent}%\\)`;
}

export function createArbitraryValueClass(
  prefix: string,
  value: string
): string {
  if (value.startsWith("rgba(") || value.startsWith("rgb(")) {
    const formatted = formatRgbaForTailwind(value);
    return `${prefix}-[${formatted}]`;
  }
  const escaped = escapeArbitraryValue(value);
  return `${prefix}-[${escaped}]`;
}

// ============================================================================
// Conversion Functions
// ============================================================================

export function fontSizeToTailwind(value: string): string {
  const numValue = parseNumericValue(value);
  if (numValue === null) {
    return createArbitraryValueClass("text", value);
  }

  const nearest = findNearestValue(numValue, FONT_SIZE_VALUES);
  const tailwindClass = FONT_SIZE_MAP[String(nearest)];

  if (tailwindClass && Math.abs(numValue - nearest) <= 2) {
    return tailwindClass;
  }

  return `text-[${Math.round(numValue)}px]`;
}

export function colorToTailwind(
  value: string,
  property: "text" | "bg" | "border" | "outline"
): string {
  const trimmed = value.trim();

  if (trimmed === "transparent" || trimmed === "rgba(0, 0, 0, 0)") {
    return `${property}-transparent`;
  }

  const rgbaMatch = trimmed.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
  );
  if (rgbaMatch) {
    const [, , , , a] = rgbaMatch;
    if (a && parseFloat(a) < 1) {
      return createArbitraryValueClass(property, trimmed);
    }
  }

  const normalized = normalizeColor(value);
  const colorClass = COLOR_MAP[normalized];
  if (colorClass) {
    return `${property}-${colorClass}`;
  }

  return `${property}-[${normalized}]`;
}

export function spacingToTailwind(value: string, property: string): string {
  const numValue = parseNumericValue(value);

  if (value.trim().toLowerCase() === "auto") {
    return `${property}-auto`;
  }

  if (numValue === null) {
    return createArbitraryValueClass(property, value);
  }

  if (numValue === 0) {
    return `${property}-0`;
  }

  const nearest = findNearestValue(numValue, SPACING_VALUES);
  const tailwindScale = SPACING_MAP[String(nearest)];

  if (tailwindScale && Math.abs(numValue - nearest) <= 2) {
    return `${property}-${tailwindScale}`;
  }

  return `${property}-[${Math.round(numValue)}px]`;
}

/**
 * Build a radius class for a given Tailwind prefix and size suffix.
 * An empty suffix yields the bare prefix (e.g. `rounded`, `rounded-tl`).
 */
function radiusClass(prefix: string, suffix: string): string {
  return suffix ? `${prefix}-${suffix}` : prefix;
}

/**
 * Convert a border-radius value to a Tailwind class.
 * @param value - CSS radius value (e.g. "8px")
 * @param prefix - Tailwind prefix: "rounded" for all corners, or a per-corner
 *   prefix such as "rounded-tl", "rounded-tr", "rounded-bl", "rounded-br".
 */
export function borderRadiusToTailwind(
  value: string,
  prefix: string = "rounded"
): string {
  const numValue = parseNumericValue(value);

  if (numValue === null) {
    return `${prefix}-[${escapeArbitraryValue(value)}]`;
  }

  if (numValue === 0) {
    return radiusClass(prefix, "none");
  }

  if (numValue >= 9999 || value.includes("9999")) {
    return radiusClass(prefix, "full");
  }

  const nearest = findNearestValue(numValue, BORDER_RADIUS_VALUES);
  const suffix = BORDER_RADIUS_SUFFIX[String(nearest)];

  if (suffix !== undefined && Math.abs(numValue - nearest) <= 2) {
    return radiusClass(prefix, suffix);
  }

  return `${prefix}-[${Math.round(numValue)}px]`;
}

// ============================================================================
// Border / Outline / Typography Conversions
// ============================================================================

/**
 * Border / outline width values that map to standard Tailwind tokens.
 */
const BORDER_WIDTH_MAP: Record<string, string> = {
  "0": "border-0",
  "1": "border",
  "2": "border-2",
  "4": "border-4",
  "8": "border-8",
};
const OUTLINE_WIDTH_MAP: Record<string, string> = {
  "0": "outline-0",
  "1": "outline-1",
  "2": "outline-2",
  "4": "outline-4",
  "8": "outline-8",
};

export function borderWidthToTailwind(value: string): string {
  const numValue = parseNumericValue(value);
  if (numValue === null) return createArbitraryValueClass("border", value);
  if (numValue === 0) return "border-0";

  // Borders are typically small exact integers; only collapse to a standard
  // token on an exact match to avoid visibly losing 1px (e.g. 3px -> border-2).
  const mapped = BORDER_WIDTH_MAP[String(numValue)];
  if (mapped) return mapped;
  return `border-[${Math.round(numValue)}px]`;
}

export function outlineWidthToTailwind(value: string): string {
  const numValue = parseNumericValue(value);
  if (numValue === null) return createArbitraryValueClass("outline", value);
  if (numValue === 0) return "outline-0";

  const mapped = OUTLINE_WIDTH_MAP[String(numValue)];
  if (mapped) return mapped;
  return `outline-[${Math.round(numValue)}px]`;
}

export function outlineOffsetToTailwind(value: string): string {
  const numValue = parseNumericValue(value);
  if (numValue === null) return `outline-offset-[${value}]`;
  const rounded = Math.round(numValue);
  const standard = [0, 1, 2, 4, 8];
  if (rounded >= 0 && standard.includes(rounded)) {
    return `outline-offset-${rounded}`;
  }
  // Tailwind requires negative arbitrary offsets to be bracketed.
  return `outline-offset-[${rounded}px]`;
}

/**
 * Border style keyword -> Tailwind class.
 */
export function borderStyleToTailwind(value: string): string | null {
  const map: Record<string, string> = {
    solid: "border-solid",
    dashed: "border-dashed",
    dotted: "border-dotted",
    double: "border-double",
    hidden: "border-hidden",
    none: "border-none",
  };
  return map[value.trim().toLowerCase()] || null;
}

/**
 * Outline style keyword -> Tailwind class.
 * Tailwind has no `outline-solid`; the bare `outline` utility is solid.
 */
export function outlineStyleToTailwind(value: string): string | null {
  const map: Record<string, string> = {
    solid: "outline",
    dashed: "outline-dashed",
    dotted: "outline-dotted",
    double: "outline-double",
    none: "outline-none",
  };
  return map[value.trim().toLowerCase()] || null;
}

export function fontStyleToTailwind(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "italic" || normalized === "oblique") return "italic";
  if (normalized === "normal") return "not-italic";
  return null;
}

export function textDecorationToTailwind(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("line-through")) return "line-through";
  if (normalized.includes("underline")) return "underline";
  if (normalized.includes("overline")) return "overline";
  if (normalized === "none" || normalized === "") return "no-underline";
  return null;
}

export function fontFamilyToTailwind(value: string): string {
  const normalized = value.trim().toLowerCase();
  // Order matters: "sans-serif" contains "serif" as a substring.
  if (normalized.includes("monospace") || normalized.includes("ui-monospace")) {
    return "font-mono";
  }
  if (normalized.includes("sans-serif") || normalized.includes("system-ui")) {
    return "font-sans";
  }
  if (normalized.includes("serif")) {
    return "font-serif";
  }
  return "font-sans";
}

export function lineHeightToTailwind(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === "normal") return "leading-normal";
  // The panel emits a unitless ratio (e.g. "1.5"); preserve precision.
  return `leading-[${escapeArbitraryValue(trimmed)}]`;
}

export function letterSpacingToTailwind(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === "normal") return "tracking-normal";
  const numValue = parseNumericValue(trimmed);
  if (numValue === 0) return "tracking-normal";
  return `tracking-[${escapeArbitraryValue(trimmed)}]`;
}

export function boxShadowToTailwind(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") return "shadow-none";
  // Arbitrary box-shadow: spaces become underscores, commas (between layers and
  // inside rgba()) and parentheses are preserved as-is.
  return `shadow-[${trimmed.replace(/\s+/g, "_")}]`;
}

export function fontWeightToTailwind(value: string): string {
  const normalized = value.trim();

  const tailwindClass = FONT_WEIGHT_MAP[normalized];
  if (tailwindClass) {
    return tailwindClass;
  }

  const namedWeights: Record<string, string> = {
    normal: "font-normal",
    bold: "font-bold",
    lighter: "font-light",
    bolder: "font-bold",
  };

  if (namedWeights[normalized.toLowerCase()]) {
    return namedWeights[normalized.toLowerCase()];
  }

  return createArbitraryValueClass("font", normalized);
}

export function opacityToTailwind(value: string): string {
  const numValue = parseNumericValue(value);

  if (numValue === null) {
    return createArbitraryValueClass("opacity", value);
  }

  const percentage = Math.round(numValue * 100);
  const standardOpacities = [
    0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90,
    95, 100,
  ];

  const nearest = findNearestValue(percentage, standardOpacities);

  if (Math.abs(percentage - nearest) <= 2) {
    return `opacity-${nearest}`;
  }

  return `opacity-[${percentage}%]`;
}

// ============================================================================
// Main Conversion Function
// ============================================================================

const PROPERTY_PREFIX_MAP: Record<string, string> = {
  width: "w",
  height: "h",
  padding: "p",
  paddingTop: "pt",
  paddingRight: "pr",
  paddingBottom: "pb",
  paddingLeft: "pl",
  margin: "m",
  marginTop: "mt",
  marginRight: "mr",
  marginBottom: "mb",
  marginLeft: "ml",
  gap: "gap",
  columnGap: "gap-x",
  rowGap: "gap-y",
};

export function cssToTailwind(styles: StyleChanges): string[] {
  const classes: string[] = [];

  for (const [property, value] of Object.entries(styles)) {
    if (!value || value === "initial" || value === "inherit") continue;

    let tailwindClass: string | null = null;

    switch (property) {
      case "fontSize":
        tailwindClass = fontSizeToTailwind(value);
        break;
      case "fontWeight":
        tailwindClass = fontWeightToTailwind(value);
        break;
      case "color":
        tailwindClass = colorToTailwind(value, "text");
        break;
      case "backgroundColor":
        tailwindClass = colorToTailwind(value, "bg");
        break;
      case "borderColor":
        tailwindClass = colorToTailwind(value, "border");
        break;
      case "borderRadius":
        tailwindClass = borderRadiusToTailwind(value);
        break;
      case "borderTopLeftRadius":
        tailwindClass = borderRadiusToTailwind(value, "rounded-tl");
        break;
      case "borderTopRightRadius":
        tailwindClass = borderRadiusToTailwind(value, "rounded-tr");
        break;
      case "borderBottomLeftRadius":
        tailwindClass = borderRadiusToTailwind(value, "rounded-bl");
        break;
      case "borderBottomRightRadius":
        tailwindClass = borderRadiusToTailwind(value, "rounded-br");
        break;
      case "borderWidth":
        tailwindClass = borderWidthToTailwind(value);
        break;
      case "borderStyle":
        tailwindClass = borderStyleToTailwind(value);
        break;
      case "outlineColor":
        tailwindClass = colorToTailwind(value, "outline");
        break;
      case "outlineWidth":
        tailwindClass = outlineWidthToTailwind(value);
        break;
      case "outlineStyle":
        tailwindClass = outlineStyleToTailwind(value);
        break;
      case "outlineOffset":
        tailwindClass = outlineOffsetToTailwind(value);
        break;
      case "boxShadow":
        tailwindClass = boxShadowToTailwind(value);
        break;
      case "opacity":
        tailwindClass = opacityToTailwind(value);
        break;
      case "fontFamily":
        tailwindClass = fontFamilyToTailwind(value);
        break;
      case "fontStyle":
        tailwindClass = fontStyleToTailwind(value);
        break;
      case "textDecoration":
        tailwindClass = textDecorationToTailwind(value);
        break;
      case "lineHeight":
        tailwindClass = lineHeightToTailwind(value);
        break;
      case "letterSpacing":
        tailwindClass = letterSpacingToTailwind(value);
        break;
      case "width":
      case "height":
      case "padding":
      case "paddingTop":
      case "paddingRight":
      case "paddingBottom":
      case "paddingLeft":
      case "margin":
      case "marginTop":
      case "marginRight":
      case "marginBottom":
      case "marginLeft":
      case "gap":
      case "columnGap":
      case "rowGap": {
        const prefix = PROPERTY_PREFIX_MAP[property];
        if (prefix) {
          tailwindClass = spacingToTailwind(value, prefix);
        }
        break;
      }
      case "display": {
        const displayMap: Record<string, string> = {
          block: "block",
          inline: "inline",
          "inline-block": "inline-block",
          flex: "flex",
          "inline-flex": "inline-flex",
          grid: "grid",
          "inline-grid": "inline-grid",
          hidden: "hidden",
          none: "hidden",
        };
        tailwindClass = displayMap[value.toLowerCase()] || null;
        break;
      }
      case "flexDirection": {
        const flexDirMap: Record<string, string> = {
          row: "flex-row",
          "row-reverse": "flex-row-reverse",
          column: "flex-col",
          "column-reverse": "flex-col-reverse",
        };
        tailwindClass = flexDirMap[value.toLowerCase()] || null;
        break;
      }
      case "justifyContent": {
        const justifyMap: Record<string, string> = {
          "flex-start": "justify-start",
          "flex-end": "justify-end",
          center: "justify-center",
          "space-between": "justify-between",
          "space-around": "justify-around",
          "space-evenly": "justify-evenly",
        };
        tailwindClass = justifyMap[value.toLowerCase()] || null;
        break;
      }
      case "alignItems": {
        const alignMap: Record<string, string> = {
          "flex-start": "items-start",
          "flex-end": "items-end",
          center: "items-center",
          baseline: "items-baseline",
          stretch: "items-stretch",
        };
        tailwindClass = alignMap[value.toLowerCase()] || null;
        break;
      }
      case "flexWrap": {
        const flexWrapMap: Record<string, string> = {
          wrap: "flex-wrap",
          nowrap: "flex-nowrap",
          "wrap-reverse": "flex-wrap-reverse",
        };
        tailwindClass = flexWrapMap[value.toLowerCase()] || null;
        break;
      }
      case "textAlign": {
        const textAlignMap: Record<string, string> = {
          left: "text-left",
          center: "text-center",
          right: "text-right",
          justify: "text-justify",
        };
        tailwindClass = textAlignMap[value.toLowerCase()] || null;
        break;
      }
      default:
        break;
    }

    if (tailwindClass) {
      classes.push(tailwindClass);
    }
  }

  return classes;
}

// ============================================================================
// Class Name Update Function
// ============================================================================

/**
 * Result of updating element className
 */
export interface UpdateClassNameResult {
  /** The updated source code */
  sourceCode: string;
  /** Whether the update was successful */
  success: boolean;
  /** Method used to find the element */
  method: "element-info" | "selector" | "fallback" | "none";
  /** Warning message if applicable */
  warning?: string;
  /** Error message if update failed */
  error?: string;
}

/**
 * Extract class prefixes from Tailwind classes for conflict detection
 * @deprecated Use getConflictingClasses from element-finder-temp instead
 */
function extractClassPrefixes(classes: string[]): Set<string> {
  return new Set(
    classes.map((cls) => {
      const match = cls.match(/^([a-z]+)-/);
      return match ? match[1] : cls;
    })
  );
}

/**
 * Find the element in source code by selector and return its position
 */
function findElementBySelector(
  sourceCode: string,
  selector: string
): { start: number; end: number } | null {
  if (selector.startsWith("#")) {
    const id = selector.slice(1);
    const idRegex = new RegExp(
      `id\\s*=\\s*(?:"${escapeRegexChars(id)}"|'${escapeRegexChars(
        id
      )}'|\\{['"\`]${escapeRegexChars(id)}['"\`]\\})`,
      "g"
    );
    const match = idRegex.exec(sourceCode);
    if (match) {
      let start = match.index;
      while (start > 0 && sourceCode[start] !== "<") {
        start--;
      }
      let end = match.index + match[0].length;
      while (end < sourceCode.length && sourceCode[end] !== ">") {
        end++;
      }
      return { start, end: end + 1 };
    }
  }

  const dataAttrMatch = selector.match(/\[data-(\w+)="([^"]+)"\]/);
  if (dataAttrMatch) {
    const [, attrName, attrValue] = dataAttrMatch;
    const attrRegex = new RegExp(
      `data-${attrName}\\s*=\\s*(?:"${escapeRegexChars(
        attrValue
      )}"|'${escapeRegexChars(attrValue)}'|\\{['"\`]${escapeRegexChars(
        attrValue
      )}['"\`]\\})`,
      "g"
    );
    const match = attrRegex.exec(sourceCode);
    if (match) {
      let start = match.index;
      while (start > 0 && sourceCode[start] !== "<") {
        start--;
      }
      let end = match.index + match[0].length;
      while (end < sourceCode.length && sourceCode[end] !== ">") {
        end++;
      }
      return { start, end: end + 1 };
    }
  }

  return null;
}

/**
 * Escape special regex characters
 */
function escapeRegexChars(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Remove conflicting classes from existing classes using the new conflict resolution system.
 * Uses getConflictingClasses for comprehensive Tailwind class conflict detection.
 */
function removeConflictingClasses(
  existingClasses: string[],
  newClasses: string[]
): string[] {
  const conflictingSet = new Set<string>();

  for (const newClass of newClasses) {
    const conflicts = getConflictingClasses(existingClasses, newClass);
    conflicts.forEach((cls) => conflictingSet.add(cls));
  }

  return existingClasses.filter((cls) => !conflictingSet.has(cls));
}

/**
 * Update className in JSX/TSX source code with new Tailwind classes.
 * Uses precise element finding when elementInfo is provided.
 * Preserves existing classes that don't conflict with new ones.
 *
 * @param sourceCode - The source code to modify
 * @param elementSelector - CSS selector or element path to identify the element
 * @param newClasses - Array of new Tailwind classes to add
 * @param elementInfo - Optional SelectedElementInfo for precise element finding
 * @returns Updated source code string (for backward compatibility)
 */
export function updateElementClassName(
  sourceCode: string,
  elementSelector: string,
  newClasses: string[],
  elementInfo?: SelectedElementInfo
): string {
  const result = updateElementClassNameWithResult(
    sourceCode,
    elementSelector,
    newClasses,
    elementInfo
  );
  return result.sourceCode;
}

/**
 * Update className in JSX/TSX source code with new Tailwind classes.
 * Returns detailed result including success status and warnings.
 *
 * @param sourceCode - The source code to modify
 * @param elementSelector - CSS selector or element path to identify the element
 * @param newClasses - Array of new Tailwind classes to add
 * @param elementInfo - Optional SelectedElementInfo for precise element finding
 * @returns UpdateClassNameResult with updated source code and metadata
 */
export function updateElementClassNameWithResult(
  sourceCode: string,
  elementSelector: string,
  newClasses: string[],
  elementInfo?: SelectedElementInfo
): UpdateClassNameResult {
  // Strategy 1: Use findElementInSource with elementInfo for precise element finding
  if (elementInfo) {
    const elementLocation = findElementInSource(sourceCode, elementInfo);

    if (elementLocation) {
      // Use updateClassNameAtLocation for precise updates with conflict resolution
      const updatedSource = updateClassNameAtLocation(
        sourceCode,
        elementLocation,
        newClasses
      );

      const warning =
        elementLocation.confidence === "low"
          ? "Element found with low confidence. Consider adding an id or data-testid attribute for more reliable updates."
          : elementLocation.confidence === "medium"
          ? "Element found with medium confidence. For best results, consider adding an id or data-testid attribute."
          : undefined;

      return {
        sourceCode: updatedSource,
        success: true,
        method: "element-info",
        warning,
      };
    }

    console.warn(
      "[style-mapper] Could not find element using elementInfo, trying selector fallback"
    );
  }

  // Strategy 2: Try to find element by unique selector (id or data-attr)
  const elementPos = findElementBySelector(sourceCode, elementSelector);

  if (elementPos) {
    const elementTag = sourceCode.slice(elementPos.start, elementPos.end);
    const classNameRegex =
      /className\s*=\s*(?:"([^"]*)"|'([^']*)'|{`([^`]*)`})/;
    const match = classNameRegex.exec(elementTag);

    if (match) {
      const existingClasses = (match[1] || match[2] || match[3] || "")
        .split(/\s+/)
        .filter(Boolean);

      // Use comprehensive conflict resolution
      const filteredClasses = removeConflictingClasses(
        existingClasses,
        newClasses
      );
      const combinedClasses = [...filteredClasses, ...newClasses].join(" ");

      const fullMatch = match[0];
      const quote = fullMatch.includes('"')
        ? '"'
        : fullMatch.includes("'")
        ? "'"
        : "`";
      const newClassName =
        quote === "`"
          ? `className={\`${combinedClasses}\`}`
          : `className=${quote}${combinedClasses}${quote}`;

      const updatedTag = elementTag.replace(fullMatch, newClassName);
      const updatedSource =
        sourceCode.slice(0, elementPos.start) +
        updatedTag +
        sourceCode.slice(elementPos.end);

      return {
        sourceCode: updatedSource,
        success: true,
        method: "selector",
      };
    } else {
      const insertPos = elementPos.end - 1;
      const newClassName = `className="${newClasses.join(" ")}"`;
      const updatedSource =
        sourceCode.slice(0, insertPos) +
        ` ${newClassName}` +
        sourceCode.slice(insertPos);

      return {
        sourceCode: updatedSource,
        success: true,
        method: "selector",
      };
    }
  }

  // Strategy 3: Fallback - Update first matching className (legacy behavior)
  console.warn(
    "[style-mapper] Could not find element by selector, using fallback"
  );

  const classNameRegex = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|{`([^`]*)`})/;
  const match = classNameRegex.exec(sourceCode);

  if (match) {
    const existingClasses = (match[1] || match[2] || match[3] || "")
      .split(/\s+/)
      .filter(Boolean);

    // Use comprehensive conflict resolution
    const filteredClasses = removeConflictingClasses(
      existingClasses,
      newClasses
    );
    const combinedClasses = [...filteredClasses, ...newClasses].join(" ");

    const fullMatch = match[0];
    const quote = fullMatch.includes('"')
      ? '"'
      : fullMatch.includes("'")
      ? "'"
      : "`";
    const newClassName =
      quote === "`"
        ? `className={\`${combinedClasses}\`}`
        : `className=${quote}${combinedClasses}${quote}`;

    const updatedSource = sourceCode.replace(fullMatch, newClassName);

    return {
      sourceCode: updatedSource,
      success: true,
      method: "fallback",
      warning:
        "Element located using fallback method (first className match). " +
        "This may affect the wrong element if multiple elements exist. " +
        "Consider adding an id or data-testid attribute for reliable updates.",
    };
  }

  return {
    sourceCode,
    success: false,
    method: "none",
    error: "Could not find any className attribute in the source code.",
  };
}

/**
 * Result of updating an element attribute (e.g. an image `src`).
 */
export interface UpdateAttributeResult {
  sourceCode: string;
  success: boolean;
  method: "element-info" | "none";
  warning?: string;
  error?: string;
}

/**
 * Update a plain HTML attribute (such as `src`) on the located element in
 * JSX/TSX source code. Attributes cannot be expressed as Tailwind classes, so
 * this is used for image-source edits that the className path can't carry.
 *
 * Only updates when the element can be located precisely via elementInfo
 * (id / data-testid / unique text). Returns success:false otherwise so the
 * caller can surface a clear, non-destructive warning.
 */
export function updateElementAttributeWithResult(
  sourceCode: string,
  elementInfo: SelectedElementInfo,
  attrName: string,
  attrValue: string
): UpdateAttributeResult {
  const location = findElementInSource(sourceCode, elementInfo);

  if (!location) {
    return {
      sourceCode,
      success: false,
      method: "none",
      error: `Could not locate <${elementInfo.tagName}> in source to update its "${attrName}". Add an id to the element for reliable saving.`,
    };
  }

  const tag = location.tagContent;

  // Choose a quote that doesn't appear in the value.
  const quote = attrValue.includes('"') ? "'" : '"';
  const newAttr = `${attrName}=${quote}${attrValue}${quote}`;

  // Match an existing attribute: attr="..." | '...' | {...}
  const attrRegex = new RegExp(
    `${escapeRegexChars(attrName)}\\s*=\\s*(?:"[^"]*"|'[^']*'|\\{[^}]*\\})`
  );

  let updatedTag: string;
  if (attrRegex.test(tag)) {
    updatedTag = tag.replace(attrRegex, newAttr);
  } else {
    // Insert before the closing `/>` or `>`.
    const insertPos = tag.endsWith("/>") ? tag.length - 2 : tag.length - 1;
    updatedTag = `${tag.slice(0, insertPos)} ${newAttr}${tag.slice(insertPos)}`;
  }

  const updatedSource =
    sourceCode.slice(0, location.start) +
    updatedTag +
    sourceCode.slice(location.end);

  return {
    sourceCode: updatedSource,
    success: true,
    method: "element-info",
    warning:
      location.confidence !== "high"
        ? `Image located with ${location.confidence} confidence. Verify the saved change.`
        : undefined,
  };
}

/**
 * Check if a Tailwind class is valid (basic validation)
 */
export function isValidTailwindClass(className: string): boolean {
  if (/^[a-z]+-\[.+\]$/.test(className)) {
    return true;
  }
  if (/^[a-z]+(-[a-z0-9]+)*$/.test(className)) {
    return true;
  }
  return false;
}

// Keep extractClassPrefixes for backward compatibility but mark as deprecated
export { extractClassPrefixes };
