import type { TextShape } from "@/types/canvas";

export interface TextDimensions {
  width: number;
  height: number;
}

export const TEXT_PLACEHOLDER = "Type something...";
export const TEXT_MIN_WIDTH = 24;
export const TEXT_MAX_WIDTH = 1200;
const AVG_CHAR_WIDTH_RATIO = 0.55;

let measureCanvas: HTMLCanvasElement | null = null;
let measureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (measureContext) return measureContext;
  measureCanvas = document.createElement("canvas");
  measureContext = measureCanvas.getContext("2d");
  return measureContext;
}

function buildFontString(
  shape: Pick<TextShape, "fontSize" | "fontFamily" | "fontWeight" | "fontStyle">
): string {
  const fontStyle = shape.fontStyle ?? "normal";
  const fontWeight = shape.fontWeight ?? 400;
  return `${fontStyle} ${fontWeight} ${shape.fontSize}px ${shape.fontFamily}`;
}

function applyTextTransform(
  value: string,
  transform: TextShape["textTransform"] | undefined
): string {
  switch (transform) {
    case "uppercase":
      return value.toUpperCase();
    case "lowercase":
      return value.toLowerCase();
    case "capitalize":
      return value.replace(/\b\w/g, (char) => char.toUpperCase());
    default:
      return value;
  }
}

export function getMinTextHeight(fontSize: number, lineHeight: number): number {
  const baseline = fontSize * lineHeight;
  return Math.max(fontSize, baseline);
}

export function clampTextDimensions(
  width: number,
  height: number,
  fontSize: number,
  lineHeight: number
): TextDimensions {
  return {
    width: Math.min(
      TEXT_MAX_WIDTH,
      Math.max(TEXT_MIN_WIDTH, width || TEXT_MIN_WIDTH)
    ),
    height: Math.max(
      getMinTextHeight(fontSize, lineHeight),
      height || getMinTextHeight(fontSize, lineHeight)
    ),
  };
}

export function measureTextDimensions(
  shape: Pick<
    TextShape,
    | "text"
    | "fontSize"
    | "fontFamily"
    | "fontWeight"
    | "fontStyle"
    | "lineHeight"
    | "letterSpacing"
    | "textTransform"
  >,
  overrideText?: string
): TextDimensions {
  const ctx = getMeasureContext();
  const text = (overrideText ?? shape.text ?? TEXT_PLACEHOLDER).replace(
    /\r/g,
    ""
  );
  const lines = text.split("\n");
  let maxWidth = 0;

  if (ctx) {
    ctx.font = buildFontString(shape);
  }

  for (const line of lines) {
    const rawLine = line.length > 0 ? line : " ";
    const transformedLine = applyTextTransform(rawLine, shape.textTransform);
    const baseWidth =
      ctx?.measureText(transformedLine).width ??
      transformedLine.length * shape.fontSize * AVG_CHAR_WIDTH_RATIO;
    const spacingWidth =
      shape.letterSpacing * Math.max(transformedLine.length - 1, 0);
    maxWidth = Math.max(maxWidth, baseWidth + spacingWidth);
  }

  const rawHeight = lines.length * shape.fontSize * shape.lineHeight;
  return clampTextDimensions(
    maxWidth,
    rawHeight,
    shape.fontSize,
    shape.lineHeight
  );
}

export function getTextShapeDimensions(shape: TextShape): TextDimensions {
  if (typeof shape.w === "number" && typeof shape.h === "number") {
    return clampTextDimensions(
      shape.w,
      shape.h,
      shape.fontSize,
      shape.lineHeight
    );
  }

  return measureTextDimensions(shape);
}
