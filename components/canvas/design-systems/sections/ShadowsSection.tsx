const SHADOWS: { key: string; cls: string; label: string }[] = [
  { key: "shadow-2xs", cls: "shadow-2xs", label: "2xs" },
  { key: "shadow-xs", cls: "shadow-xs", label: "xs" },
  { key: "shadow-sm", cls: "shadow-sm", label: "sm" },
  { key: "shadow", cls: "shadow", label: "base" },
  { key: "shadow-md", cls: "shadow-md", label: "md" },
  { key: "shadow-lg", cls: "shadow-lg", label: "lg" },
  { key: "shadow-xl", cls: "shadow-xl", label: "xl" },
  { key: "shadow-2xl", cls: "shadow-2xl", label: "2xl" },
];

export function ShadowsSection({
  tokens,
}: {
  tokens: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
      {SHADOWS.map(({ key, cls, label }) => {
        // Prefer the theme's explicit shadow string; fall back to the utility
        // class (resolves to the app default) when a preset omits the token.
        const value = tokens[key];
        return (
          <div key={key} className="flex flex-col items-center gap-2">
            <div
              className={value ? "h-16 w-full rounded-lg bg-card" : `h-16 w-full rounded-lg bg-card ${cls}`}
              style={value ? { boxShadow: value } : undefined}
            />
            <span className="font-mono text-[10px] text-muted-foreground">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
