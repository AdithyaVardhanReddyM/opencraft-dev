/**
 * Extension Content Utilities
 * Functions for detecting and parsing content captured by the UnitSet Chrome extension
 */

/** Prefix used to identify extension content in clipboard */
export const CLIPBOARD_PREFIX = "UNITSET_CAPTURE:";

/** Type marker for extension content */
export const CAPTURE_TYPE = "unitset-element-capture" as const;

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
  tagName: string;
  dimensions: {
    width: number;
    height: number;
  };
  position: {
    top: number;
    left: number;
  };
  childCount: number;
  textContent: string | null;
}

/**
 * Complete captured element data structure
 */
export interface CapturedElement {
  version: string;
  type: typeof CAPTURE_TYPE;
  timestamp: number;
  data: {
    html: string;
    styles: ComputedStyleMap;
    metadata: ElementMetadata;
  };
}

/**
 * Result of parsing clipboard content
 */
export interface ParsedExtensionContent {
  isExtensionContent: boolean;
  data: CapturedElement | null;
  rawText: string;
}

/**
 * Checks if a string is in the extension content format
 */
export function isExtensionContentFormat(text: string): boolean {
  if (!text || !text.startsWith(CLIPBOARD_PREFIX)) {
    return false;
  }

  // Try to decode and validate
  const decoded = decodeFromClipboard(text);
  return decoded !== null;
}

/**
 * Decodes captured element data from clipboard content
 * Returns null if content is not valid extension format
 */
export function decodeFromClipboard(encoded: string): CapturedElement | null {
  if (!encoded.startsWith(CLIPBOARD_PREFIX)) {
    return null;
  }

  try {
    // Extract base64 content
    const base64 = encoded.slice(CLIPBOARD_PREFIX.length);

    // Decode base64 to JSON
    const json = decodeURIComponent(escape(atob(base64)));

    // Parse JSON
    const data = JSON.parse(json) as CapturedElement;

    // Validate structure
    if (!isValidCapturedElement(data)) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Failed to decode extension content:", error);
    return null;
  }
}

/**
 * Validates that an object is a valid CapturedElement
 */
export function isValidCapturedElement(obj: unknown): obj is CapturedElement {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const data = obj as Record<string, unknown>;

  // Check required top-level fields
  if (typeof data.version !== "string" || !data.version) {
    return false;
  }

  if (data.type !== CAPTURE_TYPE) {
    return false;
  }

  if (typeof data.timestamp !== "number") {
    return false;
  }

  // Check data object
  if (!data.data || typeof data.data !== "object") {
    return false;
  }

  const innerData = data.data as Record<string, unknown>;

  // Check html
  if (typeof innerData.html !== "string") {
    return false;
  }

  // Check styles
  if (!innerData.styles || typeof innerData.styles !== "object") {
    return false;
  }

  // Check metadata
  if (!innerData.metadata || typeof innerData.metadata !== "object") {
    return false;
  }

  const metadata = innerData.metadata as Record<string, unknown>;

  if (typeof metadata.tagName !== "string") {
    return false;
  }

  if (!metadata.dimensions || typeof metadata.dimensions !== "object") {
    return false;
  }

  if (!metadata.position || typeof metadata.position !== "object") {
    return false;
  }

  if (typeof metadata.childCount !== "number") {
    return false;
  }

  return true;
}

/**
 * Parses clipboard content and returns structured result
 */
export function parseExtensionContent(text: string): ParsedExtensionContent {
  const isExtension = isExtensionContentFormat(text);

  if (!isExtension) {
    return {
      isExtensionContent: false,
      data: null,
      rawText: text,
    };
  }

  const data = decodeFromClipboard(text);

  return {
    isExtensionContent: true,
    data,
    rawText: text,
  };
}

/**
 * Formats captured element data for display in AI message
 * This is what gets sent to the AI agent
 */
export function formatForAI(captured: CapturedElement): string {
  return `[UNITSET_ELEMENT_CAPTURE]
Element: ${captured.data.metadata.tagName}
Dimensions: ${captured.data.metadata.dimensions.width}×${
    captured.data.metadata.dimensions.height
  }px

HTML:
\`\`\`html
${captured.data.html}
\`\`\`

Computed Styles:
\`\`\`json
${JSON.stringify(captured.data.styles, null, 2)}
\`\`\`
[/UNITSET_ELEMENT_CAPTURE]`;
}

/**
 * Metadata for display in chat messages
 */
export interface ExtensionMetadataDisplay {
  tagName: string;
  width: number;
  height: number;
}

/** Marker used in formatted AI messages */
const AI_FORMAT_START = "[UNITSET_ELEMENT_CAPTURE]";
const AI_FORMAT_END = "[/UNITSET_ELEMENT_CAPTURE]";

/**
 * Extracts extension metadata from a message that was sent to AI
 * Returns null if no extension content found
 */
export function extractExtensionDataFromMessage(
  content: string
): ExtensionMetadataDisplay | null {
  if (!content.includes(AI_FORMAT_START)) {
    return null;
  }

  // Extract element info from the formatted message
  const elementMatch = content.match(/Element:\s*(\w+)/);
  const dimensionsMatch = content.match(/Dimensions:\s*(\d+)×(\d+)px/);

  if (!elementMatch || !dimensionsMatch) {
    return null;
  }

  return {
    tagName: elementMatch[1],
    width: parseInt(dimensionsMatch[1], 10),
    height: parseInt(dimensionsMatch[2], 10),
  };
}

/**
 * Gets the user's text content from a message, excluding extension data
 */
export function getDisplayContentFromMessage(content: string): string {
  if (!content.includes(AI_FORMAT_START)) {
    return content;
  }

  // Remove the extension capture block
  const startIndex = content.indexOf(AI_FORMAT_START);
  const endIndex = content.indexOf(AI_FORMAT_END);

  if (startIndex === -1) {
    return content;
  }

  let displayContent = content.slice(0, startIndex).trim();

  if (endIndex !== -1) {
    displayContent += content.slice(endIndex + AI_FORMAT_END.length).trim();
  }

  // Clean up common prefixes
  displayContent = displayContent
    .replace(/^Replicate this element:\s*/i, "")
    .trim();

  return displayContent;
}
