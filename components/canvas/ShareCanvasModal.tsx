"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  createInviteLink,
  listProjectMembers,
  removeProjectMember,
  type ProjectMember,
  type ProjectRole,
} from "@/lib/api/collab";

interface ShareCanvasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ShareCanvasModal({
  open,
  onOpenChange,
  projectId,
}: ShareCanvasModalProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [myRole, setMyRole] = useState<ProjectRole | null>(null);
  const [linkRole, setLinkRole] = useState<Exclude<ProjectRole, "owner">>(
    "editor"
  );
  const [inviteUrl, setInviteUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = myRole === "owner";

  const refresh = useCallback(async () => {
    try {
      const res = await listProjectMembers(projectId);
      setMembers(res.members);
      setMyRole(res.role);
    } catch {
      /* realtime/membership not configured — leave roster empty */
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      refresh();
      setInviteUrl("");
      setCopied(false);
    }
  }, [open, refresh]);

  const handleCreateLink = async () => {
    setCreating(true);
    try {
      const { url } = await createInviteLink(projectId, linkRole);
      setInviteUrl(url);
      pendo.track("collab_invite_link_created", {
        project_id: projectId,
        role: linkRole,
      });
    } catch {
      /* surfaced via the disabled/empty state */
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can still select the text */
    }
  };

  const handleRemove = async (userId: string) => {
    await removeProjectMember(projectId, userId).catch(() => {});
    refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2 border-primary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Share & collaborate
          </DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Create an invite link so others can edit this canvas in real time."
              : "People with access to this canvas."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isOwner && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <RoleToggle
                  value={linkRole}
                  onChange={(r) => {
                    setLinkRole(r);
                    setInviteUrl("");
                  }}
                />
                <Button
                  variant="ghost"
                  onClick={handleCreateLink}
                  disabled={creating}
                  className="ml-auto gap-2"
                >
                  {creating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Link2 className="size-4" />
                  )}
                  Create link
                </Button>
              </div>

              {inviteUrl && (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              People with access
            </p>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
              <MemberRow label="Owner" role="owner" />
              {members.map((m) => (
                <MemberRow
                  key={m.userId}
                  label={m.userId}
                  role={m.role}
                  onRemove={isOwner ? () => handleRemove(m.userId) : undefined}
                />
              ))}
              {members.length === 0 && (
                <p className="text-xs text-muted-foreground/70 px-1 py-2">
                  No collaborators yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoleToggle({
  value,
  onChange,
}: {
  value: Exclude<ProjectRole, "owner">;
  onChange: (r: Exclude<ProjectRole, "owner">) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
      {(["editor", "viewer"] as const).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`px-2.5 py-1 rounded capitalize transition-colors ${
            value === r
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function MemberRow({
  label,
  role,
  onRemove,
}: {
  label: string;
  role: ProjectRole;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2">
      <span className="truncate font-mono text-xs">{label}</span>
      <span className="ml-auto text-xs text-muted-foreground capitalize">
        {role}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Remove member"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
