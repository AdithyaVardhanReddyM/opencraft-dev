import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "@e2b/code-interpreter";
import {
  removeScriptFromLayout,
  hasEditModeScript,
} from "@/lib/edit-mode/overlay-script";
import type { EditModeResponse } from "@/lib/edit-mode/types";

// Auto-pause timeout for sandboxes (15 minutes)
const SANDBOX_TIMEOUT_MS = 15 * 60 * 1000;

// Path for the edit mode script in the sandbox's public folder
const EDIT_MODE_SCRIPT_PATH = "/home/user/public/__edit-mode__.js";

// Layout file paths to try
const LAYOUT_PATHS = [
  "/home/user/app/layout.tsx",
  "/home/user/src/app/layout.tsx",
];

// In-memory storage for original layout content (shared with enable route ideally via Redis/DB)
const originalLayoutStore = new Map<
  string,
  { path: string; content: string }
>();

/**
 * POST /api/sandbox/edit-mode/disable
 * Removes the edit mode overlay script and restores the layout file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sandboxId } = body;

    if (!sandboxId) {
      return NextResponse.json<EditModeResponse>(
        { success: false, error: "sandboxId is required" },
        { status: 400 }
      );
    }

    // Connect to the sandbox
    let sandbox: Sandbox;
    try {
      sandbox = await Sandbox.connect(sandboxId, {
        timeoutMs: SANDBOX_TIMEOUT_MS,
      });
    } catch (error) {
      console.error("Failed to connect to sandbox:", error);
      return NextResponse.json<EditModeResponse>(
        {
          success: false,
          error: "Failed to connect to sandbox. The session may have expired.",
        },
        { status: 503 }
      );
    }

    // Try to delete the edit mode script file
    try {
      await sandbox.commands.run(`rm -f ${EDIT_MODE_SCRIPT_PATH}`);
    } catch (error) {
      console.error("Failed to remove edit mode script:", error);
    }

    // Try to restore original layout or remove the script tag
    const stored = originalLayoutStore.get(sandboxId);
    if (stored) {
      try {
        await sandbox.files.write(stored.path, stored.content);
        originalLayoutStore.delete(sandboxId);
      } catch (error) {
        console.error("Failed to restore original layout:", error);
      }
    } else {
      // Try to find and clean the layout file
      for (const path of LAYOUT_PATHS) {
        try {
          const content = await sandbox.files.read(path);
          if (hasEditModeScript(content)) {
            const cleanedContent = removeScriptFromLayout(content);
            // Also remove the Script import if we added it
            const finalContent = cleanedContent.replace(
              /import Script from "next\/script";\n?/g,
              ""
            );
            await sandbox.files.write(path, finalContent);
            break;
          }
        } catch {
          continue;
        }
      }
    }

    return NextResponse.json<EditModeResponse>({
      success: true,
    });
  } catch (error) {
    console.error("Unexpected error disabling edit mode:", error);
    return NextResponse.json<EditModeResponse>(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
