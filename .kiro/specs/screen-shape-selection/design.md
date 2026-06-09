# Design Document: Screen Shape Selection Improvements

## Overview

This feature enhances the screen shape selection behavior in the canvas by ensuring users can click anywhere on an unselected screen shape to select it, and automatically opening the AI chat sidebar upon selection. The solution uses a conditional click overlay that captures pointer events on unselected screens while allowing iframe interaction on selected screens.

## Architecture

The implementation follows the existing canvas architecture patterns:

1. **Screen Component Enhancement**: Modify the `Screen.tsx` component to include a conditional overlay
2. **Selection Logic**: Leverage existing hit-testing and selection mechanisms in `use-infinite-canvas.ts`
3. **Sidebar Integration**: Use the existing `setIsSidebarOpen` mechanism triggered on screen selection

```
┌─────────────────────────────────────────────────────────┐
│                    Canvas Page                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Screen Component                      │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │           Title Bar (always clickable)       │  │  │
│  │  ├─────────────────────────────────────────────┤  │  │
│  │  │                                             │  │  │
│  │  │   ┌─────────────────────────────────────┐   │  │  │
│  │  │   │  Click Overlay (when !isSelected)   │   │  │  │
│  │  │   │  pointer-events: auto               │   │  │  │
│  │  │   └─────────────────────────────────────┘   │  │  │
│  │  │                                             │  │  │
│  │  │   ┌─────────────────────────────────────┐   │  │  │
│  │  │   │  iframe (when isSelected)           │   │  │  │
│  │  │   │  pointer-events: auto               │   │  │  │
│  │  │   └─────────────────────────────────────┘   │  │  │
│  │  │                                             │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Screen Component (`components/canvas/shapes/Screen.tsx`)

**Current Interface:**

```typescript
interface ScreenProps {
  shape: ScreenShape;
  isSelected: boolean;
  screenData?: {
    sandboxUrl?: string;
    title?: string;
  };
  onClick?: () => void;
}
```

**Changes:**

- Add a click overlay div that covers the content area when `isSelected` is false
- The overlay captures click events and calls `onClick` to trigger selection
- When `isSelected` is true, the overlay is either removed or has `pointer-events: none`
- The iframe gets `pointer-events: auto` only when selected

### Canvas Page Integration

The canvas page already passes an `onClick` handler to the Screen component that:

1. Clears existing selection
2. Selects the screen shape
3. Opens the AI sidebar

No changes needed to the canvas page - the existing `onClick` handler already implements the correct behavior.

### use-infinite-canvas Hook

The hook already handles screen shape selection and sidebar opening in the `onPointerDown` handler:

```typescript
// Open sidebar when clicking on a screen shape
if (hitShape.type === "screen") {
  setIsSidebarOpen(true);
}
```

This logic works for clicks detected via hit-testing. The Screen component's `onClick` handler provides an additional path for selection that bypasses hit-testing (useful when the overlay captures the click).

## Data Models

No changes to data models required. The existing `ScreenShape` type and selection state are sufficient.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Click anywhere selects unselected screen

_For any_ screen shape and _for any_ click position within the screen's bounding box, if the screen is not selected, clicking at that position SHALL result in the screen becoming selected and all other shapes being deselected.

**Validates: Requirements 1.1, 1.4**

### Property 2: Overlay state reflects selection status

_For any_ screen shape, the click overlay SHALL have `pointer-events: auto` when the screen is not selected, and SHALL have `pointer-events: none` (or be absent) when the screen is selected.

**Validates: Requirements 1.2, 1.3, 3.1**

### Property 3: Screen selection opens sidebar

_For any_ screen shape selection event, the AI chat sidebar SHALL be in the open state after the selection completes.

**Validates: Requirements 2.1, 2.2**

### Property 4: Sidebar persists across screen switches

_For any_ sequence of screen shape selections where the sidebar is already open, the sidebar SHALL remain open after selecting a different screen shape.

**Validates: Requirements 2.3**

### Property 5: Iframe clicks preserve selection

_For any_ selected screen shape, clicking within the iframe content area SHALL NOT change the selection state of the screen shape.

**Validates: Requirements 3.2, 3.3**

## Error Handling

| Scenario                            | Handling                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------ |
| Screen shape has no onClick handler | Overlay click does nothing; selection still works via canvas hit-testing |
| iframe fails to load                | Empty state is shown; selection behavior unaffected                      |
| Multiple rapid clicks               | Each click triggers selection; last click wins                           |

## Testing Strategy

### Property-Based Testing

We will use **fast-check** as the property-based testing library for TypeScript/React.

**Test Configuration:**

- Minimum 100 iterations per property test
- Each test tagged with format: `**Feature: screen-shape-selection, Property {number}: {property_text}**`

**Property Tests:**

1. **Property 1 Test**: Generate random screen shapes with random dimensions and positions. For each, generate random click points within bounds. Verify selection state changes correctly.

2. **Property 2 Test**: Generate screen shapes with random selection states. Verify overlay pointer-events CSS property matches expected value based on selection.

3. **Property 3 Test**: Generate screen selection events. Verify sidebar state is open after each selection.

4. **Property 4 Test**: Generate sequences of screen selections with sidebar initially open. Verify sidebar remains open throughout.

5. **Property 5 Test**: Generate selected screen shapes. Simulate iframe area clicks. Verify selection state unchanged.

### Unit Tests

- Test Screen component renders overlay when `isSelected={false}`
- Test Screen component hides/disables overlay when `isSelected={true}`
- Test onClick handler is called when overlay is clicked
- Test iframe has correct pointer-events based on selection state

### Integration Tests

- Test full selection flow: click unselected screen → screen selected → sidebar opens
- Test switching between screens keeps sidebar open
- Test iframe interaction doesn't deselect screen
