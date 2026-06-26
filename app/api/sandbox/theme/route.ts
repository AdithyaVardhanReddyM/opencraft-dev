import { NextRequest, NextResponse } from "next/server";
import Sandbox from "@e2b/code-interpreter";
import { applyThemeToSandbox } from "@/lib/sandbox/apply-theme";

export const runtime = "nodejs";

// Auto-pause timeout for sandboxes (15 minutes)
const SANDBOX_AUTO_PAUSE_TIMEOUT_MS = 15 * 60 * 1000;

// applyHtmlDarkClass now lives in lib/sandbox/apply-theme (shared with the MCP
// server); re-exported here for any importers of this route module.
export { applyHtmlDarkClass } from "@/lib/sandbox/apply-theme";

export async function POST(request: NextRequest) {
  try {
    const { sandboxId, themeId, mode } = await request.json();

    if (!sandboxId) {
      return NextResponse.json(
        { error: "sandboxId is required" },
        { status: 400 }
      );
    }

    const dark = mode === "dark";

    // Connect to the sandbox (auto-resumes if paused).
    const sandbox = await Sandbox.connect(sandboxId, {
      timeoutMs: SANDBOX_AUTO_PAUSE_TIMEOUT_MS,
    });

    // Install the theme only when a themeId is provided. Mode-only flips omit
    // themeId so the helper skips the (slow) reinstall and just re-toggles dark.
    const result = await applyThemeToSandbox(sandbox, { themeId, mode });
    if (!result.ok) {
      if (result.details) console.error("Theme command failed:", result.details);
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      themeId: themeId ?? null,
      mode: dark ? "dark" : "light",
    });
  } catch (error) {
    console.error("Error applying theme:", error);
    return NextResponse.json(
      { error: "Failed to apply theme", details: String(error) },
      { status: 500 }
    );
  }
}
