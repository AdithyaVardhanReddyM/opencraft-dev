import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "@e2b/code-interpreter";
import {
  OVERLAY_SCRIPT,
  generateScriptBlock,
  generateImportStatement,
  hasEditModeScript,
  SCRIPT_START_MARKER,
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

// In-memory storage for original layout content
const originalLayoutStore = new Map<
  string,
  { path: string; content: string }
>();

/**
 * POST /api/sandbox/edit-mode/enable
 * Creates the edit mode overlay script file and modifies layout to load it
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

    // Write the edit mode script to the public folder
    try {
      await sandbox.files.write(EDIT_MODE_SCRIPT_PATH, OVERLAY_SCRIPT);
    } catch (error) {
      console.error("Failed to write edit mode script:", error);
      return NextResponse.json<EditModeResponse>(
        {
          success: false,
          error: "Failed to create edit mode script",
        },
        { status: 500 }
      );
    }

    // Find and modify the layout file to include the Script component
    let layoutPath: string | null = null;
    let layoutContent: string | null = null;

    for (const path of LAYOUT_PATHS) {
      try {
        layoutContent = await sandbox.files.read(path);
        layoutPath = path;
        break;
      } catch {
        continue;
      }
    }

    if (layoutPath && layoutContent) {
      // Check if already has edit mode script
      if (!hasEditModeScript(layoutContent)) {
        // Store original for restoration
        originalLayoutStore.set(sandboxId, {
          path: layoutPath,
          content: layoutContent,
        });

        // Add import if not present
        let modifiedContent = layoutContent;
        if (!modifiedContent.includes('import Script from "next/script"')) {
          // Add import after the last import statement
          const lastImportMatch = modifiedContent.match(/^import .+$/gm);
          if (lastImportMatch) {
            const lastImport = lastImportMatch[lastImportMatch.length - 1];
            modifiedContent = modifiedContent.replace(
              lastImport,
              `${lastImport}\n${generateImportStatement()}`
            );
          }
        }

        // Add Script component before </body>
        const scriptBlock = generateScriptBlock();
        if (modifiedContent.includes("</body>")) {
          modifiedContent = modifiedContent.replace(
            "</body>",
            `${scriptBlock}\n            </body>`
          );
        }

        // Write modified layout
        try {
          await sandbox.files.write(layoutPath, modifiedContent);
        } catch (error) {
          console.error("Failed to modify layout file:", error);
          // Continue anyway - script is in public folder
        }
      }
    }

    return NextResponse.json<EditModeResponse>({
      success: true,
    });
  } catch (error) {
    console.error("Unexpected error enabling edit mode:", error);
    return NextResponse.json<EditModeResponse>(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

// Export the store for the disable route to access
export { originalLayoutStore, EDIT_MODE_SCRIPT_PATH };
