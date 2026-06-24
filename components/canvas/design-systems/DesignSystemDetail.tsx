import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getThemeById } from "@/lib/canvas/theme-utils";
import { getThemeTokens } from "@/lib/canvas/theme-tokens";
import { ThemePreviewScope } from "@/components/canvas/design-systems/ThemePreviewScope";
import { ColorPaletteSection } from "@/components/canvas/design-systems/sections/ColorPaletteSection";
import { TypographySection } from "@/components/canvas/design-systems/sections/TypographySection";
import { SpacingRadiusSection } from "@/components/canvas/design-systems/sections/SpacingRadiusSection";
import { ShadowsSection } from "@/components/canvas/design-systems/sections/ShadowsSection";
import { ExampleComponentsShowcase } from "@/components/canvas/design-systems/sections/ExampleComponentsShowcase";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

interface DesignSystemDetailProps {
  themeId: string;
  mode: "light" | "dark";
}

export function DesignSystemDetail({ themeId, mode }: DesignSystemDetailProps) {
  const meta = getThemeById(themeId);
  const tokens = getThemeTokens(themeId);
  const name = meta?.name ?? themeId;

  if (!tokens) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        No preview data for this design system.
      </div>
    );
  }

  const active = mode === "dark" ? tokens.dark : tokens.light;

  return (
    <ScrollArea className="h-full">
      <ThemePreviewScope
        tokens={active}
        meta={tokens.theme}
        className="min-h-full space-y-8 p-5"
      >
        <div>
          <h2 className="text-xl font-semibold">{name}</h2>
          <p className="text-sm text-muted-foreground">
            Live preview of the {name} design system.
          </p>
        </div>
        <Section title="Colors">
          <ColorPaletteSection tokens={active} />
        </Section>
        <Section title="Typography">
          <TypographySection tokens={active} meta={tokens.theme} />
        </Section>
        <Section title="Spacing & radius">
          <SpacingRadiusSection tokens={active} meta={tokens.theme} />
        </Section>
        <Section title="Shadows">
          <ShadowsSection tokens={active} />
        </Section>
        <Section title="Components">
          <ExampleComponentsShowcase />
        </Section>
      </ThemePreviewScope>
    </ScrollArea>
  );
}
