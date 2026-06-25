"""The agent's default tool set (v1).

The Visual Mode tool (`check_preview`, tools/visual.py) is NOT in this set — the
runner adds it only when the per-turn `visual_mode` flag is on, alongside `finish`
(which owns the verification gate). Neither is exported as a generic default tool.
"""

from .files import create_files, edit_file, read_files
from .scrape import scrape_webpage
from .search import search_project
from .terminal import terminal

# Order is cosmetic; Strands caches the tool defs as part of the prefix.
DEFAULT_TOOLS = [
    terminal,
    create_files,
    edit_file,
    read_files,
    search_project,
    scrape_webpage,
]

__all__ = [
    "DEFAULT_TOOLS",
    "terminal",
    "create_files",
    "edit_file",
    "read_files",
    "search_project",
    "scrape_webpage",
]
