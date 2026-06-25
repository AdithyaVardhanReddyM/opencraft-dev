"use client";

import { Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VisualModeToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * Composer control for the agent's "Visual Mode" — a minimal eye + switch. When
 * on, the agent is meant to see each screen as it renders and refine the design
 * visually while it builds. UI-only for now (off by default); not yet wired into
 * a run — the backend hook comes later.
 */
export function VisualModeToggle({
  value,
  onChange,
  disabled,
}: VisualModeToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "group inline-flex h-8 select-none items-center gap-1.5 rounded-md px-1.5",
            disabled && "opacity-50"
          )}
        >
          {/* Eye doubles as a click target so the whole control toggles; the
              Switch below is the actual labelled control for assistive tech. */}
          <Eye
            aria-hidden
            onClick={() => !disabled && onChange(!value)}
            className={cn(
              "size-4 transition-colors",
              disabled ? "cursor-not-allowed" : "cursor-pointer",
              value
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground"
            )}
          />
          <Switch
            checked={value}
            onCheckedChange={onChange}
            disabled={disabled}
            aria-label="Visual mode"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-[230px] px-3 py-2"
      >
        <p className="text-[13px] font-medium">Visual Mode</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/80 [text-wrap:pretty]">
          Lets the agent see the rendered screen and refine the design as it
          builds.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
