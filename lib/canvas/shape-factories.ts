import { nanoid } from "nanoid";
import type {
  FrameShape,
  RectShape,
  EllipseShape,
  FreeDrawShape,
  ArrowShape,
  LineShape,
  TextShape,
  GeneratedUIShape,
  Point,
} from "@/types/canvas";

// Default shape styling
export const SHAPE_DEFAULTS = {
  stroke: "#ffff",
  strokeWidth: 2,
} as const;

/**
 * Create a frame shape
 */
export function createFrame(params: {
  x: number;
  y: number;
  w: number;
  h: number;
  frameNumber: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): FrameShape {
  return {
    id: nanoid(),
    type: "frame",
    x: params.x,
    y: params.y,
    w: params.w,
    h: params.h,
    frameNumber: params.frameNumber,
    stroke: "transparent",
    strokeWidth: 0,
    fill: params.fill ?? "rgba(255, 255, 255, 0.05)",
  };
}

/**
 * Create a rectangle shape
 */
export function createRect(params: {
  x: number;
  y: number;
  w: number;
  h: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): RectShape {
  return {
    id: nanoid(),
    type: "rect",
    x: params.x,
    y: params.y,
    w: params.w,
    h: params.h,
    stroke: params.stroke ?? SHAPE_DEFAULTS.stroke,
    strokeWidth: params.strokeWidth ?? SHAPE_DEFAULTS.strokeWidth,
    fill: params.fill ?? null,
  };
}

/**
 * Create an ellipse shape
 */
export function createEllipse(params: {
  x: number;
  y: number;
  w: number;
  h: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): EllipseShape {
  return {
    id: nanoid(),
    type: "ellipse",
    x: params.x,
    y: params.y,
    w: params.w,
    h: params.h,
    stroke: params.stroke ?? SHAPE_DEFAULTS.stroke,
    strokeWidth: params.strokeWidth ?? SHAPE_DEFAULTS.strokeWidth,
    fill: params.fill ?? null,
  };
}

/**
 * Create a freedraw shape
 */
export function createFreeDraw(params: {
  points: Point[];
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): FreeDrawShape {
  return {
    id: nanoid(),
    type: "freedraw",
    points: params.points,
    stroke: params.stroke ?? SHAPE_DEFAULTS.stroke,
    strokeWidth: params.strokeWidth ?? SHAPE_DEFAULTS.strokeWidth,
    fill: params.fill ?? null,
  };
}

/**
 * Create an arrow shape
 */
export function createArrow(params: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): ArrowShape {
  return {
    id: nanoid(),
    type: "arrow",
    startX: params.startX,
    startY: params.startY,
    endX: params.endX,
    endY: params.endY,
    stroke: params.stroke ?? SHAPE_DEFAULTS.stroke,
    strokeWidth: params.strokeWidth ?? SHAPE_DEFAULTS.strokeWidth,
    fill: params.fill ?? null,
  };
}

/**
 * Create a line shape
 */
export function createLine(params: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): LineShape {
  return {
    id: nanoid(),
    type: "line",
    startX: params.startX,
    startY: params.startY,
    endX: params.endX,
    endY: params.endY,
    stroke: params.stroke ?? SHAPE_DEFAULTS.stroke,
    strokeWidth: params.strokeWidth ?? SHAPE_DEFAULTS.strokeWidth,
    fill: params.fill ?? null,
  };
}

/**
 * Create a text shape
 */
export function createText(params: {
  x: number;
  y: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  textDecoration?: "none" | "underline" | "line-through";
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
}): TextShape {
  return {
    id: nanoid(),
    type: "text",
    x: params.x,
    y: params.y,
    text: params.text ?? "Type here...",
    fontSize: params.fontSize ?? 16,
    fontFamily: params.fontFamily ?? "Inter, sans-serif",
    fontWeight: params.fontWeight ?? 400,
    fontStyle: params.fontStyle ?? "normal",
    textAlign: params.textAlign ?? "left",
    textDecoration: params.textDecoration ?? "none",
    lineHeight: params.lineHeight ?? 1.2,
    letterSpacing: params.letterSpacing ?? 0,
    textTransform: params.textTransform ?? "none",
    stroke: params.stroke ?? SHAPE_DEFAULTS.stroke,
    strokeWidth: params.strokeWidth ?? SHAPE_DEFAULTS.strokeWidth,
    fill: params.fill ?? "#ffffff",
  };
}

/**
 * Create a generated UI shape
 */
export function createGeneratedUI(params: {
  x: number;
  y: number;
  w: number;
  h: number;
  uiSpecData: string | null;
  sourceFrameId: string;
  id?: string;
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
  isWorkflowPage?: boolean;
}): GeneratedUIShape {
  return {
    id: params.id ?? nanoid(),
    type: "generatedui",
    x: params.x,
    y: params.y,
    w: params.w,
    h: params.h,
    uiSpecData: params.uiSpecData,
    sourceFrameId: params.sourceFrameId,
    isWorkflowPage: params.isWorkflowPage,
    stroke: "transparent",
    strokeWidth: 0,
    fill: params.fill ?? null,
  };
}
