// Exported so the design-system editor edits exactly the swatches shown here.
export const COLOR_SWATCHES: { key: string; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "foreground", label: "Foreground" },
  { key: "card", label: "Card" },
  { key: "card-foreground", label: "Card FG" },
  { key: "popover", label: "Popover" },
  { key: "popover-foreground", label: "Popover FG" },
  { key: "primary", label: "Primary" },
  { key: "primary-foreground", label: "Primary FG" },
  { key: "secondary", label: "Secondary" },
  { key: "secondary-foreground", label: "Secondary FG" },
  { key: "muted", label: "Muted" },
  { key: "muted-foreground", label: "Muted FG" },
  { key: "accent", label: "Accent" },
  { key: "accent-foreground", label: "Accent FG" },
  { key: "destructive", label: "Destructive" },
  { key: "border", label: "Border" },
  { key: "input", label: "Input" },
  { key: "ring", label: "Ring" },
  { key: "chart-1", label: "Chart 1" },
  { key: "chart-2", label: "Chart 2" },
  { key: "chart-3", label: "Chart 3" },
  { key: "chart-4", label: "Chart 4" },
  { key: "chart-5", label: "Chart 5" },
  { key: "sidebar", label: "Sidebar" },
  { key: "sidebar-primary", label: "Sidebar Primary" },
  { key: "sidebar-accent", label: "Sidebar Accent" },
];

export function ColorPaletteSection({
  tokens,
}: {
  tokens: Record<string, string>;
}) {
  const items = COLOR_SWATCHES.filter((s) => tokens[s.key]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <div
            className="h-12 w-full rounded-md border border-foreground/10"
            style={{ backgroundColor: `var(--${key})` }}
          />
          <div className="min-w-0">
            <div className="truncate text-xs font-medium">{label}</div>
            <div className="truncate font-mono text-[10px] text-muted-foreground">
              {tokens[key]}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
