"use client";

import { Check, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { THEMES } from "@/lib/canvas/theme-utils";

function Swatches({ colors }: { colors: [string, string, string] }) {
  return (
    <div className="flex gap-1">
      {colors.map((c, i) => (
        <span
          key={i}
          className="size-3.5 rounded-full border border-foreground/10"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

interface DesignSystemRailProps {
  selectedId: string;
  isCreate: boolean;
  onSelect: (id: string) => void;
  onSelectCreate: () => void;
}

export function DesignSystemRail({
  selectedId,
  isCreate,
  onSelect,
  onSelectCreate,
}: DesignSystemRailProps) {
  return (
    <div className="flex w-60 shrink-0 flex-col border-r">
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-2">
          {THEMES.map((t) => {
            const active = !isCreate && selectedId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <Swatches colors={t.colors} />
                <span className="flex-1 truncate font-medium">{t.name}</span>
                {active && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </ScrollArea>
      <div className="border-t p-2">
        <button
          onClick={onSelectCreate}
          className={cn(
            "flex w-full items-center gap-2 rounded-md border border-dashed px-2.5 py-2 text-left text-sm transition-colors",
            isCreate
              ? "border-primary/50 bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          <Plus className="size-4 shrink-0" />
          <span className="flex-1 truncate font-medium">
            Create new design system
          </span>
        </button>
      </div>
    </div>
  );
}
