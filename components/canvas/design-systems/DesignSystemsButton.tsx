"use client";

import { useState } from "react";
import { SwatchBook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DesignSystemsModal } from "@/components/canvas/design-systems/DesignSystemsModal";

/**
 * Trigger that sits beside the logo on the canvas and opens the design-systems
 * gallery modal. Self-contained — owns its own open state.
 */
export function DesignSystemsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Design systems"
        onClick={() => setOpen(true)}
        className="h-10 gap-1.5 px-2 text-muted-foreground transition-colors duration-200 hover:bg-transparent hover:text-foreground"
      >
        <SwatchBook className="size-4" />
        <span className="text-sm font-medium">Design systems</span>
      </Button>
      <DesignSystemsModal open={open} onOpenChange={setOpen} />
    </>
  );
}
