"use client";

import { Pencil } from "lucide-react";
import type { FrameShape, Shape, ViewportState } from "@/types/canvas";

interface GenerateButtonProps {
  frame: FrameShape;
  containedShapes: Shape[];
  viewport: ViewportState;
  onGenerate: (frame: FrameShape, containedShapes: Shape[]) => void;
}

/**
 * Generate button that appears above frames containing shapes.
 * Triggers the frame-to-AI generation workflow.
 */
export function GenerateButton({
  frame,
  containedShapes,
  viewport,
  onGenerate,
}: GenerateButtonProps) {
  // Calculate frame's top-right corner in screen coordinates
  const frameRightScreenX =
    (frame.x + frame.w) * viewport.scale + viewport.translate.x;
  const frameTopScreenY = frame.y * viewport.scale + viewport.translate.y;

  // Position button above the frame with fixed offset (not scaled)
  const buttonScreenX = frameRightScreenX;
  const buttonScreenY = frameTopScreenY - 44; // 44px above frame top

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onGenerate(frame, containedShapes);
  };

  return (
    <div
      className="fixed z-50 pointer-events-auto"
      style={{
        left: buttonScreenX,
        top: buttonScreenY,
        transform: "translateX(-100%)", // Align right edge with frame right edge
      }}
    >
      <button
        onClick={handleClick}
        className="flex items-center gap-2 h-9 px-4 rounded-full bg-background hover:bg-muted border border-border text-muted-foreground hover:text-foreground shadow-lg backdrop-blur-sm transition-all duration-200"
      >
        <Pencil className="h-4 w-4" />
        <span className="text-sm font-medium">Generate Design</span>
      </button>
    </div>
  );
}
