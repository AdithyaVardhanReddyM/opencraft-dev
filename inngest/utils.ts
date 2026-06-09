import { Sandbox } from "@e2b/code-interpreter";
import { AgentResult, TextMessage, Message } from "@inngest/agent-kit";

/**
 * Message record from Convex database
 */
export interface ConvexMessage {
  _id: string;
  screenId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

/**
 * Screen record from Convex database
 */
export interface ConvexScreen {
  _id: string;
  shapeId: string;
  projectId: string;
  title?: string;
  sandboxUrl?: string;
  sandboxId?: string;
  files?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Connect to an existing sandbox
 */
export async function getSandbox(sandboxId: string) {
  const sandbox = await Sandbox.connect(sandboxId);
  return sandbox;
}

/**
 * Extract the last assistant text message content from agent result
 */
export function lastAssistantTextMessageContent(result: AgentResult) {
  const lastAssistantTextMessageIndex = result.output.findLastIndex(
    (message) => message.role === "assistant"
  );

  const message = result.output[lastAssistantTextMessageIndex] as
    | TextMessage
    | undefined;

  return message?.content
    ? typeof message.content === "string"
      ? message.content
      : message.content.map((c) => c.text).join("")
    : undefined;
}

/**
 * Format Convex messages for agent context
 * Transforms database messages to AgentKit Message format
 * Preserves order and content including files_summary
 */
export function formatMessagesForAgent(messages: ConvexMessage[]): Message[] {
  return messages.map((msg) => ({
    type: "text" as const,
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Determine if a new sandbox should be created based on screen state
 * Returns true if sandboxId is null, undefined, or empty string
 */
export function shouldCreateNewSandbox(screen: ConvexScreen | null): boolean {
  if (!screen) {
    return true;
  }
  return !screen.sandboxId || screen.sandboxId.trim() === "";
}

/**
 * Parse files_summary from message content
 * Extracts the content between <files_summary> tags
 */
export function parseFilesSummary(content: string): string | null {
  const match = content.match(/<files_summary>([\s\S]*?)<\/files_summary>/);
  return match ? match[1].trim() : null;
}
