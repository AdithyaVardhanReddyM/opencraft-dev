# Requirements Document

## Introduction

This feature enables users to convert frame shapes containing wireframe drawings into AI-generated UI components. When a frame contains one or more shapes, a "Generate" button appears above the frame. Clicking this button captures the frame content as an image, creates a new screen shape beside the frame, opens the AI chat sidebar, and automatically sends the captured image with a prompt to generate a UI component that replicates the wireframe design.

## Glossary

- **Frame**: A container shape on the canvas that can hold other shapes within its bounds
- **Screen**: A shape that displays AI-generated web content via an iframe connected to an E2B sandbox
- **Generate Button**: A UI control that appears above frames containing shapes, triggering the frame-to-AI workflow
- **Canvas Capture**: The process of rendering frame contents to an image using HTML Canvas API
- **Contained Shape**: A shape whose bounding box is fully within the frame's bounds (not merely intersecting)
- **AI Chat Sidebar**: The panel that opens when a screen is selected, allowing users to communicate with the AI agent
- **Vision Model**: An AI model capable of processing and understanding images (e.g., GPT-5.1)

## Requirements

### Requirement 1

**User Story:** As a designer, I want to see a generate button above frames that contain shapes, so that I can quickly convert my wireframes into functional UI components.

#### Acceptance Criteria

1. WHEN a frame shape contains one or more shapes fully within its bounds THEN the Canvas System SHALL display a Generate button positioned above the top-right corner of the frame
2. WHEN a frame shape contains no shapes within its bounds THEN the Canvas System SHALL hide the Generate button for that frame
3. WHEN shapes only intersect with a frame but are not fully contained THEN the Canvas System SHALL treat those shapes as not contained and hide the Generate button if no other shapes are fully contained
4. WHEN the viewport is panned or zoomed THEN the Generate button SHALL maintain its position relative to the frame in world coordinates
5. WHEN multiple frames contain shapes THEN the Canvas System SHALL display a Generate button for each qualifying frame

### Requirement 2

**User Story:** As a designer, I want to determine which shapes are inside a frame, so that the system can accurately identify frames ready for generation.

#### Acceptance Criteria

1. WHEN checking if a shape is contained within a frame THEN the Containment System SHALL verify that the shape's entire bounding box falls within the frame's bounds
2. WHEN a shape's bounding box partially extends outside the frame THEN the Containment System SHALL classify that shape as not contained
3. WHEN calculating containment for line-based shapes (lines, arrows, freedraw) THEN the Containment System SHALL use the bounding box of all points
4. WHEN calculating containment for text shapes THEN the Containment System SHALL use the text's measured dimensions including padding

### Requirement 3

**User Story:** As a designer, I want to capture the frame contents as an image, so that the AI can understand my wireframe design.

#### Acceptance Criteria

1. WHEN the user clicks the Generate button THEN the Canvas Capture System SHALL render all contained shapes to an offscreen HTML Canvas element
2. WHEN rendering shapes to the canvas THEN the Canvas Capture System SHALL preserve the relative positions of shapes within the frame
3. WHEN rendering shapes to the canvas THEN the Canvas Capture System SHALL render shapes in their correct z-order (layer order)
4. WHEN the canvas rendering is complete THEN the Canvas Capture System SHALL convert the canvas to a PNG blob
5. WHEN converting to PNG THEN the Canvas Capture System SHALL use a white or transparent background appropriate for AI vision processing

### Requirement 4

**User Story:** As a designer, I want a screen shape to be created beside my frame, so that I can see the AI-generated result alongside my wireframe.

#### Acceptance Criteria

1. WHEN the user clicks the Generate button THEN the Screen Creation System SHALL create a new screen shape positioned to the right of the frame with a 50-pixel gap
2. WHEN creating the screen shape THEN the Screen Creation System SHALL use the same height as the source frame
3. WHEN creating the screen shape THEN the Screen Creation System SHALL use the default screen width (1440 pixels)
4. WHEN the screen is created THEN the Screen Creation System SHALL register it with Convex and obtain a valid screen ID

### Requirement 5

**User Story:** As a designer, I want the AI chat to open automatically with my wireframe image, so that I can immediately start the generation process.

#### Acceptance Criteria

1. WHEN the screen shape is created THEN the Selection System SHALL select the new screen shape, causing the AI sidebar to open
2. WHEN the AI sidebar opens THEN the Chat System SHALL attach the captured frame image to the chat input
3. WHEN the image is attached THEN the Chat System SHALL set the default prompt text to "Generate this"
4. WHEN the image is attached THEN the Model Selection System SHALL switch to a vision-capable model (GPT-5.1)
5. WHEN the user sends the message THEN the AI Agent SHALL receive the image and prompt to generate a UI component replicating the wireframe

### Requirement 6

**User Story:** As a designer, I want the generation workflow to handle errors gracefully, so that I understand what went wrong if the process fails.

#### Acceptance Criteria

1. IF the canvas capture fails THEN the Error Handling System SHALL display a toast notification with the error message
2. IF the screen creation fails THEN the Error Handling System SHALL display a toast notification and not proceed with the chat workflow
3. IF the model switch fails THEN the Chat System SHALL proceed with the current model and display a warning that image processing may not work
