# Requirements Document

## Introduction

This document specifies the requirements for fixing critical bugs in the Visual Element Editor (Edit Mode) feature. The current implementation has several issues where style changes are applied globally instead of to specific elements, properties are not properly reflected in the UI, and flex properties are not saving correctly. These fixes will ensure that style modifications only affect the intended element and that the property panel accurately reflects the current state of selected elements.

## Glossary

- **Edit Mode**: A feature that allows users to visually select and modify CSS properties of elements in a sandbox preview iframe
- **Sandbox**: An isolated E2B environment running a Next.js application where user-generated UI is rendered
- **Overlay Script**: JavaScript code injected into the sandbox that handles element selection and style application
- **Unique Selector**: A CSS selector that identifies exactly one element in the DOM
- **Pending Changes**: Style modifications that have been applied to the DOM but not yet persisted to source files
- **Computed Styles**: The final CSS property values as calculated by the browser for a selected element
- **Source File**: The JSX/TSX file in the sandbox that contains the element's markup
- **Tailwind Class**: A utility CSS class from the Tailwind CSS framework

## Requirements

### Requirement 1

**User Story:** As a user, I want style changes to only affect the specific element I selected, so that I don't accidentally modify other elements on the page.

#### Acceptance Criteria

1. WHEN a user modifies a style property for a selected element THEN the System SHALL apply the change only to that specific element in the DOM
2. WHEN a user saves style changes THEN the System SHALL update only the className of the selected element in the source file
3. WHEN multiple elements share the same tag name and classes THEN the System SHALL use nth-of-type or sibling index to uniquely identify the target element
4. WHEN the System cannot generate a unique selector THEN the System SHALL warn the user before applying changes
5. IF a style change would affect multiple elements THEN the System SHALL prevent the change and display an error message

### Requirement 2

**User Story:** As a user, I want the property panel to accurately display the current styles of my selected element, so that I can see what values I'm modifying.

#### Acceptance Criteria

1. WHEN a user selects an element THEN the System SHALL display all computed style values in the property panel
2. WHEN a user has pending changes THEN the System SHALL display the pending values instead of computed values for modified properties
3. WHEN computed styles contain RGB color values THEN the System SHALL convert them to hex format for display
4. WHEN computed styles contain shorthand values THEN the System SHALL expand them to individual properties
5. WHEN the selected element changes THEN the System SHALL clear pending changes and refresh all property values

### Requirement 3

**User Story:** As a user, I want flex layout properties to save and apply correctly, so that I can adjust the layout of container elements.

#### Acceptance Criteria

1. WHEN a user changes flexDirection THEN the System SHALL apply the corresponding Tailwind class (flex-row, flex-col, etc.)
2. WHEN a user changes justifyContent THEN the System SHALL apply the corresponding Tailwind class (justify-start, justify-center, etc.)
3. WHEN a user changes alignItems THEN the System SHALL apply the corresponding Tailwind class (items-start, items-center, etc.)
4. WHEN a user changes gap values THEN the System SHALL apply the corresponding Tailwind gap classes
5. WHEN a user enables flex display THEN the System SHALL add the "flex" class to the element
6. WHEN flex properties are saved THEN the System SHALL remove conflicting existing flex classes before adding new ones

### Requirement 4

**User Story:** As a user, I want the System to properly identify elements in the source code, so that my changes are persisted to the correct location.

#### Acceptance Criteria

1. WHEN an element has an id attribute THEN the System SHALL use the id to locate it in source code
2. WHEN an element has a data-testid attribute THEN the System SHALL use the data-testid to locate it in source code
3. WHEN an element has neither id nor data-testid THEN the System SHALL use a combination of tag name, class names, and position to locate it
4. WHEN the System locates an element in source code THEN the System SHALL verify it matches the selected element's characteristics
5. IF the System cannot uniquely locate the element THEN the System SHALL display an error and prevent saving

### Requirement 5

**User Story:** As a user, I want conflicting Tailwind classes to be properly handled, so that my style changes take effect without conflicts.

#### Acceptance Criteria

1. WHEN adding a new Tailwind class THEN the System SHALL remove any existing classes with the same prefix
2. WHEN a text color class is added THEN the System SHALL remove any existing text-\* color classes
3. WHEN a background color class is added THEN the System SHALL remove any existing bg-\* color classes
4. WHEN a flex direction class is added THEN the System SHALL remove any existing flex-row or flex-col classes
5. WHEN arbitrary value classes are used THEN the System SHALL properly escape special characters

### Requirement 6

**User Story:** As a user, I want real-time preview of my style changes, so that I can see the effect before saving.

#### Acceptance Criteria

1. WHEN a user modifies a style property THEN the System SHALL immediately apply the change to the DOM via inline styles
2. WHEN a user discards changes THEN the System SHALL revert the element to its original computed styles
3. WHEN the iframe reloads THEN the System SHALL re-apply any pending changes to maintain preview state
4. WHEN applying inline styles THEN the System SHALL use the correct CSS property name format (camelCase for JS)
