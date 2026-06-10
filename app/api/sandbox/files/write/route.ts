import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "@e2b/code-interpreter";
import type { WriteFileResponse } from "@/lib/edit-mode/types";

// Auto-pause timeout for sandboxes (15 minutes)
const SANDBOX_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * POST /api/sandbox/files/write
 * Write file content to the sandbox
 *
 * Request body:
 * - sandboxId: E2B sandbox ID
 * - path: File path to write
 * - content: File content
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sandboxId, path, content } = body;

    if (!sandboxId) {
      return NextResponse.json<WriteFileResponse>(
        { success: false, error: "sandboxId is required" },
        { status: 400 }
      );
    }

    if (!path) {
      return NextResponse.json<WriteFileResponse>(
        { success: false, error: "path is required" },
        { status: 400 }
      );
    }

    if (content === undefined) {
      return NextResponse.json<WriteFileResponse>(
        { success: false, error: "content is required" },
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
      return NextResponse.json<WriteFileResponse>(
        {
          success: false,
          error: "Failed to connect to sandbox. The session may have expired.",
        },
        { status: 503 }
      );
    }

    // Write file content
    try {
      await sandbox.files.write(path, content);

      return NextResponse.json<WriteFileResponse>({
        success: true,
      });
    } catch (error) {
      console.error("Failed to write file:", error);
      return NextResponse.json<WriteFileResponse>(
        {
          success: false,
          error: `Failed to write file: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in sandbox file write API:", error);
    return NextResponse.json<WriteFileResponse>(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
