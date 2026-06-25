import type { ArrowShape, Point, Shape, ShapeSide } from "@/types/canvas";
import { getShapeBounds, type ShapeBounds } from "./containment-utils";

export type ArrowRouting = "straight" | "elbow";

// How far an elbow connector pushes away from a shape edge before turning, and
// how far the "bridge" of a U-route clears the shapes it spans. Keeping this a
// constant (rather than scaling with distance) gives predictable, tidy corners.
const STUB = 24;

// Outward unit normals for each side. The normal is the direction a connector
// travels as it leaves that edge — the key input to clean orthogonal routing.
export const SIDE_NORMALS: Record<ShapeSide, Point> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** The point on `side` of `bounds` at normalized position `t` (0..1) along it. */
export function anchorOnSide(
  bounds: ShapeBounds,
  side: ShapeSide,
  position = 0.5
): Point {
  const t = Math.max(0, Math.min(1, position));
  switch (side) {
    case "top":
      return { x: bounds.x + bounds.w * t, y: bounds.y };
    case "bottom":
      return { x: bounds.x + bounds.w * t, y: bounds.y + bounds.h };
    case "left":
      return { x: bounds.x, y: bounds.y + bounds.h * t };
    case "right":
      return { x: bounds.x + bounds.w, y: bounds.y + bounds.h * t };
  }
}

/**
 * Pick the edge of `bounds` nearest to `p` and the normalized position along it.
 * Used both to snap a dropped endpoint to an edge and to derive a facing edge for
 * legacy bindings that don't record a side.
 */
export function nearestSideOfBounds(
  p: Point,
  bounds: ShapeBounds
): { side: ShapeSide; position: number } {
  const left = Math.abs(p.x - bounds.x);
  const right = Math.abs(bounds.x + bounds.w - p.x);
  const top = Math.abs(p.y - bounds.y);
  const bottom = Math.abs(bounds.y + bounds.h - p.y);
  const min = Math.min(left, right, top, bottom);
  const hx = bounds.w ? (p.x - bounds.x) / bounds.w : 0.5;
  const hy = bounds.h ? (p.y - bounds.y) / bounds.h : 0.5;
  if (min === top) return { side: "top", position: hx };
  if (min === bottom) return { side: "bottom", position: hx };
  if (min === left) return { side: "left", position: hy };
  return { side: "right", position: hy };
}

const centerOf = (b: ShapeBounds): Point => ({
  x: b.x + b.w / 2,
  y: b.y + b.h / 2,
});

/**
 * The edge of `b` that faces `toward`, chosen by the dominant axis between the
 * box center and `toward` (so a connector exits left/right when the other end is
 * mostly horizontal, top/bottom when mostly vertical). Used to derive a side for
 * legacy bindings that don't record one. This differs from
 * {@link nearestSideOfBounds}, which picks the closest edge by perpendicular
 * distance — right for snapping a dropped point, wrong for facing a far box.
 */
function facingSide(
  b: ShapeBounds,
  toward: Point
): { side: ShapeSide; position: number } {
  const c = centerOf(b);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      side: dx >= 0 ? "right" : "left",
      position: b.h ? (toward.y - b.y) / b.h : 0.5,
    };
  }
  return {
    side: dy >= 0 ? "bottom" : "top",
    position: b.w ? (toward.x - b.x) / b.w : 0.5,
  };
}

/** Drop duplicate and collinear vertices so each bend is a real direction change. */
function simplify(pts: Point[]): Point[] {
  const dedup: Point[] = [];
  for (const p of pts) {
    const last = dedup[dedup.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 0.01) dedup.push(p);
  }
  if (dedup.length <= 2) return dedup;
  const out: Point[] = [dedup[0]];
  for (let i = 1; i < dedup.length - 1; i++) {
    const a = out[out.length - 1];
    const b = dedup[i];
    const c = dedup[i + 1];
    const collinear =
      (Math.abs(a.x - b.x) < 0.01 && Math.abs(b.x - c.x) < 0.01) ||
      (Math.abs(a.y - b.y) < 0.01 && Math.abs(b.y - c.y) < 0.01);
    if (!collinear) out.push(b);
  }
  out.push(dedup[dedup.length - 1]);
  return out;
}

/**
 * Orthogonal (right-angle) route from `start` to `end` that leaves `start` along
 * `dirStart` and arrives at `end` against `dirEnd` (both are outward edge normals).
 *
 * The route shape falls out of how the two exit directions relate:
 *  - same axis, same direction  -> U / ∩ bridge (e.g. top↔top)
 *  - same axis, opposite        -> Z through the midpoint (facing edges)
 *  - perpendicular              -> a single-corner L (staircase fallback if the
 *                                  signs rule out a clean L)
 * This is the standard exit-normal approach used by Figma/Excalidraw/React Flow,
 * minus the full obstacle-avoiding A* search (overkill for connector arrows).
 */
export function routeElbow(
  start: Point,
  dirStart: Point,
  end: Point,
  dirEnd: Point,
  stub = STUB
): Point[] {
  const startV = dirStart.x === 0; // leaves vertically
  const endV = dirEnd.x === 0;

  let pts: Point[];

  if (startV && endV) {
    if (dirStart.y === dirEnd.y) {
      // Both up or both down -> bridge clearing both endpoints by `stub`.
      const cy =
        dirStart.y < 0
          ? Math.min(start.y, end.y) - stub
          : Math.max(start.y, end.y) + stub;
      pts = [start, { x: start.x, y: cy }, { x: end.x, y: cy }, end];
    } else {
      const my = (start.y + end.y) / 2;
      pts = [start, { x: start.x, y: my }, { x: end.x, y: my }, end];
    }
  } else if (!startV && !endV) {
    if (dirStart.x === dirEnd.x) {
      const cx =
        dirStart.x < 0
          ? Math.min(start.x, end.x) - stub
          : Math.max(start.x, end.x) + stub;
      pts = [start, { x: cx, y: start.y }, { x: cx, y: end.y }, end];
    } else {
      const mx = (start.x + end.x) / 2;
      pts = [start, { x: mx, y: start.y }, { x: mx, y: end.y }, end];
    }
  } else {
    // Perpendicular: normalize to a horizontal-exit end and a vertical-exit end.
    const hStart = !startV;
    const h = hStart ? start : end;
    const hDir = hStart ? dirStart : dirEnd;
    const v = hStart ? end : start;
    const vDir = hStart ? dirEnd : dirStart;

    // A clean L bends at (v.x, h.y): horizontal out of `h`, then vertical into `v`.
    const horizOk =
      Math.sign(v.x - h.x) === hDir.x || Math.abs(v.x - h.x) < 0.01;
    const vertOk =
      Math.sign(v.y - h.y) === -vDir.y || Math.abs(v.y - h.y) < 0.01;

    let leg: Point[];
    if (horizOk && vertOk) {
      leg = [h, { x: v.x, y: h.y }, v];
    } else {
      // Signs rule out the simple L — push out along both normals and connect.
      const hs = { x: h.x + hDir.x * stub, y: h.y };
      const vs = { x: v.x, y: v.y + vDir.y * stub };
      leg = [h, hs, { x: hs.x, y: vs.y }, vs, v];
    }
    pts = hStart ? leg : leg.reverse();
  }

  return simplify(pts);
}

/**
 * Compute the polyline points (in world coordinates) for an unbound arrow from
 * just its two endpoints. "straight" returns the endpoints; "elbow" makes a
 * single mid-axis bend. (Bound arrows route through {@link getArrowRoute}, which
 * knows each endpoint's exit direction and can produce U/L routes.)
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
    const midX = (startX + endX) / 2;
    return [start, { x: midX, y: startY }, { x: midX, y: endY }, end];
  }

  const midY = (startY + endY) / 2;
  return [start, { x: startX, y: midY }, { x: endX, y: midY }, end];
}

interface ResolvedEnds {
  start: Point;
  end: Point;
  dirStart: Point | null;
  dirEnd: Point | null;
}

/**
 * Resolve an arrow's endpoints (and, for bound ends, their exit directions) from
 * the live geometry of any shapes it is bound to. Endpoints with no binding fall
 * back to the arrow's stored coordinates and a null direction.
 */
function resolveEnds(
  shape: ArrowShape,
  shapesById?: Map<string, Shape>
): ResolvedEnds {
  let start: Point = { x: shape.startX, y: shape.startY };
  let end: Point = { x: shape.endX, y: shape.endY };
  let dirStart: Point | null = null;
  let dirEnd: Point | null = null;

  const startShape =
    shape.startBinding && shapesById
      ? shapesById.get(shape.startBinding.shapeId)
      : undefined;
  const endShape =
    shape.endBinding && shapesById
      ? shapesById.get(shape.endBinding.shapeId)
      : undefined;

  if (startShape) {
    const b = getShapeBounds(startShape);
    if (shape.startBinding?.side) {
      start = anchorOnSide(b, shape.startBinding.side, shape.startBinding.position);
      dirStart = SIDE_NORMALS[shape.startBinding.side];
    } else {
      // Legacy binding: face the other shape's center (or the free endpoint).
      const ref = endShape ? centerOf(getShapeBounds(endShape)) : end;
      const d = facingSide(b, ref);
      start = anchorOnSide(b, d.side, d.position);
      dirStart = SIDE_NORMALS[d.side];
    }
  }

  if (endShape) {
    const b = getShapeBounds(endShape);
    if (shape.endBinding?.side) {
      end = anchorOnSide(b, shape.endBinding.side, shape.endBinding.position);
      dirEnd = SIDE_NORMALS[shape.endBinding.side];
    } else {
      const ref = startShape ? centerOf(getShapeBounds(startShape)) : start;
      const d = facingSide(b, ref);
      end = anchorOnSide(b, d.side, d.position);
      dirEnd = SIDE_NORMALS[d.side];
    }
  }

  return { start, end, dirStart, dirEnd };
}

// Outward normal for a free (unbound) endpoint, inferred from the line toward the
// other endpoint so a half-bound elbow still routes sensibly.
function inferDir(self: Point, other: Point, role: "start" | "end"): Point {
  const dx = other.x - self.x;
  const dy = other.y - self.y;
  const horiz = Math.abs(dx) >= Math.abs(dy);
  const toward: Point = horiz
    ? { x: Math.sign(dx) || 1, y: 0 }
    : { x: 0, y: Math.sign(dy) || 1 };
  // A start leaves toward the other end; an end's outward normal points away
  // from it (the arrow arrives along the opposite vector).
  return role === "start" ? toward : { x: -toward.x, y: -toward.y };
}

/**
 * The full polyline for an arrow, accounting for any bindings. This is the single
 * source of truth used by the renderer and hit-testing.
 *
 * - Bound endpoints contribute both their anchor and an exit direction, so an
 *   elbow arrow routes cleanly (top↔top -> ∩, facing edges -> Z, etc.).
 * - With no bindings, elbow arrows keep the simple two-point mid-axis bend.
 */
export function getArrowRoute(
  shape: ArrowShape,
  shapesById?: Map<string, Shape>
): Point[] {
  const { start, end, dirStart, dirEnd } = resolveEnds(shape, shapesById);

  if (shape.arrowType !== "elbow") return [start, end];

  // No exit information on either end — nothing better than the legacy bend.
  if (!dirStart && !dirEnd) {
    return getArrowPoints(start.x, start.y, end.x, end.y, "elbow");
  }

  const ds = dirStart ?? inferDir(start, end, "start");
  const de = dirEnd ?? inferDir(end, start, "end");
  return routeElbow(start, ds, end, de);
}

/**
 * Route an in-progress (draft) arrow for the live preview. Takes the two
 * endpoints plus the edge each is currently snapping to (or null when the
 * endpoint is in open space), and routes exactly like a committed arrow would.
 */
export function getDraftArrowRoute(
  start: Point,
  end: Point,
  startSide: ShapeSide | null,
  endSide: ShapeSide | null,
  arrowType: ArrowRouting | undefined
): Point[] {
  if (arrowType !== "elbow") return [start, end];
  if (!startSide && !endSide) {
    return getArrowPoints(start.x, start.y, end.x, end.y, "elbow");
  }
  const ds = startSide ? SIDE_NORMALS[startSide] : inferDir(start, end, "start");
  const de = endSide ? SIDE_NORMALS[endSide] : inferDir(end, start, "end");
  return routeElbow(start, ds, end, de);
}

/**
 * Resolve a (possibly bound) arrow to concrete endpoint coordinates. Unlike
 * {@link getArrowRoute} this returns an ArrowShape (with updated start/end), which
 * keeps selection handles and bounds in sync for bound connectors.
 */
export function resolveBoundArrow(
  shape: ArrowShape,
  shapesById: Map<string, Shape>
): ArrowShape {
  if (!shape.startBinding && !shape.endBinding) {
    return shape;
  }
  const { start, end } = resolveEnds(shape, shapesById);
  return {
    ...shape,
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
  };
}
