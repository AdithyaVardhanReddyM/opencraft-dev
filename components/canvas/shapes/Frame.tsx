import { FrameShape } from "@/types/canvas";

export const Frame = ({
  shape,
  displayNumber,
}: {
  shape: FrameShape;
  // Contiguous label number (1..N by creation order); falls back to the stored
  // frameNumber when not provided.
  displayNumber?: number;
}) => {
  const borderRadius = shape.borderRadius ?? 0;
  const fillColor = shape.fill ?? "rgba(226, 226, 226, 0.9)";

  return (
    <>
      <div
        className="absolute pointer-events-none backdrop-blur-xl saturate-150"
        style={{
          left: shape.x,
          top: shape.y,
          width: shape.w,
          height: shape.h,
          borderRadius: borderRadius > 0 ? `${borderRadius}px` : "0px",
          backgroundColor: fillColor,
        }}
      />
      <div
        className="absolute pointer-events-none whitespace-nowrap text-xs font-medium text-foreground/70 select-none"
        style={{
          left: shape.x,
          top: shape.y - 24,
          fontSize: "11px",
          lineHeight: "1.2",
        }}
      >
        Frame {displayNumber ?? shape.frameNumber}
      </div>
    </>
  );
};
