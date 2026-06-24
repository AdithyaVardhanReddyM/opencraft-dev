"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TokenRecord = Record<string, string>;

interface ThemePreviewScopeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Light or dark token record for the selected design system. */
  tokens: TokenRecord;
  /** The design system's `theme` record (fonts, radius, tracking). */
  meta?: TokenRecord;
}

/**
 * Applies a design system's token values as inline CSS custom properties so the
 * app's `@theme inline` utilities (bg-card, text-foreground, rounded-lg,
 * shadow-sm, ...) resolve against this theme within the subtree. Because
 * app/globals.css maps every `--color-*`/radius/shadow token to a raw var
 * (e.g. `--color-card: var(--card)`), overriding the raw `--card` here cascades
 * to all descendants. Preview-only — never touches the global `.dark` class.
 */
export function ThemePreviewScope({
  tokens,
  meta,
  className,
  style,
  children,
  ...props
}: ThemePreviewScopeProps) {
  const cssVars = React.useMemo(() => {
    const vars: Record<string, string> = {};
    const apply = (rec?: TokenRecord) => {
      if (!rec) return;
      for (const [key, value] of Object.entries(rec)) {
        if (value == null || value === "") continue;
        vars[`--${key}`] = value;
      }
    };
    // meta (fonts/radius/tracking) first, then the mode record so light/dark
    // values win for any shared key such as `radius`.
    apply(meta);
    apply(tokens);
    return vars;
  }, [tokens, meta]);

  const fontSans = tokens["font-sans"] || meta?.["font-sans"];

  return (
    <div
      className={cn("bg-background text-foreground", className)}
      style={
        {
          ...cssVars,
          ...(fontSans ? { fontFamily: fontSans } : {}),
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
}
