# Canvas State Management

This directory contains the complete implementation of the infinite canvas state management system for Unit {set}.

## Architecture

The canvas system uses **React Context + useReducer** for state management, replacing Redux while maintaining all functionality from the reference implementation.

### Core Components

1. **Types** (`types/canvas.ts`)

   - All TypeScript interfaces and types for shapes, viewport, and state

2. **Utilities** (`lib/canvas/`)

   - `coordinate-utils.ts` - Screen/world coordinate conversion and zoom calculations
   - `hit-testing.ts` - Shape intersection and hit detection
   - `entity-adapter.ts` - Normalized entity state management
   - `shape-factories.ts` - Shape creation with default styling

3. **Reducers** (`lib/canvas/`)

   - `viewport-reducer.ts` - Viewport state (pan, zoom, mode)
   - `shapes-reducer.ts` - Shapes state (add, update, remove, select)

4. **Context** (`contexts/CanvasContext.tsx`)

   - React Context provider wrapping viewport and shapes state
   - Computed values (shapesList)

5. **Hooks**

   - `hooks/use-infinite-canvas.ts` - Main hook for canvas interactions
   - `hooks/use-canvas-persistence.ts` - State persistence (localStorage + Convex)

6. **Components**
   - `app/dashboard/[projectId]/canvas/page.tsx` - Canvas page with rendering

## Features

### Viewport Management

- Pan with middle/right mouse button or Shift + left mouse button
- Zoom with Ctrl/Cmd + wheel (zooms around cursor)
- Pan with wheel (horizontal/vertical)
- Smooth performance with RAF optimization

### Shape Tools

- **Select** - Click to select, drag to move, Shift+click for multi-select
- **Frame** - Draw rectangular frames with auto-incrementing numbers
- **Rectangle** - Draw rectangles
- **Ellipse** - Draw ellipses
- **Freedraw** - Draw freehand paths with RAF-throttled rendering
- **Arrow** - Draw arrows with arrowheads
- **Line** - Draw straight lines
- **Text** - Click to place text with full typography controls
- **Eraser** - Click or drag to erase shapes

### Interaction Features

- Draft shape preview during drawing
- Multi-shape selection and movement
- Shape resizing via custom events
- Keyboard shortcuts (Shift for hand tool)
- Button click detection (prevents canvas interaction on UI buttons)
- Text input auto-blur on empty space click
- Sidebar auto-open for text selection

### Performance Optimizations

- RequestAnimationFrame throttling for freehand drawing (8ms interval)
- RAF-batched pan operations
- Refs for non-reactive state (no re-renders during interactions)
- Memoized computed values
- Immutable state updates with spread operators

### State Persistence

- Auto-save to localStorage (1 second debounce)
- Auto-load from localStorage on mount
- Export/import as JSON
- Convex integration ready (TODO: implement mutations/queries)

## Usage

### Basic Setup

```tsx
import { CanvasProvider } from "@/contexts/CanvasContext";
import { useInfiniteCanvas } from "@/hooks/use-infinite-canvas";

function MyCanvas() {
  const {
    viewport,
    shapes,
    currentTool,
    selectedShapes,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    attachCanvasRef,
    selectTool,
    getDraftShape,
    getFreeDrawPoints,
  } = useInfiniteCanvas();

  return (
    <div
      ref={attachCanvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {/* Render shapes */}
    </div>
  );
}

function App() {
  return (
    <CanvasProvider>
      <MyCanvas />
    </CanvasProvider>
  );
}
```

### With Persistence

```tsx
import { useCanvasPersistence } from "@/hooks/use-canvas-persistence";

function MyCanvas({ projectId }: { projectId: string }) {
  const { saveToConvex, loadFromConvex } = useCanvasPersistence(projectId);

  // Auto-saves to localStorage
  // Call saveToConvex() manually or on specific events
}
```

### Dispatching Actions

```tsx
import { useCanvasContext } from "@/contexts/CanvasContext";

function MyComponent() {
  const { dispatchViewport, dispatchShapes } = useCanvasContext();

  // Zoom in
  dispatchViewport({
    type: "ZOOM_BY",
    payload: { factor: 1.2, originScreen: { x: 0, y: 0 } },
  });

  // Add a rectangle
  dispatchShapes({
    type: "ADD_RECT",
    payload: { x: 100, y: 100, w: 200, h: 150 },
  });
}
```

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
WHEEL_PAN_SPEED = 0.5;
ZOOM_STEP = 1.06;

// Shape defaults
SHAPE_DEFAULTS = { stroke: "#ffff", strokeWidth: 2 };
```

## Resize Events

The system uses custom DOM events for shape resizing:

```typescript
// Start resize
window.dispatchEvent(
  new CustomEvent("shape-resize-start", {
    detail: { shapeId, corner, bounds, clientX, clientY },
  })
);

// Move during resize
window.dispatchEvent(
  new CustomEvent("shape-resize-move", {
    detail: { clientX, clientY },
  })
);

// End resize
window.dispatchEvent(new CustomEvent("shape-resize-end"));
```

## Testing

Run diagnostics on all canvas files:

```bash
# Check for TypeScript errors
pnpm tsc --noEmit
```

## Future Enhancements

- [ ] Undo/Redo with history tracking
- [ ] Collaborative editing via WebSocket
- [ ] Performance monitoring and metrics
- [ ] Touch gesture support (pinch-to-zoom)
- [ ] Grid and shape snapping
- [ ] Layer management (z-index)
- [ ] Shape grouping
- [ ] Copy/paste functionality
- [ ] Keyboard shortcuts (Delete, Ctrl+A, etc.)
- [ ] Export to image/SVG

## Migration from Redux

This implementation replaces the Redux-based canvas system with:

- React Context instead of Redux store
- useReducer instead of Redux Toolkit slices
- Custom entity adapter instead of @reduxjs/toolkit createEntityAdapter
- Direct dispatch calls instead of Redux actions

All functionality is preserved while simplifying the architecture and improving TypeScript integration.
