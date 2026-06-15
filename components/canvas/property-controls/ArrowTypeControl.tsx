"use client";

import { MoveUpRight, CornerDownRight } from "lucide-react";
import type { ArrowType } from "@/lib/canvas/properties-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ArrowTypeControlProps {
  value: ArrowType | "mixed";
  onChange: (value: ArrowType) => void;
}

export function ArrowTypeControl({ value, onChange }: ArrowTypeControlProps) {
  return (
    <div className="flex items-center gap-0.5 bg-background/50 rounded-md p-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onChange("straight")}
            className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
              value === "straight"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            aria-label="Straight arrow"
            aria-pressed={value === "straight"}
          >
            <MoveUpRight className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          Straight
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onChange("elbow")}
            className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
              value === "elbow"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            aria-label="Elbow arrow"
            aria-pressed={value === "elbow"}
          >
            <CornerDownRight className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          Elbow
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
