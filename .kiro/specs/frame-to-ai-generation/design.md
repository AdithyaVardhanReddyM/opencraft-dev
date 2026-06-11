# Design Document: Frame to AI Generation

## Overview

This feature enables users to convert wireframe drawings inside frame shapes into AI-generated UI components. The workflow involves detecting shapes contained within frames, rendering them to an image, creating a screen shape, and automatically initiating an AI chat with the captured image to generate a functional UI component.

## Architecture

The feature follows the existing canvas architecture patterns, integrating with:

1. **Canvas Context** - For shape state management and selection
2. **Hit Testing Utilities** - Extended with containment detection
3. **Shape Factories** - For screen creation
4. **AI Sidebar** - For chat integration with image attachment
5. **Convex Backend** - For screen persistence

```
┌─────────────────────────────────────────────────────────────────┐
│                        Canvas Page                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │    Frame     │    │   Generate   │    │    Screen    │      │
│  │  Component   │───▶│    Button    │───▶│   Creation   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                    │               │
│         ▼                   ▼                    ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Containment  │    │   Canvas     │    │  AI Sidebar  │      │
│  │   Utils      │    │   Capture    │    │  Integration │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. GenerateButton Component

A new component that renders above frames containing shapes.

```typescript
// components/canvas/GenerateButton.tsx
interface GenerateButtonProps {
  frame: FrameShape;
  containedShapes: Shape[];
  viewport: ViewportState;
  onGenerate: () => void;
}
```

**Responsibilities:**

- Render a button positioned above the frame's top-right corner
- Transform position based on viewport scale/translate
- Trigger the generation workflow on click

### 2. Containment Utilities

New utility functions for detecting shape containment within frames.

```typescript
// lib/canvas/containment-utils.ts

/**
 * Get the bounding box of any shape
 */
function getShapeBounds(shape: Shape): {
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Check if a shape is fully contained within a frame
 */
function isShapeContainedInFrame(shape: Shape, frame: FrameShape): boolean;

/**
 * Get all shapes fully contained within a frame
 */
function getContainedShapes(frame: FrameShape, shapes: Shape[]): Shape[];

/**
 * Get frames that have at least one contained shape
 */
function getFramesWithContainedShapes(shapes: Shape[]): Array<{
  frame: FrameShape;
  containedShapes: Shape[];
}>;
```

### 3. Canvas Capture Utilities

New utility functions for rendering shapes to an image.

```typescript
// lib/canvas/canvas-capture.ts

interface CaptureOptions {
  backgroundColor?: string;
  scale?: number;
  padding?: number;
}

/**
 * Capture frame contents as a PNG blob
 */
async function captureFrameAsImage(
  frame: FrameShape,
  containedShapes: Shape[],
  options?: CaptureOptions
): Promise<Blob>;

/**
 * Render a shape to a canvas context
 */
function renderShapeToCanvas(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  offsetX: number,
  offsetY: number
): void;
```

### 4. Frame Component Enhancement

The Frame component will be enhanced to include the GenerateButton when applicable.

```typescript
// Updated Frame.tsx
interface FrameProps {
  shape: FrameShape;
  containedShapes?: Shape[];
  viewport?: ViewportState;
  onGenerate?: (frame: FrameShape, containedShapes: Shape[]) => void;
}
```

### 5. AI Sidebar Integration

New props and methods for the AISidebar to support pre-populated images and prompts.

```typescript
// Extended AISidebar props
interface AISidebarProps {
  // ... existing props
  initialImage?: Blob;
  initialPrompt?: string;
  initialModelId?: string;
}
```

## Data Models

### Shape Bounds Interface

```typescript
interface ShapeBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}
```

### Capture Result

```typescript
interface CaptureResult {
  blob: Blob;
  width: number;
  height: number;
}
```

### Generation Context

```typescript
interface GenerationContext {
  sourceFrameId: string;
  capturedImage: Blob;
  screenShapeId: string;
  screenId: string; // Convex ID
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Generate button visibility matches containment state

_For any_ canvas state with frames and shapes, the Generate button SHALL be visible for a frame if and only if that frame has at least one shape fully contained within its bounds.

**Validates: Requirements 1.1, 1.3, 1.5**

### Property 2: Shape containment is correctly determined

_For any_ shape and frame, the containment function SHALL return true if and only if all four corners of the shape's bounding box are within the frame's bounds (x, y, x+w, y+h).

**Validates: Requirements 2.1, 2.3, 2.4**

### Property 3: Canvas capture preserves shape positions and z-order

_For any_ frame with contained shapes, capturing the frame SHALL produce an image where shapes maintain their relative positions to each other and are rendered in the same z-order as the original shapes array.

**Validates: Requirements 3.2, 3.3**

### Property 4: Screen is positioned correctly relative to source frame

_For any_ frame, the created screen shape SHALL be positioned at (frame.x + frame.w + 50, frame.y) with height equal to frame.h and width equal to SCREEN_DEFAULTS.width.

**Validates: Requirements 4.1, 4.2**

### Property 5: Button position transforms correctly with viewport

_For any_ viewport state (scale, translate), the Generate button's screen position SHALL equal the world-to-screen transformation of the frame's top-right corner.

**Validates: Requirements 1.4**

## Error Handling

### Canvas Capture Errors

- If canvas creation fails, display toast: "Failed to capture frame contents"
- If blob conversion fails, display toast: "Failed to convert capture to image"

### Screen Creation Errors

- If Convex mutation fails, display toast: "Failed to create screen"
- Clean up any partial state (don't leave orphaned shapes)

### Model Selection Errors

- If model switch fails, proceed with current model
- Display warning toast: "Image processing may not work with current model"

## Testing Strategy

### Property-Based Testing

The feature will use **fast-check** for property-based testing, as it's the standard PBT library for TypeScript/JavaScript projects.

**Test Configuration:**

- Minimum 100 iterations per property test
- Each test tagged with format: `**Feature: frame-to-ai-generation, Property {number}: {property_text}**`

**Property Tests:**

1. **Containment Property Test**

   - Generate random frames and shapes
   - Verify containment function matches manual bounds checking
   - Test edge cases: shapes exactly on boundary, shapes partially overlapping

2. **Button Visibility Property Test**

   - Generate random canvas states
   - Verify button visibility matches containment state for all frames

3. **Screen Positioning Property Test**

   - Generate random frame positions and sizes
   - Verify screen position formula is correct

4. **Viewport Transform Property Test**
   - Generate random viewport states
   - Verify button position calculation matches world-to-screen transform

### Unit Tests

- Test individual shape bounds calculations
- Test canvas rendering for each shape type
- Test error handling paths
- Test Convex integration mocking

### Integration Tests

- Test full workflow from button click to AI chat opening
- Test with various shape combinations
- Test viewport interactions during workflow
