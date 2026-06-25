"use client";

import { useCallback } from "react";
import { Figma, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useFigmaExport } from "@/hooks/use-figma-export";

interface CopyToFigmaButtonProps {
  sandboxId?: string;
  /** Disabled until the sandbox preview is ready to serialize. */
  disabled?: boolean;
}

/**
 * Serializes the live preview into Figma's clipboard format and copies it, so
 * the user can paste (⌘V) editable layers straight onto the Figma canvas — no
 * plugin. Prefetches on hover so the click writes instantly inside the gesture.
 */
export function CopyToFigmaButton({
  sandboxId,
  disabled,
}: CopyToFigmaButtonProps) {
  const { state, prepare, copy } = useFigmaExport(sandboxId);

  const handleClick = useCallback(async () => {
    try {
      const degraded = await copy();
      toast.success(
        degraded
          ? "Copied — paste into Figma (a few parts were simplified)"
          : "Copied — paste into Figma (⌘V)"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't copy to Figma"
      );
    }
  }, [copy]);

  const busy = state === "preparing" || state === "copying";
  const copied = state === "copied";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            disabled
              ? "text-muted-foreground/40 cursor-not-allowed"
              : "text-foreground hover:bg-accent hover:text-accent-foreground"
          )}
          onClick={handleClick}
          onPointerEnter={() => {
            if (!disabled) void prepare();
          }}
          disabled={disabled || busy}
          aria-label="Copy to Figma"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : copied ? (
            <Check className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Figma className="w-3.5 h-3.5" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {disabled ? "Generate this screen first" : "Copy to Figma"}
      </TooltipContent>
    </Tooltip>
  );
}
