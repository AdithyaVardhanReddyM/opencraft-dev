"use client";

import { useState } from "react";
import { SwatchBook, X, Search, Sun, Moon, Check } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { THEMES, getThemeById, type ThemeMode } from "@/lib/canvas/theme-utils";

export interface DesignSystemValue {
  id: string;
  mode: ThemeMode;
}

function SwatchCircle({ colors }: { colors: [string, string, string] }) {
  return (
    <span className="flex size-3.5 shrink-0 overflow-hidden rounded-full border border-foreground/15">
      <span className="flex-1" style={{ backgroundColor: colors[0] }} />
      <span className="flex-1" style={{ backgroundColor: colors[1] }} />
    </span>
  );
}

function SwatchPill({ colors }: { colors: [string, string, string] }) {
  return (
    <span className="flex h-5 w-9 shrink-0 overflow-hidden rounded-md border border-foreground/10">
      {colors.map((c, i) => (
        <span key={i} className="flex-1" style={{ backgroundColor: c }} />
      ))}
    </span>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ThemeMode;
  onChange: (m: ThemeMode) => void;
}) {
  return (
    <div className="inline-flex shrink-0 items-center rounded-md border bg-muted/40 p-0.5">
      {(["light", "dark"] as const).map((m) => {
        const Icon = m === "light" ? Sun : Moon;
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            aria-label={`${m} mode`}
            aria-pressed={active}
            className={cn(
              "flex size-7 items-center justify-center rounded-[5px] transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

interface DesignSystemPickerProps {
  value: DesignSystemValue | null;
  onChange: (value: DesignSystemValue | null) => void;
  disabled?: boolean;
}

/**
 * Composer control for choosing a design system before the sandbox exists.
 * Renders an icon button when empty and a removable pill once selected; the
 * popup lets you search presets and pick a light/dark mode. It only sets local
 * state — the choice is sent with the next prompt.
 */
export function DesignSystemPicker({
  value,
  onChange,
  disabled,
}: DesignSystemPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Uncommitted mode used before a system is picked; once one is selected its
  // own mode is the source of truth (so no syncing effect is needed).
  const [draftMode, setDraftMode] = useState<ThemeMode>(value?.mode ?? "light");
  const mode = value?.mode ?? draftMode;

  const selected = value ? getThemeById(value.id) : null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? THEMES.filter((t) => t.name.toLowerCase().includes(q))
    : THEMES;

  const handleModeChange = (next: ThemeMode) => {
    setDraftMode(next);
    if (value) onChange({ id: value.id, mode: next });
  };

  const handleSelect = (id: string) => {
    onChange({ id, mode });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {selected ? (
        <div
          className={cn(
            "inline-flex h-8 items-center rounded-full border bg-background text-xs font-medium",
            disabled && "opacity-50"
          )}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="inline-flex items-center gap-1.5 py-1 pl-2 pr-1.5 outline-none"
            >
              <SwatchCircle colors={selected.colors} />
              <span className="max-w-[120px] truncate">{selected.name}</span>
            </button>
          </PopoverTrigger>
          <span className="h-4 w-px bg-border" />
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            aria-label="Remove design system"
            className="flex h-full items-center rounded-r-full px-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-label="Design system"
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors",
                  disabled
                    ? "cursor-not-allowed text-muted-foreground/40"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <SwatchBook className="size-4" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Design system</TooltipContent>
        </Tooltip>
      )}

      <PopoverContent className="w-80 p-0" align="start" side="top" sideOffset={8}>
        {/* Search + light/dark toggle */}
        <div className="flex items-center gap-2 border-b p-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search design systems"
              className="h-9 w-full rounded-md border bg-transparent pl-8 pr-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>
          <ModeToggle mode={mode} onChange={handleModeChange} />
        </div>

        {/* Presets header */}
        <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <SwatchBook className="size-3.5" />
            Presets
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {filtered.length}
          </span>
        </div>

        {/* Theme list */}
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No design systems found
            </div>
          ) : (
            filtered.map((theme) => {
              const isActive = value?.id === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelect(theme.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span className="flex-1 truncate text-sm font-medium">
                    {theme.name}
                  </span>
                  {isActive && <Check className="size-4 shrink-0 text-primary" />}
                  <SwatchPill colors={theme.colors} />
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
