# Requirements Document

## Introduction

The Visual Element Editor enables users to visually select and modify UI elements within the AI-generated sandbox preview. When users switch to the "Edit" tab in the AI sidebar, an overlay system is injected into the sandbox iframe that allows hovering to highlight elements, clicking to select them, and viewing/modifying their styles through a properties panel. Changes are initially applied to the DOM in real-time, and upon saving, the modifications are persisted back to the sandbox code files by mapping styles to Tailwind CSS classes.

## Glossary

- **Edit Mode**: A state activated when the user switches to the "Edit" tab in the AI sidebar, enabling visual element selection and modification
- **Sandbox**: The E2B isolated Next.js environment running the AI-generated code with live preview
- **Overlay Script**: JavaScript code injected into the sandbox layout file that handles element highlighting, selection, and style communication
- **Properties Panel**: The UI section in the AI sidebar that displays and allows modification of selected element styles
- **Style Mapping**: The process of converting CSS property values to equivalent Tailwind CSS classes
- **Element Selector**: The visual system that highlights elements on hover and allows selection on click

## Requirements

### Requirement 1

**User Story:** As a user, I want to toggle edit mode when switching to the Edit tab, so that I can visually interact with elements in the sandbox preview.

#### Acceptance Criteria

1. WHEN a user switches to the Edit tab in the AI sidebar THEN the Visual_Element_Editor SHALL inject the overlay script into the sandbox layout file within 500 milliseconds
2. WHEN a user switches away from the Edit tab THEN the Visual_Element_Editor SHALL remove the overlay script from the sandbox layout file within 500 milliseconds
3. WHILE edit mode is active THEN the Visual_Element_Editor SHALL disable pointer interactions on the iframe content except for the overlay system
4. WHEN edit mode is activated THEN the Visual_Element_Editor SHALL display a visual indicator showing edit mode is active

### Requirement 2

**User Story:** As a user, I want to see elements highlight as I hover over them, so that I can identify which element I'm about to select.

#### Acceptance Criteria

1. WHILE edit mode is active and the user hovers over an element THEN the Overlay_Script SHALL display a colored border around the hovered element
2. WHEN the user hovers over a new element THEN the Overlay_Script SHALL remove the highlight from the previous element and highlight the new element
3. WHILE highlighting an element THEN the Overlay_Script SHALL display a label showing the element tag name (e.g., "div", "h1", "button")
4. WHEN the user moves the cursor outside the iframe THEN the Overlay_Script SHALL remove all hover highlights

### Requirement 3

**User Story:** As a user, I want to select an element by clicking on it, so that I can view and modify its properties.

#### Acceptance Criteria

1. WHEN a user clicks on an element in edit mode THEN the Overlay_Script SHALL mark that element as selected and display a persistent selection border
2. WHEN an element is selected THEN the Overlay_Script SHALL communicate the element's computed styles, tag name, and class list to the parent window
3. WHEN a user clicks on a different element THEN the Visual_Element_Editor SHALL deselect the previous element and select the new one
4. WHEN a user clicks outside any selectable element THEN the Visual_Element_Editor SHALL deselect the currently selected element

### Requirement 4

**User Story:** As a user, I want to view the selected element's properties in the sidebar, so that I can understand its current styling.

#### Acceptance Criteria

1. WHEN an element is selected THEN the Properties_Panel SHALL display the element's tag name and existing Tailwind classes
2. WHEN an element is selected THEN the Properties_Panel SHALL display typography properties including font family, font size, font weight, line height, and text color for text-containing elements
3. WHEN an element is selected THEN the Properties_Panel SHALL display layout properties including width, height, padding, margin, and display type
4. WHEN an element is selected THEN the Properties_Panel SHALL display appearance properties including background color, border radius, border width, and border color
5. WHEN no element is selected THEN the Properties_Panel SHALL display an instructional message guiding the user to select an element

### Requirement 5

**User Story:** As a user, I want to modify element properties through the sidebar controls, so that I can customize the element's appearance.

#### Acceptance Criteria

1. WHEN a user modifies a typography property THEN the Visual_Element_Editor SHALL apply the change to the selected element's DOM immediately
2. WHEN a user modifies a layout property THEN the Visual_Element_Editor SHALL apply the change to the selected element's DOM immediately
3. WHEN a user modifies an appearance property THEN the Visual_Element_Editor SHALL apply the change to the selected element's DOM immediately
4. WHILE properties are being modified THEN the Properties_Panel SHALL display a visual indicator showing unsaved changes exist

### Requirement 6

**User Story:** As a user, I want to save my property changes to the sandbox code, so that my modifications persist in the generated files.

#### Acceptance Criteria

1. WHEN a user clicks the save button THEN the Visual_Element_Editor SHALL convert the modified CSS properties to equivalent Tailwind CSS classes
2. WHEN saving changes THEN the Visual_Element_Editor SHALL identify the correct source file containing the selected element
3. WHEN saving changes THEN the Visual_Element_Editor SHALL update the element's className in the source file with the new Tailwind classes
4. WHEN saving changes THEN the Visual_Element_Editor SHALL write the updated file to the sandbox using the sandbox file write API
5. WHEN save completes successfully THEN the Visual_Element_Editor SHALL display a success notification and clear the unsaved changes indicator
6. IF saving fails THEN the Visual_Element_Editor SHALL display an error message and preserve the unsaved changes state

### Requirement 7

**User Story:** As a user, I want the style-to-Tailwind mapping to be accurate, so that my visual changes translate correctly to code.

#### Acceptance Criteria

1. WHEN converting font size values THEN the Style_Mapper SHALL map pixel values to the nearest Tailwind text size class (text-xs through text-9xl)
2. WHEN converting color values THEN the Style_Mapper SHALL map RGB/hex values to Tailwind color classes or preserve custom values using arbitrary value syntax
3. WHEN converting spacing values THEN the Style_Mapper SHALL map pixel values to the nearest Tailwind spacing scale (p-_, m-_, w-_, h-_)
4. WHEN converting border radius values THEN the Style_Mapper SHALL map pixel values to Tailwind rounded classes (rounded-none through rounded-full)
5. WHEN a CSS value has no direct Tailwind equivalent THEN the Style_Mapper SHALL use Tailwind's arbitrary value syntax (e.g., `w-[123px]`)

### Requirement 8

**User Story:** As a user, I want the overlay script to be injected and removed cleanly, so that it does not interfere with the sandbox application.

#### Acceptance Criteria

1. WHEN injecting the overlay script THEN the Visual_Element_Editor SHALL add the script to the sandbox's root layout file without modifying existing functionality
2. WHEN removing the overlay script THEN the Visual_Element_Editor SHALL restore the layout file to its original state
3. WHEN the overlay script is active THEN the Overlay_Script SHALL not interfere with the sandbox application's existing event handlers
4. WHEN the overlay script encounters an error THEN the Overlay_Script SHALL log the error and continue operating without crashing the sandbox application

### Requirement 9

**User Story:** As a user, I want to identify elements by their source location, so that the correct code is modified when I save changes.

#### Acceptance Criteria

1. WHEN the overlay script initializes THEN the Overlay_Script SHALL add data attributes to elements indicating their source file path and line number where possible
2. WHEN an element is selected THEN the Properties_Panel SHALL display the source file path if available
3. WHEN saving changes to an element without source location data THEN the Visual_Element_Editor SHALL attempt to locate the element by matching its structure and content in the source files
