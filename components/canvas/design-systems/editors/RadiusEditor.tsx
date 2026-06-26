"use client";

import { Slider } from "@/components/ui/slider";

function toRem(v: string): number {
  const rem = (v || "").match(/([\d.]+)\s*rem/);
  if (rem) return parseFloat(rem[1]);
  const px = (v || "").match(/([\d.]+)\s*px/);
  if (px) return parseFloat(px[1]) / 16;
  return 0.5;
}

const SCALE = [
  { label: "sm", mult: "calc(VAR - 4px)" },
  { label: "md", mult: "calc(VAR - 2px)" },
  { label: "lg", mult: "VAR" },
  { label: "xl", mult: "calc(VAR + 4px)" },
];

/** Edit the base `--radius` with a slider + value, and a live shape preview. */
export function RadiusEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const rem = toRem(value);
  const base = value || "0px";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Slider
          value={[rem]}
          min={0}
          max={2}
          step={0.025}
          onValueChange={(v) => onChange(`${v[0]}rem`)}
          className="flex-1"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="h-7 w-20 rounded border bg-transparent px-2 font-mono text-[11px] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[2px]"
        />
      </div>
      <div className="flex items-end gap-4">
        {SCALE.map(({ label, mult }) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <div
              className="size-12 border-2 border-foreground/25 bg-foreground/[0.04]"
              style={{ borderRadius: mult.replace("VAR", base) }}
            />
            <span className="font-mono text-[10px] text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
