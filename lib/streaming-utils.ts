/**
 * Streaming utilities for the agent-service SSE vocabulary.
 *
 * The agent runs in the Python Strands service and streams these frame types
 * over SSE (relayed by /api/chat): `sandbox`, `notice`, `text`, `tool`,
 * `reasoning`, `result`, `error`. These helpers map a frame to the UI's status
 * text and tool labels (consumed by use-chat-streaming + StreamingIndicator).
 */

export type StreamingStatus = "ready" | "submitted" | "streaming" | "error";

export type AgentFrameType =
  | "sandbox"
  | "notice"
  | "text"
  | "tool"
  | "tool_detail"
  | "reasoning"
  | "result"
  | "error";

export interface AgentFrame {
  type: AgentFrameType | string;
  text?: string; // text / reasoning deltas
  name?: string; // tool
  tool_use_id?: string; // tool
  message?: string; // notice / error
  // result/sandbox carry more fields; the hook reads those directly.
  [k: string]: unknown;
}

// The agent-service tool names → human-readable labels. The `tool` frame carries
// only the name + tool_use_id (no streamed args), so this is the finest detail
// available for the live activity line.
const TOOL_LABELS: Record<string, string> = {
  create_files: "Writing files",
  edit_file: "Editing file",
  read_files: "Reading files",
  search_project: "Searching project",
  scrape_webpage: "Inspecting webpage",
  terminal: "Running command",
  finish: "Finalizing",
};

export function toolLabel(name?: string): string {
  if (!name) return "Working";
  return TOOL_LABELS[name] ?? "Working";
}

/** Human-readable status text for a streamed frame. */
export function statusTextForFrame(frame: AgentFrame): string {
  switch (frame.type) {
    case "sandbox":
      return "Starting sandbox";
    case "notice":
      return frame.message || "Working";
    case "text":
      return "Writing the response";
    case "reasoning":
      return "Thinking";
    case "tool":
      return toolLabel(frame.name);
    case "result":
      return "Done";
    case "error":
      return "Error";
    default:
      return "Working";
  }
}

/** Parse one SSE frame ("event: ...\ndata: {json}") into its JSON payload. */
export function parseSseFrame(raw: string): AgentFrame | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  try {
    const obj = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
    return { ...obj, type: (obj.type as string) ?? event } as AgentFrame;
  } catch {
    return null;
  }
}
