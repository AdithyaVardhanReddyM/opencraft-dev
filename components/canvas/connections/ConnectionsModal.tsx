"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2, Plug, Check, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Connect external MCP servers (Notion, Linear, …) to the coding agent via OAuth.
 * Once connected, the agent gets those tools on every message (see the chat route
 * + agent-service); disconnecting here revokes that. Tokens live server-side only —
 * this modal only ever sees connection STATUS.
 */

interface ConnectionItem {
  provider: string;
  label: string;
  connected: boolean;
  accountName: string | null;
  connectedAt?: number | null;
}

function NotionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}

function LinearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
      <path d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z" />
    </svg>
  );
}

/** Presentation metadata keyed by registry id (registry.ts is server-only). */
const PROVIDER_META: Record<
  string,
  { label: string; blurb: string; tile: string; icon: ReactNode }
> = {
  notion: {
    label: "Notion",
    blurb: "Pull in your pages, docs and databases.",
    tile: "bg-foreground text-background",
    icon: <NotionIcon />,
  },
  linear: {
    label: "Linear",
    blurb: "Read and update your issues, projects and cycles.",
    tile: "bg-[#5E6AD2] text-white",
    icon: <LinearIcon />,
  },
};

// Shown even if the status fetch fails (e.g. before the table exists) so the user
// can still start a connection. The API returns the authoritative merged list.
const FALLBACK_PROVIDERS = ["notion", "linear"];

function metaFor(id: string) {
  return (
    PROVIDER_META[id] ?? {
      label: id.charAt(0).toUpperCase() + id.slice(1),
      blurb: "",
      tile: "bg-muted text-foreground",
      icon: <Plug className="size-5" />,
    }
  );
}

interface ConnectionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectionsModal({ open, onOpenChange }: ConnectionsModalProps) {
  const [items, setItems] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connections");
      if (res.ok) {
        const data = (await res.json()) as { connections?: ConnectionItem[] };
        setItems(data.connections ?? []);
      }
    } catch {
      /* non-fatal — fall back to the static provider list */
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh status whenever the modal opens.
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // The OAuth popup posts back here on success/failure (see lib/connections/flow.ts).
  useEffect(() => {
    if (!open) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data;
      if (d?.source !== "opencraft" || d?.kind !== "connection") return;
      const label = metaFor(d.provider).label;
      if (d.status === "connected") toast.success(`${label} connected`);
      else toast.error(`Couldn't connect ${label}`);
      setBusy(null);
      void load();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, load]);

  const connect = useCallback((provider: string) => {
    const w = 520;
    const h = 720;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    setBusy(provider);
    popupRef.current = window.open(
      `/api/connections/${provider}/start`,
      "oc_oauth_connect",
      `width=${w},height=${h},left=${left},top=${top}`
    );
    // If the popup is blocked or closed without finishing, don't get stuck "busy".
    const timer = window.setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        window.clearInterval(timer);
        setBusy((b) => (b === provider ? null : b));
      }
    }, 800);
  }, []);

  const disconnect = useCallback(async (provider: string) => {
    setBusy(provider);
    try {
      const res = await fetch(`/api/connections/${provider}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setItems((xs) =>
        xs.map((x) =>
          x.provider === provider
            ? { ...x, connected: false, accountName: null }
            : x
        )
      );
      toast.success(`${metaFor(provider).label} disconnected`);
    } catch {
      toast.error("Couldn't disconnect — try again");
    } finally {
      setBusy(null);
    }
  }, []);

  const rows: ConnectionItem[] =
    items.length > 0
      ? items
      : FALLBACK_PROVIDERS.map((id) => ({
          provider: id,
          label: metaFor(id).label,
          connected: false,
          accountName: null,
        }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-xl">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Link2 className="size-4" />
            </span>
            Connections
          </DialogTitle>
          <DialogDescription>
            Connect your tools so the agent can use them while it builds — fetch a
            Notion spec, pull a Linear ticket, and more. Connect once with OAuth;
            it stays available until you disconnect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 pt-1">
          {rows.map((row) => {
            const meta = metaFor(row.provider);
            const isBusy = busy === row.provider;
            return (
              <div
                key={row.provider}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3"
              >
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
                    meta.tile
                  )}
                >
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {row.label}
                    </span>
                    {row.connected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <Check className="size-3" />
                        Connected
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {row.connected && row.accountName
                      ? row.accountName
                      : meta.blurb}
                  </div>
                </div>
                {row.connected ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={isBusy}
                    onClick={() => disconnect(row.provider)}
                  >
                    {isBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Disconnect"
                    )}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="shrink-0"
                    disabled={isBusy}
                    onClick={() => connect(row.provider)}
                  >
                    {isBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Plug className="size-4" />
                        Connect
                      </>
                    )}
                  </Button>
                )}
              </div>
            );
          })}

          {/* More coming soon */}
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 p-3 opacity-70">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Plug className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground">More coming soon</div>
              <div className="truncate text-xs text-muted-foreground">
                GitHub, Slack, Figma and more.
              </div>
            </div>
          </div>

          {loading && items.length === 0 && (
            <p className="px-1 text-xs text-muted-foreground">Loading…</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
