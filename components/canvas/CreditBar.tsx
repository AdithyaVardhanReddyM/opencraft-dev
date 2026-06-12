"use client";

import { cn } from "@/lib/utils";

/**
 * Credit cost per generation by model provider
 */
export const MODEL_CREDITS: Record<string, number> = {
  "x-ai/grok-code-fast-1": 1,
  "openai/gpt-5.1": 2,
  "anthropic/claude-sonnet-4.5": 3,
};

/**
 * Get credit cost for a model, defaults to 1 if not found
 */
export function getModelCreditCost(modelId: string): number {
  return MODEL_CREDITS[modelId] ?? 1;
}

interface CreditBarProps {
  credits: number;
  selectedModelId: string;
  className?: string;
}

/**
 * Credit bar showing remaining credits and cost per generation.
 * Appears at the top of the input area with a gradient background.
 */
export function CreditBar({
  credits,
  selectedModelId,
  className,
}: CreditBarProps) {
  const creditCost = getModelCreditCost(selectedModelId);

  return (
    <div
      className={cn(
        "flex items-center px-3 py-2",
        "bg-linear-to-r from-primary/15 via-primary/10 to-primary/5",
        "border-b border-primary/20",
        className
      )}
    >
      <div className="flex items-center gap-2 text-[12px]">
        {/* <Sparkles className="h-4 w-4 text-primary" /> */}
        <span className="font-medium text-primary">{credits} credits</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">
          {creditCost} credit{creditCost !== 1 ? "s" : ""}/generation
        </span>
      </div>
    </div>
  );
}
