# Requirements Document

## Introduction

This document outlines the requirements for building the user interface controls for the infinite canvas in Unit {set}. These controls provide users with visual tools to interact with the canvas, including a toolbar for selecting drawing tools, a history pill for undo/redo operations, and a zoom bar for viewport control. The UI components will be positioned strategically on the canvas layout to provide an intuitive, Figma-like experience.

## Glossary

- **Canvas UI System**: The collection of visual interface components that enable user interaction with the canvas
- **Toolbar**: A horizontal component displaying tool buttons for selecting drawing modes (select, frame, rectangle, ellipse, pencil, text, eraser)
- **History Pill**: A compact component containing undo and redo buttons for managing canvas history
- **Zoom Bar**: A component displaying zoom controls (zoom out, zoom percentage, zoom in) for viewport scale management
- **Tool Button**: An interactive button in the toolbar that represents a specific drawing or interaction tool
- **Active Tool**: The currently selected tool in the toolbar, visually distinguished from inactive tools

## Requirements

### Requirement 1

**User Story:** As a user, I want a toolbar with drawing tool buttons, so that I can easily switch between different canvas tools

#### Acceptance Criteria

1. WHEN the canvas page loads, THE Canvas UI System SHALL display a toolbar component fixed at the top center of the viewport
2. WHEN the toolbar is rendered, THE Canvas UI System SHALL display tool buttons for select, frame, rectangle, ellipse, pencil (freedraw), text, and eraser tools
3. WHEN a tool button is displayed, THE Canvas UI System SHALL show an appropriate icon representing the tool function
4. WHEN a user clicks a tool button, THE Canvas UI System SHALL set that tool as the active tool
5. WHEN a tool is active, THE Canvas UI System SHALL apply visual styling to distinguish the active tool button from inactive buttons
6. WHEN the toolbar is rendered, THE Canvas UI System SHALL use a card-style container with proper elevation and spacing
7. WHEN tool buttons are arranged, THE Canvas UI System SHALL display them in a horizontal row with consistent spacing

### Requirement 2

**User Story:** As a user, I want a history pill with undo and redo buttons, so that I can reverse or reapply my canvas actions

#### Acceptance Criteria

1. WHEN the canvas page loads, THE Canvas UI System SHALL display a history pill component fixed at the bottom left of the viewport
2. WHEN the history pill is rendered, THE Canvas UI System SHALL display an undo button and a redo button
3. WHEN the undo button is displayed, THE Canvas UI System SHALL show an icon representing the undo action
4. WHEN the redo button is displayed, THE Canvas UI System SHALL show an icon representing the redo action
5. WHEN the history pill is rendered, THE Canvas UI System SHALL use a compact pill-shaped container with proper elevation
6. WHEN buttons are arranged in the history pill, THE Canvas UI System SHALL display them horizontally with minimal spacing
7. WHEN a user clicks the undo button, THE Canvas UI System SHALL trigger the undo action (functionality to be implemented later)
8. WHEN a user clicks the redo button, THE Canvas UI System SHALL trigger the redo action (functionality to be implemented later)

### Requirement 3

**User Story:** As a user, I want a zoom bar with zoom controls, so that I can adjust the canvas viewport scale

#### Acceptance Criteria

1. WHEN the canvas page loads, THE Canvas UI System SHALL display a zoom bar component fixed at the bottom left of the viewport, positioned above the history pill
2. WHEN the zoom bar is rendered, THE Canvas UI System SHALL display a zoom out button, zoom percentage display, and zoom in button
3. WHEN the zoom percentage is displayed, THE Canvas UI System SHALL show the current viewport scale as a percentage (e.g., "100%")
4. WHEN the zoom out button is displayed, THE Canvas UI System SHALL show a minus icon
5. WHEN the zoom in button is displayed, THE Canvas UI System SHALL show a plus icon
6. WHEN a user clicks the zoom out button, THE Canvas UI System SHALL decrease the viewport scale by a factor of 1.2
7. WHEN a user clicks the zoom in button, THE Canvas UI System SHALL increase the viewport scale by a factor of 1.2
8. WHEN the zoom bar is rendered, THE Canvas UI System SHALL use a pill-shaped container with proper elevation and spacing
9. WHEN zoom controls are arranged, THE Canvas UI System SHALL display them horizontally with the percentage centered between the buttons

### Requirement 4

**User Story:** As a developer, I want the UI components to use consistent design patterns, so that the interface feels cohesive and professional

#### Acceptance Criteria

1. WHEN any UI component is rendered, THE Canvas UI System SHALL use colors from the design system CSS variables
2. WHEN any UI component is rendered, THE Canvas UI System SHALL apply consistent border radius using the design system scale
3. WHEN any UI component is rendered, THE Canvas UI System SHALL apply appropriate shadow elevation for visual hierarchy
4. WHEN buttons are rendered, THE Canvas UI System SHALL use consistent padding and sizing across all components
5. WHEN hover states are triggered, THE Canvas UI System SHALL apply subtle visual feedback using design system colors
6. WHEN components are positioned, THE Canvas UI System SHALL use consistent spacing from viewport edges (e.g., 16px or 24px)
7. WHEN icons are displayed, THE Canvas UI System SHALL use Lucide React icons with consistent sizing (16px or 20px)

### Requirement 5

**User Story:** As a user, I want the UI controls to be visually distinct from the canvas content, so that I can easily locate and interact with them

#### Acceptance Criteria

1. WHEN UI components are rendered, THE Canvas UI System SHALL apply a semi-transparent or solid background to distinguish them from canvas content
2. WHEN UI components are positioned, THE Canvas UI System SHALL use fixed positioning to keep them visible during canvas pan and zoom
3. WHEN multiple components are stacked (zoom bar above history pill), THE Canvas UI System SHALL maintain consistent spacing between components
4. WHEN the toolbar is displayed, THE Canvas UI System SHALL center it horizontally with equal margins on both sides
5. WHEN the history pill and zoom bar are displayed, THE Canvas UI System SHALL align them to the left edge with consistent left margin

### Requirement 6

**User Story:** As a developer, I want the toolbar to integrate with the canvas state management, so that tool selection updates the canvas tool state

#### Acceptance Criteria

1. WHEN the toolbar component mounts, THE Canvas UI System SHALL access the current tool state from the canvas context
2. WHEN a tool button is clicked, THE Canvas UI System SHALL call the canvas context function to update the active tool
3. WHEN the active tool changes in the canvas context, THE Canvas UI System SHALL update the toolbar visual state to reflect the change
4. WHEN the toolbar renders, THE Canvas UI System SHALL read the current tool value to determine which button should be styled as active

### Requirement 7

**User Story:** As a developer, I want the zoom bar to integrate with the viewport state management, so that zoom controls update the canvas viewport

#### Acceptance Criteria

1. WHEN the zoom bar component mounts, THE Canvas UI System SHALL access the current viewport scale from the canvas context
2. WHEN the zoom in button is clicked, THE Canvas UI System SHALL call the canvas context function to increase viewport scale by 1.2x
3. WHEN the zoom out button is clicked, THE Canvas UI System SHALL call the canvas context function to decrease viewport scale by 1.2x
4. WHEN the viewport scale changes in the canvas context, THE Canvas UI System SHALL update the zoom percentage display
5. WHEN the zoom percentage is calculated, THE Canvas UI System SHALL round the value to the nearest integer for display

### Requirement 8

**User Story:** As a user, I want the UI components to be responsive and accessible, so that I can use them effectively across different devices

#### Acceptance Criteria

1. WHEN UI components are rendered on mobile devices, THE Canvas UI System SHALL adjust component sizes for touch interaction
2. WHEN buttons are rendered, THE Canvas UI System SHALL provide sufficient touch target size (minimum 44x44px on mobile)
3. WHEN buttons are focused via keyboard, THE Canvas UI System SHALL display a visible focus ring
4. WHEN buttons are rendered, THE Canvas UI System SHALL include appropriate ARIA labels for screen readers
5. WHEN the toolbar is rendered on small screens, THE Canvas UI System SHALL maintain readability and usability of tool buttons
