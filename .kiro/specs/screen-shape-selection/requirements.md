# Requirements Document

## Introduction

This feature improves the screen shape selection behavior in the canvas. Currently, users can only select a screen shape by clicking on its title bar area because the iframe content area captures pointer events. This enhancement ensures that clicking anywhere on an unselected screen shape will select it and automatically open the AI chat sidebar, providing a more intuitive user experience.

## Glossary

- **Screen Shape**: A canvas shape that displays a browser-like frame with an optional iframe for previewing AI-generated UI content
- **AI Chat Sidebar**: The sidebar panel that opens for AI-assisted design interactions
- **Title Bar**: The top portion of the screen shape containing traffic light buttons and URL bar
- **Content Area**: The main body of the screen shape below the title bar, which may contain an iframe or empty state
- **Pointer Events**: Mouse or touch interactions that trigger selection and other canvas behaviors

## Requirements

### Requirement 1

**User Story:** As a user, I want to select a screen shape by clicking anywhere on it, so that I can easily interact with screens without having to precisely click the title bar.

#### Acceptance Criteria

1. WHEN a user clicks anywhere within the bounds of an unselected screen shape THEN the Canvas System SHALL select that screen shape
2. WHEN a user clicks on the content area of an unselected screen shape THEN the Canvas System SHALL prevent the iframe from capturing the click event
3. WHEN a screen shape is already selected THEN the Canvas System SHALL allow normal iframe interaction within the content area
4. WHEN a user clicks on an unselected screen shape THEN the Canvas System SHALL clear any existing selection before selecting the screen shape

### Requirement 2

**User Story:** As a user, I want the AI chat sidebar to automatically open when I select a screen shape, so that I can immediately start designing with AI assistance.

#### Acceptance Criteria

1. WHEN a user selects a screen shape by clicking on it THEN the Canvas System SHALL automatically open the AI chat sidebar
2. WHEN a screen shape is selected via the select tool THEN the Canvas System SHALL open the AI chat sidebar regardless of where on the screen shape the user clicked
3. WHEN the AI chat sidebar is already open and a user selects a different screen shape THEN the Canvas System SHALL keep the sidebar open and update the context to the newly selected screen

### Requirement 3

**User Story:** As a user, I want to interact with the iframe content when the screen is selected, so that I can preview and test the generated UI.

#### Acceptance Criteria

1. WHILE a screen shape is selected THEN the Canvas System SHALL allow pointer events to pass through to the iframe content
2. WHEN a user clicks inside the iframe of a selected screen shape THEN the Canvas System SHALL NOT deselect the screen shape
3. WHEN a user interacts with the iframe content THEN the Canvas System SHALL maintain the current selection state
