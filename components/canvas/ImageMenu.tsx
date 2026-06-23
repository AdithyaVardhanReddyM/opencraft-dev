"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MoreVertical, Pencil, Trash2, ImageIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TOOLBAR_GAP } from "@/lib/canvas/toolbar-utils";
import type { ImageShape, ViewportState } from "@/types/canvas";

interface ImageMenuProps {
  shape: ImageShape;
  viewport: ViewportState;
  onRename: (name: string) => void;
  onDelete: () => void;
}

/**
 * Floating "image N" label + ⋮ menu (Rename / Delete) shown above a selected
 * image. Positioning mirrors ScreenToolbar so it stays a constant on-screen size
 * regardless of zoom.
 */
export function ImageMenu({
  shape,
  viewport,
  onRename,
  onDelete,
}: ImageMenuProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(shape.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      // Win focus back from the closing dropdown.
      const id = window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [isEditing]);

  const commit = useCallback(() => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== shape.name) onRename(trimmed);
    else setDraftName(shape.name);
    setIsEditing(false);
  }, [draftName, shape.name, onRename]);

  const inverseScale = 1 / viewport.scale;
  const toolbarX = shape.x + shape.w / 2;
  const toolbarY = shape.y - TOOLBAR_GAP / viewport.scale;

  return (
    <div
      className="absolute flex items-center gap-1 rounded-lg bg-card/95 px-1.5 py-1 backdrop-blur-2xl saturate-150"
      style={{
        left: toolbarX,
        top: toolbarY,
        transform: `translate(-50%, -100%) scale(${inverseScale})`,
        transformOrigin: "center bottom",
        boxShadow:
          "0 4px 24px -4px oklch(0 0 0 / 0.5), 0 8px 16px -8px oklch(0 0 0 / 0.3)",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ImageIcon className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {isEditing ? (
        <input
          ref={inputRef}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setDraftName(shape.name);
              setIsEditing(false);
            }
          }}
          className="h-7 w-36 rounded-md border-none bg-accent px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
        />
      ) : (
        <span className="max-w-[180px] truncate px-1 text-sm text-foreground">
          {shape.name}
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Image options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" className="w-36">
          <DropdownMenuItem
            onSelect={() => {
              setDraftName(shape.name);
              setIsEditing(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onDelete()}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
