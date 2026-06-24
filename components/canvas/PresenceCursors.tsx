"use client";

import { useCollab } from "@/contexts/CollabContext";
import { worldToScreen } from "@/lib/canvas/coordinate-utils";
import type { ViewportState } from "@/types/canvas";

/**
 * Full-screen overlay rendering remote collaborators' cursors. Peer cursors are
 * stored in WORLD coordinates (so they're viewport-independent); we project them
 * to screen space with the local viewport so each viewer sees them in the right
 * place regardless of their own pan/zoom. The cursor glyph itself does not scale.
 */
export function PresenceCursors({ viewport }: { viewport: ViewportState }) {
  const { peers } = useCollab();

  return (
    <div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden">
      {peers.map((peer) => {
        if (!peer.cursor) return null;
        const { x, y } = worldToScreen(
          peer.cursor,
          viewport.translate,
          viewport.scale
        );
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return (
          <div
            key={peer.clientId}
            className="absolute left-0 top-0 will-change-transform"
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))" }}
            >
              <path
                d="M5.5 3.5L18 11l-6.2 1.2L9 18.5 5.5 3.5z"
                fill={peer.color}
                stroke="white"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="ml-3 -mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: peer.color }}
            >
              {peer.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
