"use client";

import { useState, useMemo, useRef } from "react";
import { PanelRight, Search, X, Layers, MousePointer2 } from "lucide-react";
import type { Shape, SelectionMap } from "@/types/canvas";
import { getShapeIcon, getShapeName } from "@/lib/canvas/layers-sidebar-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface LayersSidebarProps {
  shapes: Shape[];
  selectedShapes: SelectionMap;
  onShapeClick: (shapeId: string) => void;
  isOpen: boolean;
}

interface ShapeItemProps {
  shape: Shape;
  isSelected: boolean;
  onClick: () => void;
}

function ShapeItem({ shape, isSelected, onClick }: ShapeItemProps) {
  const Icon = getShapeIcon(shape.type);
  const name = getShapeName(shape);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
        isSelected
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isSelected
            ? "text-primary"
            : "text-muted-foreground/70 group-hover:text-foreground"
        )}
      />
      <span className="truncate flex-1 text-left">{name}</span>
      {isSelected && (
        <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 shadow-[0_0_4px_rgba(0,0,0,0.2)]" />
      )}
    </button>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full border-2 border-dashed border-primary/20 rounded-lg p-6 flex flex-col items-center justify-center">
        <div className="h-12 w-12 flex items-center justify-center ">
          <Layers
            className="h-6 w-6 text-primary"
            style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary) / 0.6))" }}
          />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          {hasSearch ? "No results" : "No layers"}
        </p>
        <p className="text-[10px] text-muted-foreground max-w-[140px]">
          {hasSearch ? "Try a different term" : "Add shapes to canvas"}
        </p>
      </div>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative group">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 group-focus-within:text-primary/70 transition-colors pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filter layers..."
        className="w-full h-8 pl-8 pr-8 text-xs bg-muted/30 hover:bg-muted/50 focus:bg-background border border-transparent focus:border-primary/20 rounded-md placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function LayersSidebarToggle({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const isHoveringRef = useRef(false);

  return (
    <Tooltip
      delayDuration={300}
      open={tooltipOpen}
      onOpenChange={(open) => {
        if (open && !isHoveringRef.current) return;
        setTooltipOpen(open);
      }}
    >
      <TooltipTrigger asChild>
        <button
          onClick={onToggle}
          onMouseEnter={() => {
            isHoveringRef.current = true;
          }}
          onMouseLeave={() => {
            isHoveringRef.current = false;
            setTooltipOpen(false);
          }}
          aria-label={isOpen ? "Close layers panel" : "Open layers panel"}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
            isOpen
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background/80 backdrop-blur-sm border-border/50 hover:bg-accent hover:text-accent-foreground shadow-sm"
          )}
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4} className="text-xs">
        {isOpen ? "Close layers" : "Open layers"}
      </TooltipContent>
    </Tooltip>
  );
}

export function LayersSidebar({
  shapes,
  selectedShapes,
  onShapeClick,
  isOpen,
}: LayersSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredShapes = useMemo(() => {
    if (!searchQuery.trim()) return shapes;
    const query = searchQuery.toLowerCase();
    return shapes.filter((shape) => {
      const name = getShapeName(shape).toLowerCase();
      const type = shape.type.toLowerCase();
      return name.includes(query) || type.includes(query);
    });
  }, [shapes, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="pointer-events-auto fixed right-3 z-40 flex flex-col"
      style={{
        top: "60px",
        bottom: "72px",
        width: "285px",
      }}
    >
      <div className="flex flex-col h-full rounded-xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-3 p-3 border-b border-border/40 bg-muted/5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Layers
              </h3>
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                {shapes.length}
              </span>
            </div>
          </div>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery("")}
          />
        </div>

        {/* Content */}
        {filteredShapes.length === 0 ? (
          <EmptyState hasSearch={searchQuery.length > 0} />
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {filteredShapes.map((shape) => (
                <ShapeItem
                  key={shape.id}
                  shape={shape}
                  isSelected={!!selectedShapes[shape.id]}
                  onClick={() => onShapeClick(shape.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {shapes.length > 0 && (
          <div className="px-3 py-2 border-t border-border/40 bg-muted/5">
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
              <MousePointer2 className="h-3 w-3" />
              <span>Select to focus</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
