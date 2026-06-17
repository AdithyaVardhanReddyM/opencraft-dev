import type { ArrowShape, Point, Shape } from "@/types/canvas";
import { getShapeBounds } from "./containment-utils";

export type ArrowRouting = "straight" | "elbow";

/**
 * Compute the polyline points (in world coordinates) for an arrow.
 *
 * - "straight" returns the two endpoints.
 * - "elbow" returns an orthogonal (right-angle) route with a single bend at the
 *   midpoint of the dominant axis, so the arrowhead always enters the end point
 *   along that axis.
 */
export function getArrowPoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  arrowType: ArrowRouting | undefined
): Point[] {
  const start = { x: startX, y: startY };
  const end = { x: endX, y: endY };

  if (arrowType !== "elbow") {
    return [start, end];
  }

  const dx = endX - startX;
  const dy = endY - startY;

  // Nearly aligned on an axis — an orthogonal route would collapse to a line.
  if (Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5) {
    return [start, end];
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal-dominant: bend at the mid X, arrowhead enters horizontally.
    const midX = (startX + endX) / 2;
    return [start, { x: midX, y: startY }, { x: midX, y: endY }, end];
  }

  // Vertical-dominant: bend at the mid Y, arrowhead enters vertically.
  const midY = (startY + endY) / 2;
  return [start, { x: startX, y: midY }, { x: endX, y: midY }, end];
}

/**
 * Pick edge-center anchor points on two boxes so a connector runs between their
 * nearest facing edges. The dominant axis between the box centers decides whether
 * the connector exits left/right (horizontal) or top/bottom (vertical), which keeps
 * elbow routing clean regardless of how the shapes are arranged.
 */
function getConnectorAnchors(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): { start: Point; end: Point } {
  const aCenter = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const bCenter = { x: b.x + b.w / 2, y: b.y + b.h / 2 };

  const dx = bCenter.x - aCenter.x;
  const dy = bCenter.y - aCenter.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal-dominant: exit from the right/left edges.
    const start =
      dx >= 0
        ? { x: a.x + a.w, y: aCenter.y }
        : { x: a.x, y: aCenter.y };
    const end =
      dx >= 0 ? { x: b.x, y: bCenter.y } : { x: b.x + b.w, y: bCenter.y };
    return { start, end };
  }

  // Vertical-dominant: exit from the bottom/top edges.
  const start =
    dy >= 0 ? { x: aCenter.x, y: a.y + a.h } : { x: aCenter.x, y: a.y };
  const end = dy >= 0 ? { x: bCenter.x, y: b.y } : { x: bCenter.x, y: b.y + b.h };
  return { start, end };
}

/**
 * Resolve a (possibly bound) arrow to concrete endpoints.
 *
 * For a "flow" connector with startBinding/endBinding, the endpoints are derived
 * from the bound shapes' current bounds so the arrow follows them whenever they
 * move or resize — no mutation of the stored arrow is needed, since this runs each
 * render. Arrows without bindings (or whose bound shapes are missing) are returned
 * unchanged.
 */
export function resolveBoundArrow(
  shape: ArrowShape,
  shapesById: Map<string, Shape>
): ArrowShape {
  if (!shape.startBinding && !shape.endBinding) {
    return shape;
  }

  const startShape = shape.startBinding
    ? shapesById.get(shape.startBinding.shapeId)
    : undefined;
  const endShape = shape.endBinding
    ? shapesById.get(shape.endBinding.shapeId)
    : undefined;

  // Both ends bound and present: route between their facing edges.
  if (startShape && endShape) {
    const { start, end } = getConnectorAnchors(
      getShapeBounds(startShape),
      getShapeBounds(endShape)
    );
    return {
      ...shape,
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
    };
  }

  // Only one end bound: anchor that end to the bound shape's center-edge facing
  // the fixed end, leaving the other end at its stored coordinate.
  if (startShape) {
    const b = getShapeBounds(startShape);
    const { start } = getConnectorAnchors(b, {
      x: shape.endX,
      y: shape.endY,
      w: 0,
      h: 0,
    });
    return { ...shape, startX: start.x, startY: start.y };
  }
  if (endShape) {
    const b = getShapeBounds(endShape);
    const { start: end } = getConnectorAnchors(b, {
      x: shape.startX,
      y: shape.startY,
      w: 0,
      h: 0,
    });
    return { ...shape, endX: end.x, endY: end.y };
  }

  return shape;
}
