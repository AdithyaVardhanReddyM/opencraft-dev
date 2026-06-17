import { channel, topic } from "@inngest/realtime";
import { AgentMessageChunkSchema } from "@inngest/agent-kit";
import { z } from "zod";

/**
 * Creates a realtime channel for streaming agent events.
 * Channel pattern: user:{channelKey}
 * Topics:
 * - agent_stream: typed with AgentMessageChunk for @inngest/use-agent streaming
 * - agent_reasoning: per-turn human-readable reasoning text for the live
 *   "thinking" UI. Separate topic so it never interferes with agent_stream.
 *
 * The channelKey can be any string (e.g., screenId, "screen:xyz", userId).
 * This matches the pattern used by @inngest/use-agent.
 */
export const userChannel = channel((channelKey: string) => `user:${channelKey}`)
  .addTopic(topic("agent_stream").schema(AgentMessageChunkSchema))
  .addTopic(
    topic("agent_reasoning").schema(
      z.object({
        turn: z.number(),
        text: z.string(),
      })
    )
  );
