"use client";

import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Pencil,
  Type,
  Eraser,
  ArrowRight,
  Minus,
  Frame,
  Component,
} from "lucide-react";
import type { Tool } from "@/types/canvas";
import type { LucideIcon } from "lucide-react";

interface ToolbarProps {
  currentTool: Tool;
  onToolSelect: (tool: Tool) => void;
  /**
   * When the AI sidebar is open (a screen is selected) the toolbar slides to the
   * right so it sits just beside the sidebar instead of being covered by it.
   */
  sidebarOpen?: boolean;
}

interface ToolConfig {
  id: Tool;
  icon: LucideIcon;
  label: string;
  shortcut: string;
  special?: boolean;
}

const TOOLS: ToolConfig[] = [
  { id: "select", icon: MousePointer2, label: "Select", shortcut: "S" },
  { id: "hand", icon: Hand, label: "Hand", shortcut: "H" },
  { id: "frame", icon: Frame, label: "Frame", shortcut: "F" },
  { id: "rect", icon: Square, label: "Rectangle", shortcut: "R" },
  { id: "ellipse", icon: Circle, label: "Ellipse", shortcut: "C" },
  { id: "line", icon: Minus, label: "Line", shortcut: "L" },
  { id: "arrow", icon: ArrowRight, label: "Arrow", shortcut: "A" },
  { id: "freedraw", icon: Pencil, label: "Draw", shortcut: "D" },
  { id: "text", icon: Type, label: "Text", shortcut: "T" },
  { id: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
];

const SCREEN_TOOL: ToolConfig = {
  id: "screen",
  icon: Component,
  label: "Component",
  shortcut: "W",
  special: true,
};

export function Toolbar({
  currentTool,
  onToolSelect,
  sidebarOpen = false,
}: ToolbarProps) {
  const isScreenActive = currentTool === "screen";

  // The AI sidebar is a full-height panel flush to the left edge, 340px wide;
  // slide the toolbar past its right edge (+ a small gap) when it's open,
  // otherwise hug the left.
  const leftOffset = sidebarOpen ? 352 : 12;

  return (
    <div
      className="pointer-events-auto fixed top-1/2 z-50 -translate-y-1/2 flex flex-col items-center transition-[left] duration-300 ease-out"
      style={{ left: leftOffset }}
    >
      {/* Floating vertical toolbar pill */}
      <div
        className="relative flex flex-col items-center gap-1 rounded-xl bg-card px-2 py-2.5 backdrop-blur-2xl saturate-150"
        style={{
          // Even glow on all four sides (zero x/y offset) + a soft ambient depth.
          boxShadow:
            "0 0 28px -2px oklch(0.5665 0.1947 256.1696 / 0.30), 0 0 14px -2px oklch(0 0 0 / 0.30)",
        }}
      >
        {/* Regular tools */}
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => onToolSelect(tool.id)}
              aria-label={tool.label}
              aria-pressed={isActive}
              title={`${tool.label} (${tool.shortcut})`}
              className={`relative flex h-9 w-9 items-center justify-center rounded-md transition-colors outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:ring-0 ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span
                className={`pointer-events-none absolute bottom-0.5 right-0.5 text-[10px] font-semibold ${
                  isActive ? "text-primary-foreground/80" : "text-foreground/70"
                }`}
              >
                {tool.shortcut}
              </span>
            </button>
          );
        })}

        {/* Divider (horizontal in the vertical stack) */}
        <div className="my-1 h-px w-6 bg-border/50" />

        {/* AI Screen button - special styling, square to match the column */}
        <button
          onClick={() => onToolSelect(SCREEN_TOOL.id)}
          aria-label={SCREEN_TOOL.label}
          aria-pressed={isScreenActive}
          title={`${SCREEN_TOOL.label} (${SCREEN_TOOL.shortcut})`}
          className={`group relative flex h-9 w-9 items-center justify-center rounded-md transition-all duration-300 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:ring-0 ${
            isScreenActive
              ? "bg-linear-to-br from-primary to-[#75D8FC] text-white shadow-lg shadow-primary/30"
              : "bg-linear-to-br from-primary/15 to-[#75D8FC]/15 text-primary hover:from-primary/25 hover:to-[#75D8FC]/25 hover:shadow-md hover:shadow-primary/20"
          }`}
        >
          {/* Animated glow ring when not active */}
          {!isScreenActive && (
            <span className="absolute inset-0 rounded-md bg-linear-to-br from-primary/40 to-[#75D8FC]/40 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
          )}

          {/* Component icon with animation */}
          <Component
            className={`relative h-4 w-4 transition-transform duration-300 ${
              isScreenActive ? "text-white" : "text-primary"
            } ${!isScreenActive ? "group-hover:scale-110" : ""}`}
          />

          {/* Shortcut badge */}
          <span
            className={`pointer-events-none absolute bottom-0.5 right-0.5 text-[10px] font-semibold ${
              isScreenActive ? "text-white/80" : "text-primary/80"
            }`}
          >
            {SCREEN_TOOL.shortcut}
          </span>

          {/* Subtle shimmer effect on hover */}
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
            <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </span>
        </button>
      </div>
    </div>
  );
}
