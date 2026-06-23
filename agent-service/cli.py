#!/usr/bin/env python3
"""CLI smoke-test for the agent — runs one turn with NO database.

The agent-service is stateless, so the CLI just hands it a synthetic screen and
prints the streamed frames + the final result (which Next.js would persist).

    python cli.py "build a SaaS landing page"
    python cli.py --thinking "build a brutalist coffee shop site"
    python cli.py --sandbox-id <id> "make the hero bigger"   # reuse a sandbox

Reusing a sandbox simulates a follow-up turn; for a true follow-up you'd also
pass the prior files/file_meta, but for a quick smoke test the sandbox is enough.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

# Allow `python cli.py` from the project root without installing the package.
sys.path.insert(0, "src")

from agent_service.runner.harness import run_turn  # noqa: E402


async def _main(args: argparse.Namespace) -> int:
    screen: dict = {}
    if args.sandbox_id:
        screen["sandbox_id"] = args.sandbox_id
    if args.route:
        screen["route"] = args.route

    rc = 0
    async for frame in run_turn(
        message=args.message,
        screen=screen,
        history=[],
        model_id=args.model,
        thinking=args.thinking,
    ):
        t = frame.get("type")
        if t == "text":
            sys.stdout.write(frame["text"])
            sys.stdout.flush()
        elif t == "reasoning":
            sys.stdout.write(f"\n\033[2m[thinking] {frame['text']}\033[0m\n")
        elif t == "tool":
            print(f"\n\033[36m· {frame['name']}\033[0m")
        elif t == "sandbox":
            print(f"\n\033[35m▷ preview: {frame['sandboxUrl']}\033[0m")
        elif t == "notice":
            print(f"\n\033[33m! {frame['message']}\033[0m")
        elif t == "result":
            print(f"\n\n\033[32m✓ result\033[0m — {frame.get('title') or '(no title)'}")
            print(f"  {frame.get('summary', '')}")
            if frame.get("route"):
                print(f"  route: {frame['route']}")
            print(f"  files: {len(frame.get('files') or {})}  changes: {len(frame.get('changes') or [])}")
            print(f"  preview: {frame.get('sandboxUrl')}")
            if args.dump:
                with open(args.dump, "w") as f:
                    json.dump(frame, f, indent=2)
                print(f"  (full result written to {args.dump})")
        elif t == "error":
            print(f"\n\033[31m✗ {frame['message']}\033[0m")
            rc = 1
    return rc


def main() -> None:
    p = argparse.ArgumentParser(description="OpenCraft agent CLI (stateless smoke test)")
    p.add_argument("message", help="the user prompt")
    p.add_argument("--model", default=None, help="UI model id (default: Sonnet 4.6)")
    p.add_argument("--thinking", action="store_true", help="enable extended thinking")
    p.add_argument("--sandbox-id", default=None, help="reuse an existing E2B sandbox")
    p.add_argument("--route", default=None, help="active-screen route (e.g. /pricing)")
    p.add_argument("--dump", default=None, help="write the full result frame to this JSON file")
    args = p.parse_args()
    raise SystemExit(asyncio.run(_main(args)))


if __name__ == "__main__":
    main()
