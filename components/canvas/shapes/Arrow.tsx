import { ArrowShape } from "@/types/canvas";
import { getArrowPoints } from "@/lib/canvas/arrow-utils";

export const Arrow = ({ shape }: { shape: ArrowShape }) => {
  const arrowHeadSize = 10;
  const isDashed = shape.strokeType === "dashed";

  const minX = Math.min(shape.startX, shape.endX);
  const minY = Math.min(shape.startY, shape.endY);

  const points = getArrowPoints(
    shape.startX,
    shape.startY,
    shape.endX,
    shape.endY,
    shape.arrowType
  );

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
        width: Math.abs(shape.endX - shape.startX) + arrowHeadSize * 2,
        height: Math.abs(shape.endY - shape.startY) + arrowHeadSize * 2,
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
