import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import { verifyMcpToken, userIdFromExtra } from "@/lib/mcp/auth";
import {
  createSandbox,
  connectSandbox,
  previewUrl,
  guardCommand,
  type ConnectedSandbox,
} from "@/lib/mcp/sandbox";
import { applyThemeToSandbox } from "@/lib/sandbox/apply-theme";
import {
  appendScreenShape,
  appendImageShape,
  listImageShapes,
} from "@/lib/mcp/canvas-mutations";
import { ApiError } from "@/lib/server/errors";
import { getProjectRole, ROLE_RANK } from "@/lib/db/queries/members";
import { createProject, getAllProjects } from "@/lib/db/queries/projects";
import {
  createScreen as createScreenRow,
  getScreensByProject,
  internalGetScreen,
  internalUpdateScreen,
} from "@/lib/db/queries/screens";
import { listDesignSystems } from "@/lib/db/queries/designSystems";
import {
  THEMES,
  formatScreenTheme,
  type ThemeMode,
} from "@/lib/canvas/theme-utils";
import { uploadImageBuffer } from "@/lib/s3";
import type { ProjectRole } from "@/lib/server/realtime-token";
import type { ScreenDoc } from "@/lib/db/types";

// pg + e2b → Node runtime; the route streams an MCP HTTP response, never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// ---- guardrails surfaced to the (untrusted) external agent ------------------
const SERVER_INSTRUCTIONS = `OpenCraft MCP — build UIs inside a sandbox that renders live as a "screen" on a user's canvas.

Typical flow: list_projects → create_project (if needed) → create_screen (spins up a sandbox + adds it to the canvas) → write_files / run_command to build → apply_design_system to theme. The preview updates live; you do not need to "run" or "deploy" anything.

SANDBOX RULES (the environment is a running Next.js 15 app — respect these or you break the live preview):
- The dev server is ALREADY running on port 3000 with hot reload. NEVER run npm/pnpm/yarn/bun run dev|build|start or next dev|build|start. File writes hot-reload automatically. (run_command enforces this and will reject such commands.)
- Do NOT stop, kill, or restart the dev server or anything on port 3000.
- layout.tsx already exists — never add <html>/<body> or a top-level layout.
- Tailwind v4 + PostCSS are preconfigured. There is NO tailwind.config.js/ts — never create one (a theme.extend config is silently ignored in v4).
- shadcn/ui is already installed (components under @/components/ui). Don't reinstall it; install only NEW deps via 'npm install <pkg> --yes'. Never edit package.json or lockfiles by hand.
- app/globals.css is owned by apply_design_system — change the theme with that tool, not by editing globals.css. If you ever add a font @import, it MUST be the file's first line.
- Use relative paths (e.g. app/page.tsx) — never absolute, never the @/ alias in file paths, never /home/user. Style with Tailwind classes; don't create .css/.scss files.`;

// ---- tool result helpers ----------------------------------------------------
type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function ok(data: unknown): ToolResult {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }] };
}
function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** Run a tool body, mapping thrown ApiError/Error to a clean isError result. */
async function guard(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (e) {
    const msg =
      e instanceof ApiError
        ? e.message
        : e instanceof Error
          ? e.message
          : String(e);
    return fail(`Error: ${msg}`);
  }
}

// ---- access + sandbox plumbing ----------------------------------------------
async function requireProject(
  userId: string,
  projectId: string,
  minRole: ProjectRole = "editor"
): Promise<void> {
  const role = await getProjectRole(userId, projectId);
  if (!role) throw new ApiError(404, "Project not found");
  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new ApiError(403, "Not authorized to access this project");
  }
}

/** Resolve a screen the user may edit, ensuring it has a sandbox bound. */
async function requireScreenWithSandbox(
  userId: string,
  screenId: string,
  minRole: ProjectRole = "editor"
): Promise<{ screen: ScreenDoc; sandboxId: string }> {
  const screen = await internalGetScreen(screenId);
  if (!screen) throw new ApiError(404, "Screen not found");
  await requireProject(userId, screen.projectId, minRole);
  if (!screen.sandboxId) {
    throw new ApiError(400, "Screen has no sandbox yet");
  }
  return { screen, sandboxId: screen.sandboxId };
}

/** Run a shell command in the sandbox, never throwing on non-zero exit. */
async function runInSandbox(
  sandbox: ConnectedSandbox,
  command: string,
  timeoutMs?: number
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const res = await sandbox.commands.run(
      command,
      timeoutMs ? { timeoutMs } : {}
    );
    return {
      exitCode: res.exitCode ?? 0,
      stdout: res.stdout ?? "",
      stderr: res.stderr ?? "",
    };
  } catch (e) {
    const err = e as { exitCode?: number; stdout?: string; stderr?: string };
    return {
      exitCode: err.exitCode ?? 1,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? String(e),
    };
  }
}

/** Merge freshly-written files into the screen's persisted `files` map. */
async function mirrorFiles(
  screenId: string,
  existing: Record<string, string> | undefined,
  written: Record<string, string>
): Promise<void> {
  const merged = { ...(existing ?? {}), ...written };
  await internalUpdateScreen(screenId, { files: merged });
}

// ---- tool registration ------------------------------------------------------
function registerTools(server: McpServer) {
  const uid = (extra: { authInfo?: AuthInfo }) => userIdFromExtra(extra);

  // --- Projects & canvas -----------------------------------------------------
  server.registerTool(
    "list_projects",
    {
      description: "List the authenticated user's projects (id, name, description).",
      inputSchema: {},
    },
    async (_args, extra) =>
      guard(async () => {
        const projects = await getAllProjects(uid(extra));
        return ok(
          projects.map((p) => ({
            id: p._id,
            name: p.name,
            description: p.description ?? null,
          }))
        );
      })
  );

  server.registerTool(
    "create_project",
    {
      description: "Create a new empty project (a canvas). Returns its id.",
      inputSchema: {
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      },
    },
    async (args, extra) =>
      guard(async () => {
        const id = await createProject(uid(extra), args.name, args.description);
        return ok({ projectId: id });
      })
  );

  server.registerTool(
    "create_screen",
    {
      description:
        "Spin up a fresh sandbox (a running Next.js app) and add it to the project's canvas as a screen. Optionally theme it with a design system. Returns { screenId, sandboxId, previewUrl }. Build into it with write_files / run_command afterward.",
      inputSchema: {
        projectId: z.string(),
        title: z.string().max(80).optional(),
        designSystemId: z
          .string()
          .optional()
          .describe("Preset slug or custom design-system uuid (see list_design_systems)."),
        mode: z.enum(["light", "dark"]).optional(),
      },
    },
    async (args, extra) =>
      guard(async () => {
        const userId = uid(extra);
        // createScreenRow enforces editor access on the project.
        const shapeId = nanoid();
        const screenId = await createScreenRow(userId, shapeId, args.projectId);

        const { sandbox, sandboxId, url } = await createSandbox();

        const theme = args.designSystemId
          ? formatScreenTheme(args.designSystemId, args.mode ?? "light")
          : undefined;
        if (args.designSystemId) {
          await applyThemeToSandbox(sandbox, {
            themeId: args.designSystemId,
            mode: args.mode ?? "light",
          });
        }

        await internalUpdateScreen(screenId, {
          sandboxId,
          sandboxUrl: url,
          title: args.title,
          theme,
        });
        await appendScreenShape(args.projectId, shapeId, screenId);

        return ok({ screenId, sandboxId, previewUrl: url });
      })
  );

  server.registerTool(
    "list_screens",
    {
      description: "List the screens on a project's canvas (id, title, sandbox, preview URL).",
      inputSchema: { projectId: z.string() },
    },
    async (args, extra) =>
      guard(async () => {
        const screens = await getScreensByProject(uid(extra), args.projectId);
        return ok(
          screens.map((s) => ({
            screenId: s._id,
            title: s.title ?? null,
            sandboxId: s.sandboxId ?? null,
            previewUrl: s.sandboxUrl ?? null,
            theme: s.theme ?? null,
            route: s.route ?? null,
          }))
        );
      })
  );

  server.registerTool(
    "get_screen",
    {
      description:
        "Get one screen's details: title, preview URL, theme, and the list of file paths currently in its sandbox.",
      inputSchema: { screenId: z.string() },
    },
    async (args, extra) =>
      guard(async () => {
        const { screen } = await requireScreenWithSandbox(
          uid(extra),
          args.screenId,
          "viewer"
        );
        const files = (screen.files as Record<string, string> | undefined) ?? {};
        return ok({
          screenId: screen._id,
          title: screen.title ?? null,
          previewUrl: screen.sandboxUrl ?? null,
          sandboxId: screen.sandboxId ?? null,
          theme: screen.theme ?? null,
          route: screen.route ?? null,
          files: Object.keys(files),
        });
      })
  );

  // --- Sandbox build ---------------------------------------------------------
  server.registerTool(
    "run_command",
    {
      description:
        "Run a shell command in the screen's sandbox (e.g. 'npm install <pkg> --yes', 'ls -la'). Returns exitCode/stdout/stderr. NEVER runs dev/build/start (the dev server is already running on :3000 with hot reload) — such commands are rejected.",
      inputSchema: {
        screenId: z.string(),
        command: z.string().min(1),
        timeoutMs: z.number().int().positive().max(180000).optional(),
      },
    },
    async (args, extra) =>
      guard(async () => {
        const blocked = guardCommand(args.command);
        if (blocked) return fail(blocked);
        const { sandboxId } = await requireScreenWithSandbox(
          uid(extra),
          args.screenId
        );
        const sandbox = await connectSandbox(sandboxId);
        const result = await runInSandbox(sandbox, args.command, args.timeoutMs);
        return ok(result);
      })
  );

  server.registerTool(
    "write_files",
    {
      description:
        "Create or overwrite files in the screen's sandbox. `files` maps relative paths (e.g. 'app/page.tsx') to their full contents. The preview hot-reloads. Don't write tailwind.config.*, package.json, lockfiles, or app/globals.css (use apply_design_system for theming).",
      inputSchema: {
        screenId: z.string(),
        files: z.record(z.string(), z.string()),
      },
    },
    async (args, extra) =>
      guard(async () => {
        const { screen, sandboxId } = await requireScreenWithSandbox(
          uid(extra),
          args.screenId
        );
        const sandbox = await connectSandbox(sandboxId);
        const paths = Object.keys(args.files);
        for (const path of paths) {
          await sandbox.files.write(path, args.files[path]);
        }
        await mirrorFiles(
          screen._id,
          screen.files as Record<string, string> | undefined,
          args.files
        );
        return ok({ written: paths });
      })
  );

  server.registerTool(
    "read_files",
    {
      description: "Read files from the screen's sandbox. Returns a { path: contents } map.",
      inputSchema: {
        screenId: z.string(),
        paths: z.array(z.string()).min(1),
      },
    },
    async (args, extra) =>
      guard(async () => {
        const { sandboxId } = await requireScreenWithSandbox(
          uid(extra),
          args.screenId,
          "viewer"
        );
        const sandbox = await connectSandbox(sandboxId);
        const out: Record<string, string> = {};
        for (const path of args.paths) {
          try {
            out[path] = await sandbox.files.read(path);
          } catch (e) {
            out[path] = `__ERROR__: ${e instanceof Error ? e.message : String(e)}`;
          }
        }
        return ok(out);
      })
  );

  server.registerTool(
    "edit_file",
    {
      description:
        "Search-and-replace within an existing file in the sandbox. Replaces every occurrence of `find` with `replace`. Returns the number of replacements.",
      inputSchema: {
        screenId: z.string(),
        path: z.string(),
        find: z.string().min(1),
        replace: z.string(),
      },
    },
    async (args, extra) =>
      guard(async () => {
        const { screen, sandboxId } = await requireScreenWithSandbox(
          uid(extra),
          args.screenId
        );
        const sandbox = await connectSandbox(sandboxId);
        const before = await sandbox.files.read(args.path);
        if (!before.includes(args.find)) {
          return fail(`Error: \`find\` text not present in ${args.path}.`);
        }
        const after = before.split(args.find).join(args.replace);
        const count = before.split(args.find).length - 1;
        await sandbox.files.write(args.path, after);
        await mirrorFiles(
          screen._id,
          screen.files as Record<string, string> | undefined,
          { [args.path]: after }
        );
        return ok({ path: args.path, replacements: count });
      })
  );

  server.registerTool(
    "apply_design_system",
    {
      description:
        "Apply a design system to the screen's sandbox. Use a preset slug or a custom uuid from list_design_systems. This owns app/globals.css — theme through this tool, not by editing CSS. `mode` toggles light/dark.",
      inputSchema: {
        screenId: z.string(),
        designSystemId: z.string(),
        mode: z.enum(["light", "dark"]).optional(),
      },
    },
    async (args, extra) =>
      guard(async () => {
        const { sandboxId } = await requireScreenWithSandbox(
          uid(extra),
          args.screenId
        );
        const sandbox = await connectSandbox(sandboxId);
        const mode: ThemeMode = args.mode ?? "light";
        const res = await applyThemeToSandbox(sandbox, {
          themeId: args.designSystemId,
          mode,
        });
        if (!res.ok) return fail(`Error: ${res.error}`);
        await internalUpdateScreen(args.screenId, {
          theme: formatScreenTheme(args.designSystemId, mode),
        });
        return ok({ applied: args.designSystemId, mode });
      })
  );

  server.registerTool(
    "get_preview_url",
    {
      description:
        "Resume the screen's sandbox if paused and return its live preview URL (and refresh it on the screen).",
      inputSchema: { screenId: z.string() },
    },
    async (args, extra) =>
      guard(async () => {
        const { sandboxId } = await requireScreenWithSandbox(
          uid(extra),
          args.screenId,
          "viewer"
        );
        const sandbox = await connectSandbox(sandboxId);
        const url = previewUrl(sandbox);
        await internalUpdateScreen(args.screenId, { sandboxUrl: url });
        return ok({ previewUrl: url });
      })
  );

  // --- Design systems --------------------------------------------------------
  server.registerTool(
    "list_design_systems",
    {
      description:
        "List available design systems: built-in presets plus the user's own custom systems. Pass an `id` to create_screen or apply_design_system.",
      inputSchema: {},
    },
    async (_args, extra) =>
      guard(async () => {
        const custom = await listDesignSystems(uid(extra));
        return ok({
          presets: THEMES.map((t) => ({
            id: t.id,
            name: t.name,
            previewColors: t.colors,
          })),
          custom: custom.map((d) => ({
            id: d._id,
            name: d.name,
            previewColors: d.previewColors,
          })),
        });
      })
  );

  // --- Images ----------------------------------------------------------------
  server.registerTool(
    "list_images",
    {
      description: "List images currently on a project's canvas (name + S3 key).",
      inputSchema: { projectId: z.string() },
    },
    async (args, extra) =>
      guard(async () => {
        await requireProject(uid(extra), args.projectId, "viewer");
        return ok(await listImageShapes(args.projectId));
      })
  );

  server.registerTool(
    "place_image",
    {
      description:
        "Place an image on a project's canvas by name. Provide either `imageUrl` (fetched and uploaded) or an existing `s3Key`.",
      inputSchema: {
        projectId: z.string(),
        name: z.string().min(1).max(80),
        imageUrl: z.string().url().optional(),
        s3Key: z.string().optional(),
      },
    },
    async (args, extra) =>
      guard(async () => {
        const userId = uid(extra);
        await requireProject(userId, args.projectId, "editor");

        let s3Key = args.s3Key;
        if (!s3Key) {
          if (!args.imageUrl) {
            return fail("Error: provide either imageUrl or s3Key.");
          }
          if (!/^https?:\/\//i.test(args.imageUrl)) {
            return fail("Error: imageUrl must be an http(s) URL.");
          }
          const resp = await fetch(args.imageUrl);
          if (!resp.ok) {
            return fail(`Error: failed to fetch imageUrl (${resp.status}).`);
          }
          const contentType = resp.headers.get("content-type") || "image/png";
          if (!contentType.startsWith("image/")) {
            return fail("Error: imageUrl did not return an image.");
          }
          const buf = Buffer.from(await resp.arrayBuffer());
          s3Key = await uploadImageBuffer(userId, buf, contentType);
        }

        const shape = await appendImageShape(args.projectId, {
          s3Key,
          name: args.name,
        });
        return ok({ name: shape.name, s3Key: shape.s3Key });
      })
  );
}

// ---- handler wiring ---------------------------------------------------------
const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {
    serverInfo: { name: "opencraft", version: "1.0.0" },
    instructions: SERVER_INSTRUCTIONS,
  },
  {
    // Route lives at app/api/[transport]/route.ts → endpoint is /api/mcp.
    basePath: "/api",
    maxDuration: 120,
    verboseLogs: process.env.NODE_ENV !== "production",
    // SSE transport needs Redis; we only serve stateless streamable HTTP.
    disableSse: true,
  }
);

// Require a valid bearer token (an OpenCraft API key) on every request.
const authed = withMcpAuth(handler, verifyMcpToken, { required: true });

export { authed as GET, authed as POST, authed as DELETE };
