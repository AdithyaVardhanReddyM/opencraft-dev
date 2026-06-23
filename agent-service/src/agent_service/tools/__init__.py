"""The agent's default tool set (v1).

screenshot_preview / read_preview_logs are deferred behind "Visual Mode" and are
NOT included here. The `finish` tool is added by the runner (it owns the
verification gate), not exported as a generic tool.
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
