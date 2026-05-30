"use client";

import { Undo2, Redo2 } from "lucide-react";

interface HistoryPillProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function HistoryPill({
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: HistoryPillProps) {
  return (
    <div className="pointer-events-auto fixed bottom-4 left-[180px] z-50">
      <div className="flex items-center gap-0.5 rounded-full border border-border bg-card/95 p-1 shadow-lg backdrop-blur-sm">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          aria-disabled={!canUndo}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-accent enabled:hover:text-accent-foreground"
        >
          <Undo2 className="h-4 w-4" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          aria-disabled={!canRedo}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-accent enabled:hover:text-accent-foreground"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
