import { getArrowPoints, type ArrowRouting } from "@/lib/canvas/arrow-utils";

export const ArrowPreview = ({
  startWorld,
  currentWorld,
  arrowType,
}: {
  startWorld: { x: number; y: number };
  currentWorld: { x: number; y: number };
  arrowType?: ArrowRouting;
}) => {
  const arrowHeadSize = 6;

  const minX = Math.min(startWorld.x, currentWorld.x);
  const minY = Math.min(startWorld.y, currentWorld.y);

  const points = getArrowPoints(
    startWorld.x,
    startWorld.y,
    currentWorld.x,
    currentWorld.y,
    arrowType
  );

  const localPoints = points
    .map((p) => `${p.x - minX + arrowHeadSize},${p.y - minY + arrowHeadSize}`)
    .join(" ");

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: minX - arrowHeadSize,
        top: minY - arrowHeadSize,
        width: Math.abs(currentWorld.x - startWorld.x) + arrowHeadSize * 2,
        height: Math.abs(currentWorld.y - startWorld.y) + arrowHeadSize * 2,
        overflow: "visible",
      }}
    >
      <defs>
        <marker
          id="arrowhead-preview"
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
            fill="#9ca3af"
          />
        </marker>
      </defs>
      <polyline
        points={localPoints}
        fill="none"
        stroke="#9ca3af"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        markerEnd="url(#arrowhead-preview)"
      />
    </svg>
  );
};
