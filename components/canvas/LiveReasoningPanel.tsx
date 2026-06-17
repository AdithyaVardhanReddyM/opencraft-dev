"use client";

import { useEffect, useState } from "react";
import { ReasoningPanel } from "@/components/canvas/ReasoningPanel";
import { useReasoningStream } from "@/hooks/use-reasoning-stream";

/**
 * Reveals `target` with a typewriter effect by growing the shown length toward
 * it. `setCount` is only ever called inside the interval callback (never
 * synchronously in the effect body), and the parent remounts this on a new run
 * (via `key`), so no reset logic is needed here.
 */
function useTypewriter(target: string): string {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= target.length) return;
    const id = setInterval(() => {
      setCount((c) => Math.min(target.length, c + 3));
    }, 16);
    return () => clearInterval(id);
  }, [count, target.length]);

  return target.slice(0, count);
}

/** Inner panel: one instance per run (keyed), so the typewriter starts fresh. */
function TypewriterReasoning({
  text,
  active,
}: {
  text: string;
  active: boolean;
}) {
  const shown = useTypewriter(text);
  if (!shown) return null;
  return (
    <ReasoningPanel
      reasoning={{ content: shown, status: active ? "streaming" : "complete" }}
      className="px-1"
    />
  );
}

/**
 * LiveReasoningPanel shows the model's readable reasoning as it streams in over
 * the course of a generation, with a typewriter reveal. It renders nothing until
 * there is reasoning to show, and reuses the existing ReasoningPanel so the
 * "Thinking… / Thought for Ns" UX stays consistent.
 *
 * Mounted persistently (so its isolated subscription doesn't reconnect each run);
 * `active` reflects whether a generation is currently in flight. `runId` from the
 * hook keys the inner panel so each new run restarts the typewriter.
 */
export function LiveReasoningPanel({ active }: { active: boolean }) {
  const { reasoningText, runId } = useReasoningStream();
  if (!reasoningText) return null;
  // `runId` increments on each new run (backend numbers turns from 1), so keying
  // by it remounts the typewriter to start fresh for the new generation.
  return (
    <TypewriterReasoning key={runId} text={reasoningText} active={active} />
  );
}
