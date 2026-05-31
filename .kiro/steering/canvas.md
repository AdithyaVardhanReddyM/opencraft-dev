# Canvas Architecture

## Overview

The infinite canvas system is a core feature of Unit {set}, providing a Figma-like drawing and design experience. It uses **React Context + useReducer** for state management, replacing Redux while maintaining all functionality.

## Architecture Components

### 1. State Management (`contexts/CanvasContext.tsx`)

The canvas uses two separate reducers for clean separation of concerns:

- **Viewport Reducer**: Manages pan, zoom, and viewport mode
- **Shapes Reducer**: Manages drawing entities, selection, and tools

```typescript
// Context provides:
- viewport: ViewportState
- dispatchViewport: React.Dispatch<ViewportAction>
- shapes: ShapesState
- dispatchShapes: React.Dispatch<ShapesAction>
- shapesList: Shape[] (computed from normalized entity state)
```

### 2. Core Types (`types/canvas.ts`)

**Viewport Types:**

- `ViewportState`: scale, translate, mode, pan tracking
- `ViewportMode`: "idle" | "panning" | "shiftPanning"

**Shape Types:**

- `FrameShape`: Rectangular frames with auto-incrementing numbers
- `RectShape`: Basic rectangles
- `EllipseShape`: Ellipses
- `FreeDrawShape`: Freehand paths with point arrays
- `ArrowShape`: Arrows with start/end points
- `LineShape`: Straight lines
- `TextShape`: Text with full typography controls
- `GeneratedUIShape`: AI-generated UI components

**Tool Types:**

- `Tool`: "select" | "frame" | "rect" | "ellipse" | "freedraw" | "arrow" | "line" | "text" | "eraser"

**State Structure:**

- Normalized entity state: `{ ids: string[], entities: Record<string, Shape> }`
- Selection map: `Record<string, true>` for O(1) lookup

### 3. Reducers

**Viewport Reducer** (`lib/canvas/viewport-reducer.ts`):

- `SET_TRANSLATE`, `SET_SCALE`: Direct viewport updates
- `ZOOM_IN`, `ZOOM_OUT`, `ZOOM_BY`: Zoom operations
- `WHEEL_ZOOM`, `WHEEL_PAN`: Mouse/trackpad interactions
- `PAN_START`, `PAN_MOVE`, `PAN_END`: Pan gesture handling
- `HAND_TOOL_ENABLE`, `HAND_TOOL_DISABLE`: Shift key hand tool
- `CENTER_ON_WORLD`, `ZOOM_TO_FIT`: Navigation helpers
- `RESET_VIEW`, `RESTORE_VIEWPORT`: State management

**Shapes Reducer** (`lib/canvas/shapes-reducer.ts`):

- `SET_TOOL`: Switch between drawing tools
- `ADD_*`: Create shapes (FRAME, RECT, ELLIPSE, FREEDRAW, ARROW, LINE, TEXT, GENERATED_UI)
- `UPDATE_SHAPE`: Modify shape properties
- `REMOVE_SHAPE`: Delete single shape
- `SELECT_SHAPE`, `DESELECT_SHAPE`, `CLEAR_SELECTION`, `SELECT_ALL`: Selection management
- `DELETE_SELECTED`: Delete all selected shapes
- `LOAD_PROJECT`: Restore entire canvas state

### 4. Main Hook (`hooks/use-infinite-canvas.ts`)

The `useInfiniteCanvas` hook provides the complete canvas interaction API:

**Returned Values:**

- `viewport`, `shapes`, `currentTool`, `selectedShapes`: State
- `isSidebarOpen`, `hasSelectedText`: UI state
- `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`: Event handlers
- `attachCanvasRef`: Canvas DOM ref attachment
- `selectTool`: Tool switching
- `getDraftShape`, `getFreeDrawPoints`, `getSelectionBox`: Draft state getters
- `zoomIn`, `zoomOut`: Zoom controls

**Key Features:**

- RAF throttling for freehand drawing (8ms interval)
- RAF-batched pan operations for smooth performance
- Refs for non-reactive state (no re-renders during interactions)
- Multi-shape selection and movement
- Shape resizing via custom DOM events
- Keyboard shortcuts (Shift for hand tool, Delete/Backspace)
- Button click detection (prevents canvas interaction on UI buttons)
- Text input auto-blur on empty space click
- Sidebar auto-open for text selection

### 5. Utilities

**Coordinate Utils** (`lib/canvas/coordinate-utils.ts`):

- `screenToWorld`: Convert screen coordinates to world coordinates
- `worldToScreen`: Convert world coordinates to screen coordinates
- `zoomAroundScreenPoint`: Calculate new translate for zoom around point
- `clamp`: Constrain values to min/max range

**Hit Testing** (`lib/canvas/hit-testing.ts`):

- `getShapeAtPoint`: Find shape at world coordinates
- Shape-specific hit detection for all shape types
- Threshold-based hit testing for lines and freedraw

**Entity Adapter** (`lib/canvas/entity-adapter.ts`):

- `createEntityState`: Initialize normalized state
- `addEntity`, `updateEntity`, `removeEntity`: CRUD operations
- `removeMany`, `removeAll`: Batch operations
- Immutable updates with spread operators

**Shape Factories** (`lib/canvas/shape-factories.ts`):

- `createFrame`, `createRect`, `createEllipse`: Shape creation with defaults
- `createFreeDraw`, `createArrow`, `createLine`: Path-based shapes
- `createText`, `createGeneratedUI`: Complex shapes
- Default styling: `{ stroke: "#ffff", strokeWidth: 2 }`
- Unique IDs via nanoid

**Persistence** (`lib/canvas/persistence.ts`):

- `serializeCanvasState`, `deserializeCanvasState`: JSON serialization
- `saveToLocalStorage`, `loadFromLocalStorage`: Browser storage
- Auto-save with 1-second debounce

### 6. Persistence Hook (`hooks/use-canvas-persistence.ts`)

Manages canvas state persistence:

- Auto-save to localStorage (1 second debounce)
- Auto-load from localStorage on mount
- Export/import as JSON
- Convex integration ready (TODO: implement mutations/queries)

### 7. Canvas Page (`app/dashboard/[projectId]/canvas/page.tsx`)

Main canvas rendering component:

- Wraps content in `CanvasProvider`
- Renders toolbar, zoom bar, history pill
- Transforms shapes with viewport scale/translate
- Renders draft shapes during drawing
- Renders selection boxes and bounding boxes
- Uses component files for each shape type

### 8. Shape Components (`components/canvas/shapes/`)

Each shape type has dedicated components:

- `Frame.tsx`, `Rectangle.tsx`, `Ellipse.tsx`: Basic shapes
- `Line.tsx`, `Arrow.tsx`: Path-based shapes
- `Stroke.tsx`: Freehand drawing
- `Text.tsx`: Text with typography controls
- Preview components for draft shapes during drawing

### 9. UI Components (`components/canvas/`)

- `Toolbar.tsx`: Tool selection
- `ZoomBar.tsx`: Zoom controls and percentage display
- `HistoryPill.tsx`: Undo/redo controls (TODO: implement)
- `BoundingBox.tsx`: Selection bounds with resize handles
- `SelectionBox.tsx`: Multi-select rectangle

## Interaction Patterns

### Pan & Zoom

**Pan:**

- Middle mouse button drag
- Right mouse button drag
- Shift + left mouse button drag
- Mouse wheel (horizontal/vertical)

**Zoom:**

- Ctrl/Cmd + mouse wheel (zooms around cursor)
- Zoom in/out buttons
- Pinch-to-zoom on trackpads (via ctrlKey)

### Drawing Tools

**Select Tool:**

- Click to select shape
- Shift+click for multi-select
- Drag to move selected shapes
- Drag on empty space for selection box
- Click empty space to deselect

**Shape Tools (Frame, Rect, Ellipse, Arrow, Line):**

- Click and drag to draw
- Draft preview during drawing
- Auto-switch to select tool after drawing

**Freedraw Tool:**

- Click and drag to draw freehand
- RAF throttling for smooth rendering
- Auto-switch to select tool after drawing

**Text Tool:**

- Click to place text
- Auto-switch to select tool
- Sidebar opens for typography controls

**Eraser Tool:**

- Click or drag to erase shapes
- Tracks erased shapes to prevent double-deletion

### Selection & Movement

- Click shape to select (clears previous selection)
- Shift+click to add to selection
- Drag selected shapes to move
- Stores initial positions for all selected shapes
- Updates all selected shapes during drag

### Resizing

- Bounding box shows resize handles for selected shapes
- Custom DOM events for resize communication:
  - `shape-resize-start`: Initiates resize
  - `shape-resize-move`: Updates shape during resize
  - `shape-resize-end`: Finalizes resize
- Supports all shape types with appropriate transformations

### Keyboard Shortcuts

- **Shift**: Enable hand tool (pan with left mouse)
- **Delete/Backspace**: Delete selected shapes (not in text inputs)
- **Escape**: Clear selection (TODO: implement)
- **Ctrl/Cmd+A**: Select all (TODO: implement)
- **Ctrl/Cmd+Z**: Undo (TODO: implement)
- **Ctrl/Cmd+Shift+Z**: Redo (TODO: implement)

## Performance Optimizations

1. **RAF Throttling**: Freehand drawing throttled to 8ms intervals
2. **RAF Batching**: Pan operations batched with requestAnimationFrame
3. **Refs for Non-Reactive State**: Interaction state stored in refs to prevent re-renders
4. **Memoized Computed Values**: `shapesList` computed with useMemo
5. **Immutable State Updates**: Spread operators for efficient updates
6. **Normalized Entity State**: O(1) lookups by ID
7. **Debounced Auto-Save**: 1-second debounce for localStorage

## Constants

```typescript
// RAF throttling
RAF_INTERVAL_MS = 8;

// Hit testing thresholds
FREEDRAW_HIT_THRESHOLD = 5;
LINE_HIT_THRESHOLD = 8;
TEXT_PADDING = 8;
TEXT_BOUNDS_MARGIN = 2;

// Viewport constraints
MIN_SCALE = 0.1;
MAX_SCALE = 8;
WHEEL_PAN_SPEED = 2.0;
ZOOM_STEP = 1.05;

// Shape defaults
SHAPE_DEFAULTS = { stroke: "#ffff", strokeWidth: 2 };
```

## Future Enhancements

- [ ] Undo/Redo with history tracking
- [ ] Collaborative editing via WebSocket
- [ ] Touch gesture support (pinch-to-zoom)
- [ ] Grid and shape snapping
- [ ] Layer management (z-index)
- [ ] Shape grouping
- [ ] Copy/paste functionality
- [ ] Export to image/SVG
- [ ] Shape alignment tools
- [ ] Keyboard shortcuts (Escape, Ctrl+A, etc.)
- [ ] Shape locking
- [ ] Guides and rulers

## Best Practices

### When Adding New Shape Types

1. Add type definition to `types/canvas.ts`
2. Create factory function in `lib/canvas/shape-factories.ts`
3. Add action and case to `lib/canvas/shapes-reducer.ts`
4. Add hit testing logic to `lib/canvas/hit-testing.ts`
5. Create shape component in `components/canvas/shapes/`
6. Create preview component for draft rendering
7. Add rendering logic to canvas page

### When Adding New Tools

1. Add tool type to `Tool` union in `types/canvas.ts`
2. Add tool button to `Toolbar.tsx`
3. Add interaction logic to `use-infinite-canvas.ts`
4. Handle draft shape rendering if applicable
5. Add cursor styling to `use-canvas-cursor.ts`

### When Modifying State

- Always use dispatch actions, never mutate state directly
- Use immutable updates with spread operators
- Keep reducers pure (no side effects)
- Store interaction state in refs, not state (prevents re-renders)
- Use RAF for performance-critical operations

### When Adding Persistence

- Update `serializeCanvasState` and `deserializeCanvasState`
- Test localStorage save/load
- Implement Convex mutations/queries when ready
- Handle migration for schema changes

## Testing

```bash
# Check for TypeScript errors
pnpm tsc --noEmit

# Run linting
pnpm lint

# Test canvas in development
pnpm dev
# Navigate to /dashboard/[projectId]/canvas
```

## Migration Notes

This implementation replaces the Redux-based canvas system with:

- React Context instead of Redux store
- useReducer instead of Redux Toolkit slices
- Custom entity adapter instead of @reduxjs/toolkit createEntityAdapter
- Direct dispatch calls instead of Redux actions

All functionality is preserved while simplifying the architecture and improving TypeScript integration.
