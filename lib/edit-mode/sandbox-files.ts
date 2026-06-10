/**
 * Sandbox File Operations
 *
 * Utilities for reading and writing files in the E2B sandbox,
 * specifically for injecting/removing the edit mode overlay script.
 */

import {
  injectScriptIntoLayout,
  removeScriptFromLayout,
  hasEditModeScript,
} from "./overlay-script";

// ============================================================================
// Constants
// ============================================================================

/**
 * Path to the root layout file in the sandbox
 */
export const LAYOUT_FILE_PATH = "/home/user/app/layout.tsx";

/**
 * Alternative layout paths to try
 */
export const ALTERNATIVE_LAYOUT_PATHS = [
  "/home/user/app/layout.tsx",
  "/home/user/src/app/layout.tsx",
  "/home/user/app/layout.jsx",
  "/home/user/src/app/layout.jsx",
];

// ============================================================================
// Storage for Original Content
// ============================================================================

/**
 * In-memory storage for original layout content per sandbox
 * This allows us to restore the exact original content when disabling edit mode
 */
const originalLayoutContent = new Map<string, string>();

/**
 * Store the original layout content for a sandbox
 */
export function storeOriginalContent(sandboxId: string, content: string): void {
  originalLayoutContent.set(sandboxId, content);
}

/**
 * Get the stored original layout content for a sandbox
 */
export function getOriginalContent(sandboxId: string): string | undefined {
  return originalLayoutContent.get(sandboxId);
}

/**
 * Clear the stored original content for a sandbox
 */
export function clearOriginalContent(sandboxId: string): void {
  originalLayoutContent.delete(sandboxId);
}

// ============================================================================
// API Functions (called from API routes)
// ============================================================================

/**
 * Read a file from the sandbox via API
 */
export async function readSandboxFile(
  sandboxId: string,
  path: string
): Promise<string> {
  const response = await fetch(
    `/api/sandbox/files/content?sandboxId=${encodeURIComponent(
      sandboxId
    )}&path=${encodeURIComponent(path)}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to read file");
  }

  const data = await response.json();
  return data.content;
}

/**
 * Write a file to the sandbox via API
 */
export async function writeSandboxFile(
  sandboxId: string,
  path: string,
  content: string
): Promise<void> {
  const response = await fetch("/api/sandbox/files/write", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId, path, content }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to write file");
  }
}

// ============================================================================
// Edit Mode Script Injection
// ============================================================================

/**
 * Find the layout file path in the sandbox
 * Tries multiple common paths
 */
export async function findLayoutFile(sandboxId: string): Promise<string> {
  for (const path of ALTERNATIVE_LAYOUT_PATHS) {
    try {
      await readSandboxFile(sandboxId, path);
      return path;
    } catch {
      // Try next path
      continue;
    }
  }

  throw new Error(
    "Could not find layout file in sandbox. Tried: " +
      ALTERNATIVE_LAYOUT_PATHS.join(", ")
  );
}

/**
 * Inject the edit mode overlay script into the sandbox layout file
 */
export async function injectOverlayScript(sandboxId: string): Promise<void> {
  // Find the layout file
  const layoutPath = await findLayoutFile(sandboxId);

  // Read current content
  const currentContent = await readSandboxFile(sandboxId, layoutPath);

  // Check if already injected
  if (hasEditModeScript(currentContent)) {
    console.log("[EditMode] Script already injected, skipping");
    return;
  }

  // Store original content for restoration
  storeOriginalContent(sandboxId, currentContent);

  // Inject the script
  const modifiedContent = injectScriptIntoLayout(currentContent);

  // Write back to sandbox
  await writeSandboxFile(sandboxId, layoutPath, modifiedContent);

  console.log("[EditMode] Script injected into", layoutPath);
}

/**
 * Remove the edit mode overlay script from the sandbox layout file
 */
export async function removeOverlayScript(sandboxId: string): Promise<void> {
  // Find the layout file
  const layoutPath = await findLayoutFile(sandboxId);

  // Try to restore from stored original content first
  const originalContent = getOriginalContent(sandboxId);
  if (originalContent) {
    await writeSandboxFile(sandboxId, layoutPath, originalContent);
    clearOriginalContent(sandboxId);
    console.log("[EditMode] Restored original layout from stored content");
    return;
  }

  // Fallback: read current content and remove script
  const currentContent = await readSandboxFile(sandboxId, layoutPath);

  if (!hasEditModeScript(currentContent)) {
    console.log("[EditMode] Script not found, nothing to remove");
    return;
  }

  const cleanedContent = removeScriptFromLayout(currentContent);
  await writeSandboxFile(sandboxId, layoutPath, cleanedContent);

  console.log("[EditMode] Script removed from", layoutPath);
}

// ============================================================================
// Source File Operations
// ============================================================================

/**
 * Read a source file from the sandbox
 */
export async function readSourceFile(
  sandboxId: string,
  path: string
): Promise<string> {
  // Ensure path starts with /home/user if it's a relative path
  const fullPath = path.startsWith("/") ? path : `/home/user/${path}`;
  return readSandboxFile(sandboxId, fullPath);
}

/**
 * Write a source file to the sandbox
 */
export async function writeSourceFile(
  sandboxId: string,
  path: string,
  content: string
): Promise<void> {
  // Ensure path starts with /home/user if it's a relative path
  const fullPath = path.startsWith("/") ? path : `/home/user/${path}`;
  await writeSandboxFile(sandboxId, fullPath, content);
}
