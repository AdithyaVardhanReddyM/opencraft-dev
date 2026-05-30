# Canvas State Management Design

## Overview

This design document outlines the architecture for a React-based infinite canvas state management system. The solution uses React Context API, custom hooks, and useReducer for state management, replacing the Redux implementation while maintaining all functionality. The design emphasizes performance, type safety, and developer experience.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Canvas Component                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │         CanvasProvider (Context)                  │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │   ViewportState + ShapesState + Refs        │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                                │
│                         ▼                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │         useInfiniteCanvas Hook                    │  │
│  │  • Event Handlers                                 │  │
│  │  • Coordinate Conversion                          │  │
│  │  • Shape Operations                               │  │
│  │  • Hit Testing                                    │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                                │
│                         ▼                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Canvas Rendering Layer                    │  │
│  │  • Shapes Renderer                                │  │
│  │  • Selection Overlay                              │  │
│  │  • Draft Shape Preview                            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### State Management Flow

```
User Interaction → Event Handler → Action Dispatch → Reducer → State Update → Re-render
                                                          ↓
                                                    Side Effects (RAF, etc.)
```

## Components and Interfaces

### 1. Core Types

**Location:** `types/canvas.ts`

```typescript
// Viewport Types
export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ViewportMode = "idle" | "panning" | "shiftPanning";

export interface ViewportState {
  scale: number;
  minScale: number;
  maxScale: number;
  translate: Point;
  mode: ViewportMode;
  panStartScreen: Point | null;
  panStartTranslate: Point | null;
  wheelPanSpeed: number;
  zoomStep: number;
}

// Shape Types
export type Tool =
  | "select"
  | "frame"
  | "rect"
  | "ellipse"
  | "freedraw"
  | "arrow"
  | "line"
  | "text"
  | "eraser";

export interface BaseShape {
  id: string;
  stroke: string;
  strokeWidth: number;
  fill?: string | null;
}

export interface FrameShape extends BaseShape {
  type: "frame";
  x: number;
  y: number;
  w: number;
  h: number;
  frameNumber: number;
}

export interface RectShape extends BaseShape {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EllipseShape extends BaseShape {
  type: "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FreeDrawShape extends BaseShape {
  type: "freedraw";
  points: Point[];
}

export interface ArrowShape extends BaseShape {
  type: "arrow";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface LineShape extends BaseShape {
  type: "line";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface TextShape extends BaseShape {
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  textDecoration: "none" | "underline" | "line-through";
  lineHeight: number;
  letterSpacing: number;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
}

export interface GeneratedUIShape extends BaseShape {
  type: "generatedui";
  x: number;
  y: number;
  w: number;
  h: number;
  uiSpecData: string | null;
  sourceFrameId: string;
  isWorkflowPage?: boolean;
}

export type Shape =
  | FrameShape
  | RectShape
  | EllipseShape
  | FreeDrawShape
  | ArrowShape
  | LineShape
  | TextShape
  | GeneratedUIShape;

// Entity State (normalized shape storage)
export interface EntityState<T> {
  ids: string[];
  entities: Record<string, T>;
}

export type SelectionMap = Record<string, true>;

export interface ShapesState {
  tool: Tool;
  shapes: EntityState<Shape>;
  selected: SelectionMap;
  frameCounter: number;
}
```

### 2. Context Provider

**Location:** `contexts/CanvasContext.tsx`

The context provider manages all canvas state and provides it to child components.

```typescript
interface CanvasContextValue {
  // Viewport State
  viewport: ViewportState;
  dispatchViewport: React.Dispatch<ViewportAction>;

  // Shapes State
  shapes: ShapesState;
  dispatchShapes: React.Dispatch<ShapesAction>;

  // Computed Values
  shapesList: Shape[];
}

export const CanvasContext = createContext<CanvasContextValue | null>(null);

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [viewport, dispatchViewport] = useReducer(
    viewportReducer,
    initialViewportState
  );
  const [shapes, dispatchShapes] = useReducer(
    shapesReducer,
    initialShapesState
  );

  const shapesList = useMemo(
    () =>
      shapes.shapes.ids.map((id) => shapes.shapes.entities[id]).filter(Boolean),
    [shapes.shapes]
  );

  return (
    <CanvasContext.Provider
      value={{ viewport, dispatchViewport, shapes, dispatchShapes, shapesList }}
    >
      {children}
    </CanvasContext.Provider>
  );
}
```

### 3. Reducers

**Location:** `lib/canvas/viewport-reducer.ts` and `lib/canvas/shapes-reducer.ts`

Reducers handle state updates in an immutable way.

**Viewport Actions:**

- `SET_TRANSLATE`
- `SET_SCALE`
- `ZOOM_BY`
- `WHEEL_ZOOM`
- `WHEEL_PAN`
- `PAN_START`
- `PAN_MOVE`
- `PAN_END`
- `HAND_TOOL_ENABLE`
- `HAND_TOOL_DISABLE`
- `RESET_VIEW`
- `RESTORE_VIEWPORT`

**Shapes Actions:**

- `SET_TOOL`
- `ADD_SHAPE` (generic for all shape types)
- `UPDATE_SHAPE`
- `REMOVE_SHAPE`
- `CLEAR_ALL`
- `SELECT_SHAPE`
- `DESELECT_SHAPE`
- `CLEAR_SELECTION`
- `SELECT_ALL`
- `DELETE_SELECTED`
- `LOAD_PROJECT`

### 4. Main Hook: useInfiniteCanvas

**Location:** `hooks/use-infinite-canvas.ts`

This is the primary hook that components use to interact with the canvas.

```typescript
export interface UseInfiniteCanvasReturn {
  // State
  viewport: ViewportState;
  shapes: Shape[];
  currentTool: Tool;
  selectedShapes: SelectionMap;
  isSidebarOpen: boolean;
  hasSelectedText: boolean;

  // Event Handlers
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onPointerMove: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp: React.PointerEventHandler<HTMLDivElement>;
  onPointerCancel: React.PointerEventHandler<HTMLDivElement>;

  // Utilities
  attachCanvasRef: (ref: HTMLDivElement | null) => void;
  selectTool: (tool: Tool) => void;
  getDraftShape: () => DraftShape | null;
  getFreeDrawPoints: () => readonly Point[];
  setIsSidebarOpen: (open: boolean) => void;
}

export function useInfiniteCanvas(): UseInfiniteCanvasReturn {
  // Implementation details...
}
```

### 5. Utility Functions

**Location:** `lib/canvas/utils.ts`

```typescript
// Coordinate conversion
export function screenToWorld(
  screen: Point,
  translate: Point,
  scale: number
): Point;
export function worldToScreen(
  world: Point,
  translate: Point,
  scale: number
): Point;

// Zoom calculations
export function zoomAroundScreenPoint(
  originScreen: Point,
  newScale: number,
  currentTranslate: Point,
  currentScale: number
): Point;

// Hit testing
export function getShapeAtPoint(point: Point, shapes: Shape[]): Shape | null;
export function isPointInShape(point: Point, shape: Shape): boolean;
export function distanceToLineSegment(
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number;

// Entity adapter utilities
export function createEntityState<T extends { id: string }>(): EntityState<T>;
export function addEntity<T extends { id: string }>(
  state: EntityState<T>,
  entity: T
): EntityState<T>;
export function updateEntity<T extends { id: string }>(
  state: EntityState<T>,
  id: string,
  changes: Partial<T>
): EntityState<T>;
export function removeEntity<T extends { id: string }>(
  state: EntityState<T>,
  id: string
): EntityState<T>;

// Shape factory functions
export function createFrame(params: {
  x: number;
  y: number;
  w: number;
  h: number;
  frameNumber: number;
}): FrameShape;
export function createRect(params: {
  x: number;
  y: number;
  w: number;
  h: number;
}): RectShape;
export function createEllipse(params: {
  x: number;
  y: number;
  w: number;
  h: number;
}): EllipseShape;
export function createFreeDraw(params: { points: Point[] }): FreeDrawShape;
export function createArrow(params: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}): ArrowShape;
export function createLine(params: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}): LineShape;
export function createText(params: { x: number; y: number }): TextShape;
export function createGeneratedUI(params: {
  x: number;
  y: number;
  w: number;
  h: number;
  uiSpecData: string | null;
  sourceFrameId: string;
}): GeneratedUIShape;
```

## Data Models

### Entity State Structure

The normalized entity state provides O(1) lookup and efficient updates:

```typescript
{
  ids: ["shape-1", "shape-2", "shape-3"],
  entities: {
    "shape-1": { id: "shape-1", type: "rect", x: 100, y: 100, w: 200, h: 150, ... },
    "shape-2": { id: "shape-2", type: "ellipse", x: 400, y: 200, w: 100, h: 100, ... },
    "shape-3": { id: "shape-3", type: "text", x: 50, y: 50, text: "Hello", ... }
  }
}
```

### Selection State

Simple map for O(1) selection checks:

```typescript
{
  "shape-1": true,
  "shape-3": true
}
```

### Viewport State

```typescript
{
  scale: 1.0,
  minScale: 0.1,
  maxScale: 8.0,
  translate: { x: 0, y: 0 },
  mode: "idle",
  panStartScreen: null,
  panStartTranslate: null,
  wheelPanSpeed: 0.5,
  zoomStep: 1.06
}
```

## Error Handling

### Invalid State Transitions

- **Guard clauses** in reducers prevent invalid state transitions
- **Type safety** ensures only valid actions are dispatched
- **Validation** in shape factory functions ensures valid shape data

### Pointer Event Edge Cases

- **Pointer capture** ensures events are received even when cursor leaves canvas
- **Cleanup on unmount** prevents memory leaks from event listeners
- **RAF cancellation** prevents orphaned animation frames

### Coordinate Conversion Errors

- **Null checks** for canvas ref before coordinate conversion
- **Fallback values** when canvas bounds are unavailable
- **Clamping** for zoom levels to prevent extreme values

## Testing Strategy

### Unit Tests

**Location:** `__tests__/lib/canvas/`

1. **Viewport Reducer Tests**

   - Test each action type independently
   - Verify zoom clamping behavior
   - Test coordinate conversion accuracy
   - Verify pan state transitions

2. **Shapes Reducer Tests**

   - Test shape addition/removal
   - Verify entity state normalization
   - Test selection operations
   - Verify frame counter logic

3. **Utility Function Tests**
   - Test coordinate conversions with various scales
   - Test hit detection for each shape type
   - Test entity adapter operations
   - Test shape factory functions

### Integration Tests

**Location:** `__tests__/hooks/`

1. **useInfiniteCanvas Hook Tests**
   - Test tool switching
   - Test shape drawing workflow
   - Test selection and movement
   - Test eraser functionality
   - Test keyboard shortcuts

### Component Tests

**Location:** `__tests__/components/canvas/`

1. **CanvasProvider Tests**

   - Test context value provision
   - Test state initialization
   - Test computed values (shapesList)

2. **Canvas Component Tests**
   - Test rendering with various shapes
   - Test pointer event handling
   - Test viewport transformations
   - Test draft shape preview

## Performance Optimizations

### 1. RequestAnimationFrame Throttling

- **Freehand drawing** uses RAF with 8ms interval to limit updates
- **Pan operations** use RAF to batch translate updates
- **Pending state pattern** prevents RAF queue buildup

### 2. Memoization

- **shapesList** computed value memoized with useMemo
- **Event handlers** wrapped in useCallback to prevent re-creation
- **Coordinate conversions** cached when possible

### 3. Refs for Non-Reactive State

- **Draft shapes** stored in refs to avoid re-renders during drawing
- **Interaction flags** (isDrawing, isMoving, isErasing) use refs
- **Initial positions** for drag operations stored in refs

### 4. Efficient Entity Updates

- **Partial updates** only modify changed properties
- **Normalized structure** enables O(1) lookups
- **Immutable updates** use spread operators for minimal copying

## Design Decisions and Rationales

### Why Context + useReducer instead of Redux?

1. **Simpler setup** - No store configuration or middleware needed
2. **Better TypeScript integration** - Direct type inference
3. **Scoped state** - Canvas state isolated to canvas component tree
4. **Modern React patterns** - Aligns with React 19 best practices
5. **Smaller bundle** - No external state management library

### Why Normalized Entity State?

1. **O(1) lookups** - Fast shape retrieval by ID
2. **Efficient updates** - Update single entity without iterating
3. **Consistent structure** - Same pattern as Redux Toolkit
4. **Easy serialization** - Simple JSON structure for persistence

### Why Refs for Interaction State?

1. **Performance** - Avoid re-renders during rapid pointer events
2. **Immediate access** - No stale closure issues
3. **RAF compatibility** - Works well with animation frame callbacks
4. **Cleaner code** - Separates reactive from non-reactive state

### Why Custom Event System for Resize?

1. **Decoupling** - Resize handles don't need direct hook access
2. **Flexibility** - Easy to add resize functionality to any component
3. **Event bubbling** - Natural DOM event propagation
4. **Type safety** - CustomEvent with typed detail payload

## File Structure

```
lib/
  canvas/
    viewport-reducer.ts       # Viewport state reducer
    shapes-reducer.ts         # Shapes state reducer
    utils.ts                  # Utility functions
    shape-factories.ts        # Shape creation functions
    entity-adapter.ts         # Entity state management
    hit-testing.ts            # Shape hit detection
    coordinate-utils.ts       # Coordinate conversion

contexts/
  CanvasContext.tsx           # Canvas context provider

hooks/
  use-infinite-canvas.ts      # Main canvas hook
  use-canvas-context.ts       # Context consumer hook

types/
  canvas.ts                   # All canvas-related types

__tests__/
  lib/
    canvas/
      viewport-reducer.test.ts
      shapes-reducer.test.ts
      utils.test.ts
  hooks/
    use-infinite-canvas.test.ts
  contexts/
    CanvasContext.test.tsx
```

## Migration Path from Redux

1. **Create new files** alongside existing Redux implementation
2. **Implement context and reducers** with same action signatures
3. **Port useInfiniteCanvas hook** to use new context
4. **Update canvas component** to use CanvasProvider
5. **Test thoroughly** before removing Redux code
6. **Remove Redux dependencies** once migration is complete

## Future Enhancements

1. **Undo/Redo** - Add history tracking to reducers
2. **Collaborative editing** - Sync state via WebSocket
3. **Performance monitoring** - Add metrics for render times
4. **Gesture support** - Add pinch-to-zoom for touch devices
5. **Snapping** - Add grid and shape snapping
6. **Layers** - Add z-index management for shapes

## Additional Implementation Details

### Critical Logic from Reference Implementation

#### 1. Touch/Pointer Management

The hook uses a `touchMapRef` to track multi-touch interactions, though currently only single-touch is fully implemented:

```typescript
const touchMapRef = useRef<Map<number, TouchPointer>>(new Map());

interface TouchPointer {
  id: number;
  p: Point;
}
```

#### 2. Button Click Detection

Important logic to prevent canvas interactions when clicking UI buttons:

```typescript
const target = e.target as HTMLElement;
const isButton =
  target.tagName === "BUTTON" ||
  target.closest("button") ||
  target.classList.contains("pointer-events-auto") ||
  target.closest(".pointer-events-auto");
if (!isButton) {
  e.preventDefault();
} else {
  return; // Don't handle canvas interactions when clicking buttons
}
```

#### 3. Text Input Blur Logic

When clicking on empty space or using eraser, blur any active text inputs:

```typescript
const blurActiveTextInput = () => {
  const activeElement = document.activeElement;
  if (activeElement && activeElement.tagName === "INPUT") {
    (activeElement as HTMLInputElement).blur();
  }
};
```

#### 4. Sidebar Auto-Open for Text Selection

Automatically open sidebar when text shape is selected:

```typescript
const hasSelectedText = Object.keys(selectedShapes).some((id) => {
  const shape = shapesEntities[id];
  return shape?.type === "text";
});

useEffect(() => {
  if (hasSelectedText && !isSidebarOpen) {
    setIsSidebarOpen(true);
  } else if (!hasSelectedText) {
    setIsSidebarOpen(false);
  }
}, [hasSelectedText, isSidebarOpen]);
```

#### 5. Pointer Capture

Essential for ensuring pointer events are received even when cursor leaves canvas:

```typescript
// On pointer down
canvasRef.current?.setPointerCapture?.(e.pointerId);

// On pointer up
canvasRef.current?.releasePointerCapture?.(e.pointerId);
```

#### 6. Shift Key for Hand Tool

The implementation uses Shift key (not Space) for temporary hand tool:

```typescript
const onKeyDown = (e: KeyboardEvent): void => {
  if ((e.code == "ShiftLeft" || e.code === "ShiftRight") && !e.repeat) {
    e.preventDefault();
    isSpacePressed.current = true; // Note: ref name kept for consistency
    dispatch(handToolEnable());
  }
};
```

#### 7. Eraser Drag Logic

Track erased shapes to prevent duplicate removal during drag:

```typescript
const isErasingRef = useRef(false);
const erasedShapesRef = useRef<Set<string>>(new Set());

// On pointer down with eraser
isErasingRef.current = true;
erasedShapesRef.current.clear();
const hitShape = getShapeAtPoint(world);
if (hitShape) {
  dispatch(removeShape(hitShape.id));
  erasedShapesRef.current.add(hitShape.id);
}

// On pointer move with eraser
if (isErasingRef.current && currentTool === "eraser") {
  const hitShape = getShapeAtPoint(world);
  if (hitShape && !erasedShapesRef.current.has(hitShape.id)) {
    dispatch(removeShape(hitShape.id));
    erasedShapesRef.current.add(hitShape.id);
  }
}
```

#### 8. Shape Movement with Initial Positions

Store initial positions of all selected shapes when drag starts:

```typescript
const initialShapePositionsRef = useRef<
  Record<
    string,
    {
      x?: number;
      y?: number;
      points?: Point[];
      startX?: number;
      startY?: number;
      endX?: number;
      endY?: number;
    }
  >
>({});

// Store initial positions for all selected shapes
Object.keys(selectedShapes).forEach((id) => {
  const shape = entityState.entities[id];
  if (shape) {
    if (
      shape.type === "frame" ||
      shape.type === "rect" ||
      shape.type === "ellipse" ||
      shape.type === "generatedui"
    ) {
      initialShapePositionsRef.current[id] = { x: shape.x, y: shape.y };
    } else if (shape.type === "freedraw") {
      initialShapePositionsRef.current[id] = { points: [...shape.points] };
    } else if (shape.type === "arrow" || shape.type === "line") {
      initialShapePositionsRef.current[id] = {
        startX: shape.startX,
        startY: shape.startY,
        endX: shape.endX,
        endY: shape.endY,
      };
    } else if (shape.type === "text") {
      initialShapePositionsRef.current[id] = { x: shape.x, y: shape.y };
    }
  }
});
```

#### 9. Resize Event System

Custom events for shape resizing:

```typescript
// Event types
window.dispatchEvent(
  new CustomEvent("shape-resize-start", {
    detail: { shapeId, corner, bounds, clientX, clientY },
  })
);

window.dispatchEvent(
  new CustomEvent("shape-resize-move", {
    detail: { clientX, clientY },
  })
);

window.dispatchEvent(new CustomEvent("shape-resize-end"));

// Resize logic for different shape types
if (
  shape.type === "frame" ||
  shape.type === "rect" ||
  shape.type === "ellipse"
) {
  // Update x, y, w, h
} else if (shape.type === "freedraw") {
  // Scale all points proportionally
  const xs = shape.points.map((p) => p.x);
  const ys = shape.points.map((p) => p.y);
  const actualMinX = Math.min(...xs);
  const actualMaxX = Math.max(...xs);
  const actualMinY = Math.min(...ys);
  const actualMaxY = Math.max(...ys);
  const actualWidth = actualMaxX - actualMinX;
  const actualHeight = actualMaxY - actualMinY;

  const scaleX = actualWidth > 0 ? newActualWidth / actualWidth : 1;
  const scaleY = actualHeight > 0 ? newActualHeight / actualHeight : 1;

  const scaledPoints = shape.points.map((point) => ({
    x: newActualX + (point.x - actualMinX) * scaleX,
    y: newActualY + (point.y - actualMinY) * scaleY,
  }));
} else if (shape.type === "arrow" || shape.type === "line") {
  // Handle vertical/horizontal lines specially
  if (actualWidth === 0) {
    // Vertical line
    newStartX = newActualX + newActualWidth / 2;
    newEndX = newActualX + newActualWidth / 2;
  } else if (actualHeight === 0) {
    // Horizontal line
    newStartY = newActualY + newActualHeight / 2;
    newEndY = newActualY + newActualHeight / 2;
  } else {
    // Diagonal line - scale proportionally
  }
}
```

#### 10. Text Shape Hit Testing

Special calculation for text shape bounds:

```typescript
case "text":
  const textWidth = Math.max(
    shape.text.length * (shape.fontSize * 0.6),
    100
  );
  const textHeight = shape.fontSize * 1.2;
  const padding = 8;

  return (
    point.x >= shape.x - 2 &&
    point.x <= shape.x + textWidth + padding + 2 &&
    point.y >= shape.y - 2 &&
    point.y <= shape.y + textHeight + padding + 2
  );
```

#### 11. Viewport Actions Not in Original Design

Additional viewport actions from the slice:

- `centerOnWorld` - Center viewport on a specific world coordinate
- `zoomToFit` - Fit specific bounds in viewport with padding
- `resetView` - Reset to initial viewport state
- `restoreViewport` - Restore saved viewport state

#### 12. Shape Actions Not in Original Design

Additional shape actions:

- `selectAll` - Select all shapes
- `deleteSelected` - Delete all selected shapes
- `addFreeDrawShape` - Specific action for freedraw (validates points array)

#### 13. Frame Counter Logic

Frames have auto-incrementing numbers:

```typescript
// On add frame
state.frameCounter += 1;
const frameWithNumber = {
  ...action.payload,
  frameNumber: state.frameCounter,
};

// On remove frame
if (shape?.type === "frame") {
  state.frameCounter = Math.max(0, state.frameCounter - 1);
}
```

#### 14. Tool Change Clears Selection

When switching from select tool to any other tool:

```typescript
setTool(state, action: PayloadAction<Tool>) {
  state.tool = action.payload;
  if (action.payload !== "select") state.selected = {};
}
```

#### 15. Wheel Event Handling

Shift key changes wheel behavior:

```typescript
const onWheel = (e: WheelEvent) => {
  e.preventDefault();
  const originScreen = localPointFromClient(e.clientX, e.clientY);
  if (e.ctrlKey || e.metaKey) {
    dispatch(wheelZoom({ deltaY: e.deltaY, originScreen }));
  } else {
    const dx = e.shiftKey ? e.deltaY : e.deltaX;
    const dy = e.shiftKey ? 0 : e.deltaY;
    dispatch(wheelPan({ dx: -dx, dy: -dy }));
  }
};
```

#### 16. Minimum Shape Dimensions

All shapes enforce minimum 1x1 dimensions on creation:

```typescript
if (w > 1 && h > 1) {
  // Create shape
}
```

Resize operations enforce 10x10 minimum:

```typescript
newBounds.w = Math.max(10, calculatedWidth);
newBounds.h = Math.max(10, calculatedHeight);
```

#### 17. Arrow/Line Action Parameter Names

Note the parameter naming inconsistency in the original:

```typescript
// addArrow uses 'start' instead of 'startX'
dispatch(
  addArrow({
    start: draft.startWorld.x, // Should be startX
    startY: draft.startWorld.y,
    endX: draft.currentWorld.x,
    endY: draft.currentWorld.y,
  })
);

// But the factory function expects startX
const makeArrow = (p: {
  startX: number; // Not 'start'
  startY: number;
  endX: number;
  endY: number;
  // ...
}): ArrowShape => ({
  // ...
  startX: p.startX,
  // ...
});
```

This should be corrected in the new implementation.

### Constants

```typescript
// RAF throttling interval for freehand drawing
const RAF_INTERVAL_MS = 8;

// Default shape styling
const DEFAULTS = {
  stroke: "#ffff",
  strokeWidth: 2,
};

// Frame default styling
const FRAME_DEFAULTS = {
  stroke: "transparent",
  strokeWidth: 0,
  fill: "rgba(255, 255, 255, 0.05)",
};

// Text default styling
const TEXT_DEFAULTS = {
  text: "Type here...",
  fontSize: 16,
  fontFamily: "Inter, sans-serif",
  fontWeight: 400,
  fontStyle: "normal" as const,
  textAlign: "left" as const,
  textDecoration: "none" as const,
  lineHeight: 1.2,
  letterSpacing: 0,
  textTransform: "none" as const,
  fill: "#ffffff",
};

// Generated UI default styling
const GENERATED_UI_DEFAULTS = {
  stroke: "transparent",
  strokeWidth: 0,
  fill: null,
};

// Hit testing thresholds
const FREEDRAW_HIT_THRESHOLD = 5;
const LINE_HIT_THRESHOLD = 8;
const TEXT_PADDING = 8;
const TEXT_BOUNDS_MARGIN = 2;

// Viewport constraints
const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const WHEEL_PAN_SPEED = 0.5;
const ZOOM_STEP = 1.06;
const ZOOM_DIVISOR = 53; // Used in wheelZoom calculation
```
