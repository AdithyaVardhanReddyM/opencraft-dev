import { NextRequest, NextResponse } from "next/server";
import Sandbox from "@e2b/code-interpreter";
import {
  getThemeCommand,
  isPresetThemeId,
  DEFAULT_GLOBALS_CSS,
} from "@/lib/canvas/theme-utils";
import { buildGlobalsCss } from "@/lib/canvas/build-globals-css";
import { internalGetDesignSystem } from "@/lib/db/queries/designSystems";

export const runtime = "nodejs";

// Auto-pause timeout for sandboxes (15 minutes)
const SANDBOX_AUTO_PAUSE_TIMEOUT_MS = 15 * 60 * 1000;

type ConnectedSandbox = Awaited<ReturnType<typeof Sandbox.connect>>;

// Same layout locations the edit-mode routes use.
const LAYOUT_PATHS = ["app/layout.tsx", "src/app/layout.tsx"];

/**
 * Add or remove the `dark` class on the <html> tag of a sandbox layout. The
 * installed globals.css already carries both `:root` and `.dark` token blocks
 * (plus `@custom-variant dark (&:is(.dark *))`), so toggling this class is all
 * that's needed to switch a preset between light and dark.
 */
export function applyHtmlDarkClass(layout: string, dark: boolean): string {
  return layout.replace(/<html([^>]*)>/, (match, attrs: string) => {
    // className as a string literal: className="..." or className='...'
    const strMatch = attrs.match(/\sclassName\s*=\s*("([^"]*)"|'([^']*)')/);
    if (strMatch) {
      const classes = new Set(
        (strMatch[2] ?? strMatch[3] ?? "").split(/\s+/).filter(Boolean)
      );
      if (dark) classes.add("dark");
      else classes.delete("dark");
      const next = [...classes].join(" ");
      const newAttrs = next
        ? attrs.replace(strMatch[0], ` className="${next}"`)
        : attrs.replace(strMatch[0], "");
      return `<html${newAttrs}>`;
    }
    // className as an expression (className={...}) — can't safely merge a string
    // literal, so leave it untouched rather than emit a duplicate attribute.
    if (/\sclassName\s*=\s*\{/.test(attrs)) {
      return match;
    }
    // No className present (the stock create-next-app layout).
    return dark ? `<html${attrs} className="dark">` : match;
  });
}

async function applyMode(sandbox: ConnectedSandbox, dark: boolean): Promise<void> {
  for (const path of LAYOUT_PATHS) {
    let content: string;
    try {
      content = await sandbox.files.read(path);
    } catch {
      continue; // try the next candidate path
    }
    const next = applyHtmlDarkClass(content, dark);
    if (next !== content) {
      await sandbox.files.write(path, next);
    }
    return;
  }
}

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

    // Connect to the sandbox
    const sandbox = await Sandbox.connect(sandboxId, {
      timeoutMs: SANDBOX_AUTO_PAUSE_TIMEOUT_MS,
    });

    // Install the theme only when a themeId is provided. Mode-only flips omit
    // themeId so we skip the (slow) reinstall and just re-toggle the layout.
    if (themeId !== undefined && themeId !== null) {
      if (isPresetThemeId(themeId)) {
        const command = getThemeCommand(themeId);
        if (!command) {
          // Default preset: write the baked default globals.css.
          await sandbox.files.write("app/globals.css", DEFAULT_GLOBALS_CSS);
        } else {
          const result = await sandbox.commands.run(command, {
            timeoutMs: 60000, // 60s for npm/shadcn install
          });

          if (result.exitCode !== 0) {
            console.error("Theme command failed:", result.stderr);
            return NextResponse.json(
              { error: "Failed to apply theme", details: result.stderr },
              { status: 500 }
            );
          }
        }
      } else {
        // Custom design system (uuid): no shadcn command — generate its
        // globals.css from the stored tokens and write it straight in. Fast
        // (no npm install) and the dark toggle below works identically.
        const ds = await internalGetDesignSystem(themeId);
        if (!ds) {
          return NextResponse.json(
            { error: "Design system not found" },
            { status: 404 }
          );
        }
        await sandbox.files.write(
          "app/globals.css",
          buildGlobalsCss(ds.tokens)
        );
      }
    }

    // Activate/deactivate dark mode by toggling the <html> class in the layout.
    await applyMode(sandbox, dark);

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
