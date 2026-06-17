import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "@e2b/code-interpreter";

// Auto-pause timeout for sandboxes (15 minutes)
const SANDBOX_TIMEOUT_MS = 15 * 60 * 1000;

// Project root inside the sandbox and the archive we produce. Everything must
// live under the user's home: the E2B envd file API (files.write / downloadUrl)
// is restricted to /home/user and denies access to paths like /tmp.
//
// We archive with `tar` (always present on the Linux base) rather than `zip` or
// `python3`, which are not installed in the sandbox template.
const PROJECT_ROOT = "/home/user";
const ARCHIVE_NAME = "opencraft-project.tar.gz";
const ARCHIVE_PATH = `${PROJECT_ROOT}/${ARCHIVE_NAME}`;

// Directories that should never be included in the downloadable archive.
const EXCLUDE_DIRS = ["node_modules", ".next", ".git"];

/**
 * GET /api/sandbox/download
 * Archive the entire project in the sandbox and redirect to a pre-signed
 * E2B download URL so the browser/curl pulls the bytes directly from E2B.
 *
 * Query params:
 * - sandboxId: E2B sandbox ID
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sandboxId = searchParams.get("sandboxId");

  if (!sandboxId) {
    return NextResponse.json(
      { error: "sandboxId is required" },
      { status: 400 }
    );
  }

  // Connect to the sandbox (auto-resumes if paused).
  let sandbox: Sandbox;
  try {
    sandbox = await Sandbox.connect(sandboxId, {
      timeoutMs: SANDBOX_TIMEOUT_MS,
    });
  } catch (error) {
    console.error("Failed to connect to sandbox:", error);
    return NextResponse.json(
      { error: "Failed to connect to sandbox. The session may have expired." },
      { status: 503 }
    );
  }

  try {
    // Build the archive inside the sandbox with tar, excluding heavy/derived
    // directories, the archive file itself, and OverlayFS whiteout markers
    // (".wh.*") which exist on the container FS but can't be read as files.
    // Bare (non-anchored) patterns so they match at any depth.
    const excludes = [...EXCLUDE_DIRS, ARCHIVE_NAME, ".wh.*"]
      .map((name) => `--exclude='${name}'`)
      .join(" ");

    // tar exits 1 for benign warnings ("file changed as we read it" — the
    // archive grows inside the dir being read) and 2 for real errors.
    // --ignore-failed-read downgrades unreadable files; we accept exit <= 1.
    // commands.run THROWS a CommandExitError on a non-zero exit (it does not
    // return a result), so capture stdout/stderr from the thrown error.
    try {
      await sandbox.commands.run(
        `rm -f "${ARCHIVE_PATH}" && ` +
          `tar -czf "${ARCHIVE_PATH}" -C "${PROJECT_ROOT}" ` +
          `--ignore-failed-read --warning=no-file-changed ${excludes} . ; ` +
          `ec=$? ; if [ "$ec" -le 1 ]; then exit 0 ; else exit "$ec" ; fi`
      );
    } catch (cmdError) {
      const e = cmdError as {
        stderr?: string;
        stdout?: string;
        exitCode?: number;
      };
      const detail = e.stderr || e.stdout || (cmdError as Error)?.message;
      console.error("Failed to archive project:", {
        exitCode: e.exitCode,
        stderr: e.stderr,
        stdout: e.stdout,
      });
      return NextResponse.json(
        { error: `Failed to archive project: ${detail || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Pre-signed URL pointing directly at the sandbox — bytes skip our server.
    const downloadUrl = await sandbox.downloadUrl(ARCHIVE_PATH);

    return NextResponse.redirect(downloadUrl, 302);
  } catch (error) {
    console.error("Unexpected error in sandbox download API:", error);
    return NextResponse.json(
      {
        error: `Failed to prepare download: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
