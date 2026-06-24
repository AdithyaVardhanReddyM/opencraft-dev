"use client";

import { STICKY_NOTE_DEFAULTS } from "@/lib/canvas/shape-factories";

interface StickyNoteCursorPreviewProps {
  /** World X coordinate (cursor position) */
  worldX: number;
  /** World Y coordinate (cursor position) */
  worldY: number;
}

/**
 * Ghost preview that follows the cursor while the sticky-note tool is active.
 * Centered on the cursor (the note drops where this preview sits). The native
 * cursor is hidden for this tool, so this preview stands in for it.
 */
export function StickyNoteCursorPreview({
  worldX,
  worldY,
}: StickyNoteCursorPreviewProps) {
  const w = STICKY_NOTE_DEFAULTS.width;
  const h = STICKY_NOTE_DEFAULTS.height;
  const x = worldX - w / 2;
  const y = worldY - h / 2;

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: x, top: y, width: w, height: h }}
    >
      <div
        className="flex h-full w-full items-center justify-center rounded-[10px]"
        style={{
          backgroundColor: STICKY_NOTE_DEFAULTS.backgroundColor,
          opacity: 0.72,
          border: "2px dashed oklch(0.5665 0.1947 256.1696 / 0.55)",
          boxShadow: "0 10px 24px -10px rgba(0,0,0,0.32)",
        }}
      >
        <span
          className="text-xs font-medium"
          style={{ color: STICKY_NOTE_DEFAULTS.textColor, opacity: 0.5 }}
        >
          Click to place
        </span>
      </div>
    </div>
  );
}
