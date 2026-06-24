const RADII: { cls: string; label: string }[] = [
  { cls: "rounded-sm", label: "sm" },
  { cls: "rounded-md", label: "md" },
  { cls: "rounded-lg", label: "lg" },
  { cls: "rounded-xl", label: "xl" },
];

const SPACING_STEPS = [4, 8, 12, 16, 24];

export function SpacingRadiusSection({
  tokens,
  meta,
}: {
  tokens: Record<string, string>;
  meta?: Record<string, string>;
}) {
  const radius = tokens["radius"] || meta?.["radius"];
  const spacing = tokens["spacing"] || meta?.["spacing"];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {/* Radius */}
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Radius
          </span>
          {radius && (
            <span className="font-mono text-[10px] text-muted-foreground">
              base {radius}
            </span>
          )}
        </div>
        <div className="flex items-end gap-4">
          {RADII.map(({ cls, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div
                className={`size-12 border-2 border-primary bg-primary/15 ${cls}`}
              />
              <span className="font-mono text-[10px] text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Spacing */}
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Spacing
          </span>
          {spacing && (
            <span className="font-mono text-[10px] text-muted-foreground">
              base {spacing}
            </span>
          )}
        </div>
        <div className="space-y-2">
          {SPACING_STEPS.map((n) => (
            <div key={n} className="flex items-center gap-3">
              <span className="w-6 font-mono text-[10px] text-muted-foreground">
                {n}
              </span>
              <div
                className="h-2.5 rounded-sm bg-primary"
                style={{ width: `calc(var(--spacing, 0.25rem) * ${n})` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
