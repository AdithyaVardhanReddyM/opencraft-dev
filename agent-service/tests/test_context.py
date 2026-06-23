"""Unit tests for the pure context-assembly logic (no DB / network / sandbox)."""

from __future__ import annotations

import sys

sys.path.insert(0, "src")

from agent_service.context import history, repo_map
from agent_service.context.assembler import build_turn
from agent_service.context.file_meta import (
    build_anchor,
    changed_paths,
    derive_route_from_changes,
    merge_changes,
    page_file_to_route,
    route_to_page_file,
)


# ---- repo_map -------------------------------------------------------------


def test_repo_map_empty():
    out = repo_map.render(None, None, None)
    assert "empty project" in out


def test_repo_map_lists_files_with_descriptions_and_markers():
    files = {"app/page.tsx": "...", "components/hero.tsx": "..."}
    meta = {
        "app/page.tsx": {"description": "landing page", "status": "active"},
        "components/hero.tsx": {"description": "Hero", "status": "active"},
    }
    out = repo_map.render(files, meta, ["components/hero.tsx"])
    assert "app/page.tsx — landing page" in out
    assert "components/hero.tsx — Hero" in out
    assert "▸ components/hero.tsx" in out  # recently edited marker
    assert "edited last turn" in out


def test_repo_map_drops_deleted():
    files = {"app/page.tsx": "..."}
    meta = {"old.tsx": {"description": "x", "status": "deleted"}}
    out = repo_map.render(files, meta, None)
    assert "old.tsx" not in out


# ---- file_meta ------------------------------------------------------------


def test_route_to_page_file():
    assert route_to_page_file(None) == "app/page.tsx"
    assert route_to_page_file("/") == "app/page.tsx"
    assert route_to_page_file("/pricing") == "app/pricing/page.tsx"


def test_page_file_to_route():
    assert page_file_to_route("app/page.tsx") is None
    assert page_file_to_route("app/pricing/page.tsx") == "/pricing"
    assert page_file_to_route("app/(shop)/cart/page.tsx") == "/cart"
    assert page_file_to_route("components/hero.tsx") is None


def test_anchor_mentions_route_and_file():
    out = build_anchor({"route": "/pricing"})
    assert "/pricing" in out
    assert "app/pricing/page.tsx" in out


def test_merge_changes_and_changed_paths():
    changes = [
        {"path": "app/page.tsx", "action": "updated", "description": "home"},
        {"path": "old.tsx", "action": "deleted", "description": ""},
    ]
    meta = merge_changes({"existing.tsx": {"description": "e", "status": "active"}}, changes)
    assert meta["app/page.tsx"]["status"] == "active"
    assert meta["app/page.tsx"]["description"] == "home"
    assert meta["old.tsx"]["status"] == "deleted"
    assert meta["existing.tsx"]["status"] == "active"  # untouched preserved
    assert set(changed_paths(changes)) == {"app/page.tsx", "old.tsx"}


def test_derive_route_from_changes():
    changes = [
        {"path": "components/cart.tsx", "action": "created"},
        {"path": "app/checkout/page.tsx", "action": "created"},
    ]
    assert derive_route_from_changes(changes) == "/checkout"


# ---- history --------------------------------------------------------------


def test_clean_assistant_prefers_summary_block():
    raw = "<title>X</title>\n<task_summary>noise</task_summary>\n<summary>Made the hero bigger.</summary>"
    assert history.clean_assistant_text(raw) == "Made the hero bigger."


def test_clean_assistant_strips_legacy_blob():
    raw = "Built a landing page.\n\n<files_summary>\n- app/page.tsx: home\n</files_summary>"
    cleaned = history.clean_assistant_text(raw)
    assert "Built a landing page." in cleaned
    assert "files_summary" not in cleaned


def test_to_messages_shapes_and_skips_empty():
    rows = [
        {"role": "user", "content": "build a page"},
        {"role": "assistant", "content": "<summary>Done.</summary>"},
        {"role": "assistant", "content": "<summary></summary>"},  # empty -> skipped
    ]
    msgs = history.to_messages(rows)
    assert msgs == [
        {"role": "user", "content": [{"text": "build a page"}]},
        {"role": "assistant", "content": [{"text": "Done."}]},
    ]


# ---- assembler ------------------------------------------------------------


def test_build_turn_wraps_anchor_and_repo_map_in_current_turn():
    screen = {
        "route": "/",
        "files": {"app/page.tsx": "..."},
        "file_meta": {"app/page.tsx": {"description": "home", "status": "active"}},
        "recent_edits": [],
        "parent_screen_id": None,
    }
    prior = [{"role": "user", "content": "build it"}, {"role": "assistant", "content": "<summary>Built.</summary>"}]
    system_prompt, history_msgs, current_text = build_turn(screen, prior, "make it blue")

    assert "expert UI coding agent" in system_prompt
    assert "finish" in system_prompt.lower()
    assert len(history_msgs) == 2
    assert "<active_screen>" in current_text
    assert "<repo_map>" in current_text
    assert current_text.strip().endswith("make it blue")


def test_build_turn_includes_flow_addendum_for_flow_screens():
    screen = {"route": "/checkout", "parent_screen_id": "abc", "files": {}}
    system_prompt, _, _ = build_turn(screen, [], "add checkout")
    assert "Flow Page" in system_prompt
