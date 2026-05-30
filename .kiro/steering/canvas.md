---
inclusion: manual
---

# Canvas Architecture

## Overview

The canvas system manages shapes, viewport transformations, and drawing tools using React Context API for state management. This replaces the Redux-based approach with a more React-native solution.

## State Management Pattern

Use React Context API with `useReducer` for complex state logic. Create separate contexts for shapes and viewport to optimize re-renders.

### Context Structure

```typescript
// contexts/ShapesContext.tsx
const ShapesContext = createContext<ShapesState | null>(null);
const ShapesDispatchContext = createContext<Dispatch<ShapesAction> | null>(
  null
);

// contexts/ViewportContext.tsx
const ViewportContext = createContext<ViewportState | null>(null);
const ViewportDispatchContext = createContext<Dispatch<ViewportAction> | null>(
  null
);
```

## Shape System

### Shape Types

**Base Shape Interface:**

```typescript
interface BaseShape {
  id: string;
  stroke: string;
  strokeWidth: number;
  fill?: string | null;
}
```

**Supported Shapes:**

- `FrameShape` - Container with frame number, transparent border, subtle fill
- `RectShape` - Rectangle with position (x, y) and dimensions (w, h)
- `EllipseShape` - Ellipse with position and dimensions
- `FreeDrawShape` - Free-hand drawing with array of points
- `ArrowShape` - Arrow with start/end coordinates
- `LineShape` - Line with start/end coordinates
- `TextShape` - Text with typography properties (fontSize, fontFamily, fontWeight, fontStyle, textAlign, textDecoration, lineHeight, letterSpacing, textTransform)
- `GeneratedUIShape` - AI-generated UI with HTML markup, source frame reference, and optional workflow flag

### Shape Defaults

- Default stroke: `#ffff` (white)
- Default strokeWidth: `2`
- Default fill: `null` (transparent)
- Frame fill: `rgba(255, 255, 255, 0.05)`
- Frame stroke: `transparent` with strokeWidth `0`
- GeneratedUI stroke: `transparent` with strokeWidth `0`

### Shape State Management

**State Structure:**

```typescript
interface ShapesState {
  tool: Tool;
  shapes: Record<string, Shape>; // Map of id -> shape
  shapeIds: string[]; // Ordered array of shape IDs
  selected: Record<string, true>; // Selection map
  frameCounter: number; // Auto-increment for frame numbers
}
```

**Key Actions:**

- `setTool` - Change active drawing tool, clears selection if not "select"
- `addFrame/addRect/addEllipse/addFreeDrawShape/addArrow/addLine/addText/addGeneratedUI` - Add new shapes
- `updateShape` - Partial update of shape properties
- `removeShape` - Delete shape, decrements frameCounter if frame
- `clearAll` - Remove all shapes, reset frameCounter
- `selectShape/deselectShape/clearSelection/selectAll` - Selection management
- `deleteSelected` - Remove all selected shapes
- `loadProject` - Restore entire canvas state from saved data

### Shape ID Generation

Use `nanoid()` for unique shape IDs. Import from `nanoid` package.

## Viewport System

### Coordinate Systems

**Screen Space:** Pixel coordinates in the browser viewport
**World Space:** Infinite canvas coordinates

**Transformations:**

```typescript
// Screen to World
const worldPoint = {
  x: (screenPoint.x - translate.x) / scale,
  y: (screenPoint.y - translate.y) / scale,
};

// World to Screen
const screenPoint = {
  x: worldPoint.x * scale + translate.x,
  y: worldPoint.y * scale + translate.y,
};
```

### Viewport State

```typescript
interface ViewportState {
  scale: number; // Current zoom level
  minScale: number; // Minimum zoom (0.1)
  maxScale: number; // Maximum zoom (8)
  translate: Point; // Pan offset {x, y}
  mode: ViewportMode; // "idle" | "panning" | "shiftPanning"

  // Pan tracking
  panStartScreen: Point | null;
  panStartTranslate: Point | null;

  // Tunables
  wheelPanSpeed: number; // 0.5
  zoomStep: number; // 1.06
}
```

### Viewport Actions

**Zoom Operations:**

- `setScale` - Set absolute scale with optional origin point
- `zoomBy` - Relative zoom by factor around origin
- `wheelZoom` - Handle mouse wheel zoom (deltaY-based)
- `zoomToFit` - Fit bounds within viewport with padding

**Pan Operations:**

- `panStart` - Begin pan gesture, store start position
- `panMove` - Update translate during pan
- `panEnd` - Complete pan gesture
- `wheelPan` - Pan via mouse wheel (shift+wheel)
- `handToolEnable/handToolDisable` - Toggle shift-pan mode

**Navigation:**

- `centerOnWorld` - Center viewport on world coordinate
- `resetView` - Reset to scale=1, translate=(0,0)
- `restoreViewport` - Restore saved viewport state

### Zoom Around Point

When zooming, maintain the world point under the cursor:

```typescript
const zoomAroundScreenPoint = (
  originScreen: Point,
  newScale: number,
  currentTranslate: Point,
  currentScale: number
): Point => {
  const worldAtOrigin = screenToWorld(
    originScreen,
    currentTranslate,
    currentScale
  );
  return {
    x: originScreen.x - worldAtOrigin.x * newScale,
    y: originScreen.y - worldAtOrigin.y * newScale,
  };
};
```

### Zoom to Fit Algorithm

```typescript
// Calculate scale to fit bounds in viewport
const scaleX = (viewportWidth - padding * 2) / boundsWidth;
const scaleY = (viewportHeight - padding * 2) / boundsHeight;
const fitScale = clamp(Math.min(scaleX, scaleY), minScale, maxScale);

// Center bounds in viewport
const centerX = viewportWidth / 2;
const centerY = viewportHeight / 2;
const boundsCenterX = bounds.x + bounds.width / 2;
const boundsCenterY = bounds.y + bounds.height / 2;

translate.x = centerX - boundsCenterX * fitScale;
translate.y = centerY - boundsCenterY * fitScale;
```

## Drawing Tools

### Tool Types

```typescript
type Tool =
  | "select" // Selection and manipulation
  | "frame" // Create frames
  | "rect" // Draw rectangles
  | "ellipse" // Draw ellipses
  | "freedraw" // Free-hand drawing
  | "arrow" // Draw arrows
  | "line" // Draw lines
  | "text" // Add text
  | "eraser"; // Erase shapes
```

### Tool Behavior

**Select Tool:**

- Click to select single shape
- Shift+click to multi-select
- Drag to move selected shapes
- Click empty space to deselect

**Shape Tools (rect, ellipse, frame):**

- Click and drag to define bounds
- Create shape on mouse up
- Automatically switch to select tool after creation (optional)

**Free Draw Tool:**

- Capture points during mouse move
- Create FreeDrawShape with points array
- Minimum 2 points required

**Arrow/Line Tools:**

- Click for start point
- Drag to end point
- Create shape on mouse up

**Text Tool:**

- Click to place text at position
- Start with placeholder "Type here..."
- Enter edit mode immediately after creation

**Eraser Tool:**

- Click or drag over shapes to delete
- Use intersection detection

## Canvas Rendering

### Rendering Order

Render shapes in order of `shapeIds` array for proper z-index layering.

### SVG vs Canvas

**Use SVG for:**

- Shapes with crisp edges (rect, ellipse, line, arrow)
- Text rendering
- Easy event handling per shape
- Generated UI (via foreignObject)

**Use Canvas for:**

- Free-hand drawing (performance with many points)
- Large number of shapes (>1000)

### Transform Application

Apply viewport transform to canvas/SVG container:

```typescript
<svg
  style={{
    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
    transformOrigin: "0 0",
  }}
>
  {/* Render shapes */}
</svg>
```

Or use SVG viewBox for better quality:

```typescript
<svg
  viewBox={`${-translate.x / scale} ${-translate.y / scale} ${width / scale} ${
    height / scale
  }`}
>
  {/* Render shapes */}
</svg>
```

## Event Handling

### Mouse Events

**Coordinate Conversion:**
Always convert screen coordinates to world coordinates for shape operations:

```typescript
const handleMouseDown = (e: React.MouseEvent) => {
  const rect = canvasRef.current.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  const worldPoint = screenToWorld(
    { x: screenX, y: screenY },
    viewport.translate,
    viewport.scale
  );
  // Use worldPoint for shape operations
};
```

**Event Propagation:**

- Stop propagation on shape events to prevent canvas events
- Handle canvas events for background interactions

### Keyboard Shortcuts

**Common Shortcuts:**

- `Delete/Backspace` - Delete selected shapes
- `Cmd/Ctrl+A` - Select all
- `Escape` - Clear selection / cancel operation
- `Space` - Hand tool (pan while held)
- `V` - Select tool
- `R` - Rectangle tool
- `O` - Ellipse tool
- `L` - Line tool
- `A` - Arrow tool
- `T` - Text tool
- `P` - Pen/Free draw tool
- `Cmd/Ctrl+Z` - Undo (if history implemented)
- `Cmd/Ctrl+Shift+Z` - Redo

## Performance Optimization

### Render Optimization

**Separate Contexts:**
Split shapes and viewport into separate contexts to prevent unnecessary re-renders.

**Memoization:**

```typescript
const ShapeComponent = memo(
  ({ shape }: { shape: Shape }) => {
    // Render shape
  },
  (prev, next) => prev.shape.id === next.shape.id
);
```

**Virtualization:**
Only render shapes visible in viewport for large canvases.

### Selection Optimization

Use a selection map (`Record<string, true>`) instead of array for O(1) lookup.

## Persistence

### Save Format

```typescript
interface CanvasData {
  shapes: Record<string, Shape>;
  shapeIds: string[];
  frameCounter: number;
  viewport: {
    scale: number;
    translate: Point;
  };
  metadata: {
    version: string;
    lastModified: number;
  };
}
```

### Load/Save Operations

**Save:**

```typescript
const saveCanvas = () => {
  const data: CanvasData = {
    shapes: shapesState.shapes,
    shapeIds: shapesState.shapeIds,
    frameCounter: shapesState.frameCounter,
    viewport: {
      scale: viewportState.scale,
      translate: viewportState.translate,
    },
    metadata: {
      version: "1.0",
      lastModified: Date.now(),
    },
  };
  return JSON.stringify(data);
};
```

**Load:**

```typescript
const loadCanvas = (json: string) => {
  const data: CanvasData = JSON.parse(json);
  shapesDispatch({ type: "loadProject", payload: data });
  viewportDispatch({ type: "restoreViewport", payload: data.viewport });
};
```

## Integration with Convex

### Auto-save Strategy

Debounce canvas changes and save to Convex:

```typescript
const debouncedSave = useMemo(
  () =>
    debounce((data: CanvasData) => {
      saveProject({ projectId, canvasData: data });
    }, 1000),
  [projectId]
);

useEffect(() => {
  debouncedSave(getCurrentCanvasData());
}, [shapesState, viewportState]);
```

### Conflict Resolution

Use optimistic updates with rollback on error:

```typescript
const updateShape = async (id: string, patch: Partial<Shape>) => {
  // Optimistic update
  shapesDispatch({ type: "updateShape", payload: { id, patch } });

  try {
    await convexMutation(api.canvas.updateShape, { id, patch });
  } catch (error) {
    // Rollback on error
    shapesDispatch({
      type: "updateShape",
      payload: { id, patch: originalShape },
    });
  }
};
```

## Best Practices

1. **Always convert coordinates** - Use screen-to-world conversion for all shape operations
2. **Clamp scale values** - Prevent zoom from going below minScale or above maxScale
3. **Validate shape data** - Check for valid dimensions, non-empty points arrays
4. **Handle edge cases** - Zero-width shapes, single-point free draws, etc.
5. **Optimize re-renders** - Use separate contexts, memoization, and virtualization
6. **Debounce expensive operations** - Auto-save, viewport updates during pan/zoom
7. **Maintain z-order** - Use ordered shapeIds array for consistent layering
8. **Clean up event listeners** - Remove listeners on unmount
9. **Use requestAnimationFrame** - For smooth animations and continuous updates
10. **Test coordinate transformations** - Verify screen/world conversions at different scales

## Common Patterns

### Creating a Shape

```typescript
const handleCreateRect = (worldStart: Point, worldEnd: Point) => {
  const x = Math.min(worldStart.x, worldEnd.x);
  const y = Math.min(worldStart.y, worldEnd.y);
  const w = Math.abs(worldEnd.x - worldStart.x);
  const h = Math.abs(worldEnd.y - worldStart.y);

  if (w > 1 && h > 1) {
    // Minimum size threshold
    shapesDispatch({
      type: "addRect",
      payload: { x, y, w, h },
    });
  }
};
```

### Moving Selected Shapes

```typescript
const handleMoveSelected = (worldDelta: Point) => {
  Object.keys(shapesState.selected).forEach((id) => {
    const shape = shapesState.shapes[id];
    if (!shape) return;

    if ("x" in shape && "y" in shape) {
      shapesDispatch({
        type: "updateShape",
        payload: {
          id,
          patch: {
            x: shape.x + worldDelta.x,
            y: shape.y + worldDelta.y,
          },
        },
      });
    } else if ("startX" in shape) {
      // Handle line/arrow shapes
      shapesDispatch({
        type: "updateShape",
        payload: {
          id,
          patch: {
            startX: shape.startX + worldDelta.x,
            startY: shape.startY + worldDelta.y,
            endX: shape.endX + worldDelta.x,
            endY: shape.endY + worldDelta.y,
          },
        },
      });
    }
  });
};
```

### Hit Testing

```typescript
const hitTest = (worldPoint: Point, shape: Shape): boolean => {
  switch (shape.type) {
    case "rect":
    case "frame":
    case "ellipse":
      return (
        worldPoint.x >= shape.x &&
        worldPoint.x <= shape.x + shape.w &&
        worldPoint.y >= shape.y &&
        worldPoint.y <= shape.y + shape.h
      );
    case "line":
    case "arrow":
      // Distance from point to line segment
      return distanceToLineSegment(worldPoint, shape) < 5 / viewport.scale;
    case "freedraw":
      // Check if point is near any segment of the path
      return shape.points.some((p, i) => {
        if (i === 0) return false;
        return (
          distanceToLineSegment(worldPoint, {
            startX: shape.points[i - 1].x,
            startY: shape.points[i - 1].y,
            endX: p.x,
            endY: p.y,
          }) <
          5 / viewport.scale
        );
      });
    default:
      return false;
  }
};
```
