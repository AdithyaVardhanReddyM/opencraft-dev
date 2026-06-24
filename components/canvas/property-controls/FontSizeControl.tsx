"use client";

import type { FontSizePreset } from "@/lib/canvas/properties-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FontSizeControlProps {
  value: FontSizePreset | "mixed";
  onChange: (value: FontSizePreset) => void;
}

const SIZE_OPTIONS: {
  id: FontSizePreset;
  label: string;
  glyph: string;
  glyphSize: string;
}[] = [
  { id: "s", label: "Small", glyph: "A", glyphSize: "text-[10px]" },
  { id: "m", label: "Medium", glyph: "A", glyphSize: "text-[13px]" },
  { id: "l", label: "Large", glyph: "A", glyphSize: "text-[16px]" },
];

export function FontSizeControl({ value, onChange }: FontSizeControlProps) {
  return (
    <div className="flex items-center gap-0.5 bg-background/50 rounded-md p-0.5">
      {SIZE_OPTIONS.map((option) => (
        <Tooltip key={option.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onChange(option.id)}
              className={`flex h-7 w-7 items-center justify-center rounded font-semibold leading-none transition-colors ${
                option.glyphSize
              } ${
                value === option.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              aria-label={`Font size: ${option.label}`}
              aria-pressed={value === option.id}
            >
              {option.glyph}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8}>
            {option.label}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
