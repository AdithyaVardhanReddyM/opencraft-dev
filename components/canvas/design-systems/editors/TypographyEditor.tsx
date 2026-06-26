"use client";

const FONTS: { key: string; label: string; sample: string; cls: string }[] = [
  {
    key: "font-sans",
    label: "Sans",
    sample: "The spectacle before us was indeed sublime.",
    cls: "text-2xl font-semibold leading-tight",
  },
  {
    key: "font-serif",
    label: "Serif",
    sample: "A wonderful serenity has taken possession of my soul.",
    cls: "text-xl",
  },
  {
    key: "font-mono",
    label: "Mono",
    sample: "const theme = await loadDesignSystem(id);",
    cls: "text-sm",
  },
];

/**
 * Edit-in-place typography: edit each font stack inline and see the specimen
 * re-render in that family immediately (tokens.theme).
 */
export function TypographyEditor({
  theme,
  onChange,
}: {
  theme: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      {FONTS.map(({ key, label, sample, cls }) => {
        const value = theme[key] ?? "";
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
              <input
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                spellCheck={false}
                placeholder="font-family stack"
                className="h-7 min-w-0 flex-1 rounded-md border bg-transparent px-2 font-mono text-[11px] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[2px]"
              />
            </div>
            <p
              className={`truncate ${cls}`}
              style={{ fontFamily: value || undefined }}
            >
              {sample}
            </p>
          </div>
        );
      })}
    </div>
  );
}
