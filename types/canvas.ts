// Core geometric types
export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Viewport types
export type ViewportMode = "idle" | "panning" | "shiftPanning";

export interface ViewportState {
  scale: number;
  minScale: number;
  maxScale: number;
  translate: Point;
  mode: ViewportMode;
  panStartScreen: Point | null;
  panStartTranslate: Point | null;
  wheelPanSpeed: number;
  zoomStep: number;
}

// Tool types
export type Tool =
  | "select"
  | "hand"
  | "frame"
  | "rect"
  | "ellipse"
  | "freedraw"
  | "arrow"
  | "line"
  | "text"
  | "stickynote"
  | "eraser"
  | "screen";

export type ResizeHandle =
  | "nw"
  | "ne"
  | "sw"
  | "se"
  | "n"
  | "s"
  | "e"
  | "w"
  | "line-start"
  | "line-end";

// Shape types
export interface BaseShape {
  id: string;
  stroke: string;
  strokeWidth: number;
  fill?: string | null;
}

export interface FrameShape extends BaseShape {
  type: "frame";
  x: number;
  y: number;
  w: number;
  h: number;
  frameNumber: number;
  borderRadius?: number;
}

export interface RectShape extends BaseShape {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  strokeType?: "solid" | "dashed";
  borderRadius?: number;
}

export interface EllipseShape extends BaseShape {
  type: "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
  strokeType?: "solid" | "dashed";
}

export interface FreeDrawShape extends BaseShape {
  type: "freedraw";
  points: Point[];
  strokeType?: "solid" | "dashed";
}

// A binding ties an arrow endpoint to a shape so the connector follows that shape
// when it is moved or resized. Endpoints are recomputed from the bound shape's
// live geometry at render time.
export interface ArrowBinding {
  shapeId: string;
}

export interface ArrowShape extends BaseShape {
  type: "arrow";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strokeType?: "solid" | "dashed";
  arrowType?: "straight" | "elbow";
  // Optional bindings for "flow" connectors that auto-follow the connected shapes.
  startBinding?: ArrowBinding;
  endBinding?: ArrowBinding;
}

export interface LineShape extends BaseShape {
  type: "line";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strokeType?: "solid" | "dashed";
}

export interface TextShape extends BaseShape {
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  textDecoration: "none" | "underline" | "line-through";
  lineHeight: number;
  letterSpacing: number;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  w?: number;
  h?: number;
}

// A sticky note: a fixed-size, colored "paper" card that carries centered text.
// Structurally a filled rectangle (x/y/w/h) with text, so it reuses the rect
// geometry/resize/hit-testing paths and the text shape's inline-editing pattern
// (toggled via the shared ShapesState.editingTextId). The text color rides on
// BaseShape.stroke (strokeWidth is 0, fill is null) so it plugs into the existing
// textColor control without a separate field.
export interface StickyNoteShape extends BaseShape {
  type: "stickynote";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textAlign: "left" | "center" | "right";
}

export interface GeneratedUIShape extends BaseShape {
  type: "generatedui";
  x: number;
  y: number;
  w: number;
  h: number;
  uiSpecData: string | null;
  sourceFrameId: string;
  isWorkflowPage?: boolean;
}

export interface ScreenShape extends BaseShape {
  type: "screen";
  x: number;
  y: number;
  w: number;
  h: number;
  screenId: string; // Convex document ID reference
}

// A user-supplied image dropped/pasted onto the canvas. The pixels live in S3
// (referenced by `s3Key`); only the key + name + geometry are persisted in the
// canvas state, so the shape round-trips through autosave like any other shape.
export interface ImageShape extends BaseShape {
  type: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  s3Key: string; // S3 object key; "" while the upload is in flight
  name: string; // "image 1", "image 2", … — editable
  naturalWidth: number;
  naturalHeight: number;
  status?: "uploading" | "ready" | "error";
}

export type Shape =
  | FrameShape
  | RectShape
  | EllipseShape
  | FreeDrawShape
  | ArrowShape
  | LineShape
  | TextShape
  | StickyNoteShape
  | GeneratedUIShape
  | ScreenShape
  | ImageShape;

// Entity state (normalized data structure)
export interface EntityState<T> {
  ids: string[];
  entities: Record<string, T>;
}

// Selection state
export type SelectionMap = Record<string, true>;

// History entry representing a snapshot of canvas state
export interface HistoryEntry {
  shapes: EntityState<Shape>;
  selected: SelectionMap;
  frameCounter: number;
  timestamp: number;
}

// Shapes state
export interface ShapesState {
  tool: Tool;
  shapes: EntityState<Shape>;
  selected: SelectionMap;
  frameCounter: number;
  editingTextId: string | null;
  history: HistoryEntry[];
  historyPointer: number;
}

// Draft shape (temporary shape during drawing)
export interface DraftShape {
  type: "frame" | "rect" | "ellipse" | "arrow" | "line";
  startWorld: Point;
  currentWorld: Point;
}

// Touch pointer (for multi-touch support)
export interface TouchPointer {
  id: number;
  p: Point;
}

// Resize data
export interface ResizeData {
  shapeId: string;
  corner: ResizeHandle;
  initialBounds: { x: number; y: number; w: number; h: number };
  startPoint: { x: number; y: number };
  textMetrics?: {
    width: number;
    height: number;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
  };
}
