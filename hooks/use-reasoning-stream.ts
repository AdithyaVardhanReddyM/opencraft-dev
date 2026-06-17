"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useInngestSubscription } from "@inngest/realtime/hooks";

/**
 * Subscribes to the `agent_reasoning` realtime topic and derives the model's
 * readable "thinking" for the *current* generation.
 *
 * Fully isolated from the main chat stream (@inngest/use-agent / agent_stream):
 * its own token endpoint and its own WebSocket, so it can never interfere with
 * message delivery. The connection stays open while signed in.
 *
 * State is derived purely from the subscription's accumulated `data` (no effects
 * / no setState) to keep it simple and avoid cascading renders. The backend
 * numbers reasoning turns starting at 1 per run, so a `turn === 1` message marks
 * a fresh generation — we reset accumulation there and bump `runId` so the UI
 * can restart its typewriter for the new run.
 */
export function useReasoningStream(): {
  reasoningText: string;
  runId: number;
} {
  const { user } = useUser();
  const userId = user?.id;

  const subscription = useInngestSubscription({
    enabled: !!userId,
    refreshToken: async () => {
      const res = await fetch("/api/realtime/reasoning-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelKey: userId }),
      });
      if (!res.ok) {
        throw new Error("Failed to get reasoning subscription token");
      }
      return res.json();
    },
  });

  return useMemo(() => {
    const byTurn = new Map<number, string>();
    let runId = 0;

    for (const message of subscription.data) {
      // Messages arrive as { topic, channel, data: <payload>, ... }; tolerate a
      // raw-payload shape too in case the envelope differs.
      const payload = (
        message && typeof message === "object" && "data" in message
          ? (message as { data: unknown }).data
          : message
      ) as { turn?: number; text?: string } | undefined;

      if (
        !payload ||
        typeof payload.turn !== "number" ||
        typeof payload.text !== "string"
      ) {
        continue;
      }

      // turn === 1 marks the first reasoning of a new generation → reset.
      if (payload.turn === 1) {
        byTurn.clear();
        runId += 1;
      }
      byTurn.set(payload.turn, payload.text);
    }

    const reasoningText = [...byTurn.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, text]) => text)
      .join("\n\n");

    return { reasoningText, runId };
  }, [subscription.data]);
}
