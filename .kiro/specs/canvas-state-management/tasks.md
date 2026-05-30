# Implementation Plan

- [x] 1. Set up core types and interfaces

  - Create `types/canvas.ts` with all shape types, viewport types, and entity state interfaces
  - Define Point, Rect, ViewportMode, ViewportState types
  - Define all shape types (Frame, Rect, Ellipse, FreeDraw, Arrow, Line, Text, GeneratedUI)
  - Define Tool type, EntityState interface, SelectionMap type, and ShapesState interface
  - Export all types for use across the application
  - _Requirements: 1.1, 1.2_

- [x] 2. Implement utility functions and helpers
- [x] 2.1 Create coordinate conversion utilities

  - Implement `screenToWorld` function for converting screen coordinates to world coordinates
  - Implement `worldToScreen` function for converting world coordinates to screen coordinates
  - Implement `zoomAroundScreenPoint` function to calculate translate that keeps origin point fixed during zoom
  - Add math utilities: `clamp`, `distance`, `midpoint`
  - _Requirements: 2.7, 9.2_

- [x] 2.2 Create hit testing utilities

  - Implement `getShapeAtPoint` function that returns topmost shape at a point
  - Implement `isPointInShape` function with logic for all shape types (frame, rect, ellipse, freedraw, arrow, line, text, generatedui)
  - Implement `distanceToLineSegment` helper for line/arrow/freedraw hit testing
  - Use correct thresholds: 5px for freedraw, 8px for lines/arrows
  - Handle text shape bounds with fontSize-based width calculation and padding
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 2.3 Create entity adapter utilities

  - Implement `createEntityState` to initialize empty entity state
  - Implement `addEntity` to add single entity to state
  - Implement `updateEntity` to update entity with partial changes
  - Implement `removeEntity` to remove single entity
  - Implement `removeMany` to remove multiple entities by ID array
  - Implement `removeAll` to clear all entities
  - Ensure immutable updates using spread operators
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2.4 Create shape factory functions

  - Implement `createFrame` with auto-generated ID using nanoid, frame-specific defaults (transparent stroke, 0.05 alpha fill)
  - Implement `createRect` with standard defaults (white stroke, 2px width)
  - Implement `createEllipse` with standard defaults
  - Implement `createFreeDraw` with points array validation
  - Implement `createArrow` with startX/startY/endX/endY parameters (fix parameter naming from reference)
  - Implement `createLine` with startX/startY/endX/endY parameters
  - Implement `createText` with all typography properties and defaults (Inter font, 16px, placeholder text)
  - Implement `createGeneratedUI` with uiSpecData, sourceFrameId, and optional isWorkflowPage flag
  - Export SHAPE_DEFAULTS constant
  - _Requirements: 3.1, 4.4_

- [x] 3. Implement viewport reducer

  - Create `lib/canvas/viewport-reducer.ts` with ViewportState and ViewportAction types
  - Define initial viewport state (scale: 1, minScale: 0.1, maxScale: 8, translate: {0,0}, mode: idle)
  - Implement `setTranslate` action to update viewport translation
  - Implement `setScale` action with clamping and optional origin point
  - Implement `zoomBy` action for relative zoom with origin point
  - Implement `wheelZoom` action using zoomStep^(-deltaY/53) formula
  - Implement `wheelPan` action with wheelPanSpeed multiplier
  - Implement `panStart` action to store initial pan state and set mode
  - Implement `panMove` action to calculate delta from panStartScreen
  - Implement `panEnd` action to reset pan state and mode to idle
  - Implement `handToolEnable` action to set mode to shiftPanning if idle
  - Implement `handToolDisable` action to set mode to idle if shiftPanning
  - Implement `centerOnWorld` action to center viewport on world coordinate
  - Implement `zoomToFit` action to fit bounds in viewport with padding
  - Implement `resetView` action to reset to initial state
  - Implement `restoreViewport` action to load saved viewport state
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 10.3_

- [x] 4. Implement shapes reducer

  - Create `lib/canvas/shapes-reducer.ts` with ShapesState and ShapesAction types
  - Define initial shapes state (tool: select, shapes: empty entity state, selected: {}, frameCounter: 0)
  - Implement `setTool` action that clears selection when switching from select tool
  - Implement `addFrame` action that increments frameCounter and adds frame with frameNumber
  - Implement `addRect` action using createRect factory
  - Implement `addEllipse` action using createEllipse factory
  - Implement `addFreeDraw` action with points array validation (must have length > 0)
  - Implement `addArrow` action using createArrow factory
  - Implement `addLine` action using createLine factory
  - Implement `addText` action using createText factory
  - Implement `addGeneratedUI` action using createGeneratedUI factory
  - Implement `updateShape` action for partial shape updates using entity adapter
  - Implement `removeShape` action that decrements frameCounter if removing frame
  - Implement `clearAll` action to reset shapes and frameCounter
  - Implement `selectShape` action to add shape ID to selection map
  - Implement `deselectShape` action to remove shape ID from selection map
  - Implement `clearSelection` action to empty selection map
  - Implement `selectAll` action to select all shape IDs
  - Implement `deleteSelected` action to remove all selected shapes
  - Implement `loadProject` action to restore complete shapes state
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.4, 5.1, 5.2, 5.3, 10.1, 10.2_

- [x] 5. Create Canvas Context Provider

  - Create `contexts/CanvasContext.tsx` with CanvasContextValue interface
  - Initialize viewport state using useReducer with viewportReducer
  - Initialize shapes state using useReducer with shapesReducer
  - Compute shapesList array using useMemo from shapes entity state
  - Create context value object with viewport, dispatchViewport, shapes, dispatchShapes, shapesList
  - Export CanvasProvider component that wraps children with context
  - Export useCanvasContext hook for consuming context with null check
  - _Requirements: 1.1, 1.5_

- [x] 6. Implement useInfiniteCanvas hook - Core setup
- [x] 6.1 Set up hook structure and refs

  - Create `hooks/use-infinite-canvas.ts` with UseInfiniteCanvasReturn interface
  - Consume CanvasContext using useCanvasContext hook
  - Initialize canvasRef for DOM element reference
  - Initialize touchMapRef for multi-touch tracking (Map<number, TouchPointer>)
  - Initialize draftShapeRef for preview shapes during drawing
  - Initialize freeDrawPointsRef for freedraw point collection
  - Initialize isSpacePressed ref for shift key state (note: actually shift key, not space)
  - Initialize isDrawingRef, isMovingRef, isErasingRef, isResizingRef flags
  - Initialize moveStartRef for drag start position
  - Initialize initialShapePositionsRef for storing positions at drag start
  - Initialize erasedShapesRef Set for tracking erased shapes during drag
  - Initialize resizeDataRef for resize operation state
  - Initialize RAF refs: lastFreehandFrameRef, freehandRafRef, panRafRef
  - Initialize pendingPanPointRef for RAF-optimized panning
  - Initialize isSidebarOpen state and hasSelectedText computed value
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 6.2 Implement coordinate conversion helpers

  - Implement `localPointFromClient` to convert clientX/clientY to canvas-relative coordinates using getBoundingClientRect
  - Implement `getLocalPointFromPtr` wrapper for pointer events
  - Use screenToWorld utility for world coordinate conversion
  - _Requirements: 2.7_

- [x] 6.3 Implement utility functions

  - Implement `blurActiveTextInput` to blur active INPUT elements
  - Implement `requestRender` using state updater to force re-render for draft shapes
  - Implement `schedulePanMove` with RAF optimization and pending point pattern
  - Implement `freehandTick` RAF loop with 8ms interval throttling
  - _Requirements: 2.6, 4.6_

- [x] 7. Implement pointer event handlers
- [x] 7.1 Implement onPointerDown handler

  - Check if target is button or has pointer-events-auto class, return early if true
  - Convert pointer position to local and world coordinates
  - Capture pointer using setPointerCapture
  - Handle middle/right button or shift+left button as pan start
  - For left button with select tool: perform hit test, handle selection (shift for multi-select), start move operation, store initial positions for all selected shapes
  - For left button with eraser tool: start erasing, clear erasedShapesRef, remove hit shape
  - For left button with text tool: add text shape at position, switch to select tool
  - For left button with drawing tools (frame/rect/ellipse/arrow/line): create draft shape, set isDrawingRef
  - For left button with freedraw tool: initialize freeDrawPointsRef, start RAF loop
  - Handle empty space click: clear selection and blur text inputs (unless shift key)
  - _Requirements: 4.2, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2_

- [x] 7.2 Implement onPointerMove handler

  - Convert pointer position to local and world coordinates
  - If panning mode: call schedulePanMove with RAF optimization
  - If erasing: perform hit test, remove shape if not already erased in this drag
  - If moving shapes: calculate delta from moveStartRef, update all selected shapes using initialShapePositionsRef, handle different shape types (x/y for rect-like, points for freedraw, startX/startY/endX/endY for lines)
  - If drawing draft shape: update draftShapeRef.currentWorld, call requestRender
  - If drawing freedraw: push point to freeDrawPointsRef
  - _Requirements: 4.3, 5.5, 5.6, 6.3_

- [x] 7.3 Implement onPointerUp handler

  - Release pointer capture
  - If panning: dispatch panEnd action
  - If moving: reset isMovingRef, moveStartRef, initialShapePositionsRef
  - If erasing: reset isErasingRef, clear erasedShapesRef
  - Call finalizeDrawingIfAny to convert draft shapes to real shapes
  - _Requirements: 4.4, 5.7, 6.4, 6.5_

- [x] 7.4 Implement finalizeDrawingIfAny helper

  - Check isDrawingRef, return early if false
  - Cancel freehand RAF if active
  - For draft shapes: calculate bounds (min x/y, abs width/height), enforce minimum 1x1 dimensions
  - Dispatch appropriate add action (addFrame, addRect, addEllipse, addArrow, addLine) with calculated bounds
  - Fix arrow/line parameter naming (use startX not start)
  - For freedraw: dispatch addFreeDraw if points length > 1
  - Clear draft shape ref and freeDrawPointsRef
  - Call requestRender
  - _Requirements: 4.4, 4.5_

- [x] 7.5 Implement onPointerCancel handler

  - Call onPointerUp to handle cleanup
  - _Requirements: 4.4_

- [x] 8. Implement keyboard event handlers

  - Implement `onKeyDown` to detect ShiftLeft/ShiftRight, set isSpacePressed ref, dispatch handToolEnable
  - Implement `onKeyUp` to detect ShiftLeft/ShiftRight release, clear isSpacePressed ref, dispatch handToolDisable
  - Prevent default browser behavior for handled keys
  - Use useEffect to add/remove document-level keyboard listeners
  - Clean up RAF refs on unmount
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Implement wheel event handler

  - Create `onWheel` function that prevents default
  - Convert wheel position to local coordinates
  - If ctrl/meta key: dispatch wheelZoom with deltaY and originScreen
  - If no modifier: dispatch wheelPan with dx/dy (handle shift key for horizontal scroll)
  - Attach wheel listener to canvas ref in attachCanvasRef function with passive: false
  - _Requirements: 2.1, 2.2_

- [x] 10. Implement resize event handlers

  - Create `handleResizeStart` listener for custom "shape-resize-start" event
  - Store resize state in resizeDataRef (shapeId, corner, initialBounds, startPoint)
  - Set isResizingRef to true
  - Create `handleResizeMove` listener for custom "shape-resize-move" event
  - Calculate new bounds based on corner (nw/ne/sw/se) and world coordinates
  - Enforce minimum 10x10 dimensions
  - For rect-like shapes: update x, y, w, h
  - For freedraw: calculate bounding box, compute scale factors, scale all points proportionally
  - For arrow/line: handle vertical/horizontal lines specially (keep centered), scale diagonal lines proportionally
  - Create `handleResizeEnd` listener for custom "shape-resize-end" event
  - Reset isResizingRef and resizeDataRef
  - Use useEffect to add/remove window-level custom event listeners
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 11. Implement sidebar auto-open logic

  - Compute hasSelectedText by checking if any selected shape has type "text"
  - Use useEffect to auto-open sidebar when hasSelectedText becomes true
  - Auto-close sidebar when hasSelectedText becomes false
  - _Requirements: 1.2_

- [x] 12. Implement hook return interface

  - Return viewport state from context
  - Return shapes array (shapesList from context)
  - Return currentTool from shapes state
  - Return selectedShapes map from shapes state
  - Return isSidebarOpen state and setIsSidebarOpen setter
  - Return hasSelectedText computed value
  - Return event handlers: onPointerDown, onPointerMove, onPointerUp, onPointerCancel
  - Return attachCanvasRef function for canvas element ref
  - Return selectTool function that dispatches setTool action
  - Return getDraftShape function that returns draftShapeRef.current
  - Return getFreeDrawPoints function that returns freeDrawPointsRef.current as readonly array
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 13. Create canvas page component

  - Create `app/dashboard/[projectId]/canvas/page.tsx` as client component
  - Wrap content with CanvasProvider
  - Use useInfiniteCanvas hook to get canvas state and handlers
  - Create canvas container div with ref from attachCanvasRef
  - Attach pointer event handlers to canvas div
  - Apply viewport transform using CSS transform: translate() and scale()
  - Render shapes array with appropriate components for each shape type
  - Render draft shape preview if getDraftShape() returns non-null
  - Render freedraw preview if getFreeDrawPoints() has length > 0
  - Add basic toolbar for tool selection using selectTool function
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 14. Add project state persistence
  - Create utility functions to serialize/deserialize canvas state
  - Implement save function that exports viewport and shapes state as JSON
  - Implement load function that dispatches restoreViewport and loadProject actions
  - Integrate with Convex backend to save/load project data
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
