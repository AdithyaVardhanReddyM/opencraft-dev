import { NextRequest, NextResponse } from "next/server";
import Sandbox from "@e2b/code-interpreter";
import { getThemeCommand, DEFAULT_GLOBALS_CSS } from "@/lib/canvas/theme-utils";

// Auto-pause timeout for sandboxes (15 minutes)
const SANDBOX_AUTO_PAUSE_TIMEOUT_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { sandboxId, themeId } = await request.json();

    if (!sandboxId) {
      return NextResponse.json(
        { error: "sandboxId is required" },
        { status: 400 }
      );
    }

    if (!themeId) {
      return NextResponse.json(
        { error: "themeId is required" },
        { status: 400 }
      );
    }

    // Connect to the sandbox
    const sandbox = await Sandbox.connect(sandboxId, {
      timeoutMs: SANDBOX_AUTO_PAUSE_TIMEOUT_MS,
    });

    // Get the theme command
    const command = getThemeCommand(themeId);

    // If default theme, write the default globals.css
    if (!command) {
      await sandbox.files.write("app/globals.css", DEFAULT_GLOBALS_CSS);
      return NextResponse.json({
        success: true,
        themeId,
        message: "Default theme applied",
      });
    }

    // Execute the theme command
    const result = await sandbox.commands.run(command, {
      timeoutMs: 60000, // 60 second timeout for npm install
    });

    if (result.exitCode !== 0) {
      console.error("Theme command failed:", result.stderr);
      return NextResponse.json(
        { error: "Failed to apply theme", details: result.stderr },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      themeId,
      output: result.stdout,
    });
  } catch (error) {
    console.error("Error applying theme:", error);
    return NextResponse.json(
      { error: "Failed to apply theme", details: String(error) },
      { status: 500 }
    );
  }
}
