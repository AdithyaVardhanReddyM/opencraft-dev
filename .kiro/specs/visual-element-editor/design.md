# Design Document: Visual Element Editor

## Overview

The Visual Element Editor enables users to visually select and modify UI elements within the AI-generated sandbox preview iframe. When users switch to the "Edit" tab in the AI sidebar, an overlay script is dynamically injected into the sandbox's root layout file. This script intercepts pointer events to provide element highlighting on hover, selection on click, and bidirectional communication with the parent window for style inspection and modification.

The system follows a three-phase workflow:

1. **Inspection**: Hover to highlight elements, click to select
2. **Modification**: Edit properties in the sidebar, see live DOM updates
3. **Persistence**: Save changes by mapping CSS to Tailwind classes and updating source files

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Canvas Page                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        AISidebar                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  │  Tabs: [Chat] [Edit] [Code]                                 │ │   │
│  │  └─────────────────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  │  EditModePanel (when Edit tab active)                       │ │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐│ │   │
│  │  │  │  ElementPropertiesPanel                                 ││ │   │
│  │  │  │  - Typography controls                                  ││ │   │
│  │  │  │  - Layout controls                                      ││ │   │
│  │  │  │  - Appearance controls                                  ││ │   │
│  │  │  │  - Save button                                          ││ │   │
│  │  │  └─────────────────────────────────────────────────────────┘│ │   │
│  │  └─────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Screen Shape (iframe)                         │   │
│  │  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  │  Sandbox Preview                                            │ │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐│ │   │
│  │  │  │  Overlay Script (injected)                              ││ │   │
│  │  │  │  - Hover highlight                                      ││ │   │
│  │  │  │  - Click selection                                      ││ │   │
│  │  │  │  - postMessage communication                            ││ │   │
│  │  │  └─────────────────────────────────────────────────────────┘│ │   │
│  │  └─────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Communication Flow

```
┌──────────────┐     postMessage      ┌──────────────────┐
│   Parent     │ ◄──────────────────► │   Iframe         │
│   Window     │                      │   (Sandbox)      │
│              │                      │                  │
│  - Edit mode │  element-hovered     │  - Overlay       │
│    context   │  element-selected    │    script        │
│  - Properties│  element-deselected  │  - DOM           │
│    panel     │  ──────────────────► │    manipulation  │
│              │                      │                  │
│              │  apply-style         │                  │
│              │  enable-edit-mode    │                  │
│              │  disable-edit-mode   │                  │
│              │  ◄────────────────── │                  │
└──────────────┘                      └──────────────────┘
```

## Components and Interfaces

### 1. EditModeContext (`contexts/EditModeContext.tsx`)

React context managing edit mode state across components.

```typescript
interface EditModeState {
  isEditMode: boolean;
  selectedElement: SelectedElementInfo | null;
  hoveredElement: HoveredElementInfo | null;
  pendingChanges: StyleChanges | null;
  isSaving: boolean;
  saveError: string | null;
}

interface SelectedElementInfo {
  tagName: string;
  className: string;
  computedStyles: ComputedStylesInfo;
  boundingRect: DOMRect;
  elementPath: string; // CSS selector path for identification
  sourceFile?: string; // Source file path if available
}

interface HoveredElementInfo {
  tagName: string;
  boundingRect: DOMRect;
}

interface ComputedStylesInfo {
  // Typography
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: string;
  color: string;
  textDecoration: string;
  textTransform: string;

  // Layout
  display: string;
  width: string;
  height: string;
  padding: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  margin: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  gap: string;
  flexDirection: string;
  justifyContent: string;
  alignItems: string;

  // Appearance
  backgroundColor: string;
  borderRadius: string;
  borderWidth: string;
  borderColor: string;
  borderStyle: string;
  boxShadow: string;
  opacity: string;
}

interface StyleChanges {
  [property: string]: string;
}

interface EditModeContextValue extends EditModeState {
  enableEditMode: () => Promise<void>;
  disableEditMode: () => Promise<void>;
  updateStyle: (property: string, value: string) => void;
  saveChanges: () => Promise<void>;
  discardChanges: () => void;
}
```

### 2. useEditMode Hook (`hooks/use-edit-mode.ts`)

Custom hook for managing edit mode lifecycle and sandbox communication.

```typescript
interface UseEditModeOptions {
  sandboxId?: string;
  screenId?: string;
  iframeRef: RefObject<HTMLIFrameElement>;
}

interface UseEditModeReturn {
  isEditMode: boolean;
  selectedElement: SelectedElementInfo | null;
  hoveredElement: HoveredElementInfo | null;
  pendingChanges: StyleChanges | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  saveError: string | null;
  enableEditMode: () => Promise<void>;
  disableEditMode: () => Promise<void>;
  updateStyle: (property: string, value: string) => void;
  saveChanges: () => Promise<void>;
  discardChanges: () => void;
}
```

### 3. Overlay Script (`lib/edit-mode/overlay-script.ts`)

JavaScript code injected into the sandbox layout file.

```typescript
// Script template that gets injected
const OVERLAY_SCRIPT = `
(function() {
  // State
  let selectedElement = null;
  let highlightOverlay = null;
  let selectionOverlay = null;
  let labelElement = null;
  
  // Create overlay elements
  function createOverlays() { ... }
  
  // Update highlight position
  function updateHighlight(element) { ... }
  
  // Update selection position
  function updateSelection(element) { ... }
  
  // Get computed styles for element
  function getComputedStylesInfo(element) { ... }
  
  // Generate element path (CSS selector)
  function getElementPath(element) { ... }
  
  // Event handlers
  function handleMouseMove(e) { ... }
  function handleClick(e) { ... }
  function handleMessage(e) { ... }
  
  // Initialize
  function init() { ... }
  
  // Cleanup
  function cleanup() { ... }
  
  init();
})();
`;
```

### 4. EditModePanel Component (`components/canvas/EditModePanel.tsx`)

Main panel displayed in the Edit tab.

```typescript
interface EditModePanelProps {
  screenId?: string;
  sandboxId?: string;
  sandboxUrl?: string;
}
```

### 5. ElementPropertiesPanel Component (`components/canvas/ElementPropertiesPanel.tsx`)

Properties panel for the selected element.

```typescript
interface ElementPropertiesPanelProps {
  element: SelectedElementInfo;
  pendingChanges: StyleChanges | null;
  onStyleChange: (property: string, value: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}
```

### 6. Style Mapper Utilities (`lib/edit-mode/style-mapper.ts`)

Utilities for converting CSS values to Tailwind classes.

```typescript
// Convert CSS property-value pairs to Tailwind classes
function cssToTailwind(styles: StyleChanges): string[];

// Convert individual CSS properties
function fontSizeToTailwind(value: string): string;
function colorToTailwind(
  value: string,
  property: "text" | "bg" | "border"
): string;
function spacingToTailwind(value: string, property: string): string;
function borderRadiusToTailwind(value: string): string;

// Parse and update className in JSX/TSX source
function updateElementClassName(
  sourceCode: string,
  elementPath: string,
  newClasses: string[]
): string;
```

### 7. Sandbox File Operations (`lib/edit-mode/sandbox-files.ts`)

Utilities for reading and writing sandbox files.

```typescript
// Inject overlay script into layout file
async function injectOverlayScript(sandboxId: string): Promise<void>;

// Remove overlay script from layout file
async function removeOverlayScript(sandboxId: string): Promise<void>;

// Read source file from sandbox
async function readSourceFile(sandboxId: string, path: string): Promise<string>;

// Write updated source file to sandbox
async function writeSourceFile(
  sandboxId: string,
  path: string,
  content: string
): Promise<void>;
```

### 8. API Routes

#### POST `/api/sandbox/edit-mode/enable`

Injects the overlay script into the sandbox.

```typescript
// Request
{ sandboxId: string }

// Response
{ success: boolean, error?: string }
```

#### POST `/api/sandbox/edit-mode/disable`

Removes the overlay script from the sandbox.

```typescript
// Request
{ sandboxId: string }

// Response
{ success: boolean, error?: string }
```

#### POST `/api/sandbox/files/write`

Writes file content to the sandbox.

```typescript
// Request
{ sandboxId: string, path: string, content: string }

// Response
{ success: boolean, error?: string }
```

## Data Models

### Message Types (Parent ↔ Iframe)

```typescript
// Messages from parent to iframe
type ParentToIframeMessage =
  | { type: "enable-edit-mode" }
  | { type: "disable-edit-mode" }
  | { type: "apply-style"; property: string; value: string }
  | { type: "deselect" };

// Messages from iframe to parent
type IframeToParentMessage =
  | { type: "element-hovered"; data: HoveredElementInfo }
  | { type: "element-unhovered" }
  | { type: "element-selected"; data: SelectedElementInfo }
  | { type: "element-deselected" }
  | { type: "edit-mode-ready" }
  | { type: "edit-mode-error"; error: string };
```

### Tailwind Mapping Tables

```typescript
// Font size mapping (px to Tailwind)
const FONT_SIZE_MAP: Record<string, string> = {
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

// Spacing mapping (px to Tailwind scale)
const SPACING_MAP: Record<string, string> = {
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
  // ... continues
};

// Border radius mapping
const BORDER_RADIUS_MAP: Record<string, string> = {
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
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Overlay script injection round-trip

_For any_ valid layout file content, injecting the overlay script and then removing it should return the layout file to its original content (byte-for-byte identical).
**Validates: Requirements 1.1, 1.2, 8.1, 8.2**

### Property 2: Hover highlight positioning

_For any_ DOM element in the sandbox while edit mode is active, the hover highlight overlay should be positioned exactly at the element's bounding rectangle coordinates (x, y, width, height match within 1px tolerance).
**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Single element selection invariant

_For any_ sequence of click events on elements in edit mode, exactly zero or one element should be selected at any time, and the selected element should match the most recently clicked element (or null if clicked outside elements).
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Computed styles completeness

_For any_ selected element, the SelectedElementInfo object should contain all required computed style properties (typography, layout, appearance) with valid CSS values.
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 5: Style changes apply to DOM immediately

_For any_ style property modification through the properties panel, the selected element's inline style should reflect the new value immediately, and the pendingChanges object should contain the change.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 6: CSS to Tailwind mapping validity

_For any_ CSS property value (font-size, color, spacing, border-radius), the style mapper should produce either a valid Tailwind utility class or a valid arbitrary value syntax (e.g., `text-[17px]`).
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 7: Source file className update preservation

_For any_ JSX/TSX source file and element with className, updating the className with new Tailwind classes should preserve all other attributes, element content, and file structure.
**Validates: Requirements 6.2, 6.3, 6.4**

### Property 8: Element path uniqueness

_For any_ DOM tree, the generated element path (CSS selector) should uniquely identify exactly one element when queried with document.querySelector.
**Validates: Requirements 9.1, 9.3**

## Error Handling

### Sandbox Connection Errors

- If sandbox connection fails, display error message and disable edit mode
- Implement retry logic with exponential backoff (max 3 attempts)
- Show "Session expired" message if sandbox is no longer available

### Script Injection Errors

- If layout file cannot be read, show error and prevent edit mode activation
- If script injection fails, restore original layout file content
- Log errors to console for debugging

### Style Application Errors

- If style cannot be applied to DOM, show warning but don't block other operations
- If Tailwind mapping fails, fall back to arbitrary value syntax
- Validate CSS values before applying

### Save Errors

- If file write fails, preserve pending changes and show retry option
- If source file has been modified externally, warn user about potential conflicts
- Implement optimistic updates with rollback on failure

## Testing Strategy

### Unit Testing

- Test style mapper functions with various CSS values
- Test element path generation for different DOM structures
- Test message serialization/deserialization
- Test Tailwind class generation for edge cases

### Property-Based Testing

The following property-based tests will be implemented using fast-check:

1. **Overlay script injection round-trip**: For any valid layout file content, injecting and then removing the overlay script should return the original content.

2. **CSS to Tailwind mapping consistency**: For any CSS value in the supported range, mapping to Tailwind and back should produce equivalent visual results.

3. **Element path uniqueness**: For any DOM tree, the generated element path should uniquely identify exactly one element.

4. **Style changes accumulation**: For any sequence of style changes, the pending changes object should contain all changes with later values overwriting earlier ones for the same property.

### Integration Testing

- Test full edit mode lifecycle (enable → select → modify → save → disable)
- Test postMessage communication between parent and iframe
- Test sandbox file operations with real E2B sandbox

### Manual Testing Checklist

- Verify hover highlighting works for all common HTML elements
- Verify selection border is visible and correctly positioned
- Verify properties panel shows correct computed styles
- Verify live DOM updates when changing properties
- Verify save persists changes to source files
- Verify edit mode cleanup on tab switch
