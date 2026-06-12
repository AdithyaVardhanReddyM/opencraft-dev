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
  property: "text" | "bg" | "border"
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

export function borderRadiusToTailwind(value: string): string {
  const numValue = parseNumericValue(value);

  if (numValue === null) {
    return createArbitraryValueClass("rounded", value);
  }

  if (numValue === 0) {
    return "rounded-none";
  }

  if (numValue >= 9999 || value.includes("9999")) {
    return "rounded-full";
  }

  const nearest = findNearestValue(numValue, BORDER_RADIUS_VALUES);
  const tailwindClass = BORDER_RADIUS_MAP[String(nearest)];

  if (tailwindClass && Math.abs(numValue - nearest) <= 2) {
    return tailwindClass;
  }

  return `rounded-[${Math.round(numValue)}px]`;
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
      case "opacity":
        tailwindClass = opacityToTailwind(value);
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
