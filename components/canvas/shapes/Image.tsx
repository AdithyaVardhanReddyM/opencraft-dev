"use client";

import { ImageIcon, Loader2 } from "lucide-react";
import { useImageUrls } from "@/lib/api/hooks";
import type { ImageShape } from "@/types/canvas";

/**
 * Renders a user-supplied image on the canvas. The pixels live in S3; we resolve
 * the object key to a presigned URL on demand. The wrapper is `pointer-events-none`
 * (like Frame) so selection/move/resize flow through the canvas's world-coordinate
 * hit-testing rather than the DOM — a plain <img> needs no perimeter grab hack.
 */
export const Image = ({ shape }: { shape: ImageShape }) => {
  const { data: urlMap } = useImageUrls(
    shape.s3Key ? [shape.s3Key] : undefined
  );
  const src = shape.s3Key ? urlMap?.[shape.s3Key] : null;
  const isError = shape.status === "error";

  return (
    <>
      <div
        className="absolute pointer-events-none overflow-hidden rounded-[2px] bg-muted/30 ring-1 ring-border/40"
        style={{
          left: shape.x,
          top: shape.y,
          width: shape.w,
          height: shape.h,
        }}
      >
        {isError ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground/70">
            <ImageIcon className="h-6 w-6" />
            <span className="text-[10px]">Upload failed</span>
          </div>
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={shape.name}
            draggable={false}
            className="h-full w-full select-none object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Name label above the image — matches Frame's label styling. */}
      <div
        className="absolute pointer-events-none whitespace-nowrap text-xs font-medium text-foreground/70 select-none"
        style={{
          left: shape.x,
          top: shape.y - 24,
          fontSize: "11px",
          lineHeight: "1.2",
        }}
      >
        {shape.name}
      </div>
    </>
  );
};
