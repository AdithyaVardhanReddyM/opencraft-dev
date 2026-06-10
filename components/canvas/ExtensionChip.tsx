"use client";

import { X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CapturedElement } from "@/lib/extension-content";

interface ExtensionChipProps {
  content: CapturedElement;
  onRemove: () => void;
  className?: string;
}

/**
 * ExtensionChip - Displays captured element content in a professional chip format
 * Shows in the chat input when extension content is pasted
 */
export function ExtensionChip({
  content,
  onRemove,
  className,
}: ExtensionChipProps) {
  const { metadata } = content.data;

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-primary/10 border border-primary/30",
        "transition-all duration-150",
        "hover:bg-primary/15 hover:border-primary/40",
        className
      )}
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/20">
        <ExternalLink className="w-3.5 h-3.5 text-primary" />
      </div>

      {/* Content */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-medium text-primary truncate">
          Copied from Extension
        </span>
        <span className="text-[10px] text-muted-foreground truncate">
          {metadata.tagName} • {metadata.dimensions.width}×
          {metadata.dimensions.height}px
        </span>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded-md",
          "text-muted-foreground hover:text-foreground",
          "hover:bg-primary/20 transition-colors duration-150",
          "opacity-0 group-hover:opacity-100"
        )}
        aria-label="Remove captured element"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
