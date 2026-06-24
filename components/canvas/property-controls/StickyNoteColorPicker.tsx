"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { STICKY_NOTE_PALETTE } from "@/lib/canvas/properties-utils";
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

interface StickyNoteColorPickerProps {
  value: string | "mixed";
  onChange: (value: string) => void;
}

export function StickyNoteColorPicker({
  value,
  onChange,
}: StickyNoteColorPickerProps) {
  const [open, setOpen] = useState(false);

  const handleColorSelect = (color: string) => {
    onChange(color);
    setOpen(false);
  };

  const displayColor = value === "mixed" ? "#888888" : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className="flex h-7 w-7 items-center justify-center rounded bg-background/50 transition-colors hover:bg-accent"
              aria-label="Note color"
            >
              <div
                className="h-4 w-4 rounded-sm border border-border/50"
                style={{ backgroundColor: displayColor }}
              />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          Note color
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        className="w-auto p-2 bg-card border-border"
        side="bottom"
        align="start"
        sideOffset={8}
      >
        <div className="grid grid-cols-4 gap-1.5">
          {STICKY_NOTE_PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              className="relative h-6 w-6 rounded-sm border border-border/30 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-card"
              style={{ backgroundColor: color }}
              aria-label={`Select note color ${color}`}
            >
              {value === color && (
                <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-black/70" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
