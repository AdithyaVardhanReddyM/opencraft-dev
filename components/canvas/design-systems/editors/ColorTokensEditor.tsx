"use client";

import { COLOR_SWATCHES } from "@/components/canvas/design-systems/sections/ColorPaletteSection";

function isHex(v: string) {
  return /^#([0-9a-fA-F]{3,8})$/.test(v.trim());
}

/**
 * Edit-in-place color palette: the same swatch-on-top / value-below layout as the
 * read-only ColorPaletteSection, but each swatch opens the native picker and each
 * value is an editable field. The raw text is the source of truth (accepts oklch /
 * hsl / hex); the picker writes hex. The swatch renders the raw value directly
 * (browsers render `oklch(...)`), so it stays accurate either way.
 */
export function ColorTokensEditor({
  tokens,
  onChange,
}: {
  tokens: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3">
      {COLOR_SWATCHES.map(({ key, label }) => {
        const value = tokens[key] ?? "";
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="group relative h-12 w-full overflow-hidden rounded-md border border-foreground/10 ring-offset-1 ring-offset-background transition-shadow hover:ring-2 hover:ring-ring/40">
              <div
                className="absolute inset-0"
                style={{ backgroundColor: value || "transparent" }}
              />
              <input
                type="color"
                aria-label={`Pick ${label} color`}
                value={isHex(value) ? value : "#000000"}
                onChange={(e) => onChange(key, e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium">{label}</div>
              <input
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                spellCheck={false}
                className="mt-0.5 h-6 w-full rounded border border-transparent bg-transparent px-1 font-mono text-[10px] text-muted-foreground outline-none transition-colors hover:border-border focus:border-ring focus:text-foreground"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
