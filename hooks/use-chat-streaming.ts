"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMessages } from "@/lib/api/hooks";
import {
  getUploadUrl,
  resolveImageUrls,
  refreshScreens,
  refreshScreenFiles,
  refreshStats,
  refreshMessages,
} from "@/lib/api/mutations";
import {
  statusTextForFrame,
  toolLabel,
  parseSseFrame,
  type AgentFrame,
} from "@/lib/streaming-utils";
import { useCollabOptional } from "@/contexts/CollabContext";

/** The model's live "thinking" stream for a message. */
export interface MessageReasoning {
  content: string;
  status: "streaming" | "complete";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
  isStreaming?: boolean;
  imageIds?: string[];
  modelId?: string;
  reasoning?: MessageReasoning;
}

export interface UseChatStreamingOptions {
  screenId?: string;
  projectId?: string;
}

export type StreamingStatus = "ready" | "submitted" | "streaming" | "error";

export interface StreamingStep {
  id: string;
  text: string;
  status: "pending" | "complete";
  timestamp: Date;
  /** The tool-use id this step represents, so a later `tool_detail` frame can
   *  swap in the resolved target label (e.g. "Editing app/page.tsx") in place. */
  toolUseId?: string;
}

/**
 * An attachment shown as a pill in the chat input. Either a freshly added file
 * (`upload` — needs PUTing to S3) or a reference to an existing canvas image
 * (`canvas` — already in S3, so its key is reused as-is).
 */
export type PillAttachment =
  | { kind: "upload"; id: string; file: File; previewUrl: string }
  | { kind: "canvas"; id: string; name: string; s3Key: string };

/** Options for sending a message */
export interface SendMessageOptions {
  modelId?: string;
  images?: PillAttachment[];
  thinking?: boolean;
}

export interface UseChatStreamingReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isLoadingHistory: boolean;
  status: StreamingStatus;
  statusText: string;
  streamingSteps: StreamingStep[];
  /** Concrete current action (e.g. "Writing files"), derived from the live tool frame. */
  currentActivity: string;
  error: { message: string; canRetry: boolean } | null;
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
  retryLastMessage: () => void;
}

// Strip the legacy agent's structured tags from message content for display.
// New summaries are already clean plain text, so these are no-ops on fresh
// messages; they only matter for older tag-wrapped rows still in the DB.
function stripFilesSummary(content: string): string {
  return content
    .replace(/<\/?task_summary>/gi, "")
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<files_summary>[\s\S]*?<\/files_summary>/gi, "")
    .replace(/<title>[\s\S]*$/i, "")
    .replace(/<files_summary>[\s\S]*$/i, "")
    .trim();
}

// Safety net: strip any inline <thinking>…</thinking> from assistant content so
// the markdown renderer never receives a literal <thinking> tag (which it can't
// render and throws on). Gemini surfaces reasoning on a separate channel, so this
// is a no-op for it — it chiefly cleans legacy rows persisted by earlier models.
function stripInlineThinking(content: string): string {
  return content
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "") // balanced blocks
    .replace(/<thinking>[\s\S]*$/i, "") // unterminated tail
    .replace(/<\/?thinking>/gi, "") // stray tags
    .trim();
}

/** The in-progress assistant message accumulated from the live SSE stream. */
interface LiveAssistant {
  content: string;
  reasoning: string;
  reasoningActive: boolean;
}

/**
 * Chat-stream frames mirrored to collaborators over the realtime channel. The
 * generating client publishes these; peers viewing the same screen reconstruct
 * the live thread from them. Snapshot-based (not per-token) to bound volume.
 */
type ChatBroadcast =
  | {
      kind: "chat";
      screenId: string;
      phase: "start";
      prompt: string;
      modelId?: string;
      imageIds?: string[];
    }
  | {
      kind: "chat";
      screenId: string;
      phase: "state";
      content: string;
      reasoning: string;
      reasoningActive: boolean;
      steps: { id: string; text: string; status: "pending" | "complete" }[];
      statusText: string;
    }
  | { kind: "chat"; screenId: string; phase: "end" };

const STATE_BROADCAST_MS = 120;

/**
 * Chat with real-time streaming against the Strands agent-service. Sends the
 * turn to /api/chat (which proxies the service's SSE), renders the live
 * text/tool/reasoning frames, and reconciles with the persisted thread (written
 * durably by the service → /api/internal/agent-result callback) via SWR.
 */
export function useChatStreaming({
  screenId,
  projectId,
}: UseChatStreamingOptions): UseChatStreamingReturn {
  const [statusText, setStatusText] = useState("");
  const [currentActivity, setCurrentActivity] = useState("");
  const [streamingSteps, setStreamingSteps] = useState<StreamingStep[]>([]);
  const [error, setError] = useState<{
    message: string;
    canRetry: boolean;
    originalMessage?: string;
  } | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  // True while a *collaborator* (not us) is generating on this screen — we mirror
  // their stream into the same display state so the thread shows it live.
  const [isRemoteStreaming, setIsRemoteStreaming] = useState(false);

  // The optimistic user bubble + the live assistant message, shown only while a
  // run is in flight (the persisted rows take over once SWR catches up).
  const [optimisticUser, setOptimisticUser] = useState<ChatMessage | null>(null);
  const [liveAssistant, setLiveAssistant] = useState<LiveAssistant | null>(null);

  // Realtime collaboration channel (null when realtime is off → pure local chat).
  const collab = useCollabOptional();
  const broadcastRef = useRef(collab?.broadcast);
  broadcastRef.current = collab?.broadcast;

  // "In flight" = a run is streaming, whether ours or a mirrored collaborator's.
  const inFlight = isWaitingForResponse || isRemoteStreaming;

  const prevScreenIdRef = useRef<string | undefined>(screenId);
  const lastOptionsRef = useRef<SendMessageOptions | undefined>(undefined);
  const lastMessageRef = useRef<string>("");
  // SWR message count captured at send time; completion = count grew past this
  // AND the newest message is an assistant turn.
  const baselineCountRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  // Refs so the broadcast throttler + the subscription read fresh values without
  // re-subscribing on every render.
  const screenIdRef = useRef(screenId);
  screenIdRef.current = screenId;
  const isWaitingRef = useRef(isWaitingForResponse);
  isWaitingRef.current = isWaitingForResponse;
  const stateBroadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStateBroadcast = useRef(0);
  const remoteEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persisted history. While waiting we poll so the assistant message written by
  // the service callback appears (also our robust completion signal if a
  // serverless timeout cuts the live stream).
  const { data: convexMessages, mutate: mutateMessages } = useMessages(screenId, {
    refreshInterval: inFlight ? 1500 : 0,
  });
  const convexLenRef = useRef(0);
  convexLenRef.current = convexMessages?.length ?? 0;

  // Persisted messages → display format.
  const convexFormattedMessages: ChatMessage[] = useMemo(
    () =>
      convexMessages?.map((msg) => {
        // Persisted reasoning (assistant turns where thinking was on) is stored
        // as { content } in reasoning_details; surface it already-complete so the
        // ReasoningPanel renders the collapsed "Thought process" chip.
        const persistedReasoning = (msg.reasoningDetails ?? null) as {
          content?: string;
        } | null;
        return {
          id: msg._id,
          role: msg.role,
          content: stripFilesSummary(stripInlineThinking(msg.content)),
          timestamp: new Date(msg.createdAt),
          imageIds: msg.imageIds as string[] | undefined,
          modelId: msg.modelId,
          reasoning: persistedReasoning?.content
            ? {
                content: persistedReasoning.content,
                status: "complete" as const,
              }
            : undefined,
        };
      }) ?? [],
    [convexMessages]
  );

  // Merge persisted history with the in-flight optimistic/live messages.
  const messages = useMemo(() => {
    if (!inFlight) return convexFormattedMessages;
    const extra: ChatMessage[] = [];
    // Show the optimistic user bubble only until SWR has fetched the persisted
    // user row (count grew past the baseline), to avoid a duplicate.
    const persistedCaughtUp =
      (convexMessages?.length ?? 0) > baselineCountRef.current;
    if (optimisticUser && !persistedCaughtUp) extra.push(optimisticUser);
    if (liveAssistant) {
      extra.push({
        id: "live-assistant",
        role: "assistant",
        content: liveAssistant.content,
        timestamp: new Date(),
        isStreaming: true,
        reasoning: liveAssistant.reasoning
          ? {
              content: liveAssistant.reasoning,
              status: liveAssistant.reasoningActive ? "streaming" : "complete",
            }
          : undefined,
      });
    }
    return [...convexFormattedMessages, ...extra];
  }, [
    convexFormattedMessages,
    inFlight,
    optimisticUser,
    liveAssistant,
    convexMessages?.length,
  ]);

  // Detect completion: a new assistant message landed in the persisted thread.
  // Works for both our own run and a mirrored collaborator's.
  useEffect(() => {
    if (!convexMessages || !inFlight) return;
    const currentCount = convexMessages.length;
    const lastMessage = convexMessages[currentCount - 1];
    if (
      currentCount > baselineCountRef.current &&
      lastMessage?.role === "assistant"
    ) {
      setIsWaitingForResponse(false);
      setIsRemoteStreaming(false);
      setStreamingSteps([]);
      setStatusText("");
      setCurrentActivity("");
      setLiveAssistant(null);
      setOptimisticUser(null);
      if (projectId) void refreshScreens(projectId);
      // The build may have rewritten the source tree — refresh the selected
      // screen's lazily-loaded files so the Code tab's content cache is current.
      if (screenId) void refreshScreenFiles(screenId);
      void refreshStats();
    }
  }, [convexMessages, inFlight, projectId, screenId]);

  const isLoading = inFlight;
  const status: StreamingStatus = inFlight ? "streaming" : "ready";

  // Show the history loader only when a screen is selected but its thread isn't
  // cached yet (a genuine cold load). Derived — NOT effect-managed — on purpose:
  // an earlier version toggled this from two competing effects (one keyed on the
  // SWR data, one on screen change). On a warm reselect the screen-change effect
  // ran last and forced the flag back to `true`, and since neither effect's deps
  // changed again it stayed stuck until the *background* revalidation returned —
  // so reselecting an already-loaded screen sat on "Loading conversation" for the
  // whole refetch instead of rendering the cached messages instantly. SWR serves
  // the cache synchronously here, so `convexMessages` is already defined on the
  // reselect render and the loader never flashes.
  const isLoadingHistory = !!screenId && convexMessages === undefined;

  // Reset + abort any in-flight run when the screen changes.
  useEffect(() => {
    if (prevScreenIdRef.current !== screenId) {
      abortRef.current?.abort();
      setError(null);
      setStatusText("");
      setCurrentActivity("");
      setStreamingSteps([]);
      setLiveAssistant(null);
      setOptimisticUser(null);
      setIsWaitingForResponse(false);
      setIsRemoteStreaming(false);
      if (remoteEndTimer.current) {
        clearTimeout(remoteEndTimer.current);
        remoteEndTimer.current = null;
      }
      prevScreenIdRef.current = screenId;
    }
  }, [screenId]);

  // Abort on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  // ---- Multiplayer chat mirroring -----------------------------------------
  // Latest streaming snapshot, kept in a ref so the throttled broadcaster always
  // sends current content even when its timer was scheduled in an earlier render.
  const latestStreamRef = useRef<{
    content: string;
    reasoning: string;
    reasoningActive: boolean;
    steps: { id: string; text: string; status: "pending" | "complete" }[];
    statusText: string;
  }>({ content: "", reasoning: "", reasoningActive: false, steps: [], statusText: "" });
  latestStreamRef.current = {
    content: liveAssistant?.content ?? "",
    reasoning: liveAssistant?.reasoning ?? "",
    reasoningActive: liveAssistant?.reasoningActive ?? false,
    steps: streamingSteps.map((s) => ({
      id: s.id,
      text: s.text,
      status: s.status,
    })),
    statusText,
  };

  const flushStateBroadcast = useCallback(() => {
    stateBroadcastTimer.current = null;
    lastStateBroadcast.current = Date.now();
    const sid = screenIdRef.current;
    if (!sid) return;
    const s = latestStreamRef.current;
    broadcastRef.current?.({
      kind: "chat",
      screenId: sid,
      phase: "state",
      content: s.content,
      reasoning: s.reasoning,
      reasoningActive: s.reasoningActive,
      steps: s.steps,
      statusText: s.statusText,
    } satisfies ChatBroadcast);
  }, []);

  // While WE generate, mirror our streaming snapshot to peers (throttled). No
  // cleanup-cancel here so the trailing broadcast isn't starved by rapid renders.
  useEffect(() => {
    if (!isWaitingForResponse) return;
    const since = Date.now() - lastStateBroadcast.current;
    if (since >= STATE_BROADCAST_MS) {
      flushStateBroadcast();
    } else if (!stateBroadcastTimer.current) {
      stateBroadcastTimer.current = setTimeout(
        flushStateBroadcast,
        STATE_BROADCAST_MS - since
      );
    }
  }, [
    isWaitingForResponse,
    liveAssistant,
    streamingSteps,
    statusText,
    flushStateBroadcast,
  ]);

  // Stop the broadcaster when our run ends; clear timers on unmount.
  useEffect(() => {
    if (isWaitingForResponse) return;
    if (stateBroadcastTimer.current) {
      clearTimeout(stateBroadcastTimer.current);
      stateBroadcastTimer.current = null;
    }
  }, [isWaitingForResponse]);
  useEffect(
    () => () => {
      if (stateBroadcastTimer.current) clearTimeout(stateBroadcastTimer.current);
      if (remoteEndTimer.current) clearTimeout(remoteEndTimer.current);
    },
    []
  );

  // Receive peers' mirrored chat stream for the currently-open screen and render
  // it into the same display state. Ignored while we're generating locally.
  const subscribeFn = collab?.subscribe;
  useEffect(() => {
    if (!subscribeFn) return;
    return subscribeFn((payload) => {
      const m = payload as ChatBroadcast | null;
      if (!m || m.kind !== "chat" || m.screenId !== screenIdRef.current) return;
      if (isWaitingRef.current) return; // our own run takes precedence

      if (m.phase === "start") {
        if (remoteEndTimer.current) clearTimeout(remoteEndTimer.current);
        baselineCountRef.current = convexLenRef.current;
        setError(null);
        setIsRemoteStreaming(true);
        setOptimisticUser({
          id: "remote-user",
          role: "user",
          content: m.prompt,
          timestamp: new Date(),
          imageIds: m.imageIds,
          modelId: m.modelId,
        });
        setLiveAssistant(null);
        setStreamingSteps([
          {
            id: "remote-initial",
            text: "Starting...",
            status: "pending",
            timestamp: new Date(),
          },
        ]);
        setStatusText("Starting...");
        if (projectId) void refreshScreens(projectId);
      } else if (m.phase === "state") {
        setIsRemoteStreaming(true);
        setLiveAssistant({
          content: m.content,
          reasoning: m.reasoning,
          reasoningActive: m.reasoningActive,
        });
        setStreamingSteps(
          m.steps.map((s) => ({
            id: s.id,
            text: s.text,
            status: s.status,
            timestamp: new Date(),
          }))
        );
        setStatusText(m.statusText);
      } else if (m.phase === "end") {
        // The persisted assistant message (via the agent callback) is the real
        // terminal signal — the completion effect clears us when it lands. Refetch
        // now, and keep a fallback in case the callback never persists.
        void mutateMessages();
        if (projectId) void refreshScreens(projectId);
        if (screenIdRef.current) void refreshScreenFiles(screenIdRef.current);
        if (remoteEndTimer.current) clearTimeout(remoteEndTimer.current);
        remoteEndTimer.current = setTimeout(() => {
          setIsRemoteStreaming(false);
          setLiveAssistant(null);
          setOptimisticUser(null);
          setStreamingSteps([]);
          setStatusText("");
        }, 20000);
      }
    });
  }, [subscribeFn, projectId, mutateMessages]);

  // Advance the streaming-step list for a frame: complete the prior pending step
  // and start a new one labeled `text` (tagged with the tool-use id so a later
  // `tool_detail` frame can refine its label).
  const pushStep = useCallback((text: string, toolUseId?: string) => {
    setStreamingSteps((prev) => {
      const updated = prev.map((s) =>
        s.status === "pending" ? { ...s, status: "complete" as const } : s
      );
      return [
        ...updated,
        {
          id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text,
          status: "pending" as const,
          timestamp: new Date(),
          toolUseId,
        },
      ];
    });
  }, []);

  // Swap a tool step's generic label ("Editing file") for its resolved target
  // ("Editing app/page.tsx") once the tool's input has streamed enough to know.
  const updateStepLabel = useCallback((toolUseId: string, text: string) => {
    setStreamingSteps((prev) =>
      prev.map((s) => (s.toolUseId === toolUseId ? { ...s, text } : s))
    );
  }, []);

  const handleFrame = useCallback(
    (frame: AgentFrame) => {
      switch (frame.type) {
        case "text": {
          const delta = frame.text || "";
          if (!delta) break;
          setLiveAssistant((prev) => ({
            content: (prev?.content || "") + delta,
            reasoning: prev?.reasoning || "",
            reasoningActive: false,
          }));
          setStatusText("Writing the response");
          setCurrentActivity("");
          break;
        }
        case "reasoning": {
          const delta = frame.text || "";
          if (!delta) break;
          setLiveAssistant((prev) => ({
            content: prev?.content || "",
            reasoning: (prev?.reasoning || "") + delta,
            reasoningActive: true,
          }));
          setStatusText("Thinking");
          break;
        }
        case "tool": {
          const label = toolLabel(frame.name);
          pushStep(label, frame.tool_use_id);
          setStatusText(label);
          // The agent moved on to acting — thinking (if any) is done.
          setLiveAssistant((prev) =>
            prev ? { ...prev, reasoningActive: false } : prev
          );
          break;
        }
        case "tool_detail": {
          // Refine the matching step's label in place (e.g. the file being
          // edited). No new step — avoids a duplicate "Editing file" line.
          const detail = typeof frame.label === "string" ? frame.label : "";
          const id =
            typeof frame.tool_use_id === "string" ? frame.tool_use_id : "";
          if (detail && id) {
            updateStepLabel(id, detail);
            setStatusText(detail);
          }
          break;
        }
        case "notice": {
          const text = statusTextForFrame(frame);
          pushStep(text);
          setStatusText(text);
          break;
        }
        case "sandbox": {
          // Screen was early-persisted by the route; refresh so the canvas
          // iframe can show as soon as the sandbox URL is available.
          setStatusText("Starting sandbox");
          if (projectId) void refreshScreens(projectId);
          break;
        }
        case "result": {
          // Terminal success. The assistant row is persisted by the service
          // callback (may land a beat later) — mark steps done and let the SWR
          // poll flip us out of "waiting" when the row appears.
          setStreamingSteps((prev) =>
            prev.map((s) => ({ ...s, status: "complete" as const }))
          );
          setStatusText("Done");
          setCurrentActivity("");
          // Mark any in-flight reasoning complete so the panel collapses to its
          // "Thought process" chip. Functional updater — never read the captured
          // `liveAssistant` here (the stream loop holds a stale closure of it).
          setLiveAssistant((prev) =>
            prev ? { ...prev, reasoningActive: false } : prev
          );
          void mutateMessages();
          break;
        }
        case "error": {
          setError({
            message: frame.message || "The agent run failed",
            canRetry: true,
            originalMessage: lastMessageRef.current || undefined,
          });
          setIsWaitingForResponse(false);
          setStreamingSteps([]);
          setStatusText("");
          setCurrentActivity("");
          setLiveAssistant(null);
          setOptimisticUser(null);
          if (screenId) void refreshMessages(screenId);
          break;
        }
        default:
          break;
      }
    },
    [pushStep, updateStepLabel, projectId, screenId, mutateMessages]
  );

  const sendMessage = useCallback(
    async (content: string, options?: SendMessageOptions) => {
      const trimmedContent = content.trim();
      const { modelId, images = [], thinking } = options || {};
      const hasUploads = images.some((i) => i.kind === "upload");

      if (!trimmedContent && images.length === 0) return;
      if (isWaitingForResponse || isRemoteStreaming) return;
      if (!screenId || !projectId) {
        setError({
          message: "Please select a screen to chat with AI",
          canRetry: false,
        });
        return;
      }

      // Stash the prompt + options for retry.
      lastMessageRef.current = trimmedContent;
      lastOptionsRef.current = options;

      setError(null);
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      baselineCountRef.current = convexMessages?.length ?? 0;
      const displayContent =
        trimmedContent || (images.length > 0 ? "[Image attached]" : "");

      setIsWaitingForResponse(true);
      setLiveAssistant(null);
      setStatusText(hasUploads ? "Uploading images..." : "Starting...");
      setStreamingSteps([
        {
          id: `initial-${Date.now()}`,
          text: hasUploads ? "Uploading images..." : "Starting...",
          status: "pending",
          timestamp: new Date(),
        },
      ]);

      try {
        // Resolve every attachment to an S3 key. Uploaded pills are PUT to S3;
        // canvas pills already have a key, so they skip the upload. We pass the
        // presigned GET URLs (not base64) to the model and persist the keys.
        const imageStorageIds: string[] = [];
        for (const image of images) {
          if (image.kind === "canvas") {
            if (image.s3Key) imageStorageIds.push(image.s3Key);
            continue;
          }
          const contentType = image.file.type || "application/octet-stream";
          const { key, uploadUrl } = await getUploadUrl(contentType);
          const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: image.file,
          });
          if (!putRes.ok) throw new Error(`Image upload failed (${putRes.status})`);
          imageStorageIds.push(key);
        }

        let imageAgentUrls: string[] = [];
        if (imageStorageIds.length > 0) {
          const urlMap = await resolveImageUrls(imageStorageIds);
          imageAgentUrls = imageStorageIds
            .map((id) => urlMap[id])
            .filter((url): url is string => Boolean(url));
        }

        // Optimistic user bubble (the route persists the real row).
        setOptimisticUser({
          id: `optimistic-${Date.now()}`,
          role: "user",
          content: displayContent,
          timestamp: new Date(),
          imageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
          modelId,
        });
        setStatusText("Starting...");

        // Mirror the run to collaborators viewing this screen.
        broadcastRef.current?.({
          kind: "chat",
          screenId,
          phase: "start",
          prompt: displayContent,
          modelId,
          imageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
        } satisfies ChatBroadcast);

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            screenId,
            projectId,
            message: displayContent,
            modelId,
            thinking: thinking ?? false,
            imageUrls: imageAgentUrls.length > 0 ? imageAgentUrls : undefined,
            imageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
          }),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          let msg = `Request failed (${res.status})`;
          try {
            const j = await res.json();
            if (j?.error) msg = j.error;
          } catch {
            /* not JSON */
          }
          throw new Error(msg);
        }

        // Read + parse the SSE stream.
        const reader = res.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const raw of parts) {
            if (!raw.trim()) continue;
            const frame = parseSseFrame(raw);
            if (frame) handleFrame(frame);
          }
        }
        if (buffer.trim()) {
          const frame = parseSseFrame(buffer);
          if (frame) handleFrame(frame);
        }
        // Stream ended without flipping us out of "waiting" (e.g. serverless cut
        // the live stream before the assistant row landed). The SWR poll keeps
        // running and the completion effect will resolve it — head-start refetch.
        void mutateMessages();
        broadcastRef.current?.({ kind: "chat", screenId, phase: "end" });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // intentional cancel
        setError({
          message:
            err instanceof Error ? err.message : "An unexpected error occurred",
          canRetry: true,
          originalMessage: trimmedContent,
        });
        setStatusText("");
        setCurrentActivity("");
        setIsWaitingForResponse(false);
        setStreamingSteps([]);
        setLiveAssistant(null);
        setOptimisticUser(null);
        broadcastRef.current?.({ kind: "chat", screenId, phase: "end" });
      }
    },
    [
      isWaitingForResponse,
      isRemoteStreaming,
      screenId,
      projectId,
      convexMessages?.length,
      handleFrame,
      mutateMessages,
    ]
  );

  const retryLastMessage = useCallback(() => {
    if (!error?.canRetry || !error.originalMessage) return;
    const opts = lastOptionsRef.current;
    sendMessage(error.originalMessage, opts);
  }, [error, sendMessage]);

  return {
    messages,
    isLoading,
    isLoadingHistory,
    status,
    statusText,
    streamingSteps,
    currentActivity,
    error: error ? { message: error.message, canRetry: error.canRetry } : null,
    sendMessage,
    retryLastMessage,
  };
}
