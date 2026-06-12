/**
 * Selector Generator
 *
 * Utilities for generating unique CSS selectors that target specific elements.
 * Used to ensure style changes only affect the intended element, even when
 * multiple elements share the same class or are rendered in loops.
 */

import type { SelectedElementInfo } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * Confidence level of the generated selector
 */
export type SelectorConfidence = "high" | "medium" | "low";

/**
 * Method used to generate the selector
 */
export type SelectorMethod =
  | "id"
  | "data-attr"
  | "nth-child"
  | "path"
  | "structure"
  | "text-content";

/**
 * Result of selector generation
 */
export interface UniqueSelector {
  selector: string;
  confidence: SelectorConfidence;
  method: SelectorMethod;
}

/**
 * Verification data for confirming selector matches the correct element
 */
export interface SelectorVerification {
  tagName: string;
  textContent?: string;
  textContentHash?: string;
  classNames?: string[];
  siblingIndex: number;
  childIndex: number;
  parentTag?: string;
}

// ============================================================================
// Selector Generation
// ============================================================================

/**
 * Generate a unique CSS selector for an element based on its info
 */
export function generateUniqueSelector(
  element: SelectedElementInfo
): UniqueSelector {
  // Priority 1: ID-based selector (highest confidence)
  if (element.id) {
    return {
      selector: `#${escapeSelector(element.id)}`,
      confidence: "high",
      method: "id",
    };
  }

  // Priority 2: data-testid attribute
  if (element.dataAttributes?.testid) {
    return {
      selector: `[data-testid="${escapeAttrValue(
        element.dataAttributes.testid
      )}"]`,
      confidence: "high",
      method: "data-attr",
    };
  }

  // Priority 3: data-id attribute
  if (element.dataAttributes?.id) {
    return {
      selector: `[data-id="${escapeAttrValue(element.dataAttributes.id)}"]`,
      confidence: "high",
      method: "data-attr",
    };
  }

  // Priority 4: Structural selector using nearest ID ancestor
  const structuralSelector = generateStructuralSelector(element);
  if (structuralSelector) {
    return structuralSelector;
  }

  // Priority 5: Use element path with nth-of-type
  const pathSelector = generatePathSelector(element);
  if (pathSelector) {
    return {
      selector: pathSelector,
      confidence: "medium",
      method: "path",
    };
  }

  // Fallback: Use element path as-is
  return {
    selector: element.elementPath,
    confidence: "low",
    method: "path",
  };
}

/**
 * Generate a structural selector using parent context and child index
 * This provides better uniqueness for elements without IDs
 */
export function generateStructuralSelector(
  element: SelectedElementInfo
): UniqueSelector | null {
  const { nearestIdAncestor, tagName, childIndex, parentTagName, parentId } =
    element;

  // If we have a nearest ID ancestor, use it as the base
  if (nearestIdAncestor) {
    const selector = `#${escapeSelector(nearestIdAncestor.id)} ${
      nearestIdAncestor.pathFromAncestor
    }`;
    return {
      selector,
      confidence: "medium",
      method: "structure",
    };
  }

  // If we have parent info, build a selector using parent context
  if (parentTagName) {
    let selector = "";

    // If parent has an ID, use it
    if (parentId) {
      selector = `#${escapeSelector(parentId)} > ${tagName}:nth-child(${
        childIndex + 1
      })`;
      return {
        selector,
        confidence: "medium",
        method: "structure",
      };
    }

    // Use parent tag with child index
    selector = `${parentTagName} > ${tagName}:nth-child(${childIndex + 1})`;

    // For text elements with unique content, add text content hash as a comment for verification
    // The selector itself uses structural positioning
    return {
      selector,
      confidence: "low",
      method: "structure",
    };
  }

  return null;
}

/**
 * Generate verification data for a selector
 * Used to confirm the selector matches the correct element
 */
export function generateVerificationData(
  element: SelectedElementInfo
): SelectorVerification {
  return {
    tagName: element.tagName,
    textContent: element.textContent,
    textContentHash: element.textContentHash,
    classNames: element.className
      ? element.className.split(/\s+/).filter(Boolean)
      : undefined,
    siblingIndex: element.siblingIndex,
    childIndex: element.childIndex,
    parentTag: element.parentTagName,
  };
}

/**
 * Generate a path-based selector using nth-of-type for uniqueness
 */
function generatePathSelector(element: SelectedElementInfo): string | null {
  const { elementPath, siblingIndex, tagName } = element;

  // If the path already contains nth-of-type, use it directly
  if (elementPath.includes(":nth-of-type")) {
    return elementPath;
  }

  // Build a more specific selector using sibling index
  const pathParts = elementPath.split(" > ");
  if (pathParts.length === 0) return null;

  // Add nth-of-type to the last element in the path
  const lastPart = pathParts[pathParts.length - 1];
  const tagPart = lastPart.split(".")[0].split(":")[0]; // Get just the tag name

  // Replace the last part with a more specific selector
  pathParts[pathParts.length - 1] = `${tagPart}:nth-of-type(${
    siblingIndex + 1
  })`;

  return pathParts.join(" > ");
}

/**
 * Escape special characters in CSS selector
 */
function escapeSelector(str: string): string {
  return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
}

/**
 * Escape special characters in attribute value
 */
function escapeAttrValue(str: string): string {
  return str.replace(/"/g, '\\"');
}

// ============================================================================
// Selector Validation
// ============================================================================

/**
 * Result of selector uniqueness validation
 */
export interface SelectorValidationResult {
  isUnique: boolean;
  matchCount: number;
  confidence: SelectorConfidence;
  warning?: string;
}

/**
 * Validate that a selector uniquely identifies exactly one element
 * This function is meant to be called in the browser context
 */
export function validateSelectorUniqueness(
  selector: string,
  document: Document
): boolean {
  try {
    const matches = document.querySelectorAll(selector);
    return matches.length === 1;
  } catch {
    // Invalid selector
    return false;
  }
}

/**
 * Validate selector uniqueness with detailed result
 * Returns confidence level based on validation result
 */
export function validateSelectorWithConfidence(
  selector: string,
  document: Document,
  verification?: SelectorVerification
): SelectorValidationResult {
  try {
    const matches = document.querySelectorAll(selector);
    const matchCount = matches.length;

    if (matchCount === 0) {
      return {
        isUnique: false,
        matchCount: 0,
        confidence: "low",
        warning: "Selector matches no elements",
      };
    }

    if (matchCount === 1) {
      // If we have verification data, verify the match
      if (verification) {
        const element = matches[0] as HTMLElement;
        const verified = verifyElementMatch(element, verification);
        return {
          isUnique: true,
          matchCount: 1,
          confidence: verified ? "high" : "medium",
          warning: verified
            ? undefined
            : "Element found but verification failed",
        };
      }
      return {
        isUnique: true,
        matchCount: 1,
        confidence: "high",
      };
    }

    // Multiple matches - try to find the correct one using verification
    if (verification) {
      let verifiedCount = 0;
      for (let i = 0; i < matches.length; i++) {
        if (verifyElementMatch(matches[i] as HTMLElement, verification)) {
          verifiedCount++;
        }
      }
      if (verifiedCount === 1) {
        return {
          isUnique: false,
          matchCount,
          confidence: "medium",
          warning: `Selector matches ${matchCount} elements, but only 1 passes verification`,
        };
      }
    }

    return {
      isUnique: false,
      matchCount,
      confidence: "low",
      warning: `Selector matches ${matchCount} elements`,
    };
  } catch (error) {
    return {
      isUnique: false,
      matchCount: 0,
      confidence: "low",
      warning: `Invalid selector: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }
}

/**
 * Verify that an element matches the expected verification data
 */
export function verifyElementMatch(
  element: HTMLElement,
  verification: SelectorVerification
): boolean {
  // Check tag name
  if (element.tagName.toLowerCase() !== verification.tagName.toLowerCase()) {
    return false;
  }

  // Check parent tag if specified
  if (verification.parentTag && element.parentElement) {
    if (
      element.parentElement.tagName.toLowerCase() !==
      verification.parentTag.toLowerCase()
    ) {
      return false;
    }
  }

  // Check child index if specified
  if (verification.childIndex !== undefined && element.parentElement) {
    const children = Array.from(element.parentElement.children);
    const actualIndex = children.indexOf(element);
    if (actualIndex !== verification.childIndex) {
      return false;
    }
  }

  // Check sibling index if specified
  if (verification.siblingIndex !== undefined && element.parentElement) {
    const siblings = Array.from(element.parentElement.children).filter(
      (child) => child.tagName === element.tagName
    );
    const actualIndex = siblings.indexOf(element);
    if (actualIndex !== verification.siblingIndex) {
      return false;
    }
  }

  // Check text content hash if specified (for text elements)
  if (verification.textContentHash && element.textContent) {
    const actualHash = hashTextContent(element.textContent);
    if (actualHash !== verification.textContentHash) {
      return false;
    }
  }

  return true;
}

/**
 * Simple hash function for text content (matches overlay script implementation)
 */
function hashTextContent(text: string): string {
  if (!text) return "";
  // Simple djb2 hash
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) + hash + text.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Find the best selector from multiple candidates
 */
export function findBestSelector(
  candidates: UniqueSelector[],
  document: Document
): UniqueSelector | null {
  // Sort by confidence (high > medium > low)
  const sorted = [...candidates].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });

  // Return the first one that uniquely identifies an element
  for (const candidate of sorted) {
    if (validateSelectorUniqueness(candidate.selector, document)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Generate multiple selector candidates and find the best unique one
 */
export function generateAndValidateSelector(
  element: SelectedElementInfo,
  document: Document
): { selector: UniqueSelector; validation: SelectorValidationResult } | null {
  const candidates: UniqueSelector[] = [];
  const verification = generateVerificationData(element);

  // Generate all possible selectors
  // Priority 1: ID-based selector
  if (element.id) {
    candidates.push({
      selector: `#${escapeSelector(element.id)}`,
      confidence: "high",
      method: "id",
    });
  }

  // Priority 2: data-testid attribute
  if (element.dataAttributes?.testid) {
    candidates.push({
      selector: `[data-testid="${escapeAttrValue(
        element.dataAttributes.testid
      )}"]`,
      confidence: "high",
      method: "data-attr",
    });
  }

  // Priority 3: data-id attribute
  if (element.dataAttributes?.id) {
    candidates.push({
      selector: `[data-id="${escapeAttrValue(element.dataAttributes.id)}"]`,
      confidence: "high",
      method: "data-attr",
    });
  }

  // Priority 4: Structural selector
  const structuralSelector = generateStructuralSelector(element);
  if (structuralSelector) {
    candidates.push(structuralSelector);
  }

  // Priority 5: Path selector
  const pathSelector = generatePathSelector(element);
  if (pathSelector) {
    candidates.push({
      selector: pathSelector,
      confidence: "medium",
      method: "path",
    });
  }

  // Validate each candidate and return the best one
  for (const candidate of candidates) {
    const validation = validateSelectorWithConfidence(
      candidate.selector,
      document,
      verification
    );
    if (validation.isUnique) {
      return { selector: candidate, validation };
    }
  }

  // If no unique selector found, return the best candidate with its validation
  if (candidates.length > 0) {
    const bestCandidate = candidates[0];
    const validation = validateSelectorWithConfidence(
      bestCandidate.selector,
      document,
      verification
    );
    return { selector: bestCandidate, validation };
  }

  return null;
}

// ============================================================================
// Source Code Selector Matching
// ============================================================================

/**
 * Convert a CSS selector to a pattern for finding elements in JSX source code
 * This is used to locate the element in the source file for modification
 */
export function selectorToSourcePattern(
  selector: UniqueSelector
): RegExp | null {
  const { selector: sel, method } = selector;

  switch (method) {
    case "id":
      // Match id="value" or id={'value'} or id={`value`}
      const idValue = sel.replace("#", "").replace(/\\/g, "");
      return new RegExp(
        `id\\s*=\\s*(?:"${escapeRegex(idValue)}"|'${escapeRegex(
          idValue
        )}'|\\{['"\`]${escapeRegex(idValue)}['"\`]\\})`,
        "g"
      );

    case "data-attr":
      // Match data-testid="value" or data-id="value"
      const attrMatch = sel.match(/\[data-(\w+)="([^"]+)"\]/);
      if (attrMatch) {
        const [, attrName, attrValue] = attrMatch;
        return new RegExp(
          `data-${attrName}\\s*=\\s*(?:"${escapeRegex(
            attrValue
          )}"|'${escapeRegex(attrValue)}'|\\{['"\`]${escapeRegex(
            attrValue
          )}['"\`]\\})`,
          "g"
        );
      }
      return null;

    case "path":
    case "nth-child":
      // Path-based selectors are harder to match in source
      // We'll need to use AST parsing for these cases
      return null;

    default:
      return null;
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
