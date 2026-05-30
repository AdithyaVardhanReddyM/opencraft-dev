import type { Point } from "@/types/canvas";

/**
 * Clamp a value between min and max
 */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Calculate distance between two points
 */
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Calculate midpoint between two points
 */
export function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorld(
  screen: Point,
  translate: Point,
  scale: number
): Point {
  return {
    x: (screen.x - translate.x) / scale,
    y: (screen.y - translate.y) / scale,
  };
}

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreen(
  world: Point,
  translate: Point,
  scale: number
): Point {
  return {
    x: world.x * scale + translate.x,
    y: world.y * scale + translate.y,
  };
}

/**
 * Compute the translate that keeps originScreen pointing at the same world point after scaling
 */
export function zoomAroundScreenPoint(
  originScreen: Point,
  newScale: number,
  currentTranslate: Point,
  currentScale: number
): Point {
  const worldAtOrigin = screenToWorld(
    originScreen,
    currentTranslate,
    currentScale
  );
  return {
    x: originScreen.x - worldAtOrigin.x * newScale,
    y: originScreen.y - worldAtOrigin.y * newScale,
  };
}
