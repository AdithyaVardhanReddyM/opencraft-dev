import type { Point, Shape } from "@/types/canvas";

// Hit testing thresholds
const FREEDRAW_HIT_THRESHOLD = 5;
const LINE_HIT_THRESHOLD = 8;
const TEXT_PADDING = 8;
const TEXT_BOUNDS_MARGIN = 2;

/**
 * Calculate distance from a point to a line segment
 */
export function distanceToLineSegment(
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let xx: number, yy: number;
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
}

/**
 * Check if a point is inside a shape
 */
export function isPointInShape(point: Point, shape: Shape): boolean {
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
      for (let i = 0; i < shape.points.length - 1; i++) {
        const p1 = shape.points[i];
        const p2 = shape.points[i + 1];
        if (distanceToLineSegment(point, p1, p2) <= FREEDRAW_HIT_THRESHOLD) {
          return true;
        }
      }
      return false;

    case "arrow":
    case "line":
      return (
        distanceToLineSegment(
          point,
          { x: shape.startX, y: shape.startY },
          { x: shape.endX, y: shape.endY }
        ) <= LINE_HIT_THRESHOLD
      );

    case "text":
      const textWidth = Math.max(
        shape.text.length * (shape.fontSize * 0.6),
        100
      );
      const textHeight = shape.fontSize * 1.2;

      return (
        point.x >= shape.x - TEXT_BOUNDS_MARGIN &&
        point.x <= shape.x + textWidth + TEXT_PADDING + TEXT_BOUNDS_MARGIN &&
        point.y >= shape.y - TEXT_BOUNDS_MARGIN &&
        point.y <= shape.y + textHeight + TEXT_PADDING + TEXT_BOUNDS_MARGIN
      );

    default:
      return false;
  }
}

/**
 * Get the topmost shape at a point (iterates from end to start for z-order)
 */
export function getShapeAtPoint(point: Point, shapes: Shape[]): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    if (isPointInShape(point, shape)) {
      return shape;
    }
  }
  return null;
}
