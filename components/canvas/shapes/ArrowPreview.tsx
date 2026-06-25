import {
  getDraftArrowRoute,
  type ArrowRouting,
} from "@/lib/canvas/arrow-utils";
import type { ArrowBindTarget } from "@/types/canvas";

export const ArrowPreview = ({
  startWorld,
  currentWorld,
  arrowType,
  bindStart,
  bindEnd,
}: {
  startWorld: { x: number; y: number };
  currentWorld: { x: number; y: number };
  arrowType?: ArrowRouting;
  // When an endpoint is hovering a shape, the preview snaps to that edge and
  // routes like the committed arrow will, so the bend you see is what you get.
  bindStart?: ArrowBindTarget | null;
  bindEnd?: ArrowBindTarget | null;
}) => {
  const arrowHeadSize = 6;

  const start = bindStart?.point ?? startWorld;
  const end = bindEnd?.point ?? currentWorld;

  const points = getDraftArrowRoute(
    start,
    end,
    bindStart?.side ?? null,
    bindEnd?.side ?? null,
    arrowType
  );

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

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
