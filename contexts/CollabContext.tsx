"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  getRealtimeToken,
  RealtimeTokenError,
  type ProjectRole,
} from "@/lib/api/collab";
import { YjsAppSyncProvider } from "@/lib/realtime/yjs-appsync-provider";
import type { ConnectionStatus } from "@/lib/realtime/appsync-events-client";
import type { Point } from "@/types/canvas";

export interface PeerPresence {
  clientId: number;
  userId: string;
  name: string;
  image: string;
  color: string;
  cursor: Point | null;
  selection: string[];
  editing: string | null;
}

interface CollabContextValue {
  /** The shared document — null until/unless realtime is connected. */
  doc: Y.Doc | null;
  awareness: Awareness | null;
  status: ConnectionStatus;
  enabled: boolean; // realtime configured + user has access
  role: ProjectRole | null;
  /** Whether this user may broadcast/persist edits (false only for viewers). */
  canEdit: boolean;
  peers: PeerPresence[];
  self: { name: string; image: string; color: string };
  setCursor: (world: Point | null) => void;
  setSelection: (ids: string[]) => void;
  setEditing: (id: string | null) => void;
  /** Broadcast a generic ephemeral message to peers (e.g. chat-stream frames). */
  broadcast: (payload: unknown) => void;
  /** Subscribe to peers' broadcasts. Returns an unsubscribe fn. */
  subscribe: (handler: (payload: unknown) => void) => () => void;
}

const CollabContext = createContext<CollabContextValue | null>(null);

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function CollabProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const [status, setStatus] = useState<ConnectionStatus>("closed");
  const [enabled, setEnabled] = useState(false);
  const [role, setRole] = useState<ProjectRole | null>(null);
  const [peers, setPeers] = useState<PeerPresence[]>([]);
  // State-backed (not just refs) so consumers re-render when the doc is created.
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);

  const awarenessRef = useRef<Awareness | null>(null);
  const providerRef = useRef<YjsAppSyncProvider | null>(null);
  // Subscribers for generic app messages (chat-stream mirroring, etc.).
  const subscribersRef = useRef(new Set<(payload: unknown) => void>());

  const self = useMemo(() => {
    const name =
      user?.firstName ||
      user?.username ||
      user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      "Guest";
    return {
      name,
      image: user?.imageUrl ?? "",
      color: colorFor(user?.id ?? "anon"),
    };
  }, [user]);

  useEffect(() => {
    if (!isSignedIn || !user) return;
    let cancelled = false;

    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    awarenessRef.current = awareness;
    setDoc(doc);
    setAwareness(awareness);

    awareness.setLocalState({
      user: {
        id: user.id,
        name: self.name,
        image: self.image,
        color: self.color,
      },
      cursor: null,
      selection: [],
      editing: null,
    });

    const recomputePeers = () => {
      const next: PeerPresence[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === doc.clientID) return;
        const u = (state?.user ?? {}) as {
          id?: string;
          name?: string;
          image?: string;
          color?: string;
        };
        next.push({
          clientId,
          userId: u.id ?? String(clientId),
          name: u.name ?? "Guest",
          image: u.image ?? "",
          color: u.color ?? "#64748b",
          cursor: (state?.cursor as Point | null) ?? null,
          selection: (state?.selection as string[]) ?? [],
          editing: (state?.editing as string | null) ?? null,
        });
      });
      setPeers(next);
    };
    awareness.on("change", recomputePeers);

    // Probe for access, retrying on transient failures. The common retry case:
    // a user who just opened an invite link is being added as a member in
    // parallel (useJoinInvite), so the first token request can 404 until that
    // lands. A 503 means realtime isn't configured at all — give up immediately
    // rather than spam. Only stand up the provider once access is confirmed.
    let probeAttempts = 0;
    const probe = () => {
      if (cancelled) return;
      getRealtimeToken(projectId)
        .then((auth) => {
          if (cancelled) return;
          setEnabled(true);
          setRole(auth.role);
          providerRef.current = new YjsAppSyncProvider({
            doc,
            awareness,
            onStatus: setStatus,
            onAppMessage: (payload) => {
              subscribersRef.current.forEach((h) => {
                try {
                  h(payload);
                } catch {
                  /* a subscriber threw — don't break the others */
                }
              });
            },
            getAuth: async () => {
              const fresh = await getRealtimeToken(projectId);
              return {
                token: fresh.token,
                realtimeUrl: fresh.realtimeUrl,
                httpDns: fresh.httpDns,
                channel: fresh.channel,
                expiresAt: fresh.expiresAt,
              };
            },
          });
        })
        .catch((err) => {
          if (cancelled) return;
          const status =
            err instanceof RealtimeTokenError ? err.status : undefined;
          if (status === 503 || probeAttempts >= 10) {
            setEnabled(false); // not configured, or gave up after ~12s
            return;
          }
          probeAttempts++;
          setTimeout(probe, 1200);
        });
    };
    probe();

    return () => {
      cancelled = true;
      awareness.off("change", recomputePeers);
      providerRef.current?.destroy();
      providerRef.current = null;
      awareness.destroy();
      doc.destroy();
      awarenessRef.current = null;
      setDoc(null);
      setAwareness(null);
      setPeers([]);
      setStatus("closed");
      setEnabled(false);
      setRole(null);
    };
    // Recreate the session when the project or signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isSignedIn, user?.id]);

  const setCursor = useCallback((world: Point | null) => {
    awarenessRef.current?.setLocalStateField("cursor", world);
  }, []);
  const setSelection = useCallback((ids: string[]) => {
    awarenessRef.current?.setLocalStateField("selection", ids);
  }, []);
  const setEditing = useCallback((id: string | null) => {
    awarenessRef.current?.setLocalStateField("editing", id);
  }, []);
  const broadcast = useCallback((payload: unknown) => {
    providerRef.current?.publishApp(payload);
  }, []);
  const subscribe = useCallback((handler: (payload: unknown) => void) => {
    subscribersRef.current.add(handler);
    return () => {
      subscribersRef.current.delete(handler);
    };
  }, []);

  const value: CollabContextValue = {
    doc,
    awareness,
    status,
    enabled,
    role,
    // Only an explicit "viewer" is blocked; null (single-player / not configured)
    // and owner/editor may edit.
    canEdit: role !== "viewer",
    peers,
    self,
    setCursor,
    setSelection,
    setEditing,
    broadcast,
    subscribe,
  };

  return (
    <CollabContext.Provider value={value}>{children}</CollabContext.Provider>
  );
}

export function useCollab() {
  const ctx = useContext(CollabContext);
  if (!ctx) throw new Error("useCollab must be used within a CollabProvider");
  return ctx;
}

/** Like useCollab, but returns null instead of throwing when there's no
 *  provider — for components that may render outside the canvas tree. */
export function useCollabOptional() {
  return useContext(CollabContext);
}
