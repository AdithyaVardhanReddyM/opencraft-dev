"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { McpConnectDialog } from "./McpConnectDialog";
import { AGENTS, AgentLogo } from "./agent-logos";

/**
 * Dashboard hero banner inviting users to connect external AI agents (Claude
 * Code, Codex, v0, …) to their projects over MCP. The "Connect" button opens
 * McpConnectDialog with key generation + per-client setup instructions.
 */
export function McpConnectBanner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-blue-100/80 bg-gradient-to-br from-sky-50 via-white to-cyan-50/70 shadow-sm">
        {/* soft cyan glow, top-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_92%_-10%,rgba(96,196,242,0.18),transparent_60%)]"
        />

        <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-8">
          {/* Left — copy */}
          <div className="max-w-xl shrink-0">
            <h2 className="text-[1.6rem] font-semibold leading-[1.12] tracking-[-0.02em] text-foreground sm:text-[1.85rem]">
              Bring your favourite agents to your{" "}
              <span className="text-primary">canvas</span>
            </h2>

            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Connect Claude Code, Codex, v0 or any MCP client, they spin up
              live sandboxes and build right on your projects.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <Button onClick={() => setOpen(true)} className="group">
                Connect
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Set up in seconds
              </span>
            </div>
          </div>

          {/* Right — agent → canvas beams (compact, centered in the leftover space) */}
          <div className="hidden flex-1 justify-center lg:flex">
            <BeamDiagram />
          </div>
        </div>
      </section>

      <McpConnectDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function NodeTile({
  refProp,
  className,
  children,
}: {
  refProp: React.RefObject<HTMLDivElement | null>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={refProp}
      className={`z-10 flex items-center justify-center rounded-xl border border-border/70 bg-white ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/** Three named agent nodes connected to a central "OpenCraft" node via beams. */
function BeamDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const claudeRef = useRef<HTMLDivElement>(null);
  const codexRef = useRef<HTMLDivElement>(null);
  const v0Ref = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const agentRefs = [claudeRef, codexRef, v0Ref];

  return (
    <div
      ref={containerRef}
      className="relative flex h-[180px] w-[540px] items-center justify-between"
    >
      {/* left: named agent column (tiles right-aligned so they share one line) */}
      <div className="flex flex-col items-end gap-4">
        {AGENTS.map((agent, i) => (
          <div key={agent.id} className="flex items-center gap-2.5">
            <span className="whitespace-nowrap text-sm font-semibold text-foreground">
              {agent.name}
            </span>
            <NodeTile refProp={agentRefs[i]} className="size-11 shadow-sm">
              <AgentLogo agent={agent} size={24} className="size-6" />
            </NodeTile>
          </div>
        ))}
      </div>

      {/* right: hub */}
      <div className="flex items-center gap-2.5">
        <NodeTile
          refProp={hubRef}
          className="size-14 rounded-2xl border-primary/20 shadow-sm"
        >
          <Image
            src="/opencraft_logo.svg"
            alt="OpenCraft"
            width={30}
            height={30}
            className="size-[30px] object-contain"
          />
        </NodeTile>
        <span className="whitespace-nowrap text-sm font-semibold text-foreground">
          OpenCraft
        </span>
      </div>

      {/* beams: agents → hub */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={claudeRef}
        toRef={hubRef}
        curvature={30}
        duration={3.5}
        gradientStartColor="#2b86d9"
        gradientStopColor="#60c4f2"
        pathColor="#cbd5e1"
        pathWidth={1.5}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={codexRef}
        toRef={hubRef}
        curvature={0}
        duration={3.5}
        delay={0.5}
        gradientStartColor="#2b86d9"
        gradientStopColor="#60c4f2"
        pathColor="#cbd5e1"
        pathWidth={1.5}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={v0Ref}
        toRef={hubRef}
        curvature={-30}
        duration={3.5}
        delay={1}
        gradientStartColor="#2b86d9"
        gradientStopColor="#60c4f2"
        pathColor="#cbd5e1"
        pathWidth={1.5}
      />
    </div>
  );
}
