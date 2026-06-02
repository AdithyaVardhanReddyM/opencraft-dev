# Canvas Architecture

## Overview

The infinite canvas system is a core feature of Unit {set}, providing a Figma-like drawing and design experience. It uses **React Context + useReducer** for state management with a clean, Redux-free architecture that maintains full functionality while improving TypeScript integration and simplifying the codebase.

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

- `Tool`: "select" | "hand" | "frame" | "rect" | "ellipse" | "freedraw" | "arrow" | "line" | "text" | "eraser"

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

- `viewport`, `shapes`, `currentTool`, `activeTool`, `selectedShapes`: State
- `isSidebarOpen`, `hasSelectedText`: UI state
- `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`, `onDoubleClick`: Event handlers
- `attachCanvasRef`: Canvas DOM ref attachment
- `selectTool`: Tool switching
- `getDraftShape`, `getFreeDrawPoints`, `getSelectionBox`: Draft state getters
- `setIsSidebarOpen`: Sidebar control
- `zoomIn`, `zoomOut`, `resetZoom`: Zoom controls

**Key Features:**

- RAF throttling for freehand drawing (8ms interval)
- RAF-batched pan operations for smooth performance
- Refs for non-reactive state (no re-renders during interactions)
- Multi-shape selection and movement with initial position tracking
- Shape resizing via custom DOM events (shape-resize-start, shape-resize-move, shape-resize-end)
- Keyboard shortcuts (Space for hand tool, Delete/Backspace, tool hotkeys)
- Tool hotkeys: S (select), H (hand), F (frame), R (rect), C (ellipse), L (line), A (arrow), D (freedraw), T (text), E (eraser)
- Button click detection (prevents canvas interaction on UI buttons)
- Text input auto-blur on empty space click
- Sidebar auto-open for text selection
- Double-click to edit text shapes
- Selection box for multi-select (drag on empty space)
- Hand tool override with Space key (temporary pan mode)

### 5. Utilities

**Coordinate Utils** (`lib/canvas/coordinate-utils.ts`):

- `screenToWorld`: Convert screen coordinates to world coordinates
- `worldToScreen`: Convert world coordinates to screen coordinates
- `zoomAroundScreenPoint`: Calculate new translate for zoom around point
- `clamp`: Constrain values to min/max range
- `distance`: Calculate distance between two points
- `midpoint`: Calculate midpoint between two points

**Hit Testing** (`lib/canvas/hit-testing.ts`):

- `getShapeAtPoint`: Find shape at world coordinates with smart nested shape handling
- `isPointInShape`: Check if a point is inside a shape (respects fill and stroke)
- `distanceToLineSegment`: Calculate distance from point to line segment
- Shape-specific hit detection for all shape types
- Threshold-based hit testing for lines and freedraw (5px and 8px respectively)
- Smart selection strategy: prefers smallest shape when multiple shapes overlap
- Optional bounds fallback for selection

**Entity Adapter** (`lib/canvas/entity-adapter.ts`):

- `createEntityState`: Initialize normalized state
- `addEntity`, `updateEntity`, `removeEntity`: CRUD operations
- `removeMany`, `removeAll`: Batch operations
- Immutable updates with spread operators

**Shape Factories** (`lib/canvas/shape-factories.ts`):

- `createFrame`, `createRect`, `createEllipse`: Shape creation with defaults
- `createFreeDraw`, `createArrow`, `createLine`: Path-based shapes
- `createText`, `createGeneratedUI`: Complex shapes
- Default styling: `{ stroke: "#ffff", strokeWidth: 1 }`
- Frame-specific styling: transparent stroke, semi-transparent fill
- Text shapes automatically measure dimensions on creation
- Unique IDs via nanoid

**Persistence** (`lib/canvas/persistence.ts`):

- `serializeCanvasState`, `deserializeCanvasState`: JSON serialization with version tracking
- `exportCanvasState`, `importCanvasState`: JSON string conversion
- `saveToLocalStorage`, `loadFromLocalStorage`, `clearLocalStorage`: Browser storage
- Auto-save with 1-second debounce
- Stores viewport state, shapes, tool, selection, and frame counter

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

**Rendered Shapes:**

- `Frame.tsx`: Frames with auto-incrementing numbers
- `Rectangle.tsx`: Basic rectangles
- `Ellipse.tsx`: Ellipses
- `Line.tsx`: Straight lines
- `Arrow.tsx`: Arrows with arrowheads
- `Stroke.tsx`: Freehand drawing paths
- `Text.tsx`: Text with full typography controls and editing

**Preview Components (Draft Rendering):**

- `FramePreview.tsx`: Frame preview during drawing
- `RectanglePreview.tsx`: Rectangle preview during drawing
- `EllipsePreview.tsx`: Ellipse preview during drawing
- `LinePreview.tsx`: Line preview during drawing
- `ArrowPreview.tsx`: Arrow preview during drawing
- `StrokePreview.tsx`: Freehand stroke preview during drawing

### 9. UI Components (`components/canvas/`)

- `Toolbar.tsx`: Tool selection with all drawing tools
- `ZoomBar.tsx`: Zoom controls (in/out/reset) and percentage display
- `HistoryPill.tsx`: Undo/redo controls (TODO: implement functionality)
- `BoundingBox.tsx`: Selection bounds with 8-point resize handles (corners + edges)
- `SelectionBox.tsx`: Multi-select rectangle (drag on empty space)

### 10. Cursor Management (`lib/canvas/cursor-utils.ts` + `hooks/use-canvas-cursor.ts`)

**Cursor Utils:**

- `getCursorForTool`: Maps tools to cursor classes
- `getCursorForViewportMode`: Returns cursor for viewport modes (panning/shiftPanning)
- `shouldShowGrabCursor`: Determines when to show grab cursor (Space key held)
- Cursor classes: select, pen, eraser, crosshair, text, move, grab, grabbing

**Cursor Hook:**

- Manages cursor state based on tool, viewport mode, and keyboard modifiers
- Priority system: panning > Space key > selection > tool
- Shows move cursor when shapes are selected
- Listens for Space key to show grab cursor

## Interaction Patterns

### Pan & Zoom

**Pan:**

- Middle mouse button drag (button 1)
- Right mouse button drag (button 2)
- Space + left mouse button drag (temporary hand tool)
- Hand tool + left mouse button drag
- Mouse wheel (horizontal/vertical with Shift modifier)
- Wheel event listener with passive: false for preventDefault

**Zoom:**

- Ctrl/Cmd + mouse wheel (zooms around cursor position)
- Zoom in/out buttons (1.2x factor)
- Reset zoom button (resets to 1.0 scale around canvas center)
- Pinch-to-zoom on trackpads (via ctrlKey detection)
- Adaptive sensitivity: trackpad (0.25) vs mouse wheel (0.05)

### Drawing Tools

**Select Tool:**

- Click to select shape (clears previous selection unless Shift held)
- Shift+click to add/remove from selection
- Drag to move selected shapes (stores initial positions for all selected)
- Drag on empty space for selection box (multi-select)
- Click empty space to deselect all
- Double-click text shapes to enter edit mode
- Smart hit detection: prefers smaller shapes when nested

**Shape Tools (Frame, Rect, Ellipse, Arrow, Line):**

- Click and drag to draw
- Draft preview during drawing
- Auto-switch to select tool after drawing

**Freedraw Tool:**

- Click and drag to draw freehand
- RAF throttling for smooth rendering
- Auto-switch to select tool after drawing

**Text Tool:**

- Click to place text at cursor position
- Auto-switch to select tool after placement
- Sidebar auto-opens for typography controls
- Double-click text to edit
- Text dimensions auto-calculated on creation
- Supports full typography: font family, size, weight, style, alignment, decoration, line height, letter spacing, text transform

**Eraser Tool:**

- Click or drag to erase shapes
- Tracks erased shapes in Set to prevent double-deletion during drag
- Uses hit testing with allowBoundsFallback: false for precise erasing
- Clears erased shapes Set on pointer up

### Selection & Movement

- Click shape to select (clears previous selection unless Shift held)
- Shift+click to add to selection
- Drag selected shapes to move (all selected shapes move together)
- Stores initial positions for all selected shapes in ref
- Calculates delta from move start and applies to all shapes
- Supports moving all shape types: frames, rects, ellipses, freedraw, arrows, lines, text, generatedui
- Movement preserves shape structure (points for freedraw, start/end for lines/arrows)

### Resizing

- Bounding box shows 8 resize handles for selected shapes (corners: nw, ne, sw, se; edges: n, s, e, w)
- Custom DOM events for resize communication:
  - `shape-resize-start`: Initiates resize with shapeId, corner, bounds, clientX/Y
  - `shape-resize-move`: Updates shape during resize with clientX/Y
  - `shape-resize-end`: Finalizes resize and clears resize data
- Supports all shape types with appropriate transformations:
  - Frames, rects, ellipses, generatedui: Direct x, y, w, h updates
  - Freedraw: Scales points proportionally within new bounds
  - Arrows/lines: Special handling for line-start and line-end handles, scales diagonal lines
  - Text: Shows selection indicator only (no resize handles yet)
- Minimum size constraint: 10px width and height
- Resize data stored in ref to prevent re-renders

### Keyboard Shortcuts

**Implemented:**

- **Space**: Enable hand tool (temporary pan with left mouse, shows grab cursor)
- **Delete/Backspace**: Delete selected shapes (disabled in text inputs)
- **S**: Select tool
- **H**: Hand tool
- **F**: Frame tool
- **R**: Rectangle tool
- **C**: Ellipse tool (Circle)
- **L**: Line tool
- **A**: Arrow tool
- **D**: Freedraw tool (Draw)
- **T**: Text tool
- **E**: Eraser tool

**TODO:**

- **Escape**: Clear selection
- **Ctrl/Cmd+A**: Select all
- **Ctrl/Cmd+Z**: Undo
- **Ctrl/Cmd+Shift+Z**: Redo
- **Ctrl/Cmd+C**: Copy
- **Ctrl/Cmd+V**: Paste
- **Ctrl/Cmd+D**: Duplicate

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
// RAF throttling (use-infinite-canvas.ts)
RAF_INTERVAL_MS = 8;

// Hit testing thresholds (hit-testing.ts)
FREEDRAW_HIT_THRESHOLD = 5;
LINE_HIT_THRESHOLD = 8;
TEXT_PADDING = 8;
TEXT_BOUNDS_MARGIN = 2;

// Viewport constraints (viewport-reducer.ts)
MIN_SCALE = 0.1;
MAX_SCALE = 8;
WHEEL_PAN_SPEED = 2.0;
ZOOM_STEP = 1.05;

// Zoom sensitivity (use-infinite-canvas.ts)
TRACKPAD_SENSITIVITY = 0.25;
MOUSE_WHEEL_SENSITIVITY = 0.05;

// Shape defaults (shape-factories.ts)
SHAPE_DEFAULTS = { stroke: "#ffff", strokeWidth: 1 };

// Text defaults (text-utils.ts)
TEXT_PLACEHOLDER = "Type something...";
TEXT_MIN_WIDTH = 24;
TEXT_MAX_WIDTH = 1200;
AVG_CHAR_WIDTH_RATIO = 0.55;

// Tool hotkeys (use-infinite-canvas.ts)
TOOL_HOTKEYS = {
  s: "select",
  h: "hand",
  f: "frame",
  r: "rect",
  c: "ellipse",
  l: "line",
  a: "arrow",
  d: "freedraw",
  t: "text",
  e: "eraser",
};
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
3. Add interaction logic to `use-infinite-canvas.ts` (onPointerDown, onPointerMove, onPointerUp)
4. Handle draft shape rendering if applicable (add preview component)
5. Add cursor styling to `cursor-utils.ts` TOOL_CURSOR_MAP
6. Add keyboard shortcut to TOOL_HOTKEYS in `use-infinite-canvas.ts`
7. Update shapes reducer if new shape type is needed

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

## Additional Utilities

### Text Utils (`lib/canvas/text-utils.ts`)

- `measureTextDimensions`: Measures text width/height using canvas context
- `getTextShapeDimensions`: Gets dimensions from shape or measures if needed
- `clampTextDimensions`: Constrains text dimensions to min/max bounds
- `getMinTextHeight`: Calculates minimum text height based on font size and line height
- Uses canvas 2D context for accurate text measurement
- Supports text transform (uppercase, lowercase, capitalize)
- Handles multi-line text with line height and letter spacing

### Selection Box Helper (`use-infinite-canvas.ts`)

- `intersectsSelectionBox`: Checks if shape intersects with selection rectangle
- Calculates shape bounds for all shape types
- Uses AABB (Axis-Aligned Bounding Box) intersection test
- Supports multi-select by dragging on empty space

## Implementation Details

### Event Handling

- Uses pointer events (not mouse events) for better touch support
- Pointer capture for reliable drag operations
- Prevents default on non-button elements
- Allows interaction with buttons and textareas
- Wheel event listener with passive: false for zoom/pan control

### State Management Strategy

- **Viewport state**: Managed by viewport reducer (pan, zoom, mode)
- **Shapes state**: Managed by shapes reducer (entities, selection, tool)
- **Interaction state**: Stored in refs (draft shapes, movement, resizing)
- **UI state**: Local component state (sidebar, force updates)
- Refs prevent re-renders during high-frequency interactions

### Performance Considerations

- RAF throttling for freehand drawing (8ms = ~120fps)
- RAF batching for pan operations
- Refs for interaction state (no re-renders)
- Memoized shapes list computation
- Immutable state updates with spread operators
- Normalized entity state for O(1) lookups
- Debounced auto-save (1 second)

## Migration Notes

This implementation uses a modern React architecture:

- React Context instead of Redux store
- useReducer instead of Redux Toolkit slices
- Custom entity adapter instead of @reduxjs/toolkit createEntityAdapter
- Direct dispatch calls instead of Redux actions
- Hooks-based architecture with clear separation of concerns

All functionality is preserved while simplifying the architecture and improving TypeScript integration.
