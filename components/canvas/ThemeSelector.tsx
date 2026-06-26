"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Palette,
  Check,
  Loader2,
  ChevronDown,
  Sun,
  Moon,
  Search,
} from "lucide-react";
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
import {
  THEMES,
  parseScreenTheme,
  type ThemeMode,
} from "@/lib/canvas/theme-utils";
import { useDesignSystems } from "@/lib/api/hooks";

function SwatchPill({ colors }: { colors: [string, string, string] }) {
  return (
    <span className="flex h-5 w-9 shrink-0 overflow-hidden rounded-md border border-foreground/10">
      {colors.map((color, index) => (
        <span key={index} className="flex-1" style={{ backgroundColor: color }} />
      ))}
    </span>
  );
}

function ModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  disabled?: boolean;
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
            disabled={disabled}
            aria-label={`${m} mode`}
            aria-pressed={active}
            className={cn(
              "flex size-7 items-center justify-center rounded-[5px] transition-colors disabled:opacity-50",
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

interface ThemeSelectorProps {
  /** Encoded screen theme value, e.g. "claude" or "claude:dark". */
  currentTheme: string;
  onThemeChange: (themeId: string, mode: ThemeMode) => Promise<void>;
  disabled?: boolean;
}

export function ThemeSelector({
  currentTheme,
  onThemeChange,
  disabled = false,
}: ThemeSelectorProps) {
  const { id: currentId, mode: currentMode } = parseScreenTheme(currentTheme);
  const { data: custom } = useDesignSystems();

  const [isOpen, setIsOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyingThemeId, setApplyingThemeId] = useState<string | null>(null);
  const [mode, setMode] = useState<ThemeMode>(currentMode);
  const [query, setQuery] = useState("");

  // Keep the toggle in sync if the persisted mode changes externally.
  useEffect(() => {
    setMode(currentMode);
  }, [currentMode]);

  const apply = useCallback(
    async (themeId: string, nextMode: ThemeMode) => {
      setIsApplying(true);
      setApplyingThemeId(themeId);
      try {
        await onThemeChange(themeId, nextMode);
        return true;
      } catch (error) {
        console.error("Failed to apply theme:", error);
        return false;
      } finally {
        setIsApplying(false);
        setApplyingThemeId(null);
      }
    },
    [onThemeChange]
  );

  const handleThemeSelect = useCallback(
    async (themeId: string) => {
      if (isApplying) return;
      if (themeId === currentId && mode === currentMode) return;
      const ok = await apply(themeId, mode);
      if (ok) setIsOpen(false);
    },
    [apply, isApplying, currentId, currentMode, mode]
  );

  const handleModeChange = useCallback(
    async (nextMode: ThemeMode) => {
      if (isApplying || nextMode === mode) return;
      const prev = mode;
      setMode(nextMode); // optimistic
      const ok = await apply(currentId, nextMode);
      if (!ok) setMode(prev); // revert on failure
    },
    [apply, isApplying, mode, currentId]
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? THEMES.filter((t) => t.name.toLowerCase().includes(q))
    : THEMES;
  const filteredCustom = (custom ?? []).filter(
    (d) => !q || d.name.toLowerCase().includes(q)
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex h-8 items-center gap-1 rounded-md px-2 transition-colors",
                disabled
                  ? "cursor-not-allowed text-muted-foreground/40"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              disabled={disabled}
              aria-label="Change theme"
            >
              {isApplying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Palette className="size-4" />
              )}
              <ChevronDown className="size-3 opacity-60" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {disabled ? "Sandbox not ready" : "Change theme"}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 p-0" align="start" sideOffset={8}>
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
          <ModeToggle
            mode={mode}
            onChange={handleModeChange}
            disabled={isApplying}
          />
        </div>

        {/* Presets header */}
        <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Palette className="size-3.5" />
            Presets
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {filtered.length}
          </span>
        </div>

        {/* Theme list */}
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 && filteredCustom.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No design systems found
            </div>
          ) : (
            <>
              {filtered.map((theme) => {
                const isActive = currentId === theme.id;
                const isThisApplying = applyingThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                      isApplying && !isThisApplying && "opacity-50"
                    )}
                    onClick={() => handleThemeSelect(theme.id)}
                    disabled={isApplying}
                  >
                    <span className="flex-1 truncate text-sm font-medium">
                      {theme.name}
                    </span>
                    {isThisApplying ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : isActive ? (
                      <Check className="size-4 shrink-0 text-primary" />
                    ) : null}
                    <SwatchPill colors={theme.colors} />
                  </button>
                );
              })}

              {filteredCustom.length > 0 && (
                <>
                  <div className="px-2.5 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                    Your design systems
                  </div>
                  {filteredCustom.map((d) => {
                    const isActive = currentId === d._id;
                    const isThisApplying = applyingThemeId === d._id;
                    return (
                      <button
                        key={d._id}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground",
                          isApplying && !isThisApplying && "opacity-50"
                        )}
                        onClick={() => handleThemeSelect(d._id)}
                        disabled={isApplying}
                      >
                        <span className="flex-1 truncate text-sm font-medium">
                          {d.name}
                        </span>
                        {isThisApplying ? (
                          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                        ) : isActive ? (
                          <Check className="size-4 shrink-0 text-primary" />
                        ) : null}
                        <SwatchPill colors={d.previewColors} />
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
