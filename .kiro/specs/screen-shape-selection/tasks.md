# Implementation Plan

- [x] 1. Update Screen component with click overlay

  - [x] 1.1 Add conditional click overlay to Screen component
    - Modify `components/canvas/shapes/Screen.tsx`
    - Add a transparent overlay div that covers the content area
    - Position overlay absolutely over the content area (below title bar)
    - Set `pointer-events: auto` when `isSelected` is false
    - Set `pointer-events: none` when `isSelected` is true
    - Attach `onClick` handler to the overlay
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.2 Update iframe pointer-events based on selection
    - Set iframe `pointer-events: none` when not selected (overlay handles clicks)
    - Set iframe `pointer-events: auto` when selected (allow interaction)
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]\* 1.3 Write property test for overlay state
    - **Property 2: Overlay state reflects selection status**
    - **Validates: Requirements 1.2, 1.3, 3.1**

- [x] 2. Verify selection and sidebar integration

  - [x] 2.1 Verify click anywhere triggers selection
    - Test that clicking on the overlay selects the screen shape
    - Ensure existing onClick handler in canvas page is called
    - Verify selection clears other selected shapes
    - _Requirements: 1.1, 1.4_
  - [ ]\* 2.2 Write property test for click selection
    - **Property 1: Click anywhere selects unselected screen**
    - **Validates: Requirements 1.1, 1.4**
  - [x] 2.3 Verify sidebar auto-opens on screen selection
    - Confirm sidebar opens when screen is selected via overlay click
    - Confirm sidebar opens when screen is selected via hit-testing
    - _Requirements: 2.1, 2.2_
  - [ ]\* 2.4 Write property test for sidebar opening
    - **Property 3: Screen selection opens sidebar**
    - **Validates: Requirements 2.1, 2.2**

- [x] 3. Test iframe interaction when selected

  - [x] 3.1 Verify iframe is interactive when screen is selected
    - Confirm pointer events pass through to iframe when selected
    - Confirm clicking inside iframe doesn't deselect the screen
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]\* 3.2 Write property test for selection persistence
    - **Property 5: Iframe clicks preserve selection**
    - **Validates: Requirements 3.2, 3.3**

- [x] 4. Test sidebar persistence across screen switches

  - [x] 4.1 Verify sidebar stays open when switching screens
    - Select one screen (sidebar opens)
    - Select a different screen
    - Confirm sidebar remains open
    - _Requirements: 2.3_
  - [ ]\* 4.2 Write property test for sidebar persistence
    - **Property 4: Sidebar persists across screen switches**
    - **Validates: Requirements 2.3**

- [ ] 5. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
