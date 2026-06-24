function familyName(stack?: string) {
  if (!stack) return "—";
  return stack.split(",")[0].replace(/['"]/g, "").trim();
}

export function TypographySection({
  tokens,
  meta,
}: {
  tokens: Record<string, string>;
  meta?: Record<string, string>;
}) {
  const get = (key: string) => tokens[key] || meta?.[key];
  const sans = get("font-sans");
  const serif = get("font-serif");
  const mono = get("font-mono");

  return (
    <div className="space-y-5">
      {/* Sans — heading scale */}
      <div style={{ fontFamily: sans }}>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sans
          </span>
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            {familyName(sans)}
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-semibold leading-tight">
            The spectacle before us was indeed sublime.
          </p>
          <p className="text-base text-muted-foreground">
            Almost before we knew it, we had left the ground.
          </p>
        </div>
      </div>

      {/* Serif */}
      <div style={{ fontFamily: serif }}>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Serif
          </span>
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            {familyName(serif)}
          </span>
        </div>
        <p className="text-xl">
          A wonderful serenity has taken possession of my entire soul.
        </p>
      </div>

      {/* Mono */}
      <div style={{ fontFamily: mono }}>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Mono
          </span>
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            {familyName(mono)}
          </span>
        </div>
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          const designSystem = await loadTheme(id);
        </p>
      </div>
    </div>
  );
}
