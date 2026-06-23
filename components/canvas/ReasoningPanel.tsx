"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Brain, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Streamdown } from "streamdown";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";
import type { MessageReasoning } from "@/hooks/use-chat-streaming";

export interface ReasoningPanelProps {
  reasoning: MessageReasoning;
  className?: string;
}

/**
 * ReasoningPanel renders the model's live "thinking" stream.
 * While streaming it auto-expands so the user sees activity during the gap
 * before any answer text. Once complete it collapses to a "Thought for Ns"
 * chip that can be re-expanded on click.
 */
function ReasoningPanelComponent({ reasoning, className }: ReasoningPanelProps) {
  const isStreaming = reasoning.status === "streaming";

  // Expansion is derived: it follows the thinking state (expanded while
  // streaming, collapsed when done) until the user takes control, after which
  // their explicit choice wins. Deriving avoids a setState-in-effect.
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const isExpanded = userExpanded !== null ? userExpanded : isStreaming;

  // Measure how long reasoning took. State is only updated from the interval
  // callback (never synchronously in the effect body) and freezes at the last
  // measured value once streaming stops.
  const startRef = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isStreaming) return;
    if (startRef.current === null) startRef.current = Date.now();
    const id = setInterval(() => {
      if (startRef.current !== null) {
        setElapsedMs(Date.now() - startRef.current);
      }
    }, 200);
    return () => clearInterval(id);
  }, [isStreaming]);

  // Keep the streaming reasoning scrolled to the latest tokens.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isExpanded && isStreaming && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [reasoning.content, isExpanded, isStreaming]);

  // Only show a duration we actually measured this session. Persisted reasoning
  // (loaded already-complete, elapsedMs === 0) shows "Thought process" instead of
  // a bogus "Thought for 1s".
  const seconds =
    !isStreaming && elapsedMs > 0 ? Math.max(1, Math.round(elapsedMs / 1000)) : null;
  const headerLabel = isStreaming
    ? "Thinking…"
    : seconds !== null
      ? `Thought for ${seconds}s`
      : "Thought process";

  const handleToggle = () => {
    setUserExpanded(!isExpanded);
  };

  return (
    <div className={cn("mb-1.5 flex flex-col gap-1", className)}>
      <button
        onClick={handleToggle}
        className="group flex items-center gap-1.5 self-start text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
      >
        <Brain className="h-3.5 w-3.5 shrink-0" />
        {isStreaming ? (
          <Shimmer className="text-xs" duration={1.5} spread={3}>
            {headerLabel}
          </Shimmer>
        ) : (
          <span>{headerLabel}</span>
        )}
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 transition-transform",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && reasoning.content && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              ref={bodyRef}
              className="max-h-40 overflow-y-auto border-l-2 border-border/40 pl-2.5 text-xs leading-relaxed text-muted-foreground/70"
            >
              <Streamdown
                className={cn(
                  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                  // Compact, muted markdown sized for the thinking panel.
                  "[&_p]:mb-1.5 [&_p]:leading-relaxed",
                  "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5",
                  "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-0.5",
                  "[&_li]:leading-snug",
                  "[&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_h4]:text-xs",
                  "[&_h1]:mb-1 [&_h2]:mb-1 [&_h3]:mb-1 [&_h4]:mb-1",
                  "[&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold",
                  "[&_strong]:font-semibold [&_strong]:text-muted-foreground",
                  "[&_code]:rounded [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[11px]",
                  "[&_pre]:my-1.5 [&_pre]:rounded-md [&_pre]:bg-muted/60 [&_pre]:p-2 [&_pre]:text-[11px]",
                  "[&_a]:underline [&_a]:underline-offset-2"
                )}
              >
                {reasoning.content}
              </Streamdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const ReasoningPanel = memo(ReasoningPanelComponent);
