# Design Document: Canvas Layers Sidebar

## Overview

The Canvas Layers Sidebar is a floating, collapsible panel positioned on the right side of the canvas that provides users with a hierarchical view of all shapes on the canvas. It enables quick navigation and selection of shapes, improving workflow efficiency for complex designs.

## Architecture

The sidebar follows the existing canvas UI component patterns, using a floating panel design consistent with the Toolbar, ZoomBar, and HistoryPill components. It integrates with the existing CanvasContext for state management.

```
┌─────────────────────────────────────────────────────────────┐
│                        Canvas Page                          │
│  ┌─────────┐                              ┌──────────────┐  │
│  │ Toolbar │                              │   Layers     │  │
│  └─────────┘                              │   Sidebar    │  │
│                                           │  ┌────────┐  │  │
│                                           │  │ Toggle │  │  │
│              Canvas Content               │  ├────────┤  │  │
│                                           │  │ Shape  │  │  │
│                                           │  │ List   │  │  │
│  ┌─────────┐ ┌─────────┐                  │  │        │  │  │
│  │ ZoomBar │ │ History │                  │  └────────┘  │  │
│  └─────────┘ └─────────┘                  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### LayersSidebar Component

```typescript
interface LayersSidebarProps {
  shapes: Shape[];
  selectedShapes: SelectionMap;
  onShapeClick: (shapeId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}
```

### Shape Item Component

```typescript
interface ShapeItemProps {
  shape: Shape;
  isSelected: boolean;
  onClick: () => void;
}
```

### Utility Functions

```typescript
// Get icon component for shape type
function getShapeIcon(type: Shape["type"]): LucideIcon;

// Generate readable name for shape
function getShapeName(shape: Shape): string;

// Calculate shape center point for viewport navigation
function getShapeCenter(shape: Shape): Point;

// Calculate shape bounds for viewport fitting
function getShapeBounds(shape: Shape): {
  x: number;
  y: number;
  w: number;
  h: number;
};
```

## Data Models

### Shape Type to Icon Mapping

| Shape Type  | Icon       | Display Name      |
| ----------- | ---------- | ----------------- |
| frame       | Frame      | Frame {number}    |
| rect        | Square     | Rectangle         |
| ellipse     | Circle     | Ellipse           |
| line        | Minus      | Line              |
| arrow       | ArrowRight | Arrow             |
| freedraw    | Pencil     | Drawing           |
| text        | Type       | Text: "{preview}" |
| generatedui | Layout     | Generated UI      |

### Sidebar State

```typescript
interface SidebarState {
  isOpen: boolean;
}
```

The sidebar state is managed locally within the canvas page component using React useState, as it's UI-only state that doesn't need to persist or be shared.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Shape list completeness

_For any_ array of shapes on the canvas, the Layers Sidebar SHALL display exactly one Shape_Item for each shape, with no duplicates and no missing shapes.
**Validates: Requirements 1.3, 4.3**

### Property 2: Shape item rendering correctness

_For any_ shape type in the system, the getShapeIcon function SHALL return a valid icon component, and the getShapeName function SHALL return a non-empty string.
**Validates: Requirements 1.4, 1.5**

### Property 3: Viewport centering calculation

_For any_ shape with calculable bounds, the getShapeCenter function SHALL return a point that, when used with CENTER_ON_WORLD viewport action, positions the shape center at the viewport center.
**Validates: Requirements 2.1, 2.3**

### Property 4: Selection state synchronization

_For any_ selection state (SelectionMap), the Layers Sidebar SHALL display the selected visual state for exactly those Shape_Items whose shape IDs are keys in the SelectionMap.
**Validates: Requirements 3.1, 3.2, 3.3**

## Error Handling

| Scenario                        | Handling                                  |
| ------------------------------- | ----------------------------------------- |
| Empty shapes array              | Display empty state with guidance message |
| Shape with missing properties   | Use fallback values for name/icon         |
| Invalid shape type              | Use generic icon and "Unknown Shape" name |
| Viewport calculation edge cases | Clamp values to valid ranges              |

## Testing Strategy

### Dual Testing Approach

This feature uses both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and component rendering
- **Property-based tests**: Verify universal properties across all valid inputs

### Property-Based Testing

**Library**: fast-check (already available in the ecosystem for TypeScript/React projects)

**Configuration**: Each property test runs a minimum of 100 iterations.

**Test Annotations**: Each property-based test is tagged with:

```typescript
// **Feature: canvas-layers-sidebar, Property {number}: {property_text}**
```

### Unit Testing

Unit tests cover:

- Component rendering with various shape configurations
- Empty state display
- Toggle functionality
- Click handlers and event propagation
- Icon and name generation for each shape type

### Test Files

- `lib/canvas/layers-sidebar-utils.test.ts` - Utility function tests
- `components/canvas/LayersSidebar.test.tsx` - Component tests (optional)
