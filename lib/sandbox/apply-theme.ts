import "server-only";
import type Sandbox from "@e2b/code-interpreter";
import {
  getThemeCommand,
  isPresetThemeId,
  DEFAULT_GLOBALS_CSS,
  type ThemeMode,
} from "@/lib/canvas/theme-utils";
import { buildGlobalsCss } from "@/lib/canvas/build-globals-css";
import { internalGetDesignSystem } from "@/lib/db/queries/designSystems";

/**
 * Apply a design system to a live sandbox. Shared by the browser route
 * (`/api/sandbox/theme`) and the MCP `apply_design_system` tool so there is one
 * implementation of the preset-vs-custom + dark-mode logic.
 */

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

async function applyMode(
  sandbox: ConnectedSandbox,
  dark: boolean
): Promise<void> {
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

export type ApplyThemeResult =
  | { ok: true }
  | { ok: false; status: number; error: string; details?: string };

/**
 * Install a design system into a connected sandbox, then toggle dark mode.
 * - `themeId` undefined/null → mode-only flip (skip the slow reinstall).
 * - preset slug → its shadcn add command (or DEFAULT_GLOBALS_CSS for "default").
 * - custom uuid → buildGlobalsCss(tokens) written straight in (no shadcn).
 */
export async function applyThemeToSandbox(
  sandbox: ConnectedSandbox,
  opts: { themeId?: string | null; mode?: ThemeMode }
): Promise<ApplyThemeResult> {
  const dark = opts.mode === "dark";
  const { themeId } = opts;

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
          return {
            ok: false,
            status: 500,
            error: "Failed to apply theme",
            details: result.stderr,
          };
        }
      }
    } else {
      // Custom design system (uuid): generate globals.css from stored tokens.
      const ds = await internalGetDesignSystem(themeId);
      if (!ds) {
        return { ok: false, status: 404, error: "Design system not found" };
      }
      await sandbox.files.write("app/globals.css", buildGlobalsCss(ds.tokens));
    }
  }

  await applyMode(sandbox, dark);
  return { ok: true };
}
