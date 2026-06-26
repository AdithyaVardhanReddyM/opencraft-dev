"use client";

import * as React from "react";
import {
  Sun,
  Moon,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  Globe,
  Code2,
  Paintbrush,
  Eye,
  Pencil,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getThemeTokens, type ThemeTokens } from "@/lib/canvas/theme-tokens";
import {
  parseDesignSystemInput,
  isParseError,
} from "@/lib/canvas/parse-design-system";
import { ThemePreviewScope } from "@/components/canvas/design-systems/ThemePreviewScope";
import { ColorPaletteSection } from "@/components/canvas/design-systems/sections/ColorPaletteSection";
import { TypographySection } from "@/components/canvas/design-systems/sections/TypographySection";
import { SpacingRadiusSection } from "@/components/canvas/design-systems/sections/SpacingRadiusSection";
import { ShadowsSection } from "@/components/canvas/design-systems/sections/ShadowsSection";
import { ExampleComponentsShowcase } from "@/components/canvas/design-systems/sections/ExampleComponentsShowcase";
import { ColorTokensEditor } from "@/components/canvas/design-systems/editors/ColorTokensEditor";
import { TypographyEditor } from "@/components/canvas/design-systems/editors/TypographyEditor";
import { RadiusEditor } from "@/components/canvas/design-systems/editors/RadiusEditor";
import { createDesignSystem } from "@/lib/api/mutations";
import { toast } from "sonner";

type Mode = "light" | "dark";
type Source = "web" | "css" | "manual";

// The phases the web-import agent streams back (matches the `progress` step ids
// emitted by agent-service/extract_design.py). The UI ticks each off live.
const EXTRACT_STEPS = [
  { id: "fetch", label: "Loading the website" },
  { id: "capture", label: "Capturing screenshot & styles" },
  { id: "analyze", label: "Analyzing colors & typography" },
  { id: "build", label: "Assembling your design system" },
];

function cloneDefaultTokens(): ThemeTokens {
  const base = getThemeTokens("default");
  return base
    ? (JSON.parse(JSON.stringify(base)) as ThemeTokens)
    : { theme: {}, light: {}, dark: {} };
}

/** Pull the JSON payload out of one SSE frame block (its `data:` lines). */
function parseSseData(raw: string): Record<string, unknown> | null {
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return null;
  try {
    return JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Live checklist of the extraction phases — `active` is a step id or "done". */
function ExtractionSteps({ active }: { active: string | null }) {
  const activeIdx =
    active === "done"
      ? EXTRACT_STEPS.length
      : active
        ? EXTRACT_STEPS.findIndex((s) => s.id === active)
        : 0;
  return (
    <ol className="rounded-lg border bg-muted/30 p-3.5">
      {EXTRACT_STEPS.map((s, i) => {
        const status =
          i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
        const last = i === EXTRACT_STEPS.length - 1;
        return (
          <li key={s.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  status === "done" &&
                    "border-emerald-500 bg-emerald-500 text-white",
                  status === "active" && "border-primary text-primary",
                  status === "pending" && "border-muted-foreground/25"
                )}
              >
                {status === "done" ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : status === "active" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                )}
              </span>
              {!last && (
                <span
                  className={cn(
                    "my-0.5 w-0.5 flex-1 rounded-full transition-colors",
                    i < activeIdx ? "bg-emerald-500" : "bg-border"
                  )}
                  style={{ minHeight: 14 }}
                />
              )}
            </div>
            <span
              className={cn(
                "pb-3.5 text-sm leading-5",
                status === "pending"
                  ? "text-muted-foreground"
                  : "text-foreground",
                status === "active" && "font-medium"
              )}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="inline-flex shrink-0 items-center rounded-md border p-0.5">
      {(["light", "dark"] as const).map((m) => {
        const Icon = m === "light" ? Sun : Moon;
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={cn(
              "flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium capitalize transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            {m}
          </button>
        );
      })}
    </div>
  );
}

function Note({
  tone,
  children,
}: {
  tone: "error" | "warning";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      )}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function EditorSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

interface CreateDesignSystemPanelProps {
  /** Called with the new id after a successful create (rail selects it). */
  onCreated?: (id: string) => void;
}

export function CreateDesignSystemPanel({
  onCreated,
}: CreateDesignSystemPanelProps) {
  const [tokens, setTokens] = React.useState<ThemeTokens | null>(null);
  const [name, setName] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("light");
  const [tab, setTab] = React.useState<"edit" | "preview">("edit");
  const [source, setSource] = React.useState<Source>("manual");
  const [sourceUrl, setSourceUrl] = React.useState("");
  const [warnings, setWarnings] = React.useState<string[]>([]);

  // Import-step state
  const [urlInput, setUrlInput] = React.useState("");
  const [cssInput, setCssInput] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [activeStep, setActiveStep] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const handleParseCss = () => {
    setImportError(null);
    const result = parseDesignSystemInput(cssInput);
    if (isParseError(result)) {
      setImportError(result.error);
      return;
    }
    setTokens(result.tokens);
    setWarnings(result.warnings);
    setSource("css");
  };

  const handleExtractWeb = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setImporting(true);
    setImportError(null);
    setWarnings([]);
    setActiveStep("fetch"); // optimistic; real progress frames advance it
    try {
      const res = await fetch("/api/design-systems/import-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok || !res.body) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.error || `Extraction failed (${res.status})`);
      }

      // Read the SSE stream: `progress` frames tick the checklist; the final
      // `design_system` frame carries the tokens (or an error).
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let result: Record<string, unknown> | null = null;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const raw of parts) {
          if (!raw.trim()) continue;
          const frame = parseSseData(raw);
          if (!frame) continue;
          if (frame.type === "progress" && typeof frame.step === "string") {
            setActiveStep(frame.step);
          } else if (frame.type === "design_system") {
            result = frame;
          } else if (frame.type === "error") {
            throw new Error(String(frame.message ?? "Extraction failed"));
          }
        }
      }
      if (buffer.trim()) {
        const frame = parseSseData(buffer);
        if (frame?.type === "design_system") result = frame;
      }

      if (!result) throw new Error("No design system was returned.");
      if (result.error) throw new Error(String(result.error));
      setActiveStep("done");
      setTokens(result.tokens as ThemeTokens);
      setName(String(result.name ?? "").slice(0, 60));
      setSource("web");
      setSourceUrl(url);
    } catch (e) {
      setImportError(
        e instanceof Error ? e.message : "Could not extract a design system."
      );
      setActiveStep(null);
    } finally {
      setImporting(false);
    }
  };

  const handleBlank = () => {
    setTokens(cloneDefaultTokens());
    setSource("manual");
    setWarnings([]);
  };

  // ---- token updaters (immutable) -----------------------------------------
  const updateModeToken = (key: string, value: string) =>
    setTokens((prev) => {
      if (!prev) return prev;
      const target = mode === "dark" ? "dark" : "light";
      return { ...prev, [target]: { ...prev[target], [key]: value } };
    });

  const updateThemeToken = (key: string, value: string) =>
    setTokens((prev) =>
      prev ? { ...prev, theme: { ...prev.theme, [key]: value } } : prev
    );

  const updateRadius = (value: string) =>
    setTokens((prev) =>
      prev
        ? {
            theme: { ...prev.theme, radius: value },
            light: { ...prev.light, radius: value },
            dark: { ...prev.dark, radius: value },
          }
        : prev
    );

  const handleCreate = async () => {
    if (!tokens) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Give your design system a name.");
      return;
    }
    setSaving(true);
    try {
      const previewColors: [string, string, string] = [
        tokens.light.primary ?? tokens.light.foreground ?? "",
        tokens.light.secondary ?? tokens.light.muted ?? "",
        tokens.light.accent ?? tokens.light.secondary ?? "",
      ];
      const id = await createDesignSystem({
        name: trimmed,
        source,
        sourceUrl: source === "web" ? sourceUrl : null,
        tokens,
        previewColors,
      });
      toast.success("Design system created");
      onCreated?.(id);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not create design system"
      );
    } finally {
      setSaving(false);
    }
  };

  // ---- import chooser ------------------------------------------------------
  if (!tokens) {
    return (
      <ScrollArea className="h-full">
        <div className="mx-auto max-w-xl space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Create a design system</h2>
            <p className="text-sm text-muted-foreground">
              Import one from a website or your CSS, or start from the default —
              then fine-tune the colors, type, and radius before saving.
            </p>
          </div>

          <Tabs
            defaultValue="web"
            onValueChange={() => setImportError(null)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="web" className="gap-1.5">
                <Globe className="size-3.5" /> From web
              </TabsTrigger>
              <TabsTrigger value="css" className="gap-1.5">
                <Code2 className="size-3.5" /> From CSS
              </TabsTrigger>
              <TabsTrigger value="blank" className="gap-1.5">
                <Paintbrush className="size-3.5" /> Blank
              </TabsTrigger>
            </TabsList>

            <TabsContent value="web" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Extract a design system from any website. We screenshot the page
                and read its colors, typography, and radius.
              </p>
              <div className="flex gap-2">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleExtractWeb()}
                  placeholder="https://example.com"
                  disabled={importing}
                  className="h-9 flex-1 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                />
                <Button
                  onClick={handleExtractWeb}
                  disabled={importing || !urlInput.trim()}
                >
                  {importing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Extracting…
                    </>
                  ) : (
                    "Extract"
                  )}
                </Button>
              </div>
              {importing && <ExtractionSteps active={activeStep} />}
              {importError && <Note tone="error">{importError}</Note>}
            </TabsContent>

            <TabsContent value="css" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Paste shadcn CSS variables (the <code>:root</code> /{" "}
                <code>.dark</code> blocks), a tweakcn theme JSON, or a Tailwind
                config.
              </p>
              <Textarea
                value={cssInput}
                onChange={(e) => setCssInput(e.target.value)}
                rows={10}
                spellCheck={false}
                placeholder={":root {\n  --background: oklch(1 0 0);\n  --primary: oklch(0.21 0 0);\n  ...\n}"}
                className="font-mono text-xs"
              />
              <div className="flex items-center gap-3">
                <Button onClick={handleParseCss} disabled={!cssInput.trim()}>
                  Parse
                </Button>
                <span className="text-xs text-muted-foreground">
                  Missing tokens are filled from the default theme.
                </span>
              </div>
              {importError && <Note tone="error">{importError}</Note>}
            </TabsContent>

            <TabsContent value="blank" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Start from the default theme and customize every token by hand.
              </p>
              <Button onClick={handleBlank}>Start from default</Button>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    );
  }

  // ---- editor --------------------------------------------------------------
  const active = mode === "dark" ? tokens.dark : tokens.light;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTokens(null)}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" /> Back
        </Button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Name your design system"
          className="h-8 min-w-0 flex-1 rounded-md border bg-transparent px-3 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        <ModeToggle mode={mode} onChange={setMode} />
        <Button onClick={handleCreate} disabled={saving || !name.trim()}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Creating…
            </>
          ) : (
            "Create"
          )}
        </Button>
      </div>

      {warnings.length > 0 && (
        <div className="border-b px-4 py-2">
          <Note tone="warning">
            {warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </Note>
        </div>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "edit" | "preview")}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="border-b px-4 py-2">
          <TabsList>
            <TabsTrigger value="edit" className="px-3">
              <Pencil className="size-3.5" /> Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="px-3">
              <Eye className="size-3.5" /> Preview
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Edit — every token edited in place, full width */}
        <TabsContent value="edit" className="min-h-0">
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-3xl space-y-8 p-6">
              <EditorSection
                title={`Colors · ${mode}`}
                hint="Click a swatch to pick a color, or edit its value. Toggle Light/Dark to edit each mode."
              >
                <ColorTokensEditor tokens={active} onChange={updateModeToken} />
              </EditorSection>
              <EditorSection title="Typography">
                <TypographyEditor
                  theme={tokens.theme}
                  onChange={updateThemeToken}
                />
              </EditorSection>
              <EditorSection title="Radius">
                <RadiusEditor
                  value={tokens.theme.radius ?? active.radius ?? ""}
                  onChange={updateRadius}
                />
              </EditorSection>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Preview — the whole system, themed, like the preset detail view */}
        <TabsContent value="preview" className="min-h-0">
          <ScrollArea className="h-full">
            <ThemePreviewScope
              tokens={active}
              meta={tokens.theme}
              className="min-h-full"
            >
              <div className="mx-auto max-w-3xl space-y-8 p-6">
                <EditorSection title="Components">
                  <ExampleComponentsShowcase />
                </EditorSection>
                <EditorSection title="Colors">
                  <ColorPaletteSection tokens={active} />
                </EditorSection>
                <EditorSection title="Typography">
                  <TypographySection tokens={active} meta={tokens.theme} />
                </EditorSection>
                <EditorSection title="Spacing & radius">
                  <SpacingRadiusSection tokens={active} meta={tokens.theme} />
                </EditorSection>
                <EditorSection title="Shadows">
                  <ShadowsSection tokens={active} />
                </EditorSection>
              </div>
            </ThemePreviewScope>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
