/**
 * Element Finder
 *
 * Utilities for finding and verifying elements in JSX/TSX source code.
 * Used to ensure style changes are applied to the correct element.
 */

import type { SelectedElementInfo } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for finding an element in source code
 */
export interface FindElementOptions {
  tagName: string;
  id?: string;
  dataTestId?: string;
  textContent?: string;
  classNames?: string[];
  siblingIndex: number;
  parentContext?: string;
}

/**
 * Location of an element in source code
 */
export interface ElementLocation {
  /** Start position in source */
  start: number;
  /** End position in source */
  end: number;
  /** The full opening tag content */
  tagContent: string;
  /** Position of className attribute within tag */
  classNameStart?: number;
  /** End position of className attribute */
  classNameEnd?: number;
  /** Existing class names */
  existingClasses: string[];
  /** Confidence level of the match */
  confidence: "high" | "medium" | "low";
  /** Method used to find the element */
  method: "id" | "data-attr" | "text-content" | "structure" | "fallback";
}

/**
 * Result of element validation
 */
export interface ElementValidationResult {
  isValid: boolean;
  isUnique: boolean;
  matchCount: number;
  warning?: string;
  error?: string;
}

// ============================================================================
// Class Conflict Groups
// ============================================================================

/**
 * Tailwind class conflict groups - classes in the same group conflict with each other
 */
export const CLASS_CONFLICT_GROUPS: Record<string, RegExp> = {
  // Text colors
  textColor: /^text-([\w-]+)(?:\[.+\])?$/,
  // Background colors
  bgColor: /^bg-([\w-]+)(?:\[.+\])?$/,
  // Flex direction
  flexDirection: /^flex-(row|col|row-reverse|col-reverse)$/,
  // Justify content
  justifyContent:
    /^justify-(start|end|center|between|around|evenly|normal|stretch)$/,
  // Align items
  alignItems: /^items-(start|end|center|baseline|stretch)$/,
  // Font size
  fontSize: /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[.+\])$/,
  // Font weight
  fontWeight:
    /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[.+\])$/,
  // Gap (all directions)
  gap: /^gap-(\d+|px|\[.+\])$/,
  // Gap X
  gapX: /^gap-x-(\d+|px|\[.+\])$/,
  // Gap Y
  gapY: /^gap-y-(\d+|px|\[.+\])$/,
  // Padding (all sides)
  padding: /^p-(\d+|px|auto|\[.+\])$/,
  // Padding top
  paddingTop: /^pt-(\d+|px|auto|\[.+\])$/,
  // Padding right
  paddingRight: /^pr-(\d+|px|auto|\[.+\])$/,
  // Padding bottom
  paddingBottom: /^pb-(\d+|px|auto|\[.+\])$/,
  // Padding left
  paddingLeft: /^pl-(\d+|px|auto|\[.+\])$/,
  // Padding X
  paddingX: /^px-(\d+|px|auto|\[.+\])$/,
  // Padding Y
  paddingY: /^py-(\d+|px|auto|\[.+\])$/,
  // Margin (all sides)
  margin: /^m-(\d+|px|auto|\[.+\])$/,
  // Margin top
  marginTop: /^mt-(\d+|px|auto|\[.+\])$/,
  // Margin right
  marginRight: /^mr-(\d+|px|auto|\[.+\])$/,
  // Margin bottom
  marginBottom: /^mb-(\d+|px|auto|\[.+\])$/,
  // Margin left
  marginLeft: /^ml-(\d+|px|auto|\[.+\])$/,
  // Margin X
  marginX: /^mx-(\d+|px|auto|\[.+\])$/,
  // Margin Y
  marginY: /^my-(\d+|px|auto|\[.+\])$/,
  // Border radius
  borderRadius: /^rounded(-[a-z]+)?(-[a-z0-9]+)?$/,
  // Display
  display:
    /^(block|inline|inline-block|flex|inline-flex|grid|inline-grid|hidden|contents|flow-root)$/,
  // Width
  width: /^w-(\d+|px|auto|full|screen|min|max|fit|\[.+\])$/,
  // Height
  height: /^h-(\d+|px|auto|full|screen|min|max|fit|\[.+\])$/,
  // Opacity
  opacity: /^opacity-(\d+|\[.+\])$/,
  // Text align
  textAlign: /^text-(left|center|right|justify|start|end)$/,
  // Flex wrap
  flexWrap: /^flex-(wrap|nowrap|wrap-reverse)$/,
  // Border color
  borderColor: /^border-([\w-]+)(?:\[.+\])?$/,
};

/**
 * Get the conflict group for a Tailwind class
 */
export function getConflictGroup(className: string): string | null {
  for (const [group, pattern] of Object.entries(CLASS_CONFLICT_GROUPS)) {
    if (pattern.test(className)) {
      return group;
    }
  }
  return null;
}

/**
 * Get all classes from an existing list that conflict with a new class
 */
export function getConflictingClasses(
  existingClasses: string[],
  newClass: string
): string[] {
  const newGroup = getConflictGroup(newClass);
  if (!newGroup) return [];

  return existingClasses.filter((cls) => {
    const clsGroup = getConflictGroup(cls);
    return clsGroup === newGroup;
  });
}

// ============================================================================
// Element Finding Functions
// ============================================================================

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find an element in JSX source code by ID
 */
function findElementById(
  sourceCode: string,
  id: string
): ElementLocation | null {
  // Match id="value" or id={'value'} or id={`value`}
  const idRegex = new RegExp(
    `<([a-zA-Z][a-zA-Z0-9]*)\\s+[^>]*id\\s*=\\s*(?:"${escapeRegex(
      id
    )}"|'${escapeRegex(id)}'|\\{['"\`]${escapeRegex(id)}['"\`]\\})[^>]*>`,
    "g"
  );

  const match = idRegex.exec(sourceCode);
  if (!match) return null;

  const tagContent = match[0];
  const start = match.index;
  const end = start + tagContent.length;

  // Extract existing classes
  const classMatch = tagContent.match(
    /className\s*=\s*(?:"([^"]*)"|'([^']*)'|{`([^`]*)`})/
  );
  const existingClasses = classMatch
    ? (classMatch[1] || classMatch[2] || classMatch[3] || "")
        .split(/\s+/)
        .filter(Boolean)
    : [];

  return {
    start,
    end,
    tagContent,
    existingClasses,
    confidence: "high",
    method: "id",
  };
}

/**
 * Find an element in JSX source code by data-testid
 */
function findElementByDataTestId(
  sourceCode: string,
  testId: string
): ElementLocation | null {
  // Match data-testid="value" or data-testid={'value'}
  const testIdRegex = new RegExp(
    `<([a-zA-Z][a-zA-Z0-9]*)\\s+[^>]*data-testid\\s*=\\s*(?:"${escapeRegex(
      testId
    )}"|'${escapeRegex(testId)}'|\\{['"\`]${escapeRegex(
      testId
    )}['"\`]\\})[^>]*>`,
    "g"
  );

  const match = testIdRegex.exec(sourceCode);
  if (!match) return null;

  const tagContent = match[0];
  const start = match.index;
  const end = start + tagContent.length;

  // Extract existing classes
  const classMatch = tagContent.match(
    /className\s*=\s*(?:"([^"]*)"|'([^']*)'|{`([^`]*)`})/
  );
  const existingClasses = classMatch
    ? (classMatch[1] || classMatch[2] || classMatch[3] || "")
        .split(/\s+/)
        .filter(Boolean)
    : [];

  return {
    start,
    end,
    tagContent,
    existingClasses,
    confidence: "high",
    method: "data-attr",
  };
}

/**
 * Find an element in JSX source code by unique text content
 */
function findElementByTextContent(
  sourceCode: string,
  tagName: string,
  textContent: string
): ElementLocation | null {
  if (!textContent || textContent.length < 3) return null;

  // Escape the text content for regex
  const escapedText = escapeRegex(textContent.trim().substring(0, 50));

  // Match opening tag followed by text content
  const textRegex = new RegExp(
    `<(${tagName})\\s*([^>]*)>\\s*${escapedText}`,
    "gi"
  );

  const matches: Array<{ index: number; match: string }> = [];
  let match;
  while ((match = textRegex.exec(sourceCode)) !== null) {
    matches.push({ index: match.index, match: match[0] });
  }

  // Only use if unique match
  if (matches.length !== 1) return null;

  const foundMatch = matches[0];
  // Find the end of the opening tag
  const tagEndIndex = sourceCode.indexOf(">", foundMatch.index);
  if (tagEndIndex === -1) return null;

  const tagContent = sourceCode.substring(foundMatch.index, tagEndIndex + 1);

  // Extract existing classes
  const classMatch = tagContent.match(
    /className\s*=\s*(?:"([^"]*)"|'([^']*)'|{`([^`]*)`})/
  );
  const existingClasses = classMatch
    ? (classMatch[1] || classMatch[2] || classMatch[3] || "")
        .split(/\s+/)
        .filter(Boolean)
    : [];

  return {
    start: foundMatch.index,
    end: tagEndIndex + 1,
    tagContent,
    existingClasses,
    confidence: "medium",
    method: "text-content",
  };
}

/**
 * Find an element in JSX source code using multiple strategies
 */
export function findElementInSource(
  sourceCode: string,
  elementInfo: SelectedElementInfo
): ElementLocation | null {
  // Strategy 1: Find by ID (highest confidence)
  if (elementInfo.id) {
    const byId = findElementById(sourceCode, elementInfo.id);
    if (byId) return byId;
  }

  // Strategy 2: Find by data-testid
  if (elementInfo.dataAttributes?.testid) {
    const byTestId = findElementByDataTestId(
      sourceCode,
      elementInfo.dataAttributes.testid
    );
    if (byTestId) return byTestId;
  }

  // Strategy 3: Find by data-id
  if (elementInfo.dataAttributes?.id) {
    const byDataId = findElementByDataTestId(
      sourceCode,
      elementInfo.dataAttributes.id
    );
    if (byDataId) return byDataId;
  }

  // Strategy 4: Find by unique text content (for text elements)
  if (elementInfo.textContent) {
    const byText = findElementByTextContent(
      sourceCode,
      elementInfo.tagName,
      elementInfo.textContent
    );
    if (byText) return byText;
  }

  // Strategy 5: Fallback - find first matching tag with similar classes
  // This is low confidence and should trigger a warning
  return null;
}

/**
 * Verify that an element location matches the expected element info
 */
export function verifyElementMatch(
  sourceCode: string,
  location: ElementLocation,
  elementInfo: SelectedElementInfo
): boolean {
  const tagContent = location.tagContent.toLowerCase();

  // Verify tag name
  if (!tagContent.startsWith(`<${elementInfo.tagName.toLowerCase()}`)) {
    return false;
  }

  // If we found by ID, verify the ID matches
  if (elementInfo.id && location.method === "id") {
    const idMatch = tagContent.match(/id\s*=\s*["']([^"']+)["']/);
    if (!idMatch || idMatch[1] !== elementInfo.id) {
      return false;
    }
  }

  return true;
}

/**
 * Update className at a specific location in source code
 */
export function updateClassNameAtLocation(
  sourceCode: string,
  location: ElementLocation,
  newClasses: string[]
): string {
  const tagContent = location.tagContent;

  // Find className in this specific element
  const classNameRegex = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|{`([^`]*)`})/;
  const match = classNameRegex.exec(tagContent);

  let updatedTag: string;

  if (match) {
    const existingClasses = (match[1] || match[2] || match[3] || "")
      .split(/\s+/)
      .filter(Boolean);

    // Filter out conflicting classes
    const filteredClasses = existingClasses.filter((cls) => {
      for (const newClass of newClasses) {
        const conflicts = getConflictingClasses([cls], newClass);
        if (conflicts.length > 0) return false;
      }
      return true;
    });

    // Combine filtered existing classes with new classes
    const combinedClasses = [...filteredClasses, ...newClasses].join(" ");

    // Determine quote style
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

    // Replace only in this element
    updatedTag = tagContent.replace(fullMatch, newClassName);
  } else {
    // No className found, add one before the closing >
    const insertPos = tagContent.length - 1;
    const newClassName = `className="${newClasses.join(" ")}"`;
    updatedTag =
      tagContent.slice(0, insertPos) +
      ` ${newClassName}` +
      tagContent.slice(insertPos);
  }

  return (
    sourceCode.slice(0, location.start) +
    updatedTag +
    sourceCode.slice(location.end)
  );
}

/**
 * Validate that an element can be uniquely located in source code
 */
export function validateElementLocation(
  sourceCode: string,
  elementInfo: SelectedElementInfo
): ElementValidationResult {
  // Try to find the element
  const location = findElementInSource(sourceCode, elementInfo);

  if (!location) {
    return {
      isValid: false,
      isUnique: false,
      matchCount: 0,
      error:
        "Could not locate element in source file. Consider adding an id or data-testid attribute.",
    };
  }

  // Verify the match
  const verified = verifyElementMatch(sourceCode, location, elementInfo);
  if (!verified) {
    return {
      isValid: false,
      isUnique: false,
      matchCount: 1,
      error: "Found element does not match expected characteristics.",
    };
  }

  // Check confidence level
  if (location.confidence === "low") {
    return {
      isValid: true,
      isUnique: false,
      matchCount: 1,
      warning:
        "Element found with low confidence. Multiple elements may share similar characteristics. Consider adding an id or data-testid attribute.",
    };
  }

  if (location.confidence === "medium") {
    return {
      isValid: true,
      isUnique: true,
      matchCount: 1,
      warning:
        "Element found with medium confidence. For best results, consider adding an id or data-testid attribute.",
    };
  }

  return {
    isValid: true,
    isUnique: true,
    matchCount: 1,
  };
}
