"use client";

import { Minus, Plus } from "lucide-react";

interface ZoomBarProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  minScale?: number;
  maxScale?: number;
}

export function ZoomBar({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
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
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-accent enabled:hover:text-accent-foreground"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onReset}
          title="Reset zoom"
          aria-label="Reset zoom to 100%"
          className="w-16 rounded-full px-2 py-1 text-center text-xs font-medium text-foreground transition-colors outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:ring-0 hover:bg-accent hover:text-accent-foreground"
        >
          {percentage}%
        </button>

        <button
          onClick={onZoomIn}
          disabled={isAtMax}
          aria-label="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-accent enabled:hover:text-accent-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
