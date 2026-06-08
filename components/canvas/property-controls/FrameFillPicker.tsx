"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { FRAME_FILL_PALETTE } from "@/lib/canvas/properties-utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FrameFillPickerProps {
  value: string | "mixed";
  onChange: (value: string) => void;
}

export function FrameFillPicker({ value, onChange }: FrameFillPickerProps) {
  const [open, setOpen] = useState(false);

  const handleColorSelect = (color: string) => {
    onChange(color);
    setOpen(false);
  };

  const displayColor = value === "mixed" ? "rgba(128, 128, 128, 0.1)" : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className="flex h-7 w-7 items-center justify-center rounded bg-background/50 transition-colors hover:bg-accent"
              aria-label="Frame fill color"
            >
              <div
                className="h-4 w-4 rounded-sm border border-border/50 relative overflow-hidden"
                style={{ backgroundColor: displayColor }}
              >
                {/* Checkerboard pattern to show transparency */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `linear-gradient(45deg, #666 25%, transparent 25%), 
                                      linear-gradient(-45deg, #666 25%, transparent 25%), 
                                      linear-gradient(45deg, transparent 75%, #666 75%), 
                                      linear-gradient(-45deg, transparent 75%, #666 75%)`,
                    backgroundSize: "4px 4px",
                    backgroundPosition: "0 0, 0 2px, 2px -2px, -2px 0px",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: displayColor }}
                />
              </div>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          Fill color
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        className="w-auto p-2 bg-card border-border"
        side="bottom"
        align="start"
        sideOffset={8}
      >
        <div className="grid grid-cols-5 gap-1.5">
          {FRAME_FILL_PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              className="relative h-6 w-6 rounded-sm border border-border/30 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-card overflow-hidden"
              aria-label={`Select fill color`}
            >
              {/* Checkerboard background */}
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage: `linear-gradient(45deg, #444 25%, transparent 25%), 
                                    linear-gradient(-45deg, #444 25%, transparent 25%), 
                                    linear-gradient(45deg, transparent 75%, #444 75%), 
                                    linear-gradient(-45deg, transparent 75%, #444 75%)`,
                  backgroundSize: "4px 4px",
                  backgroundPosition: "0 0, 0 2px, 2px -2px, -2px 0px",
                }}
              />
              <div
                className="absolute inset-0"
                style={{ backgroundColor: color }}
              />
              {value === color && (
                <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white/80" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
