import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Placeholder shown when the "Create new" rail entry is selected. The create
 * flow isn't built yet — this reads as a roadmap teaser, not a broken feature.
 */
export function CreateDesignSystemPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <Sparkles className="size-7 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">Create your own design system</h2>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          Soon you&apos;ll be able to fork a preset and fine-tune its colors,
          typography, radius, and shadows — then apply it across your screens.
        </p>
      </div>
      <Button disabled>Coming soon</Button>
    </div>
  );
}
