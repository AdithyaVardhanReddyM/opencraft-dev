"use client";

import { Component } from "lucide-react";
import { SCREEN_DEFAULTS } from "@/lib/canvas/shape-factories";

interface ScreenCursorPreviewProps {
  /** World X coordinate (cursor position) */
  worldX: number;
  /** World Y coordinate (cursor position) */
  worldY: number;
}

/**
 * Ghost preview component that follows the cursor when the screen tool is active.
 * The preview is centered on the cursor position.
 */
export function ScreenCursorPreview({
  worldX,
  worldY,
}: ScreenCursorPreviewProps) {
  const w = SCREEN_DEFAULTS.width;
  const h = SCREEN_DEFAULTS.height;

  // Center the preview on the cursor
  const x = worldX - w / 2;
  const y = worldY - h / 2;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
      }}
    >
      <div
        className="w-full h-full border-2 border-dashed border-primary/50 bg-primary/5 flex items-center justify-center"
        style={{
          backdropFilter: "blur(2px)",
        }}
      >
        <div className="flex flex-col items-center gap-1.5 text-primary/70">
          <Component className="w-5 h-5" />
          <span className="text-xs font-medium">Component</span>
        </div>
      </div>
    </div>
  );
}
