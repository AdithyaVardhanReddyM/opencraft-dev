"use client";

import {
  Layers,
  Plus,
  Square,
  Circle,
  Triangle,
  Pencil,
  Type,
  Frame,
  Monitor,
  MousePointer2,
  Hand,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateProject: () => void;
}

// Decorative scatter of design-tool icons for the background
const DECOR_ICONS = [
  { Icon: Square, top: "14%", left: "9%", size: 30, rotate: -12 },
  { Icon: Circle, top: "26%", left: "84%", size: 24, rotate: 0 },
  { Icon: Pencil, top: "68%", left: "8%", size: 28, rotate: 16 },
  { Icon: Type, top: "76%", left: "85%", size: 32, rotate: -8 },
  { Icon: Frame, top: "10%", left: "70%", size: 26, rotate: 6 },
  { Icon: Monitor, top: "84%", left: "42%", size: 28, rotate: -6 },
  { Icon: MousePointer2, top: "44%", left: "4%", size: 24, rotate: 0 },
  { Icon: Hand, top: "52%", left: "92%", size: 28, rotate: -14 },
  { Icon: ArrowRight, top: "28%", left: "16%", size: 26, rotate: 18 },
  { Icon: Triangle, top: "62%", left: "72%", size: 24, rotate: -18 },
  { Icon: Monitor, top: "36%", left: "74%", size: 28, rotate: -6 },
  { Icon: Circle, top: "86%", left: "20%", size: 18, rotate: 0 },
] as const;

export function EmptyState({ onCreateProject }: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-white to-[#75D8FC]/[0.06]">
      {/* Decorative icon scatter (faded toward the center) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          maskImage:
            "radial-gradient(circle at center, transparent 26%, black 70%)",
          WebkitMaskImage:
            "radial-gradient(circle at center, transparent 26%, black 70%)",
        }}
      >
        {DECOR_ICONS.map((d, i) => (
          <d.Icon
            key={i}
            size={d.size}
            className="absolute text-primary"
            style={{
              top: d.top,
              left: d.left,
              transform: `rotate(${d.rotate}deg)`,
            }}
          />
        ))}
      </div>

      {/* Center glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center px-6 py-24 text-center">
        <Layers className="mb-6 size-16 text-primary drop-shadow-[0_8px_20px_rgba(0,114,229,0.25)]" />

        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Start your first project
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          It&apos;s quiet here. Spin up a canvas to start designing — every
          project you create will live in this space.
        </p>

        <Button
          onClick={onCreateProject}
          size="lg"
          className="mt-6 gap-2 shadow-sm shadow-primary/20 transition-transform hover:-translate-y-0.5"
        >
          <Plus className="size-5" />
          Create First Project
        </Button>
      </div>
    </div>
  );
}
