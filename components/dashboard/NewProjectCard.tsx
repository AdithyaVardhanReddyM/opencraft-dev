"use client";

import {
  Plus,
  Square,
  Circle,
  Pencil,
  Type,
  Frame,
  ArrowRight,
  Minus,
  MousePointer2,
  Hand,
  Monitor,
} from "lucide-react";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";

interface NewProjectCardProps {
  onClick: () => void;
}

export function NewProjectCard({ onClick }: NewProjectCardProps) {
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-xl border-2 border-dashed border-border cursor-pointer transition-all duration-300 hover:border-primary hover:shadow-xl hover:shadow-primary/10 group"
      onClick={onClick}
    >
      {/* Orbiting circles area */}
      <div className="relative aspect-16/10 overflow-hidden bg-muted/30 flex items-center justify-center">
        {/* Outer orbit - 5 icons */}
        <OrbitingCircles iconSize={22} radius={95} duration={35} path>
          <Square className="size-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
          <Circle className="size-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
          <Pencil className="size-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
          <Type className="size-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
        </OrbitingCircles>

        {/* Inner orbit - 4 icons, reverse */}
        <OrbitingCircles iconSize={22} radius={50} duration={25} reverse path>
          <Monitor className="size-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
          <MousePointer2 className="size-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
          <Hand className="size-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
          <Frame className="size-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
        </OrbitingCircles>

        {/* Center Plus icon */}
        <div className="absolute rounded-full bg-muted group-hover:bg-primary/15 p-3.5 transition-all duration-300 group-hover:scale-110 z-10">
          <Plus className="size-7 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3">
        <h3 className="font-semibold text-base leading-tight text-foreground group-hover:text-primary transition-colors duration-200 mb-2">
          New Project
        </h3>
        <p className="text-xs text-muted-foreground">Create a new canvas</p>
      </div>
    </div>
  );
}
