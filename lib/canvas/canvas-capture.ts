import type { Shape, FrameShape } from "@/types/canvas";
import { getTextShapeDimensions, TEXT_PLACEHOLDER } from "./text-utils";

/**
 * Options for capturing frame contents
 */
export interface CaptureOptions {
  backgroundColor?: string;
  scale?: number;
  padding?: number;
}

/**
 * Result of a capture operation
 */
export interface CaptureResult {
  blob: Blob;
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: Required<CaptureOptions> = {
  backgroundColor: "#18181b", // Dark background (zinc-900) for visibility of white shapes
  scale: 2, // 2x for better quality
  padding: 10,
};

/**
 * Render a rectangle shape to canvas
 */
function renderRect(
  ctx: CanvasRenderingContext2D,
  shape: Shape & { type: "rect" },
  offsetX: number,
  offsetY: number
): void {
  const x = shape.x - offsetX;
  const y = shape.y - offsetY;
  const borderRadius = shape.borderRadius ?? 8;

  ctx.beginPath();
  if (borderRadius > 0) {
    ctx.roundRect(x, y, shape.w, shape.h, borderRadius);
  } else {
    ctx.rect(x, y, shape.w, shape.h);
  }

  if (shape.fill && shape.fill !== "transparent") {
    ctx.fillStyle = shape.fill;
    ctx.fill();
  }

  if (shape.strokeWidth > 0) {
    ctx.strokeStyle = shape.stroke;
    ctx.lineWidth = shape.strokeWidth;
    if (shape.strokeType === "dashed") {
      ctx.setLineDash([8, 4]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
  }
}

/**
 * Render an ellipse shape to canvas
 */
function renderEllipse(
  ctx: CanvasRenderingContext2D,
  shape: Shape & { type: "ellipse" },
  offsetX: number,
  offsetY: number
): void {
  const centerX = shape.x - offsetX + shape.w / 2;
  const centerY = shape.y - offsetY + shape.h / 2;
  const radiusX = shape.w / 2;
  const radiusY = shape.h / 2;

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);

  if (shape.fill && shape.fill !== "transparent") {
    ctx.fillStyle = shape.fill;
    ctx.fill();
  }

  if (shape.strokeWidth > 0) {
    ctx.strokeStyle = shape.stroke;
    ctx.lineWidth = shape.strokeWidth;
    if (shape.strokeType === "dashed") {
      ctx.setLineDash([8, 4]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
  }
}

/**
 * Render a line shape to canvas
 */
function renderLine(
  ctx: CanvasRenderingContext2D,
  shape: Shape & { type: "line" },
  offsetX: number,
  offsetY: number
): void {
  ctx.beginPath();
  ctx.moveTo(shape.startX - offsetX, shape.startY - offsetY);
  ctx.lineTo(shape.endX - offsetX, shape.endY - offsetY);

  ctx.strokeStyle = shape.stroke;
  ctx.lineWidth = shape.strokeWidth;
  if (shape.strokeType === "dashed") {
    ctx.setLineDash([8, 4]);
  } else {
    ctx.setLineDash([]);
  }
  ctx.stroke();
}

/**
 * Render an arrow shape to canvas
 */
function renderArrow(
  ctx: CanvasRenderingContext2D,
  shape: Shape & { type: "arrow" },
  offsetX: number,
  offsetY: number
): void {
  const startX = shape.startX - offsetX;
  const startY = shape.startY - offsetY;
  const endX = shape.endX - offsetX;
  const endY = shape.endY - offsetY;
  const arrowHeadSize = 10;

  // Draw line
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = shape.stroke;
  ctx.lineWidth = shape.strokeWidth;
  if (shape.strokeType === "dashed") {
    ctx.setLineDash([8, 4]);
  } else {
    ctx.setLineDash([]);
  }
  ctx.stroke();

  // Draw arrowhead
  const angle = Math.atan2(endY - startY, endX - startX);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowHeadSize * Math.cos(angle - Math.PI / 6),
    endY - arrowHeadSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    endX - arrowHeadSize * Math.cos(angle + Math.PI / 6),
    endY - arrowHeadSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fillStyle = shape.stroke;
  ctx.fill();
}

/**
 * Render a freedraw shape to canvas
 */
function renderFreedraw(
  ctx: CanvasRenderingContext2D,
  shape: Shape & { type: "freedraw" },
  offsetX: number,
  offsetY: number
): void {
  if (shape.points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(shape.points[0].x - offsetX, shape.points[0].y - offsetY);

  for (let i = 1; i < shape.points.length; i++) {
    ctx.lineTo(shape.points[i].x - offsetX, shape.points[i].y - offsetY);
  }

  ctx.strokeStyle = shape.stroke;
  ctx.lineWidth = shape.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (shape.strokeType === "dashed") {
    ctx.setLineDash([8, 4]);
  } else {
    ctx.setLineDash([]);
  }
  ctx.stroke();
}

/**
 * Apply text transform to a string
 */
function applyTextTransform(
  text: string,
  transform: "none" | "uppercase" | "lowercase" | "capitalize"
): string {
  switch (transform) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "capitalize":
      return text.replace(/\b\w/g, (char) => char.toUpperCase());
    default:
      return text;
  }
}

/**
 * Render a text shape to canvas
 */
function renderText(
  ctx: CanvasRenderingContext2D,
  shape: Shape & { type: "text" },
  offsetX: number,
  offsetY: number
): void {
  const x = shape.x - offsetX;
  const y = shape.y - offsetY;
  const dimensions = getTextShapeDimensions(shape);

  // Set font properties
  ctx.font = `${shape.fontStyle} ${shape.fontWeight} ${shape.fontSize}px ${shape.fontFamily}`;
  ctx.fillStyle = shape.stroke;
  ctx.textBaseline = "top";

  // Handle text alignment
  let textX = x;
  if (shape.textAlign === "center") {
    ctx.textAlign = "center";
    textX = x + dimensions.width / 2;
  } else if (shape.textAlign === "right") {
    ctx.textAlign = "right";
    textX = x + dimensions.width;
  } else {
    ctx.textAlign = "left";
  }

  // Apply text transform and render each line
  const text = shape.text || TEXT_PLACEHOLDER;
  const transformedText = applyTextTransform(text, shape.textTransform);
  const lines = transformedText.split("\n");
  const lineHeight = shape.fontSize * shape.lineHeight;

  lines.forEach((line, index) => {
    const lineY = y + index * lineHeight;

    // Apply letter spacing by drawing each character
    if (shape.letterSpacing > 0) {
      let charX = textX;
      ctx.textAlign = "left";
      for (const char of line) {
        ctx.fillText(char, charX, lineY);
        charX += ctx.measureText(char).width + shape.letterSpacing;
      }
    } else {
      ctx.fillText(line, textX, lineY);
    }

    // Handle text decoration
    if (shape.textDecoration !== "none") {
      const textWidth = ctx.measureText(line).width;
      const decorationY =
        shape.textDecoration === "underline"
          ? lineY + shape.fontSize
          : lineY + shape.fontSize / 2;

      ctx.beginPath();
      ctx.moveTo(x, decorationY);
      ctx.lineTo(x + textWidth, decorationY);
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
}

/**
 * Render a frame shape to canvas (just the background)
 */
function renderFrame(
  ctx: CanvasRenderingContext2D,
  shape: FrameShape,
  offsetX: number,
  offsetY: number
): void {
  const x = shape.x - offsetX;
  const y = shape.y - offsetY;
  const borderRadius = shape.borderRadius ?? 0;
  const fillColor = shape.fill ?? "rgba(255, 255, 255, 0.05)";

  ctx.beginPath();
  if (borderRadius > 0) {
    ctx.roundRect(x, y, shape.w, shape.h, borderRadius);
  } else {
    ctx.rect(x, y, shape.w, shape.h);
  }

  ctx.fillStyle = fillColor;
  ctx.fill();
}

/**
 * Render a shape to a canvas context
 */
export function renderShapeToCanvas(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  offsetX: number,
  offsetY: number
): void {
  ctx.save();

  switch (shape.type) {
    case "rect":
      renderRect(ctx, shape, offsetX, offsetY);
      break;
    case "ellipse":
      renderEllipse(ctx, shape, offsetX, offsetY);
      break;
    case "line":
      renderLine(ctx, shape, offsetX, offsetY);
      break;
    case "arrow":
      renderArrow(ctx, shape, offsetX, offsetY);
      break;
    case "freedraw":
      renderFreedraw(ctx, shape, offsetX, offsetY);
      break;
    case "text":
      renderText(ctx, shape, offsetX, offsetY);
      break;
    case "frame":
      renderFrame(ctx, shape, offsetX, offsetY);
      break;
    // Skip screen and generatedui shapes - they contain iframes
    case "screen":
    case "generatedui":
      break;
  }

  ctx.restore();
}

/**
 * Capture frame contents as a PNG blob
 */
export async function captureFrameAsImage(
  frame: FrameShape,
  containedShapes: Shape[],
  options?: CaptureOptions
): Promise<CaptureResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { backgroundColor, scale, padding } = opts;

  // Calculate canvas dimensions
  const width = frame.w + padding * 2;
  const height = frame.h + padding * 2;
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  // Create offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Scale for high DPI
  ctx.scale(scale, scale);

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Calculate offset (frame origin + padding)
  const offsetX = frame.x - padding;
  const offsetY = frame.y - padding;

  // Render frame background first
  renderShapeToCanvas(ctx, frame, offsetX, offsetY);

  // Render contained shapes in order (preserves z-order)
  for (const shape of containedShapes) {
    renderShapeToCanvas(ctx, shape, offsetX, offsetY);
  }

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({
            blob,
            width: scaledWidth,
            height: scaledHeight,
          });
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      "image/png",
      1.0
    );
  });
}
