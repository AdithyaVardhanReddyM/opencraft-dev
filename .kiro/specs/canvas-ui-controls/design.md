# Design Document

## Overview

This design document outlines the implementation of three key UI components for the infinite canvas: Toolbar, History Pill, and Zoom Bar. These components provide users with intuitive controls for drawing tools, history management, and viewport zoom. The design follows the existing design system patterns from Unit {set}, using shadcn/ui components, Tailwind CSS, and Lucide React icons.

## Architecture

### Component Hierarchy

```
CanvasPage
└── CanvasProvider
    └── CanvasContent
        ├── Toolbar (fixed top-center)
        ├── Canvas (SVG rendering area)
        ├── HistoryPill (fixed bottom-left)
        └── ZoomBar (fixed bottom-left, above HistoryPill)
```

### State Management Integration

All three UI components integrate with the existing Canvas Context:

- **Toolbar**: Reads `currentTool` from shapes state, calls `selectTool()` to update
- **ZoomBar**: Reads `viewport.scale`, dispatches `ZOOM_IN` and `ZOOM_OUT` actions
- **HistoryPill**: Will integrate with future undo/redo state (placeholder for now)

### Component Positioning

```
┌─────────────────────────────────────────┐
│                                         │
│            [Toolbar]                    │  ← Top center
│                                         │
│                                         │
│                                         │
│          Canvas Area                    │
│                                         │
│                                         │
│                                         │
│  [ZoomBar]                              │  ← Bottom left
│  [HistoryPill]                          │  ← Bottom left
└─────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Toolbar Component

**File**: `components/canvas/Toolbar.tsx`

**Purpose**: Provides tool selection buttons for canvas interactions

**Props Interface**:

```typescript
interface ToolbarProps {
  currentTool: Tool;
  onToolSelect: (tool: Tool) => void;
}
```

**Tool Configuration**:

```typescript
const TOOLS = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "frame", icon: Square, label: "Frame" },
  { id: "rect", icon: RectangleHorizontal, label: "Rectangle" },
  { id: "ellipse", icon: Circle, label: "Ellipse" },
  { id: "freedraw", icon: Pencil, label: "Pencil" },
  { id: "text", icon: Type, label: "Text" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
] as const;
```

**Visual Design**:

- Container: Card with `bg-card/95` (semi-transparent), `backdrop-blur-sm`, `border`, `shadow-lg`
- Layout: Horizontal flex with `gap-1` between buttons
- Buttons:
  - Size: `h-9 w-9` (36x36px)
  - Active state: `bg-primary text-primary-foreground`
  - Inactive state: `bg-transparent hover:bg-accent hover:text-accent-foreground`
  - Border radius: `rounded-md`
  - Icon size: `16px` (w-4 h-4)
- Positioning: `fixed top-4 left-1/2 -translate-x-1/2 z-50`

**Accessibility**:

- Each button has `aria-label` with tool name
- Active tool has `aria-pressed="true"`
- Keyboard navigation with tab/arrow keys
- Tooltip on hover showing tool name

### 2. HistoryPill Component

**File**: `components/canvas/HistoryPill.tsx`

**Purpose**: Provides undo/redo controls for canvas history

**Props Interface**:

```typescript
interface HistoryPillProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}
```

**Visual Design**:

- Container: Pill-shaped card with `bg-card/95`, `backdrop-blur-sm`, `border`, `shadow-lg`
- Layout: Horizontal flex with `gap-0.5` between buttons
- Buttons:
  - Size: `h-8 w-8` (32x32px)
  - Icons: `Undo2` and `Redo2` from Lucide
  - Icon size: `16px` (w-4 h-4)
  - Disabled state: `opacity-50 cursor-not-allowed`
  - Hover state: `hover:bg-accent hover:text-accent-foreground`
- Positioning: `fixed bottom-4 left-4 z-50`
- Border radius: `rounded-full` for pill shape
- Padding: `p-1`

**Accessibility**:

- Buttons have `aria-label="Undo"` and `aria-label="Redo"`
- Disabled buttons have `aria-disabled="true"`
- Keyboard shortcuts: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Shift+Z (redo)

### 3. ZoomBar Component

**File**: `components/canvas/ZoomBar.tsx`

**Purpose**: Provides zoom controls and displays current zoom percentage

**Props Interface**:

```typescript
interface ZoomBarProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  minScale?: number;
  maxScale?: number;
}
```

**Visual Design**:

- Container: Pill-shaped card with `bg-card/95`, `backdrop-blur-sm`, `border`, `shadow-lg`
- Layout: Horizontal flex with three sections
  - Zoom out button (left)
  - Percentage display (center)
  - Zoom in button (right)
- Buttons:
  - Size: `h-8 w-8` (32x32px)
  - Icons: `Minus` and `Plus` from Lucide
  - Icon size: `14px` (w-3.5 h-3.5)
  - Disabled when at min/max scale
  - Hover state: `hover:bg-accent hover:text-accent-foreground`
- Percentage Display:
  - Width: `w-16` (64px)
  - Text: `text-xs font-medium text-center`
  - Format: "100%"
- Positioning: `fixed bottom-16 left-4 z-50` (above HistoryPill)
- Border radius: `rounded-full` for pill shape
- Padding: `p-1`
- Gap: `gap-0.5` between elements

**Zoom Behavior**:

- Zoom factor: 1.2x per click
- Min scale: 0.1 (10%)
- Max scale: 8.0 (800%)
- Percentage rounds to nearest integer

**Accessibility**:

- Buttons have `aria-label="Zoom in"` and `aria-label="Zoom out"`
- Percentage display has `aria-live="polite"` for screen readers
- Keyboard shortcuts: Ctrl/Cmd+Plus (zoom in), Ctrl/Cmd+Minus (zoom out)

## Data Models

### Tool Type (Existing)

```typescript
type Tool =
  | "select"
  | "frame"
  | "rect"
  | "ellipse"
  | "freedraw"
  | "arrow"
  | "line"
  | "text"
  | "eraser";
```

### Viewport Actions (New)

```typescript
// Add to viewport-reducer.ts
type ViewportAction =
  | { type: "ZOOM_IN" }
  | { type: "ZOOM_OUT" }
  | { type: "SET_ZOOM"; payload: number }
  | ... // existing actions
```

### History State (Future)

```typescript
// To be implemented in future iteration
interface HistoryState {
  past: ShapesState[];
  present: ShapesState;
  future: ShapesState[];
}
```

## Error Handling

### Zoom Constraints

- Zoom in/out buttons are disabled when at min/max scale
- Attempting to zoom beyond limits is silently ignored
- Invalid scale values default to 1.0 (100%)

### Tool Selection

- Invalid tool IDs default to "select"
- Tool state is always defined (never null/undefined)

### History Operations

- Undo/redo buttons are disabled when no history available
- Operations on empty history are no-ops
- History is preserved across component remounts

## Testing Strategy

### Unit Tests

**Toolbar Component**:

- Renders all tool buttons correctly
- Highlights active tool
- Calls `onToolSelect` with correct tool ID on click
- Displays correct icons for each tool
- Applies correct accessibility attributes

**ZoomBar Component**:

- Displays current zoom percentage correctly
- Calls `onZoomIn` when plus button clicked
- Calls `onZoomOut` when minus button clicked
- Disables zoom in button at max scale
- Disables zoom out button at min scale
- Formats percentage with no decimals

**HistoryPill Component**:

- Renders undo and redo buttons
- Calls `onUndo` when undo button clicked
- Calls `onRedo` when redo button clicked
- Disables undo button when `canUndo` is false
- Disables redo button when `canRedo` is false

### Integration Tests

- Toolbar integrates with canvas context and updates tool state
- ZoomBar integrates with viewport reducer and updates scale
- Components maintain correct positioning on window resize
- Components remain visible during canvas pan/zoom operations

### Visual Regression Tests

- Components render with correct styling in light/dark mode
- Hover states display correctly
- Active/disabled states display correctly
- Components maintain visual hierarchy (z-index)

## Design System Integration

### Colors

All components use semantic color tokens:

- `bg-card` - Component backgrounds
- `border` - Component borders
- `text-foreground` - Default text
- `bg-primary` / `text-primary-foreground` - Active tool button
- `bg-accent` / `text-accent-foreground` - Hover states
- `text-muted-foreground` - Disabled states

### Spacing

- Component padding: `p-1` (4px) for pills, `p-2` (8px) for toolbar
- Button gaps: `gap-0.5` (2px) for pills, `gap-1` (4px) for toolbar
- Viewport margins: `16px` from edges (using `left-4`, `bottom-4`, `top-4`)

### Typography

- Zoom percentage: `text-xs` (12px), `font-medium`
- Tool labels (tooltips): `text-sm` (14px)

### Shadows & Effects

- All components: `shadow-lg` for elevation
- All components: `backdrop-blur-sm` for glass effect
- All components: `bg-card/95` for semi-transparency

### Border Radius

- Toolbar: `rounded-lg` (8px)
- Pills: `rounded-full` (fully rounded)
- Buttons: `rounded-md` (6px) in toolbar, `rounded-md` (6px) in pills

## Implementation Notes

### Component Organization

```
components/
└── canvas/
    ├── Toolbar.tsx
    ├── HistoryPill.tsx
    └── ZoomBar.tsx
```

### Viewport Reducer Updates

Add new action handlers to `lib/canvas/viewport-reducer.ts`:

```typescript
case "ZOOM_IN":
  return {
    ...state,
    scale: Math.min(state.maxScale, state.scale * 1.2),
  };

case "ZOOM_OUT":
  return {
    ...state,
    scale: Math.max(state.minScale, state.scale / 1.2),
  };

case "SET_ZOOM":
  return {
    ...state,
    scale: Math.max(
      state.minScale,
      Math.min(state.maxScale, action.payload)
    ),
  };
```

### Canvas Page Integration

Update `app/dashboard/[projectId]/canvas/page.tsx`:

1. Import new components
2. Remove existing toolbar implementation
3. Add Toolbar, ZoomBar, and HistoryPill components
4. Pass appropriate props from `useInfiniteCanvas` hook

### Responsive Considerations

- On mobile (< 640px):
  - Toolbar buttons reduce to `h-8 w-8` (32x32px)
  - Icon sizes remain at 16px for touch targets
  - Toolbar may wrap to two rows if needed
  - Bottom components stack with `gap-2` (8px)

### Performance Optimizations

- Use `React.memo` for all three components
- Memoize tool configuration array
- Debounce zoom percentage updates (100ms)
- Use CSS transforms for positioning (GPU-accelerated)

## Future Enhancements

### Phase 2: History Implementation

- Implement undo/redo state management
- Add keyboard shortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z)
- Display history depth in tooltip
- Add "Clear History" option

### Phase 3: Advanced Zoom

- Add zoom to fit button
- Add zoom to selection button
- Add zoom percentage input (click to edit)
- Add preset zoom levels (25%, 50%, 100%, 200%)

### Phase 4: Toolbar Enhancements

- Add tool groups with separators
- Add keyboard shortcuts display
- Add tool options panel (stroke width, color picker)
- Add recent colors palette

### Phase 5: Mobile Optimization

- Add touch gestures for zoom (pinch)
- Add floating action button for tool selection
- Add bottom sheet for tool options
- Optimize button sizes for touch
