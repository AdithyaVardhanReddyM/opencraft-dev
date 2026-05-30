import {
  Shape,
  selectShape,
  clearSelection,
  removeShape,
  addText,
  setTool,
  updateShape,
  addFrame,
  addRect,
  addEllipse,
  addArrow,
  addLine,
  addFreedraw,
  Tool,
} from "@/redux/slice/shapes";
import {
  Point,
  panMove,
  wheelZoom,
  wheelPan,
  screenToWorld,
  panStart,
  panEnd,
  handToolEnable,
  handToolDisable,
} from "@/redux/slice/viewport";
import { AppDispatch, useAppSelector } from "@/ redux/store";
import { useDispatch } from "react-redux";
import { use, useEffect, useRef, useState } from "react";

interface TouchPointer {
  id: number;
  p: Point;
}
interface DraftShape {
  type: "frame" | "rect" | "ellipse" | "arrow" | "line";
  startWorld: Point;
  currentWorld: Point;
}

const RAF_INTERVAL_MS = 8;

export const useInfiniteCanvas = () => {
  //states
  const dispatch = useDispatch<AppDispatch>();

  const viewport = useAppSelector((s) => s.viewport);
  const entityState = useAppSelector((s) => s.shapes.shapes);

  const shapeList: Shape[] = entityState.ids
    .map((id: string) => entityState.entities[id])
    .filter((s: Shape | undefined): s is Shape => Boolean(s));
  const currentTool = useAppSelector((s) => s.shapes.tool);
  const selectedShapes = useAppSelector((s = s.shapes.selected));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const shapesEntities = useAppSelector(
    (state) => state.shapes.shapes.entities
  );

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

  //refs

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const touchMapRef = useRef<Map<number, TouchPointer>>(new Map());
  const draftShapeRef = useRef<DraftShape | null>(null); // draft shape -> shape drawn before finalised, preview shape, later we will mount if successful

  const freeDrawPointsRef = useRef<Point[]>([]); //for free hand drawing
  const isSpacePressed = useRef(false); // remember if key is pressed, essentially not creating a rerender

  const isDrawingRef = useRef(false); // track of drawing shape

  const isMovingRef = useRef(false); // track of moving shape if the user is moving something
  const moveStartRef = useRef<Point | null>(null); // where did the movement start from

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

  const isErasingRef = useRef(false);
  const erasedShapesRef = useRef<Set<string>>(new Set());
  const isResizingRef = useRef(false);
  const resizeDataRef = useRef<{
    shapeId: string;
    corner: string;
    initialBounds: { x: number; y: number; w: number; h: number };
    startPoint: { x: number; y: number };
  } | null>(null);

  const lastFreehandFrameRef = useRef(0);
  const freehandRafRef = useRef<number | null>(null);
  const panRafRef = useRef<number | null>(null);
  const pendingPanPointRef = useRef<Point | null>(null);

  // below for forced state update
  const [, force] = useState(0);
  const requestRender = (): void => {
    force((n) => (n + 1) | 0); // this will trigger rerender
  };

  // coordinate convert helper funtion for canvas
  const localPointFromClient = (clientX: number, clientY: number): Point => {
    const el = canvasRef.current;
    if (!el) return { x: clientX, y: clientY };
    const r = el.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  // remove focus from elements
  const blurActiveTextInput = () => {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === "INPUT") {
      (activeElement as HTMLInputElement).blur();
    }
  };

  type WithClientXY = { clientX: number; clientY: number };
  const getLocalPointFromPtr = (e: WithClientXY): Point =>
    localPointFromClient(e.clientX, e.clientY);

  // shape hit testing

  const getShapeAtPoint = (worldPoint: Point): Shape | null => {
    for (let i = shapeList.length - 1; i >= 0; i--) {
      const shape = shapeList[i];
      if (isPointInShape(worldPoint, shape)) {
        return shape;
      }
    }
    return null;
  };

  const isPointInShape = (point: Point, shape: Shape): boolean => {
    switch (shape.type) {
      case "frame":
      case "rect":
      case "ellipse":
      case "generatedui":
        return (
          point.x >= shape.x &&
          point.x <= shape.x + shape.w &&
          point.y >= shape.y &&
          point.y <= shape.y + shape.h
        );
      case "freedraw":
        const threshold = 5;
        for (let i = 0; i < shape.points.length - 1; i++) {
          const p1 = shape.points[i];
          const p2 = shape.points[i + 1];
          if (distanceToLineSegment(point, p1, p2) <= threshold) {
            return true;
          }
        }
        return false;
      case "arrow":
      case "line":
        const lineThreshold = 8;
        return (
          distanceToLineSegment(
            point,
            { x: shape.startX, y: shape.startY },
            { x: shape.endX, y: shape.endY }
          ) <= lineThreshold
        );
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
      default:
        return false;
    }
  };

  const distanceToLineSegment = (
    point: Point,
    lineStart: Point,
    lineEnd: Point
  ): number => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // performance optimizations and animations for a smoother pan
  const schedulePanMove = (p: Point) => {
    pendingPanPointRef.current = p;
    if (panRafRef.current != null) return;
    panRafRef.current = window.requestAnimationFrame(() => {
      panRafRef.current = null;
      const next = pendingPanPointRef.current;
      if (next) dispatch(panMove(next));
    });
  };

  const freehandTick = (): void => {
    const now = performance.now();
    if (now - lastFreehandFrameRef.current >= RAF_INTERVAL_MS) {
      if (freeDrawPointsRef.current.length > 0) requestRender();
      lastFreehandFrameRef.current = now;
    }
    if (isDrawingRef.current) {
      freehandRafRef.current = window.requestAnimationFrame(freehandTick);
    }
  };

  //events
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

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
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

    const local = getLocalPointFromPtr(e.nativeEvent);
    const world = screenToWorld(local, viewport.translate, viewport.scale);
    if (touchMapRef.current.size <= 1) {
      canvasRef.current?.setPointerCapture?.(e.pointerId);
      const isPanButton = e.button === 1 || e.button === 2;
      const panByShift = isSpacePressed.current && e.button === 0;
      if (isPanButton || panByShift) {
        const mode = isSpacePressed.current ? "shiftPanning" : "panning";
        dispatch(panStart({ screen: local, mode }));
        return;
      }
      if (e.button === 0) {
        if (currentTool === "select") {
          const hitShape = getShapeAtPoint(world);

          if (hitShape) {
            const isAlreadySelected = selectedShapes[hitShape.id];
            if (!isAlreadySelected) {
              if (!e.shiftKey) dispatch(clearSelection());
              dispatch(selectShape(hitShape.id));
            }
            isMovingRef.current = true;
            moveStartRef.current = world;

            initialShapePositionsRef.current = {};
            Object.keys(selectedShapes).forEach((id) => {
              const shape = entityState.entities[id];
              if (shape) {
                if (
                  shape.type === "frame" ||
                  shape.type === "rect" ||
                  shape.type === "ellipse" ||
                  shape.type === "generatedui"
                ) {
                  initialShapePositionsRef.current[id] = {
                    x: shape.x,
                    y: shape.y,
                  };
                } else if (shape.type === "freedraw") {
                  initialShapePositionsRef.current[id] = {
                    points: [...shape.points],
                  };
                } else if (shape.type === "arrow" || shape.type === "line") {
                  initialShapePositionsRef.current[id] = {
                    startX: shape.startX,
                    startY: shape.startY,
                    endX: shape.endX,
                    endY: shape.endY,
                  };
                } else if (shape.type === "text") {
                  initialShapePositionsRef.current[id] = {
                    x: shape.x,
                    y: shape.y,
                  };
                }
              }
            });

            if (
              hitShape.type === "frame" ||
              hitShape.type === "rect" ||
              hitShape.type === "ellipse" ||
              hitShape.type === "generatedui"
            ) {
              initialShapePositionsRef.current[hitShape.id] = {
                x: hitShape.x,
                y: hitShape.y,
              };
            } else if (hitShape.type === "freedraw") {
              initialShapePositionsRef.current[hitShape.id] = {
                points: [...hitShape.points],
              };
            } else if (hitShape.type === "arrow" || hitShape.type === "line") {
              initialShapePositionsRef.current[hitShape.id] = {
                startX: hitShape.startX,
                startY: hitShape.startY,
                endX: hitShape.endX,
                endY: hitShape.endY,
              };
            } else if (hitShape.type === "text") {
              initialShapePositionsRef.current[hitShape.id] = {
                x: hitShape.x,
                y: hitShape.y,
              };
            }
          } else {
            // Clicked on empty space - clear selection and blur any active text inputs
            if (!e.shiftKey) {
              dispatch(clearSelection());
              blurActiveTextInput();
            }
          }
        } else if (currentTool === "eraser") {
          isErasingRef.current = true;
          erasedShapesRef.current.clear();
          const hitShape = getShapeAtPoint(world);
          if (hitShape) {
            dispatch(removeShape(hitShape.id));
            erasedShapesRef.current.add(hitShape.id);
          } else {
            blurActiveTextInput();
          }
        } else if (currentTool === "text") {
          dispatch(addText({ x: world.x, y: world.y }));
          dispatch(setTool("select"));
        } else {
          isDrawingRef.current = true;
          if (
            currentTool === "frame" ||
            currentTool === "rect" ||
            currentTool === "ellipse" ||
            currentTool === "arrow" ||
            currentTool === "line"
          ) {
            console.log("Starting to draw:", currentTool, "at:", world);
            draftShapeRef.current = {
              type: currentTool,
              startWorld: world,
              currentWorld: world,
            };
            requestRender();
          } else if (currentTool === "freedraw") {
            freeDrawPointsRef.current = [world];
            lastFreehandFrameRef.current = performance.now();
            freehandRafRef.current = window.requestAnimationFrame(freehandTick);
            requestRender();
          }
        }
      }
    }
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const local = getLocalPointFromPtr(e.nativeEvent);
    const world = screenToWorld(local, viewport.translate, viewport.scale);

    if (viewport.mode === "panning" || viewport.mode === "shiftPanning") {
      schedulePanMove(local);
      return;
    }
    if (isErasingRef.current && currentTool === "eraser") {
      const hitShape = getShapeAtPoint(world);
      if (hitShape && erasedShapesRef.current.has(hitShape.id)) {
        // Delete the shape if we haven't already deleted it in this drag
        dispatch(removeShape(hitShape.id));
        erasedShapesRef.current.add(hitShape.id);
      }
    }
    if (
      isMovingRef.current &&
      moveStartRef.current &&
      currentTool === "select"
    ) {
      const deltaX = world.x - moveStartRef.current.x;
      const deltaY = world.y - moveStartRef.current.y;

      Object.keys(initialShapePositionsRef.current).forEach((id) => {
        const initialPos = initialShapePositionsRef.current[id];
        const shape = entityState.entities[id];
        if (shape && initialPos) {
          if (
            shape.type === "frame" ||
            shape.type === "rect" ||
            shape.type === "ellipse" ||
            shape.type === "generatedui" ||
            shape.type === "text"
          ) {
            if (
              typeof initialPos.x === "number" &&
              typeof initialPos.y === "number"
            ) {
              dispatch(
                updateShape({
                  id,
                  patch: {
                    x: initialPos.x + deltaX,
                    y: initialPos.y + deltaY,
                  },
                })
              );
            }
          } else if (shape.type === "freedraw") {
            const initialPoints = initialPos.points;
            if (initialPoints) {
              const newPoints = initialPoints.map((point) => ({
                x: point.x + deltaX,
                y: point.y + deltaY,
              }));
              dispatch(
                updateShape({
                  id,
                  patch: {
                    points: newPoints,
                  },
                })
              );
            }
          } else if (shape.type === "arrow" || shape.type === "line") {
            if (
              typeof initialPos.startX === "number" &&
              typeof initialPos.startY === "number" &&
              typeof initialPos.endX === "number" &&
              typeof initialPos.endY === "number"
            ) {
              dispatch(
                updateShape({
                  id,
                  patch: {
                    startX: initialPos.startX + deltaX,
                    startY: initialPos.startY + deltaY,
                    endX: initialPos.endX + deltaX,
                    endY: initialPos.endY + deltaY,
                  },
                })
              );
            }
          }
        }
      });
    }

    if (isDrawingRef.current) {
      if (draftShapeRef.current) {
        draftShapeRef.current.currentWorld = world;
        requestRender();
      } else if (currentTool === "freedraw") {
        freeDrawPointsRef.current.push(world);
      }
    }
  };

  // finalise drawing, convert draft shapes into real

  const finalizeDrawingIfAny = (): void => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (freehandRafRef.current) {
      window.cancelAnimationFrame(freehandRafRef.current);
      freehandRafRef.current = null;
    }
    const draft = draftShapeRef.current;
    if (draft) {
      const x = Math.min(draft.startWorld.x, draft.currentWorld.x);
      const y = Math.min(draft.startWorld.y, draft.currentWorld.y);
      const w = Math.abs(draft.currentWorld.x - draft.startWorld.x);
      const h = Math.abs(draft.currentWorld.y - draft.startWorld.y);

      if (w > 1 && h > 1) {
        if (draft.type === "frame") {
          console.log("Adding frame shape:", { x, y, w, h });
          dispatch(addFrame({ x, y, w, h }));
        } else if (draft.type === "rect") {
          dispatch(addRect({ x, y, w, h }));
        } else if (draft.type === "ellipse") {
          dispatch(addEllipse({ x, y, w, h }));
        } else if (draft.type === "arrow") {
          dispatch(
            addArrow({
              start: draft.startWorld.x,
              startY: draft.startWorld.y,
              endX: draft.currentWorld.x,
              endY: draft.currentWorld.y,
            })
          );
        } else if (draft.type === "line") {
          dispatch(
            addLine({
              start: draft.startWorld.x,
              startY: draft.startWorld.y,
              endX: draft.currentWorld.x,
              endY: draft.currentWorld.y,
            })
          );
        }
      }
      draftShapeRef.current = null;
    } else if (currentTool === "freedraw") {
      const pts = freeDrawPointsRef.current;
      if (pts.length > 1) {
        dispatch(addFreedraw({ points: pts }));
      }
      freeDrawPointsRef.current = [];
    }
    requestRender();
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    canvasRef.current?.releasePointerCapture?.(e.pointerId);
    if (viewport.mode === "panning" || viewport.mode === "shiftPanning") {
      dispatch(panEnd());
      return;
    }

    if (isMovingRef.current) {
      isMovingRef.current = false;
      moveStartRef.current = null;
      initialShapePositionsRef.current = {};
    }

    if (isErasingRef.current) {
      isErasingRef.current = false;
      erasedShapesRef.current.clear();
    }

    finalizeDrawingIfAny();
  };

  const onPointerCancel: React.PointerEventHandler<HTMLDivElement> = (e) => {
    onPointerUp(e);
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if ((e.code == "ShiftLeft" || e.code === "ShiftRight") && !e.repeat) {
      e.preventDefault();
      isSpacePressed.current = true; // Keep the same ref name for consistency
      dispatch(handToolEnable());
    }
  };

  const onKeyUp = (e: KeyboardEvent): void => {
    if ((e.code == "ShiftLeft" || e.code === "ShiftRight") && !e.repeat) {
      e.preventDefault();
      isSpacePressed.current = false; // Keep the same ref name for consistency
      dispatch(handToolDisable());
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      if (freehandRafRef.current) {
        window.cancelAnimationFrame(freehandRafRef.current);
      }
      if (panRafRef.current) {
        window.cancelAnimationFrame(panRafRef.current);
      }
    };
  }, []);

  // handling resizing
  useEffect(() => {
    const handleResizeStart = (e: CustomEvent) => {
      const { shapeId, corner, bounds } = e.detail;
      isResizingRef.current = true;
      resizeDataRef.current = {
        shapeId,
        corner,
        initialBounds: bounds,
        startPoint: { x: e.detail.clientX || 0, y: e.detail.clientY || 0 },
      };
    };

    const handleResizeMove = (e: CustomEvent) => {
      if (!isResizingRef.current || !resizeDataRef.current) return;
      const { shapeId, corner, initialBounds } = resizeDataRef.current;
      const { clientX, clientY } = e.detail;
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const world = screenToWorld(
        { x: localX, y: localY },
        viewport.translate,
        viewport.scale
      );
      const shape = entityState.entities[shapeId];
      if (!shape) return;

      const newBounds = { ...initialBounds };
      switch (corner) {
        case "nw":
          newBounds.w = Math.max(
            10,
            initialBounds.w + (initialBounds.x - world.x)
          );
          newBounds.h = Math.max(
            10,
            initialBounds.h + (initialBounds.y - world.y)
          );
          newBounds.x = world.x;
          newBounds.y = world.y;
          break;
        case "ne":
          newBounds.w = Math.max(10, world.x - initialBounds.x);
          newBounds.h = Math.max(
            10,
            initialBounds.h + (initialBounds.y - world.y)
          );
          newBounds.y = world.y;
          break;

        case "sw":
          newBounds.w = Math.max(
            10,
            initialBounds.w + (initialBounds.x - world.x)
          );
          newBounds.h = Math.max(10, world.y - initialBounds.y);
          newBounds.x = world.x;
          break;

        case "se":
          newBounds.w = Math.max(10, world.x - initialBounds.x);
          newBounds.h = Math.max(10, world.y - initialBounds.y);
          break;
      }

      if (
        shape.type === "frame" ||
        shape.type === "rect" ||
        shape.type === "ellipse"
      ) {
        dispatch(
          updateShape({
            id: shapeId,
            patch: {
              x: newBounds.x,
              y: newBounds.y,
              w: newBounds.w,
              h: newBounds.h,
            },
          })
        );
      } else if (shape.type === "freedraw") {
        const xs = shape.points.map((p: { x: number; y: number }) => p.x);
        const ys = shape.points.map((p: { x: number; y: number }) => p.y);

        const actualMinX = Math.min(...xs);
        const actualMaxX = Math.max(...xs);
        const actualMinY = Math.min(...ys);
        const actualMaxY = Math.max(...ys);
        const actualWidth = actualMaxX - actualMinX;
        const actualHeight = actualMaxY - actualMinY;

        const newActualX = newBounds.x + 5; // Remove padding
        const newActualY = newBounds.y + 5;
        const newActualWidth = Math.max(10, newBounds.w - 10); // Minimum size and remove padding
        const newActualHeight = Math.max(10, newBounds.h - 10);

        const scaleX = actualWidth > 0 ? newActualWidth / actualWidth : 1;
        const scaleY = actualHeight > 0 ? newActualHeight / actualHeight : 1;

        const scaledPoints = shape.points.map(
          (point: { x: number; y: number }) => ({
            x: newActualX + (point.x - actualMinX) * scaleX,
            y: newActualY + (point.y - actualMinY) * scaleY,
          })
        );
        dispatch(
          updateShape({
            id: shapeId,
            patch: {
              points: scaledPoints,
            },
          })
        );
      } else if (shape.type === "arrow" || shape.type === "line") {
        const actualMinX = Math.min(shape.start, shape.endX);
        const actualMaxX = Math.max(shape.start, shape.endX);
        const actualMinY = Math.min(shape.startY, shape.endY);
        const actualMaxY = Math.max(shape.startY, shape.endY);
        const actualWidth = actualMaxX - actualMinX;
        const actualHeight = actualMaxY - actualMinY;

        const newActualX = newBounds.x + 5;
        const newActualY = newBounds.y + 5;
        const newActualWidth = Math.max(10, newBounds.w - 10);
        const newActualHeight = Math.max(10, newBounds.h - 10);

        let newStartX, newStartY, newEndX, newEndY;
        if (actualWidth === 0) {
          newStartX = newActualX + newActualWidth / 2;
          newEndX = newActualX + newActualWidth / 2;
          newStartY =
            shape.startY < shape.endY
              ? newActualY
              : newActualY + newActualHeight;
          newEndY =
            shape.startY < shape.endY
              ? newActualY + newActualHeight
              : newActualY;
        } else if (actualHeight === 0) {
          newStartY = newActualY + newActualHeight / 2;
          newEndY = newActualY + newActualHeight / 2;
          newStartY =
            shape.startX < shape.endX
              ? newActualX
              : newActualX + newActualWidth;
          newEndX =
            shape.start < shape.endX ? newActualX + newActualWidth : newActualX;
        } else {
          const scaleX = newActualWidth / actualWidth;
          const scaleY = newActualHeight / actualHeight;
          newStartX = newActualX + (shape.startX - actualMinX) * scaleX;
          newStartY = newActualY + (shape.startY - actualMinY) * scaleY;
          newEndX = newActualX + (shape.endX - actualMinX) * scaleX;
          newEndY = newActualY + (shape.endY - actualMinY) * scaleY;
        }

        dispatch(
          updateShape({
            id: shapeId,
            patch: {
              startX: newStartX,
              startY: newStartY,
              endX: newEndX,
              endY: newEndY,
            },
          })
        );
      }
    };

    const handleResizeEnd = () => {
      isResizingRef.current = false;
      resizeDataRef.current = null;
    };

    window.addEventListener(
      "shape-resize-start",
      handleResizeStart as EventListener
    );
    window.addEventListener(
      "shape-resize-move",
      handleResizeMove as EventListener
    );
    window.addEventListener(
      "shape-resize-end",
      handleResizeEnd as EventListener
    );

    return () => {
      window.removeEventListener(
        "shape-resize-start",
        handleResizeStart as EventListener
      );
      window.removeEventListener(
        "shape-resize-move",
        handleResizeMove as EventListener
      );
      window.removeEventListener(
        "shape-resize-end",
        handleResizeEnd as EventListener
      );
    };
  }, [dispatch, entityState.entities, viewport.translate, viewport.scale]);

  // connecting hook to canvas elements
  const attachCanvasRef = (ref: HTMLDivElement | null): void => {
    // Clean up any existing event listeners on the old canvas
    if (canvasRef.current) {
      canvasRef.current.removeEventListener("wheel", onWheel);
    }
    // Store the new canvas reference
    canvasRef.current = ref;
    // Add wheel event listener to the new canvas (for zoom/pan)
    if (ref) {
      ref.addEventListener("wheel", onWheel, { passive: false });
    }
  };

  const selectTool = (tool: Tool): void => {
    dispatch(setTool(tool));
  };

  const getDraftShape = (): DraftShape | null => draftShapeRef.current;
  const getFreeDrawPoints = (): ReadonlyArray<Point> =>
    freeDrawPointsRef.current;

  return {
    viewport,
    shapes: shapeList,
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
    isSidebarOpen,
    hasSelectedText,
    setIsSidebarOpen,
  };
};
