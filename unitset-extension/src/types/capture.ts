/**
 * Type definitions for the UnitSet Element Capture feature
 */

/** Version identifier for the capture format */
export const CAPTURE_VERSION = "1.0";

/** Type marker to identify extension content */
export const CAPTURE_TYPE = "unitset-element-capture" as const;

/** Prefix used in clipboard to identify extension content */
export const CLIPBOARD_PREFIX = "UNITSET_CAPTURE:";

/**
 * Map of CSS selectors to their computed style properties
 */
export interface ComputedStyleMap {
  [selector: string]: {
    [property: string]: string;
  };
}

/**
 * Metadata about the captured element
 */
export interface ElementMetadata {
  /** The HTML tag name (e.g., "DIV", "BUTTON") */
  tagName: string;
  /** Element dimensions in pixels */
  dimensions: {
    width: number;
    height: number;
  };
  /** Element position relative to viewport */
  position: {
    top: number;
    left: number;
  };
  /** Number of direct child elements */
  childCount: number;
  /** Truncated text content (first 200 chars) */
  textContent: string | null;
}

/**
 * Complete captured element data structure
 */
export interface CapturedElement {
  /** Format version for compatibility */
  version: string;
  /** Type marker to identify this as extension content */
  type: typeof CAPTURE_TYPE;
  /** Unix timestamp when capture occurred */
  timestamp: number;
  /** The captured element data */
  data: {
    /** Complete outer HTML of the element */
    html: string;
    /** Computed CSS styles for element and descendants */
    styles: ComputedStyleMap;
    /** Element metadata */
    metadata: ElementMetadata;
  };
}

/**
 * Result of parsing clipboard content
 */
export interface ParsedExtensionContent {
  /** Whether the content is valid extension content */
  isExtensionContent: boolean;
  /** Parsed data if valid, null otherwise */
  data: CapturedElement | null;
  /** Original raw text from clipboard */
  rawText: string;
}

/**
 * Selection state for the content script
 */
export interface SelectionState {
  /** Whether selection mode is currently active */
  isActive: boolean;
  /** Currently highlighted element */
  currentElement: HTMLElement | null;
  /** Original outline style to restore on cleanup */
  originalOutline: string | null;
}

/**
 * Message types for communication between popup and content script
 */
export type ExtensionMessage =
  | { type: "ACTIVATE_SELECTION" }
  | { type: "DEACTIVATE_SELECTION" }
  | { type: "ELEMENT_SELECTED"; data: CapturedElement }
  | { type: "SELECTION_COMPLETE"; data: CapturedElement }
  | { type: "SELECTION_ERROR"; error: string }
  | { type: "SELECTION_CANCELLED" }
  | { type: "SELECTION_TOO_LARGE"; size: number; maxSize: number };
