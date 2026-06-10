/**
 * Element Capture Utilities
 * Functions for capturing HTML, styles, and metadata from DOM elements
 */

import type {
  CapturedElement,
  ComputedStyleMap,
  ElementMetadata,
} from "../types/capture";
import { CAPTURE_VERSION, CAPTURE_TYPE } from "../types/capture";

// CSS properties to capture (most impactful for visual replication)
const STYLE_PROPERTIES = [
  // Layout
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "float",
  "clear",
  "z-index",
  "overflow",
  "overflow-x",
  "overflow-y",

  // Box Model
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "box-sizing",

  // Flexbox
  "flex",
  "flex-direction",
  "flex-wrap",
  "flex-flow",
  "justify-content",
  "align-items",
  "align-content",
  "align-self",
  "gap",
  "row-gap",
  "column-gap",

  // Grid
  "grid",
  "grid-template-columns",
  "grid-template-rows",
  "grid-column",
  "grid-row",
  "grid-gap",

  // Typography
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-decoration",
  "text-transform",
  "white-space",
  "word-wrap",
  "word-break",
  "color",

  // Background
  "background",
  "background-color",
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",

  // Border
  "border",
  "border-width",
  "border-style",
  "border-color",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-radius",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-left-radius",
  "border-bottom-right-radius",

  // Effects
  "box-shadow",
  "text-shadow",
  "opacity",
  "filter",
  "backdrop-filter",
  "transform",
  "transition",

  // Other
  "cursor",
  "visibility",
  "outline",
  "list-style",
  "list-style-type",
];

/**
 * Generates a unique selector for an element
 */
function generateSelector(element: HTMLElement, root: HTMLElement): string {
  if (element === root) {
    return ":root";
  }

  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== root && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    // Add id if present
    if (current.id) {
      selector += `#${current.id}`;
      parts.unshift(selector);
      break;
    }

    // Add classes
    if (current.className && typeof current.className === "string") {
      const classes = current.className.trim().split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        selector += `.${classes.slice(0, 2).join(".")}`;
      }
    }

    // Add nth-child if needed for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    parts.unshift(selector);
    current = current.parentElement;
  }

  return parts.join(" > ");
}

/**
 * Extracts computed styles for an element
 */
function extractElementStyles(element: HTMLElement): Record<string, string> {
  const computed = window.getComputedStyle(element);
  const styles: Record<string, string> = {};

  for (const prop of STYLE_PROPERTIES) {
    const value = computed.getPropertyValue(prop);
    if (value && value !== "none" && value !== "normal" && value !== "auto") {
      styles[prop] = value;
    }
  }

  return styles;
}

/**
 * Extracts computed styles for an element and all its descendants
 */
export function extractComputedStyles(element: HTMLElement): ComputedStyleMap {
  const styleMap: ComputedStyleMap = {};

  // Get styles for the root element
  const rootSelector = generateSelector(element, element);
  styleMap[rootSelector] = extractElementStyles(element);

  // Get styles for all descendants
  const descendants = element.querySelectorAll("*");
  descendants.forEach((descendant) => {
    if (descendant instanceof HTMLElement) {
      const selector = generateSelector(descendant, element);
      const styles = extractElementStyles(descendant);

      // Only include if there are meaningful styles
      if (Object.keys(styles).length > 0) {
        styleMap[selector] = styles;
      }
    }
  });

  return styleMap;
}

/**
 * Extracts metadata about an element
 */
export function extractMetadata(element: HTMLElement): ElementMetadata {
  const rect = element.getBoundingClientRect();
  const textContent = element.textContent?.trim() || null;

  return {
    tagName: element.tagName,
    dimensions: {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    position: {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
    },
    childCount: element.children.length,
    textContent: textContent ? textContent.slice(0, 200) : null,
  };
}

/**
 * Captures complete element data for AI replication
 */
export function captureElement(element: HTMLElement): CapturedElement {
  return {
    version: CAPTURE_VERSION,
    type: CAPTURE_TYPE,
    timestamp: Date.now(),
    data: {
      html: element.outerHTML,
      styles: extractComputedStyles(element),
      metadata: extractMetadata(element),
    },
  };
}
