/**
 * Serialization Utilities
 * Functions for encoding/decoding captured element data for clipboard transfer
 */

import type { CapturedElement } from "../types/capture";
import { CLIPBOARD_PREFIX, CAPTURE_TYPE } from "../types/capture";

/**
 * Encodes captured element data for clipboard transfer
 * Format: UNITSET_CAPTURE:<base64-encoded-json>
 */
export function encodeForClipboard(data: CapturedElement): string {
  const json = JSON.stringify(data);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return `${CLIPBOARD_PREFIX}${base64}`;
}

/**
 * Decodes captured element data from clipboard content
 * Returns null if content is not valid extension format
 */
export function decodeFromClipboard(encoded: string): CapturedElement | null {
  // Check for prefix
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
    console.error("UnitSet: Failed to decode clipboard content", error);
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
 * Checks if a string is in the extension content format
 */
export function isExtensionContentFormat(text: string): boolean {
  if (!text.startsWith(CLIPBOARD_PREFIX)) {
    return false;
  }

  // Try to decode and validate
  const decoded = decodeFromClipboard(text);
  return decoded !== null;
}

/**
 * Copies text to clipboard using the Clipboard API
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Fallback for older browsers or restricted contexts
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
