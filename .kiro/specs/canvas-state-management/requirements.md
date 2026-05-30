# Requirements Document

## Introduction

This document outlines the requirements for building a robust state management infrastructure for the infinite canvas feature in Unit {set}. The canvas will enable users to create, manipulate, and organize visual elements (shapes, frames, text, etc.) with viewport controls (pan, zoom) in a Figma-like interface. This infrastructure will replace the Redux-based implementation with a modern React-based solution using hooks and context, while preserving all the functionality from the reference implementation.

## Glossary

- **Canvas System**: The interactive drawing surface where users create and manipulate visual elements
- **Viewport**: The visible portion of the infinite canvas, including scale (zoom) and translation (pan) state
- **Shape**: A visual element on the canvas (frame, rectangle, ellipse, line, arrow, freedraw, text, or generated UI)
- **Tool**: The current interaction mode (select, frame, rect, ellipse, freedraw, arrow, line, text, eraser)
- **World Coordinates**: The absolute coordinate system of the infinite canvas
- **Screen Coordinates**: The viewport-relative coordinate system visible to the user
- **Draft Shape**: A temporary shape being drawn before finalization
- **Selection State**: The set of currently selected shapes on the canvas
- **Entity State**: The normalized data structure storing all shapes with efficient lookup by ID

## Requirements

### Requirement 1

**User Story:** As a developer, I want a custom hook for managing infinite canvas state, so that I can integrate canvas functionality into React components without Redux

#### Acceptance Criteria

1. WHEN the Canvas System is initialized, THE Canvas System SHALL provide a custom React hook that manages all canvas state
2. WHEN the custom hook is invoked, THE Canvas System SHALL return viewport state, shapes collection, current tool, and selection state
3. WHEN the custom hook is invoked, THE Canvas System SHALL return event handlers for pointer interactions (down, move, up, cancel)
4. WHEN the custom hook is invoked, THE Canvas System SHALL return utility functions for coordinate conversion and shape operations
5. WHERE React Context is used for state management, THE Canvas System SHALL provide a context provider component

### Requirement 2

**User Story:** As a developer, I want viewport state management with pan and zoom capabilities, so that users can navigate the infinite canvas smoothly

#### Acceptance Criteria

1. WHEN a user performs a wheel event with ctrl/meta key, THE Canvas System SHALL zoom the viewport around the cursor position
2. WHEN a user performs a wheel event without modifier keys, THE Canvas System SHALL pan the viewport in the scroll direction
3. WHEN a user presses shift key and drags with left mouse button, THE Canvas System SHALL pan the viewport
4. WHEN a user drags with middle mouse button or right mouse button, THE Canvas System SHALL pan the viewport
5. WHEN viewport scale changes, THE Canvas System SHALL clamp the scale between minimum (0.1) and maximum (8.0) values
6. WHEN viewport is panned or zoomed, THE Canvas System SHALL maintain smooth performance using requestAnimationFrame optimization
7. WHEN coordinate conversion is requested, THE Canvas System SHALL provide functions to convert between screen and world coordinates

### Requirement 3

**User Story:** As a developer, I want shape state management with normalized data structure, so that shapes can be efficiently stored, retrieved, and updated

#### Acceptance Criteria

1. WHEN a shape is added to the canvas, THE Canvas System SHALL store the shape in a normalized entity structure with ID-based lookup
2. WHEN a shape is updated, THE Canvas System SHALL apply partial updates without replacing the entire shape object
3. WHEN a shape is removed, THE Canvas System SHALL delete the shape from the entity structure and remove it from selection state
4. WHEN all shapes are cleared, THE Canvas System SHALL reset the entity structure and selection state to empty
5. WHEN shapes are retrieved, THE Canvas System SHALL provide an ordered array of shape objects for rendering
6. WHEN a frame shape is added, THE Canvas System SHALL increment a frame counter and assign a unique frame number
7. WHEN a frame shape is removed, THE Canvas System SHALL decrement the frame counter

### Requirement 4

**User Story:** As a user, I want to draw shapes on the canvas using different tools, so that I can create visual designs

#### Acceptance Criteria

1. WHEN the user selects a drawing tool (frame, rect, ellipse, arrow, line), THE Canvas System SHALL set the current tool state
2. WHEN the user presses pointer down with a drawing tool active, THE Canvas System SHALL create a draft shape at the pointer location
3. WHEN the user moves the pointer while drawing, THE Canvas System SHALL update the draft shape dimensions in real-time
4. WHEN the user releases the pointer after drawing, THE Canvas System SHALL finalize the draft shape if dimensions exceed minimum threshold (1x1)
5. WHEN the user draws with the freedraw tool, THE Canvas System SHALL collect pointer positions and render them as a continuous path
6. WHEN the user draws with the freedraw tool, THE Canvas System SHALL optimize rendering using requestAnimationFrame with 8ms interval
7. WHEN the user selects the text tool and clicks, THE Canvas System SHALL create a text shape at the click position and switch to select tool

### Requirement 5

**User Story:** As a user, I want to select and move shapes on the canvas, so that I can reposition my designs

#### Acceptance Criteria

1. WHEN the user clicks on a shape with select tool active, THE Canvas System SHALL add the shape to the selection state
2. WHEN the user clicks on empty space with select tool active, THE Canvas System SHALL clear the selection state
3. WHEN the user shift-clicks on a shape, THE Canvas System SHALL toggle the shape in the selection state without clearing other selections
4. WHEN the user drags a selected shape, THE Canvas System SHALL move all selected shapes by the drag delta
5. WHEN the user starts dragging a shape, THE Canvas System SHALL store initial positions of all selected shapes
6. WHEN the user moves the pointer while dragging, THE Canvas System SHALL update shape positions relative to initial positions and drag delta
7. WHEN the user releases the pointer after dragging, THE Canvas System SHALL finalize shape positions and clear drag state

### Requirement 6

**User Story:** As a user, I want to erase shapes using the eraser tool, so that I can remove unwanted elements

#### Acceptance Criteria

1. WHEN the user selects the eraser tool, THE Canvas System SHALL set the current tool to eraser
2. WHEN the user clicks on a shape with eraser tool active, THE Canvas System SHALL remove the shape from the canvas
3. WHEN the user drags with eraser tool active, THE Canvas System SHALL remove all shapes that intersect the eraser path
4. WHEN a shape is erased during a drag operation, THE Canvas System SHALL track the erased shape ID to prevent duplicate removal
5. WHEN the user releases the pointer after erasing, THE Canvas System SHALL clear the erased shapes tracking set

### Requirement 7

**User Story:** As a developer, I want shape hit testing functionality, so that the system can determine which shape is under the cursor

#### Acceptance Criteria

1. WHEN a point is tested against a rectangular shape (frame, rect), THE Canvas System SHALL return true if the point is within the shape bounds
2. WHEN a point is tested against an ellipse shape, THE Canvas System SHALL return true if the point is within the ellipse bounds
3. WHEN a point is tested against a freedraw shape, THE Canvas System SHALL return true if the point is within 5 pixels of any line segment
4. WHEN a point is tested against a line or arrow shape, THE Canvas System SHALL return true if the point is within 8 pixels of the line segment
5. WHEN a point is tested against a text shape, THE Canvas System SHALL return true if the point is within the text bounding box with padding
6. WHEN multiple shapes overlap at a point, THE Canvas System SHALL return the topmost shape in the rendering order

### Requirement 8

**User Story:** As a developer, I want keyboard event handling for canvas interactions, so that users can use keyboard shortcuts

#### Acceptance Criteria

1. WHEN the user presses the shift key, THE Canvas System SHALL enable hand tool mode for panning
2. WHEN the user releases the shift key, THE Canvas System SHALL disable hand tool mode
3. WHEN shift key is pressed and user drags with left mouse button, THE Canvas System SHALL pan the viewport
4. WHEN keyboard events are registered, THE Canvas System SHALL prevent default browser behavior for handled keys
5. WHEN the component unmounts, THE Canvas System SHALL remove all keyboard event listeners

### Requirement 9

**User Story:** As a developer, I want shape resize functionality, so that users can adjust shape dimensions after creation

#### Acceptance Criteria

1. WHEN a resize operation starts, THE Canvas System SHALL store the shape ID, resize corner, initial bounds, and start point
2. WHEN the pointer moves during resize, THE Canvas System SHALL calculate new bounds based on the resize corner and pointer position
3. WHEN a rectangular shape is resized, THE Canvas System SHALL update x, y, width, and height properties
4. WHEN a freedraw shape is resized, THE Canvas System SHALL scale all points proportionally to the new bounds
5. WHEN a line or arrow shape is resized, THE Canvas System SHALL update start and end coordinates proportionally
6. WHEN the resize operation ends, THE Canvas System SHALL clear the resize state
7. WHEN new bounds are calculated, THE Canvas System SHALL enforce minimum dimensions of 10x10 pixels

### Requirement 10

**User Story:** As a developer, I want the canvas state to be persistable, so that projects can be saved and loaded

#### Acceptance Criteria

1. WHEN a project is loaded, THE Canvas System SHALL accept a complete state object including shapes, tool, selection, and frame counter
2. WHEN shapes are loaded, THE Canvas System SHALL restore the normalized entity structure with all shape data
3. WHEN viewport state is loaded, THE Canvas System SHALL restore scale and translation values
4. WHEN state is exported, THE Canvas System SHALL provide a serializable object containing all canvas state
5. WHERE state includes entity adapters, THE Canvas System SHALL ensure compatibility with standard JSON serialization
