"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Trash2,
  KeyRound,
  Plug,
  Loader2,
  ShieldCheck,
  Wand2,
  Boxes,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AGENTS, AgentLogo } from "./agent-logos";

interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: number | null;
  createdAt: number;
}

const KEY_PLACEHOLDER = "oc_YOUR_KEY";
const agentById = (id: string) => AGENTS.find((a) => a.id === id);

type ClientId = "claude-code" | "codex" | "other";

function buildSnippet(client: ClientId, url: string, key: string): string {
  switch (client) {
    case "claude-code":
      return `claude mcp add --transport http opencraft "${url}" \\
  --header "Authorization: Bearer ${key}"`;
    case "codex":
      return `# ~/.codex/config.toml
[mcp_servers.opencraft]
url = "${url}"
http_headers = { Authorization = "Bearer ${key}" }`;
    case "other":
      return `{
  "mcpServers": {
    "opencraft": {
      "type": "http",
      "url": "${url}",
      "headers": { "Authorization": "Bearer ${key}" }
    }
  }
}`;
  }
}

const CLIENT_TABS: { id: ClientId; label: string; hint: string }[] = [
  { id: "claude-code", label: "Claude Code", hint: "Run in your terminal." },
  { id: "codex", label: "Codex", hint: "Add to your Codex config." },
  {
    id: "other",
    label: "Cursor & others",
    hint: "Any MCP-compatible client (Cursor, Windsurf, Claude Desktop, v0…).",
  },
];

/** A monospace block with a copy button. */
function CopyBlock({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(label ? `${label} copied` : "Copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy — copy it manually");
    }
  };
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-lg border border-border/70 bg-muted/40 p-3 pr-11 font-mono text-[12.5px] leading-relaxed text-foreground/90 scrollbar-thin">
        {text}
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy"
        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {copied ? (
          <Check className="size-3.5 text-primary" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  );
}

interface McpConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function McpConnectDialog({ open, onOpenChange }: McpConnectDialogProps) {
  const [endpoint, setEndpoint] = useState("");
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [client, setClient] = useState<ClientId>("claude-code");

  // Endpoint depends on the browser origin — resolve after mount (no SSR drift).
  useEffect(() => {
    if (typeof window !== "undefined") {
      setEndpoint(`${window.location.origin}/api/mcp`);
    }
  }, []);

  const loadKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const res = await fetch("/api/mcp-keys");
      if (res.ok) setKeys(await res.json());
    } catch {
      /* non-fatal — the connect instructions still work */
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  // Refresh keys each time the dialog opens; clear the one-time secret on close.
  useEffect(() => {
    if (open) loadKeys();
    else {
      setNewKey(null);
      setKeyName("");
    }
  }, [open, loadKeys]);

  const generate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/mcp-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() || "Default" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { key: string };
      setNewKey(data.key);
      setKeyName("");
      toast.success("API key created", {
        description: "Copy it now — it won't be shown again.",
      });
      loadKeys();
    } catch {
      toast.error("Couldn't create a key", {
        description: "Make sure you're signed in and try again.",
      });
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      const res = await fetch("/api/mcp-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setKeys((k) => k.filter((x) => x.id !== id));
      toast.success("Key revoked");
    } catch {
      toast.error("Couldn't revoke that key");
    }
  };

  const copyNewKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopiedKey(true);
      toast.success("API key copied");
      setTimeout(() => setCopiedKey(false), 1600);
    } catch {
      toast.error("Couldn't copy — copy it manually");
    }
  };

  const keyForSnippet = newKey ?? KEY_PLACEHOLDER;
  const snippet = buildSnippet(client, endpoint || "<your-app-url>/api/mcp", keyForSnippet);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-xl">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plug className="size-4" />
            </span>
            Connect your agents via MCP
          </DialogTitle>
          <DialogDescription>
            Give Claude Code, Codex, v0 or any MCP client a key, and they can
            spin up sandboxes and design on your canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-1">
          {/* Step 1 — API key */}
          <section className="space-y-3">
            <StepHeading
              n={1}
              icon={<KeyRound className="size-3.5" />}
              title="Create an API key"
            />

            {newKey ? (
              <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/[0.04] p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <ShieldCheck className="size-3.5" />
                  Copy this key now — you won&apos;t see it again.
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md border border-border/70 bg-background px-3 py-2 font-mono text-[12.5px]">
                    {newKey}
                  </code>
                  <Button size="sm" onClick={copyNewKey} className="shrink-0">
                    {copiedKey ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    {copiedKey ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="Key name (e.g. My laptop)"
                  maxLength={60}
                  disabled={creating}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") generate();
                  }}
                />
                <Button onClick={generate} disabled={creating} className="shrink-0">
                  {creating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                  Generate key
                </Button>
              </div>
            )}

            {/* Existing keys */}
            {keys.length > 0 && (
              <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                {keys.map((k) => (
                  <li
                    key={k.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">
                        {k.name}
                      </div>
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        {k.prefix}…{" "}
                        {k.lastUsedAt
                          ? `· used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                          : "· never used"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => revoke(k.id)}
                      aria-label={`Revoke ${k.name}`}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {loadingKeys && keys.length === 0 && (
              <p className="text-xs text-muted-foreground">Loading keys…</p>
            )}
          </section>

          {/* Step 2 — connect */}
          <section className="space-y-3">
            <StepHeading
              n={2}
              icon={<Plug className="size-3.5" />}
              title="Add OpenCraft to your agent"
            />

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Server endpoint
              </label>
              <CopyBlock text={endpoint || "…"} label="Endpoint" />
            </div>

            {/* Client tabs */}
            <div className="flex flex-wrap gap-1.5">
              {CLIENT_TABS.map((t) => {
                const agent = agentById(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setClient(t.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      client === t.id
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {agent ? (
                      <AgentLogo agent={agent} size={14} className="size-3.5" />
                    ) : (
                      <Boxes className="size-3.5" />
                    )}
                    {t.label}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              {CLIENT_TABS.find((t) => t.id === client)?.hint}
            </p>
            <CopyBlock text={snippet} label="Config" />
            {!newKey && (
              <p className="text-xs text-muted-foreground">
                Replace{" "}
                <code className="rounded bg-muted px-1 font-mono">
                  {KEY_PLACEHOLDER}
                </code>{" "}
                with a key from step 1.
              </p>
            )}
          </section>

          {/* Step 3 — what they can do */}
          <section className="space-y-3">
            <StepHeading
              n={3}
              icon={<Wand2 className="size-3.5" />}
              title="What your agent can do"
            />
            <ul className="grid gap-2 sm:grid-cols-2">
              {[
                "Create projects & screens on your canvas",
                "Build in a live sandbox — edits show instantly",
                "Apply your design systems & themes",
                "Place images and read project state",
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm text-foreground/80"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-muted-foreground">Works with</span>
              <div className="flex items-center gap-3">
                {AGENTS.map((agent) => (
                  <span
                    key={agent.id}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70"
                  >
                    <span className="inline-flex size-5 items-center justify-center rounded-[5px] border border-border/60 bg-white">
                      <AgentLogo agent={agent} size={13} className="size-3.5" />
                    </span>
                    {agent.name}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepHeading({
  n,
  icon,
  title,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
        {n}
      </span>
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </h3>
    </div>
  );
}
