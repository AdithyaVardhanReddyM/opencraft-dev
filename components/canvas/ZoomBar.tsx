"use client";

import { Minus, Plus } from "lucide-react";

interface ZoomBarProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  minScale?: number;
  maxScale?: number;
}

export function ZoomBar({
  scale,
  onZoomIn,
  onZoomOut,
  minScale = 0.1,
  maxScale = 8.0,
}: ZoomBarProps) {
  const percentage = Math.round(scale * 100);
  const isAtMin = scale <= minScale;
  const isAtMax = scale >= maxScale;

  return (
    <div className="pointer-events-auto fixed bottom-4 left-4 z-50">
      <div className="flex items-center gap-0.5 rounded-full border border-border bg-card/95 p-1 shadow-lg backdrop-blur-sm">
        <button
          onClick={onZoomOut}
          disabled={isAtMin}
          aria-label="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-accent enabled:hover:text-accent-foreground"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <div
          className="w-16 text-center text-xs font-medium text-foreground"
          aria-live="polite"
        >
          {percentage}%
        </div>

        <button
          onClick={onZoomIn}
          disabled={isAtMax}
          aria-label="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-accent enabled:hover:text-accent-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
