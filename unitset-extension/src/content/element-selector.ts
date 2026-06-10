/**
 * Element Selector Content Script
 * Handles visual element selection, highlighting, and capture on webpages
 */

/// <reference types="chrome" />
import type { SelectionState, CapturedElement } from "../types/capture";
import { CLIPBOARD_PREFIX } from "../types/capture";
import { captureElement } from "./capture";

// Highlight styling constants
const HIGHLIGHT_OUTLINE = "2px solid #f97316";
const HIGHLIGHT_OUTLINE_OFFSET = "2px";

// Max size limit for captured content (100KB)
const MAX_CAPTURE_SIZE = 100 * 1024;

// Selection state
const state: SelectionState = {
  isActive: false,
  currentElement: null,
  originalOutline: null,
};

// Store original styles for cleanup
const originalStyles = new Map<
  HTMLElement,
  { outline: string; outlineOffset: string }
>();

/**
 * Highlights an element with the UnitSet orange outline
 */
export function highlightElement(element: HTMLElement): void {
  // Remove highlight from previous element
  if (state.currentElement && state.currentElement !== element) {
    removeHighlight();
  }

  // Store original styles
  if (!originalStyles.has(element)) {
    originalStyles.set(element, {
      outline: element.style.outline,
      outlineOffset: element.style.outlineOffset,
    });
  }

  // Apply highlight
  element.style.outline = HIGHLIGHT_OUTLINE;
  element.style.outlineOffset = HIGHLIGHT_OUTLINE_OFFSET;
  state.currentElement = element;
}

/**
 * Removes highlight from the current element
 */
export function removeHighlight(): void {
  if (state.currentElement) {
    const original = originalStyles.get(state.currentElement);
    if (original) {
      state.currentElement.style.outline = original.outline;
      state.currentElement.style.outlineOffset = original.outlineOffset;
      originalStyles.delete(state.currentElement);
    }
    state.currentElement = null;
  }
}

/**
 * Cleans up all highlights and restores original styles
 */
function cleanupAllHighlights(): void {
  originalStyles.forEach((original, element) => {
    element.style.outline = original.outline;
    element.style.outlineOffset = original.outlineOffset;
  });
  originalStyles.clear();
  state.currentElement = null;
}

/**
 * Mouse move handler - highlights element under cursor
 */
function handleMouseMove(event: MouseEvent): void {
  if (!state.isActive) return;

  const target = event.target as HTMLElement;

  // Skip if same element or not an HTMLElement
  if (target === state.currentElement || !(target instanceof HTMLElement)) {
    return;
  }

  // Skip html, body, and script/style elements
  const skipTags = ["HTML", "BODY", "SCRIPT", "STYLE", "NOSCRIPT"];
  if (skipTags.includes(target.tagName)) {
    return;
  }

  highlightElement(target);
}

/**
 * Estimates the size of captured content
 */
function estimateCaptureSize(captured: CapturedElement): number {
  return JSON.stringify(captured).length;
}

/**
 * Encodes captured element data for clipboard transfer
 * Format: UNITSET_CAPTURE:<base64-encoded-json>
 */
function encodeForClipboard(data: CapturedElement): string {
  const json = JSON.stringify(data);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return `${CLIPBOARD_PREFIX}${base64}`;
}

/**
 * Copies text to clipboard using the Clipboard API
 */
async function copyToClipboard(text: string): Promise<void> {
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

/**
 * Click handler - captures the selected element and auto-copies to clipboard
 */
async function handleClick(event: MouseEvent): Promise<void> {
  if (!state.isActive || !state.currentElement) return;

  // Prevent default behavior and stop propagation
  event.preventDefault();
  event.stopPropagation();

  try {
    // Capture the element
    const captured = captureElement(state.currentElement);

    // Check size limit
    const captureSize = estimateCaptureSize(captured);
    if (captureSize > MAX_CAPTURE_SIZE) {
      showSizeWarning();
      // Don't deactivate - let user try a smaller element
      return;
    }

    // Encode and copy to clipboard immediately
    const encoded = encodeForClipboard(captured);
    await copyToClipboard(encoded);

    // Show success confirmation
    showCaptureConfirmation();

    // Deactivate selection mode
    deactivateSelectionMode();
  } catch (error) {
    console.error("UnitSet: Failed to capture element", error);
    showErrorToast(
      error instanceof Error ? error.message : "Failed to capture element"
    );
    deactivateSelectionMode();
  }
}

/**
 * Keyboard handler - Escape to exit selection mode
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (!state.isActive) return;

  if (event.key === "Escape") {
    event.preventDefault();
    chrome.runtime.sendMessage({ type: "SELECTION_CANCELLED" });
    deactivateSelectionMode();
  }
}

/**
 * Activates element selection mode
 */
export function activateSelectionMode(): void {
  if (state.isActive) return;

  state.isActive = true;

  // Add event listeners
  document.addEventListener("mousemove", handleMouseMove, true);
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeyDown, true);

  // Change cursor to crosshair
  document.body.style.cursor = "crosshair";

  console.log("UnitSet: Selection mode activated");
}

/**
 * Deactivates element selection mode
 */
export function deactivateSelectionMode(): void {
  if (!state.isActive) return;

  state.isActive = false;

  // Remove event listeners
  document.removeEventListener("mousemove", handleMouseMove, true);
  document.removeEventListener("click", handleClick, true);
  document.removeEventListener("keydown", handleKeyDown, true);

  // Cleanup highlights
  cleanupAllHighlights();

  // Restore cursor
  document.body.style.cursor = "";

  console.log("UnitSet: Selection mode deactivated");
}

/**
 * Check if selection mode is active
 */
export function isSelectionActive(): boolean {
  return state.isActive;
}

/**
 * Shows a brief visual confirmation when element is captured and copied
 */
function showCaptureConfirmation(): void {
  // Remove any existing toast
  document.getElementById("unitset-toast")?.remove();

  const toast = document.createElement("div");
  toast.id = "unitset-toast";
  toast.innerHTML = `
    <div style="
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #171717;
      color: #fafafa;
      padding: 16px 24px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      border: 1px solid #22c55e;
      z-index: 2147483647;
      animation: unitset-slide-in 0.3s ease-out;
      max-width: 320px;
    ">
      <div style="display: flex; align-items: center; gap: 10px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <span style="font-weight: 600;">Copied to clipboard!</span>
      </div>
      <span style="color: #a1a1aa; font-size: 13px;">Paste in UnitSet AI sidebar to replicate this element</span>
    </div>
    <style>
      @keyframes unitset-slide-in {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    </style>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/**
 * Shows an error toast
 */
function showErrorToast(message: string): void {
  // Remove any existing toast
  document.getElementById("unitset-toast")?.remove();

  const toast = document.createElement("div");
  toast.id = "unitset-toast";
  toast.innerHTML = `
    <div style="
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #171717;
      color: #fafafa;
      padding: 16px 24px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      border: 1px solid #ef4444;
      z-index: 2147483647;
      animation: unitset-slide-in 0.3s ease-out;
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <span>${message}</span>
    </div>
    <style>
      @keyframes unitset-slide-in {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    </style>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/**
 * Shows a warning when element is too large
 */
function showSizeWarning(): void {
  // Remove any existing toast
  document.getElementById("unitset-toast")?.remove();

  const toast = document.createElement("div");
  toast.id = "unitset-toast";
  toast.innerHTML = `
    <div style="
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #171717;
      color: #fafafa;
      padding: 16px 24px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      border: 1px solid #fbbf24;
      z-index: 2147483647;
      animation: unitset-slide-in 0.3s ease-out;
      max-width: 320px;
    ">
      <div style="display: flex; align-items: center; gap: 10px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span style="font-weight: 600;">Element too large</span>
      </div>
      <span style="color: #a1a1aa; font-size: 13px;">Try selecting a smaller component (max 100KB)</span>
    </div>
    <style>
      @keyframes unitset-slide-in {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    </style>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "ACTIVATE_SELECTION") {
    activateSelectionMode();
    sendResponse({ success: true });
  } else if (message.type === "DEACTIVATE_SELECTION") {
    deactivateSelectionMode();
    sendResponse({ success: true });
  }
  return true;
});
