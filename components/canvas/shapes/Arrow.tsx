import { ArrowShape, Shape } from "@/types/canvas";
import { getArrowRoute } from "@/lib/canvas/arrow-utils";

export const Arrow = ({
  shape,
  shapesById,
}: {
  shape: ArrowShape;
  shapesById?: Map<string, Shape>;
}) => {
  const arrowHeadSize = 10;
  const isDashed = shape.strokeType === "dashed";

  // Resolve bindings and route here so the SVG is sized from the *actual* path —
  // an elbow bridge can extend beyond the raw start/end box (e.g. above two tops).
  const points = getArrowRoute(shape, shapesById);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  // Convert world points to the SVG's local coordinate space.
  const localPoints = points
    .map((p) => `${p.x - minX + arrowHeadSize},${p.y - minY + arrowHeadSize}`)
    .join(" ");

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: minX - arrowHeadSize,
        top: minY - arrowHeadSize,
        width: maxX - minX + arrowHeadSize * 2,
        height: maxY - minY + arrowHeadSize * 2,
        overflow: "visible",
      }}
    >
      <defs>
        <marker
          id={`arrowhead-${shape.id}`}
          markerWidth={arrowHeadSize}
          markerHeight={arrowHeadSize}
          refX={arrowHeadSize - 2}
          refY={arrowHeadSize / 2}
          orient="auto"
        >
          <polygon
            points={`0 0, ${arrowHeadSize} ${
              arrowHeadSize / 2
            }, 0 ${arrowHeadSize}`}
            fill={shape.stroke}
          />
        </marker>
      </defs>
      <polyline
        points={localPoints}
        fill="none"
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={isDashed ? "8 4" : undefined}
        markerEnd={`url(#arrowhead-${shape.id})`}
      />
    </svg>
  );
};
