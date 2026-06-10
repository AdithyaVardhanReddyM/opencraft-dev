# Requirements Document

## Introduction

This feature extends the UnitSet Chrome extension to enable users to visually select any HTML element on a webpage, capture a comprehensive representation of that element (including HTML structure, computed styles, and context), and seamlessly integrate the captured content with the UnitSet AI sidebar for component replication. The captured content will be displayed professionally in the chat input and the AI will be instructed to replicate the component as closely as possible.

## Glossary

- **Extension**: The UnitSet Chrome extension that runs in the browser
- **Element Selector**: A visual mode that allows users to hover over and select HTML elements on any webpage
- **Captured Content**: The comprehensive data package containing HTML, styles, and metadata needed for AI replication
- **AI Sidebar**: The chat interface in the UnitSet canvas where users interact with the AI agent
- **Extension Chip**: A styled visual indicator in the chat input showing that content was captured from the extension
- **Selection Mode**: The active state where the extension highlights elements under the cursor

## Requirements

### Requirement 1

**User Story:** As a user, I want to activate element selection mode from the extension popup, so that I can start selecting HTML elements on the current webpage.

#### Acceptance Criteria

1. WHEN the user opens the extension popup THEN the Extension SHALL display a "Select HTML" button prominently
2. WHEN the user clicks the "Select HTML" button THEN the Extension SHALL inject a content script into the active tab and enter selection mode
3. WHEN selection mode is activated THEN the Extension SHALL close the popup and allow interaction with the webpage

### Requirement 2

**User Story:** As a user, I want visual feedback when hovering over elements, so that I can clearly see which element I'm about to select.

#### Acceptance Criteria

1. WHILE selection mode is active AND the user moves the mouse THEN the Extension SHALL highlight the element under the cursor with a visible outline
2. WHEN the cursor moves to a different element THEN the Extension SHALL remove the highlight from the previous element and apply it to the new element
3. WHEN highlighting an element THEN the Extension SHALL use a distinct visual style (colored outline) that does not interfere with the page layout

### Requirement 3

**User Story:** As a user, I want to exit selection mode without selecting anything, so that I can cancel the operation if needed.

#### Acceptance Criteria

1. WHEN the user presses the Escape key during selection mode THEN the Extension SHALL exit selection mode cleanly
2. WHEN exiting selection mode THEN the Extension SHALL remove all visual highlights from the page
3. WHEN exiting selection mode THEN the Extension SHALL restore the page to its original state without side effects

### Requirement 4

**User Story:** As a user, I want to capture a complete representation of the selected element, so that the AI can accurately replicate it.

#### Acceptance Criteria

1. WHEN the user clicks on a highlighted element THEN the Extension SHALL capture the element's outer HTML structure
2. WHEN capturing an element THEN the Extension SHALL extract all computed CSS styles applied to the element and its descendants
3. WHEN capturing an element THEN the Extension SHALL include metadata such as element tag name, dimensions, and position context
4. WHEN capturing is complete THEN the Extension SHALL copy the captured content to the clipboard in a structured format
5. WHEN capturing is complete THEN the Extension SHALL exit selection mode and provide visual confirmation

### Requirement 5

**User Story:** As a user, I want the captured content to display professionally in the AI sidebar input, so that I can see what I'm about to send without visual clutter.

#### Acceptance Criteria

1. WHEN the user pastes captured content into the AI sidebar input THEN the System SHALL detect the extension content format
2. WHEN extension content is detected THEN the System SHALL display an "Extension Chip" visual indicator instead of raw content
3. WHEN displaying the Extension Chip THEN the System SHALL show a styled box with background color and label indicating "Copied from Extension"
4. WHEN the Extension Chip is displayed THEN the System SHALL allow the user to remove it by clicking a close button

### Requirement 6

**User Story:** As a user, I want the AI to understand and replicate the captured component, so that I can recreate UI elements I find on other websites.

#### Acceptance Criteria

1. WHEN the user sends a message containing extension-captured content THEN the System SHALL include the full captured data in the AI request
2. WHEN the AI receives captured content THEN the AI System Prompt SHALL instruct the AI to recognize the content format
3. WHEN the AI processes captured content THEN the AI SHALL attempt to replicate the component as closely as possible using the project's tech stack (Next.js, shadcn/ui, Tailwind CSS)

### Requirement 7

**User Story:** As a developer, I want the captured content format to be well-structured, so that it can be reliably parsed and processed.

#### Acceptance Criteria

1. WHEN capturing element data THEN the Extension SHALL serialize the content as a JSON object with defined schema
2. WHEN serializing captured content THEN the Extension SHALL include a version identifier for future compatibility
3. WHEN serializing captured content THEN the Extension SHALL include a type marker to distinguish it from regular text
4. WHEN the captured content is serialized THEN the Extension SHALL encode it for safe clipboard transfer

### Requirement 8

**User Story:** As a user, I want the extension to work reliably across different websites, so that I can capture elements from any webpage.

#### Acceptance Criteria

1. WHEN selection mode is active on any webpage THEN the Extension SHALL handle elements with various CSS properties correctly
2. WHEN capturing elements with nested children THEN the Extension SHALL preserve the complete DOM hierarchy
3. IF an error occurs during capture THEN the Extension SHALL display a user-friendly error message and exit selection mode gracefully
