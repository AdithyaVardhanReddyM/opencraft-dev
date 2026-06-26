import Image from "next/image";
import { cn } from "@/lib/utils";

/** Agent brand logos (real images from /public) used by the MCP banner + modal. */
export interface Agent {
  id: string;
  name: string;
  src: string;
}

export const AGENTS: Agent[] = [
  { id: "claude-code", name: "Claude Code", src: "/claude_code.png" },
  { id: "codex", name: "Codex", src: "/codex.png" },
  { id: "v0", name: "v0", src: "/v0.png" },
];

export function AgentLogo({
  agent,
  size = 24,
  className,
}: {
  agent: Agent;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={agent.src}
      alt={agent.name}
      width={size}
      height={size}
      className={cn("object-contain", className)}
    />
  );
}
