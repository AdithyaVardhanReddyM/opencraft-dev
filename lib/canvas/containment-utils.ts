import type { Shape, FrameShape } from "@/types/canvas";
import { getTextShapeDimensions } from "./text-utils";

/**
 * Shape bounds interface representing a bounding box
 */
export interface ShapeBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Padding for text shapes (matches hit-testing.ts)
const TEXT_PADDING = 8;

/**
 * Get the bounding box of any shape
 */
export function getShapeBounds(shape: Shape): ShapeBounds {
  switch (shape.type) {
    case "frame":
    case "rect":
    case "ellipse":
    case "generatedui":
    case "screen":
      return {
        x: shape.x,
        y: shape.y,
        w: shape.w,
        h: shape.h,
      };

    case "freedraw": {
      if (shape.points.length === 0) {
        return { x: 0, y: 0, w: 0, h: 0 };
      }
      const xs = shape.points.map((p) => p.x);
      const ys = shape.points.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
      };
    }

    case "arrow":
    case "line": {
      const minX = Math.min(shape.startX, shape.endX);
      const maxX = Math.max(shape.startX, shape.endX);
      const minY = Math.min(shape.startY, shape.endY);
      const maxY = Math.max(shape.startY, shape.endY);
      return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
      };
    }

    case "text": {
      const { width, height } = getTextShapeDimensions(shape);
      return {
        x: shape.x - TEXT_PADDING,
        y: shape.y - TEXT_PADDING,
        w: width + TEXT_PADDING * 2,
        h: height + TEXT_PADDING * 2,
      };
    }

    default:
      return { x: 0, y: 0, w: 0, h: 0 };
  }
}

/**
 * Check if a shape is fully contained within a frame
 * A shape is contained if its entire bounding box falls within the frame's bounds
 */
export function isShapeContainedInFrame(
  shape: Shape,
  frame: FrameShape
): boolean {
  // Don't check if shape is the frame itself
  if (shape.id === frame.id) {
    return false;
  }

  const bounds = getShapeBounds(shape);

  // Check if all four corners of the shape's bounding box are within the frame
  const shapeLeft = bounds.x;
  const shapeRight = bounds.x + bounds.w;
  const shapeTop = bounds.y;
  const shapeBottom = bounds.y + bounds.h;

  const frameLeft = frame.x;
  const frameRight = frame.x + frame.w;
  const frameTop = frame.y;
  const frameBottom = frame.y + frame.h;

  return (
    shapeLeft >= frameLeft &&
    shapeRight <= frameRight &&
    shapeTop >= frameTop &&
    shapeBottom <= frameBottom
  );
}

/**
 * Get all shapes fully contained within a frame
 */
export function getContainedShapes(
  frame: FrameShape,
  shapes: Shape[]
): Shape[] {
  return shapes.filter(
    (shape) => shape.type !== "frame" && isShapeContainedInFrame(shape, frame)
  );
}

/**
 * Get frames that have at least one contained shape
 * Returns an array of objects with the frame and its contained shapes
 */
export function getFramesWithContainedShapes(
  shapes: Shape[]
): Array<{ frame: FrameShape; containedShapes: Shape[] }> {
  const frames = shapes.filter((s) => s.type === "frame") as FrameShape[];
  const result: Array<{ frame: FrameShape; containedShapes: Shape[] }> = [];

  for (const frame of frames) {
    const containedShapes = getContainedShapes(frame, shapes);
    if (containedShapes.length > 0) {
      result.push({ frame, containedShapes });
    }
  }

  return result;
}
