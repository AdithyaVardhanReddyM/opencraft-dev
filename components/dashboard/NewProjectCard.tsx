"use client";

import {
  Plus,
  Square,
  Circle,
  Pencil,
  Type,
  Frame,
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
      className="group relative flex cursor-pointer flex-col rounded-2xl border border-dashed border-border bg-white p-2.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
      onClick={onClick}
    >
      {/* Inner panel — orbiting circles */}
      <div className="relative flex aspect-16/10 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/60 bg-muted/20">
        {/* Outer orbit */}
        <OrbitingCircles iconSize={22} radius={95} duration={35} path>
          <Square className="size-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
          <Circle className="size-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
          <Pencil className="size-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
          <Type className="size-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
        </OrbitingCircles>

        {/* Inner orbit */}
        <OrbitingCircles iconSize={22} radius={50} duration={25} reverse path>
          <Monitor className="size-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
          <MousePointer2 className="size-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
          <Hand className="size-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
          <Frame className="size-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
        </OrbitingCircles>

        {/* Center Plus */}
        <div className="absolute z-10 rounded-full bg-muted p-3.5 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15">
          <Plus className="size-7 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
        </div>
      </div>

      {/* Footer — no separator */}
      <div className="px-1.5 pb-1 pt-3">
        <h3 className="mb-1.5 text-base font-semibold leading-tight text-foreground transition-colors duration-200 group-hover:text-primary">
          New Project
        </h3>
        <p className="text-xs text-muted-foreground">Create a new canvas</p>
      </div>
    </div>
  );
}
