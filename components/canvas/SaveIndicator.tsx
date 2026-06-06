"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, Check, Loader2, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SaveStatus } from "@/lib/canvas/autosave-utils";
import { formatRelativeTime } from "@/lib/canvas/autosave-utils";

interface SaveIndicatorProps {
  status: SaveStatus;
  lastSavedAt: number | null;
}

export function SaveIndicator({ status, lastSavedAt }: SaveIndicatorProps) {
  const [relativeTime, setRelativeTime] = useState<string>("");

  // Update relative time every 10 seconds
  useEffect(() => {
    if (!lastSavedAt) return;

    const updateTime = () => {
      setRelativeTime(formatRelativeTime(lastSavedAt));
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);

    return () => clearInterval(interval);
  }, [lastSavedAt]);

  const getStatusConfig = () => {
    switch (status) {
      case "saved":
        return {
          icon: <Check className="h-3.5 w-3.5" />,
          tooltip: `Saved ${relativeTime || "just now"}`,
          color: "text-emerald-400/70",
          hoverColor: "hover:text-emerald-400",
        };
      case "saving":
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          tooltip: "Saving changes...",
          color: "text-primary/70",
          hoverColor: "hover:text-primary",
        };
      case "offline":
        return {
          icon: <CloudOff className="h-3.5 w-3.5" />,
          tooltip: "Offline - changes saved locally",
          color: "text-amber-400/70",
          hoverColor: "hover:text-amber-400",
        };
      case "error":
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          tooltip: "Sync error - changes saved locally",
          color: "text-red-400/70",
          hoverColor: "hover:text-red-400",
        };
      default:
        return {
          icon: <Cloud className="h-3.5 w-3.5" />,
          tooltip: "Unknown status",
          color: "text-muted-foreground/50",
          hoverColor: "hover:text-muted-foreground",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`
            p-1.5 rounded-md cursor-default
            ${config.color} ${config.hoverColor}
            transition-colors duration-200
          `}
        >
          {config.icon}
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={8}>
        {config.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
