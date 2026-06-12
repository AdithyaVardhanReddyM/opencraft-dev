# Design Document: Edit Mode Property Fixes

## Overview

This design addresses critical bugs in the Visual Element Editor where style changes are applied globally instead of to specific elements. The root cause is that the current implementation falls back to updating the first `className` match in the source file when it cannot uniquely identify an element. This design introduces improved element targeting, better source code manipulation, and proper Tailwind class conflict resolution.

## Architecture

The edit mode system consists of three main layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Parent Window (Next.js App)                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Property Panel │  │  Edit Mode Hook │  │  Style Mapper   │  │
│  │  (UI Components)│  │  (State Mgmt)   │  │  (CSS→Tailwind) │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │                                │
│                         postMessage                             │
│                                │                                │
└────────────────────────────────┼────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────┐
│                     Sandbox Iframe (E2B)                        │
│                                │                                │
│  ┌─────────────────────────────┴─────────────────────────────┐  │
│  │                    Overlay Script                          │  │
│  │  - Element selection & highlighting                        │  │
│  │  - Computed styles extraction                              │  │
│  │  - Inline style application                                │  │
│  │  - Unique identifier generation                            │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced Selector Generator (`lib/edit-mode/selector-generator.ts`)

**Current Issue:** The selector generator only produces high-confidence selectors for elements with IDs or data-testids. For other elements, it falls back to path-based selectors that cannot be reliably matched in source code.

**Solution:** Implement AST-based source code matching that uses multiple element characteristics:

```typescript
interface EnhancedSelector {
  // Primary selector for DOM queries
  domSelector: string;

  // Pattern for finding element in JSX source
  sourcePattern: SourcePattern;

  // Confidence level
  confidence: "high" | "medium" | "low";

  // Method used
  method: "id" | "data-attr" | "text-content" | "structure" | "position";

  // Verification data
  verification: {
    tagName: string;
    textContent?: string;
    classNames?: string[];
    siblingIndex: number;
    parentTag?: string;
  };
}

interface SourcePattern {
  // Regex or string pattern to find the element opening tag
  pattern: RegExp | string;

  // Context lines before/after for verification
  contextBefore?: string;
  contextAfter?: string;
}
```

### 2. Improved Style Mapper (`lib/edit-mode/style-mapper.ts`)

**Current Issue:** The `updateElementClassName` function uses a simple regex that matches the first `className` in the file.

**Solution:** Implement precise element targeting using multiple strategies:

```typescript
interface ElementLocation {
  // Start and end positions in source
  start: number;
  end: number;

  // The full opening tag content
  tagContent: string;

  // Position of className attribute within tag
  classNameStart?: number;
  classNameEnd?: number;

  // Existing class names
  existingClasses: string[];
}

// New function to find element with verification
function findElementInSource(
  sourceCode: string,
  selector: EnhancedSelector
): ElementLocation | null;

// New function to update className at specific location
function updateClassNameAtLocation(
  sourceCode: string,
  location: ElementLocation,
  newClasses: string[]
): string;
```

### 3. Enhanced Class Conflict Resolution

**Current Issue:** The `extractClassPrefixes` function only extracts simple prefixes, missing complex Tailwind patterns.

**Solution:** Implement comprehensive conflict detection:

```typescript
// Tailwind class categories for conflict detection
const CLASS_CONFLICT_GROUPS = {
  textColor: /^text-([\w-]+)$/, // text-red-500, text-[#fff]
  bgColor: /^bg-([\w-]+)$/, // bg-blue-500, bg-[#000]
  flexDirection: /^flex-(row|col|row-reverse|col-reverse)$/,
  justifyContent: /^justify-(start|end|center|between|around|evenly)$/,
  alignItems: /^items-(start|end|center|baseline|stretch)$/,
  fontSize: /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[.+\])$/,
  fontWeight:
    /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[.+\])$/,
  gap: /^gap-(x-|y-)?(\d+|px|\[.+\])$/,
  padding: /^p[trblxy]?-(\d+|px|auto|\[.+\])$/,
  margin: /^m[trblxy]?-(\d+|px|auto|\[.+\])$/,
  borderRadius: /^rounded(-[a-z]+)?(-[a-z0-9]+)?$/,
  display:
    /^(block|inline|inline-block|flex|inline-flex|grid|inline-grid|hidden)$/,
};

function getConflictingClasses(
  existingClasses: string[],
  newClass: string
): string[];
```

### 4. Source Code Element Finder

**New Component:** A robust element finder that uses multiple strategies:

```typescript
interface FindElementOptions {
  tagName: string;
  id?: string;
  dataTestId?: string;
  textContent?: string;
  classNames?: string[];
  siblingIndex: number;
  parentContext?: string;
}

function findElementInJSX(
  sourceCode: string,
  options: FindElementOptions
): ElementLocation | null {
  // Strategy 1: Find by ID attribute
  // Strategy 2: Find by data-testid attribute
  // Strategy 3: Find by unique text content
  // Strategy 4: Find by tag + position in parent
  // Strategy 5: Find by class combination + position
}
```

## Data Models

### SelectedElementInfo (Enhanced)

```typescript
interface SelectedElementInfo {
  tagName: string;
  className: string;
  id: string;
  computedStyles: ComputedStylesInfo;
  boundingRect: BoundingRect;
  elementPath: string;
  sourceFile?: string;
  textContent?: string;

  // Enhanced identification
  uniqueIdentifier: string;
  siblingIndex: number;
  dataAttributes: Record<string, string>;

  // New fields for better targeting
  parentTagName?: string;
  parentId?: string;
  childIndex: number; // Index among all children (not just same-tag siblings)
  nearestIdAncestor?: {
    id: string;
    pathFromAncestor: string;
  };
}
```

### StyleChanges (Enhanced)

```typescript
interface StyleChanges {
  [property: string]: string;
}

interface PendingUpdate {
  elementInfo: SelectedElementInfo;
  changes: StyleChanges;
  tailwindClasses: string[];
  sourceLocation?: ElementLocation;
  verified: boolean;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Element-specific style application

_For any_ selected element and style change, applying the change via postMessage SHALL modify only that element's inline style, leaving all other elements unchanged.
**Validates: Requirements 1.1**

### Property 2: Source file single-element update

_For any_ source file with multiple elements and a save operation targeting one element, the resulting source file SHALL have exactly one className modification at the correct element location.
**Validates: Requirements 1.2**

### Property 3: Unique selector generation for duplicates

_For any_ HTML document with multiple elements sharing the same tag and classes, the generated selector SHALL include nth-of-type or positional information that uniquely identifies each element.
**Validates: Requirements 1.3**

### Property 4: Pending changes override computed values

_For any_ property with a pending change, the getValue function SHALL return the pending value; for properties without pending changes, it SHALL return the computed value.
**Validates: Requirements 2.2**

### Property 5: RGB to hex conversion correctness

_For any_ valid RGB or RGBA color string, the rgbToHex function SHALL produce a valid 6-character hex color code.
**Validates: Requirements 2.3**

### Property 6: CSS to Tailwind mapping correctness

_For any_ valid CSS property value (flexDirection, justifyContent, alignItems, gap), the cssToTailwind function SHALL produce the corresponding valid Tailwind class.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 7: Class conflict resolution

_For any_ existing className string and new Tailwind class, adding the new class SHALL remove all existing classes that conflict with it (same prefix/category).
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6**

### Property 8: Selector method priority

_For any_ element with an id attribute, the selector generator SHALL use 'id' method; for elements with data-testid but no id, it SHALL use 'data-attr' method; otherwise it SHALL use structural methods.
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 9: CSS property name formatting

_For any_ CSS property name in kebab-case, the conversion to camelCase SHALL produce the correct JavaScript property name for style assignment.
**Validates: Requirements 6.4**

### Property 10: Arbitrary value escaping

_For any_ Tailwind arbitrary value containing special characters, the generated class SHALL properly escape those characters.
**Validates: Requirements 5.5**

## Error Handling

### Element Not Found

When the system cannot locate an element in source code:

1. Display error message: "Could not locate element in source file"
2. Prevent save operation
3. Keep pending changes for retry after user adds identifier

### Multiple Matches

When a selector matches multiple elements:

1. Display warning: "Multiple elements match this selector"
2. Show count of matches
3. Suggest adding id or data-testid to the element
4. Allow user to proceed with caution or cancel

### Source File Parse Error

When source file cannot be parsed:

1. Display error: "Could not parse source file"
2. Log detailed error for debugging
3. Prevent save operation

## Testing Strategy

### Unit Testing

- Test rgbToHex with various RGB/RGBA formats
- Test cssToTailwind mappings for all supported properties
- Test class conflict detection for all conflict groups
- Test selector generation for elements with various attributes

### Property-Based Testing

The property-based testing library for this project is **fast-check** (TypeScript/JavaScript).

Each property-based test MUST:

1. Be tagged with a comment referencing the correctness property: `**Feature: edit-mode-property-fixes, Property {number}: {property_text}**`
2. Run a minimum of 100 iterations
3. Use smart generators that constrain to valid input spaces

**Test Files:**

- `lib/edit-mode/__tests__/style-mapper.property.test.ts` - Properties 5, 6, 7, 9, 10
- `lib/edit-mode/__tests__/selector-generator.property.test.ts` - Properties 3, 8
- `lib/edit-mode/__tests__/element-finder.property.test.ts` - Property 2

### Integration Testing

- Test full flow: select element → modify style → save → verify source
- Test with various JSX patterns (single quotes, double quotes, template literals)
- Test with nested elements and complex DOM structures
