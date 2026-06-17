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
  reasoningDetails?: unknown; // Reasoning details for reasoning models
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
  parentScreenId?: string; // Set on flow children; references the originating screen
  route?: string; // Route (page) this screen displays, e.g. "/checkout"
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
 * Extended message type that includes reasoning_details for reasoning models
 * We use intersection type to ensure compatibility with Message while adding reasoning_details
 */
export type ExtendedMessage = Message & {
  reasoning_details?: unknown;
};

/**
 * Format Convex messages for agent context
 * Transforms database messages to AgentKit Message format
 * Preserves order and content including files_summary and reasoning_details
 * Returns Message[] for compatibility with AgentKit, but includes reasoning_details when present
 */
export function formatMessagesForAgent(messages: ConvexMessage[]): Message[] {
  return messages.map((msg) => {
    // Base message structure matching TextMessage type
    const baseMessage: TextMessage = {
      type: "text" as const,
      role: msg.role,
      content: msg.content,
    };

    // Include reasoning_details if present (required for reasoning model multi-turn)
    // This is passed through to the API even though it's not in the Message type
    // We cast to unknown first then to Message to allow the extra property
    if (msg.reasoningDetails) {
      return {
        ...baseMessage,
        reasoning_details: msg.reasoningDetails,
      } as unknown as Message;
    }

    return baseMessage;
  });
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

/**
 * Normalize an agent-reported route to a clean, leading-slash path.
 * Returns undefined for empty/root values. Strips a trailing slash so it joins
 * cleanly with a sandbox base URL.
 */
export function normalizeRoute(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  let route = raw.trim();
  if (!route || route === "/") return undefined;
  // Drop a leading origin if the model returned a full URL.
  route = route.replace(/^https?:\/\/[^/]+/i, "");
  if (!route.startsWith("/")) route = `/${route}`;
  route = route.replace(/\/+$/, "");
  return route || undefined;
}

/**
 * Extract the route from an explicit <route> tag in the agent's final output.
 * Used for flow pages so the child screen's iframe can point at the new page.
 */
export function extractRoute(content: string): string | undefined {
  const match = content.match(/<route>([\s\S]*?)<\/route>/i);
  return normalizeRoute(match ? match[1] : undefined);
}

/**
 * Convert a Next.js app-router page file path to its URL route.
 * e.g. "app/pricing/page.tsx" -> "/pricing", "app/(shop)/cart/page.tsx" -> "/cart".
 * Route groups "(group)" are stripped; dynamic "[param]" segments are kept as-is.
 * Returns undefined for the root page ("app/page.tsx") or non-page paths.
 */
export function pageFilePathToRoute(rawPath: string): string | undefined {
  const path = rawPath.replace(/^\.?\//, ""); // strip leading "./" or "/"
  const match = path.match(/^app\/(.+)\/page\.(tsx|ts|jsx|js)$/);
  if (!match) return undefined; // not a nested page (app/page.tsx has no capture)
  const segments = match[1]
    .split("/")
    .filter((s) => s && !(s.startsWith("(") && s.endsWith(")"))); // drop route groups
  if (segments.length === 0) return undefined;
  return `/${segments.join("/")}`;
}

/**
 * Derive the route a flow build created by inspecting the files it wrote.
 * The agent's state files are seeded from the parent, so a page path that is NOT
 * present in the parent is the page just added for this flow. This is more
 * reliable than the model's <route> tag, since the URL must map to a real file.
 * Falls back to any non-root app page if nothing looks newly added.
 */
export function deriveRouteFromFiles(
  files: Record<string, string> | undefined,
  parentFiles: Record<string, string> | undefined
): string | undefined {
  if (!files) return undefined;
  const norm = (p: string) => p.replace(/^\.?\//, "");
  const parentKeys = new Set(Object.keys(parentFiles || {}).map(norm));

  const pages = Object.keys(files)
    .map(norm)
    .map((p) => ({ path: p, route: pageFilePathToRoute(p) }))
    .filter((x): x is { path: string; route: string } => !!x.route);

  if (pages.length === 0) return undefined;

  // Prefer a page that wasn't in the parent (the one created for this flow).
  const fresh = pages.find((x) => !parentKeys.has(x.path));
  return (fresh ?? pages[0]).route;
}
