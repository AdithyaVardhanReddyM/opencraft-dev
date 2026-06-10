# Implementation Plan

- [x] 1. Set up edit mode types and utilities

  - [x] 1.1 Create edit mode type definitions
    - Create `lib/edit-mode/types.ts` with interfaces for EditModeState, SelectedElementInfo, HoveredElementInfo, ComputedStylesInfo, StyleChanges
    - Define message types for parent-iframe communication (ParentToIframeMessage, IframeToParentMessage)
    - _Requirements: 3.2, 4.1, 4.2, 4.3, 4.4_
  - [ ]\* 1.2 Write property test for computed styles completeness
    - **Property 4: Computed styles completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 2. Implement style mapper utilities

  - [x] 2.1 Create CSS to Tailwind mapping functions
    - Create `lib/edit-mode/style-mapper.ts` with mapping tables and conversion functions
    - Implement fontSizeToTailwind, colorToTailwind, spacingToTailwind, borderRadiusToTailwind
    - Implement cssToTailwind function that converts StyleChanges to Tailwind class array
    - Implement arbitrary value syntax fallback for non-standard values
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ]\* 2.2 Write property test for CSS to Tailwind mapping validity
    - **Property 6: CSS to Tailwind mapping validity**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
  - [x] 2.3 Implement className update function
    - Create updateElementClassName function to parse and update className in JSX/TSX source
    - Handle various className formats (string literal, template literal, cn() calls)
    - Preserve existing non-conflicting classes
    - _Requirements: 6.3_
  - [ ]\* 2.4 Write property test for source file className update preservation
    - **Property 7: Source file className update preservation**
    - **Validates: Requirements 6.2, 6.3, 6.4**

- [x] 3. Checkpoint - Make sure all tests are passing

  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement overlay script

  - [x] 4.1 Create overlay script template
    - Create `lib/edit-mode/overlay-script.ts` with the IIFE script template
    - Implement createOverlays function to create highlight and selection overlay elements
    - Implement updateHighlight and updateSelection functions for positioning
    - Implement getComputedStylesInfo to extract all required CSS properties
    - _Requirements: 2.1, 2.3, 3.1, 4.2, 4.3, 4.4_
  - [x] 4.2 Implement element path generation
    - Create getElementPath function to generate unique CSS selector for elements
    - Handle elements with IDs, classes, and nth-child fallback
    - Ensure generated paths are unique within the document
    - _Requirements: 9.1, 9.3_
  - [ ]\* 4.3 Write property test for element path uniqueness
    - **Property 8: Element path uniqueness**
    - **Validates: Requirements 9.1, 9.3**
  - [x] 4.4 Implement event handlers in overlay script
    - Implement handleMouseMove for hover highlighting
    - Implement handleClick for element selection
    - Implement handleMessage for receiving commands from parent
    - Add postMessage calls to communicate with parent window
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3_

- [x] 5. Implement sandbox file operations

  - [x] 5.1 Create sandbox file utilities
    - Create `lib/edit-mode/sandbox-files.ts` with file operation functions
    - Implement injectOverlayScript to add script to layout.tsx
    - Implement removeOverlayScript to restore original layout.tsx
    - Store original layout content for clean restoration
    - _Requirements: 1.1, 1.2, 8.1, 8.2_
  - [ ]\* 5.2 Write property test for overlay script injection round-trip
    - **Property 1: Overlay script injection round-trip**
    - **Validates: Requirements 1.1, 1.2, 8.1, 8.2**
  - [x] 5.3 Implement source file read/write functions
    - Implement readSourceFile to read file content from sandbox
    - Implement writeSourceFile to write updated content to sandbox
    - _Requirements: 6.2, 6.4_

- [x] 6. Create API routes for edit mode

  - [x] 6.1 Create enable edit mode API route
    - Create `app/api/sandbox/edit-mode/enable/route.ts`
    - Connect to sandbox, read layout file, inject script, write back
    - Return success/error response
    - _Requirements: 1.1, 8.1_
  - [x] 6.2 Create disable edit mode API route
    - Create `app/api/sandbox/edit-mode/disable/route.ts`
    - Connect to sandbox, restore original layout file
    - Return success/error response
    - _Requirements: 1.2, 8.2_
  - [x] 6.3 Create file write API route
    - Create `app/api/sandbox/files/write/route.ts`
    - Accept sandboxId, path, and content
    - Write file to sandbox using E2B SDK
    - _Requirements: 6.4_

- [x] 7. Checkpoint - Make sure all tests are passing

  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement useEditMode hook

  - [x] 8.1 Create useEditMode hook
    - Create `hooks/use-edit-mode.ts` with edit mode state management
    - Implement enableEditMode to call API and set up message listener
    - Implement disableEditMode to call API and clean up
    - Handle postMessage events from iframe
    - _Requirements: 1.1, 1.2, 1.3, 3.2_
  - [x] 8.2 Implement style update and save functions
    - Implement updateStyle to apply changes to DOM via postMessage
    - Track pending changes in state
    - Implement saveChanges to convert styles to Tailwind and write to source file
    - Implement discardChanges to reset pending changes
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 9. Create EditModeContext

  - [x] 9.1 Create EditModeContext provider
    - Create `contexts/EditModeContext.tsx` with context and provider
    - Wrap useEditMode hook functionality
    - Provide context value to children
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 10. Implement ElementPropertiesPanel component

  - [x] 10.1 Create ElementPropertiesPanel component
    - Create `components/canvas/ElementPropertiesPanel.tsx`
    - Display element tag name and existing classes
    - Show source file path if available
    - _Requirements: 4.1, 9.2_
  - [x] 10.2 Implement typography controls section
    - Add font family selector (sans, serif, mono)
    - Add font size input with Tailwind presets
    - Add font weight selector
    - Add text color picker
    - Add text alignment controls
    - _Requirements: 4.2, 5.1_
  - [x] 10.3 Implement layout controls section
    - Add width/height inputs
    - Add padding controls (individual sides)
    - Add margin controls (individual sides)
    - Add display type selector
    - Add flex direction and alignment controls
    - _Requirements: 4.3, 5.2_
  - [x] 10.4 Implement appearance controls section
    - Add background color picker
    - Add border radius control
    - Add border width and color controls
    - Add opacity slider
    - _Requirements: 4.4, 5.3_
  - [x] 10.5 Implement save/discard actions
    - Add unsaved changes indicator
    - Add Save button with loading state
    - Add Discard button
    - Show success/error notifications
    - _Requirements: 5.4, 6.5, 6.6_

- [x] 11. Implement EditModePanel component

  - [x] 11.1 Create EditModePanel component
    - Create `components/canvas/EditModePanel.tsx`
    - Show empty state with instructions when no element selected
    - Show ElementPropertiesPanel when element is selected
    - Show edit mode indicator
    - _Requirements: 1.4, 4.5_

- [x] 12. Integrate edit mode into AISidebar

  - [x] 12.1 Update AISidebar Edit tab
    - Replace ComingSoonPlaceholder with EditModePanel
    - Pass screenId, sandboxId, sandboxUrl props
    - Handle tab switching to enable/disable edit mode
    - _Requirements: 1.1, 1.2_
  - [x] 12.2 Add EditModeContext provider
    - Wrap AISidebar content with EditModeProvider when on Edit tab
    - Pass iframe ref for postMessage communication
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 13. Update Screen component for edit mode

  - [x] 13.1 Add edit mode support to Screen component
    - Forward iframe ref to parent for postMessage
    - Add pointer-events handling for edit mode
    - Ensure iframe allows cross-origin messaging
    - _Requirements: 1.3, 2.1, 3.1_

- [x] 14. Checkpoint - Make sure all tests are passing

  - Ensure all tests pass, ask the user if questions arise.

- [ ]\* 15. Write remaining property tests

  - [ ]\* 15.1 Write property test for hover highlight positioning
    - **Property 2: Hover highlight positioning**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  - [ ]\* 15.2 Write property test for single element selection invariant
    - **Property 3: Single element selection invariant**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [ ]\* 15.3 Write property test for style changes apply to DOM
    - **Property 5: Style changes apply to DOM immediately**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 16. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.
