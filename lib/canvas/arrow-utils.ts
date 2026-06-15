import type { Point } from "@/types/canvas";

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
