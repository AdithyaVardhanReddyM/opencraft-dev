"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DimensionsControlProps {
  width: number | "mixed";
  height: number | "mixed";
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
}

export function DimensionsControl({
  width,
  height,
  onWidthChange,
  onHeightChange,
}: DimensionsControlProps) {
  const [localWidth, setLocalWidth] = useState(
    width === "mixed" ? "" : String(Math.round(width))
  );
  const [localHeight, setLocalHeight] = useState(
    height === "mixed" ? "" : String(Math.round(height))
  );

  // Sync local state with props
  useEffect(() => {
    setLocalWidth(width === "mixed" ? "" : String(Math.round(width)));
  }, [width]);

  useEffect(() => {
    setLocalHeight(height === "mixed" ? "" : String(Math.round(height)));
  }, [height]);

  const handleWidthBlur = useCallback(() => {
    const parsed = parseInt(localWidth, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onWidthChange(parsed);
    } else if (width !== "mixed") {
      setLocalWidth(String(Math.round(width)));
    }
  }, [localWidth, width, onWidthChange]);

  const handleHeightBlur = useCallback(() => {
    const parsed = parseInt(localHeight, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onHeightChange(parsed);
    } else if (height !== "mixed") {
      setLocalHeight(String(Math.round(height)));
    }
  }, [localHeight, height, onHeightChange]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    onBlur: () => void
  ) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      onBlur();
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 bg-background/50 rounded-md px-1.5 py-0.5">
            <span className="text-[10px] text-muted-foreground font-medium">
              W
            </span>
            <input
              type="text"
              value={localWidth}
              onChange={(e) => setLocalWidth(e.target.value)}
              onBlur={handleWidthBlur}
              onKeyDown={(e) => handleKeyDown(e, handleWidthBlur)}
              placeholder={width === "mixed" ? "—" : ""}
              className="w-11 h-6 bg-transparent text-xs text-foreground text-center rounded border-none outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              aria-label="Width in pixels"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          Width (px)
        </TooltipContent>
      </Tooltip>

      <span className="text-muted-foreground/40 text-xs">×</span>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 bg-background/50 rounded-md px-1.5 py-0.5">
            <span className="text-[10px] text-muted-foreground font-medium">
              H
            </span>
            <input
              type="text"
              value={localHeight}
              onChange={(e) => setLocalHeight(e.target.value)}
              onBlur={handleHeightBlur}
              onKeyDown={(e) => handleKeyDown(e, handleHeightBlur)}
              placeholder={height === "mixed" ? "—" : ""}
              className="w-11 h-6 bg-transparent text-xs text-foreground text-center rounded border-none outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              aria-label="Height in pixels"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          Height (px)
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
