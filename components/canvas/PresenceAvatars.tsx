"use client";

import { useCollab } from "@/contexts/CollabContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Overlapping avatars of everyone on the canvas (self + live peers). Each is the
 * user's Clerk profile image with a ring in their presence color; hover shows
 * "You" or the collaborator's name.
 */
export function PresenceAvatars() {
  const { peers, self, enabled } = useCollab();
  if (!enabled) return null;

  const people = [
    { key: "self", label: "You", image: self.image, color: self.color },
    ...peers.map((p) => ({
      key: String(p.clientId),
      label: p.name,
      image: p.image,
      color: p.color,
    })),
  ];

  const shown = people.slice(0, 5);
  const extra = people.length - shown.length;

  return (
    <div className="flex items-center -space-x-2">
      {shown.map((p) => (
        <Tooltip key={p.key}>
          <TooltipTrigger asChild>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image}
              alt={p.label}
              referrerPolicy="no-referrer"
              className="size-7 rounded-full object-cover bg-muted cursor-default"
              // White gap + colored identity ring (Figma-style overlap).
              style={{
                boxShadow: `0 0 0 1.5px var(--background), 0 0 0 3px ${p.color}`,
              }}
            />
          </TooltipTrigger>
          <TooltipContent>{p.label}</TooltipContent>
        </Tooltip>
      ))}
      {extra > 0 && (
        <div
          className="size-7 rounded-full bg-muted text-muted-foreground text-[11px] font-medium flex items-center justify-center"
          style={{ boxShadow: "0 0 0 1.5px var(--background)" }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
