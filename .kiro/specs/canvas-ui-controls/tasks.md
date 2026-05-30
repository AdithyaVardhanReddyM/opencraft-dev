# Implementation Plan

- [x] 1. Update viewport reducer with zoom actions

  - Add ZOOM_IN, ZOOM_OUT, and SET_ZOOM action types to ViewportAction union in lib/canvas/viewport-reducer.ts
  - Implement action handlers that multiply/divide scale by 1.2 and clamp to min/max bounds
  - _Requirements: 3.6, 3.7, 7.2, 7.3_

- [x] 2. Create Toolbar component

  - [x] 2.1 Create Toolbar component file with tool configuration

    - Create components/canvas/Toolbar.tsx with ToolbarProps interface
    - Define TOOLS array with tool IDs, Lucide icons (MousePointer2, Square, RectangleHorizontal, Circle, Pencil, Type, Eraser), and labels
    - _Requirements: 1.2, 1.3, 4.7_

  - [x] 2.2 Implement Toolbar UI and styling

    - Create fixed positioned container at top-center with semi-transparent card background
    - Map over TOOLS array to render button elements with icons
    - Apply active/inactive button styles based on currentTool prop
    - Add hover states and transitions
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.4_

  - [x] 2.3 Add Toolbar accessibility features
    - Add aria-label to each button with tool name
    - Add aria-pressed attribute for active tool
    - Ensure keyboard navigation works with tab key
    - _Requirements: 4.7, 8.3, 8.4_

- [x] 3. Create ZoomBar component

  - [x] 3.1 Create ZoomBar component file with props interface

    - Create components/canvas/ZoomBar.tsx with ZoomBarProps interface
    - Import Minus and Plus icons from Lucide React
    - _Requirements: 3.1, 3.4, 3.5_

  - [x] 3.2 Implement ZoomBar UI and styling

    - Create fixed positioned pill-shaped container at bottom-left
    - Add zoom out button with Minus icon
    - Add centered percentage display that formats scale as integer percentage
    - Add zoom in button with Plus icon
    - Apply semi-transparent card background with backdrop blur
    - _Requirements: 3.1, 3.2, 3.3, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

  - [x] 3.3 Implement ZoomBar button logic

    - Disable zoom in button when scale >= maxScale
    - Disable zoom out button when scale <= minScale
    - Call onZoomIn/onZoomOut handlers on button clicks
    - _Requirements: 3.6, 3.7, 7.2, 7.3, 7.4, 7.5_

  - [x] 3.4 Add ZoomBar accessibility features
    - Add aria-label to zoom buttons
    - Add aria-live="polite" to percentage display
    - _Requirements: 8.3, 8.4_

- [x] 4. Create HistoryPill component

  - [x] 4.1 Create HistoryPill component file with props interface

    - Create components/canvas/HistoryPill.tsx with HistoryPillProps interface
    - Import Undo2 and Redo2 icons from Lucide React
    - _Requirements: 2.1, 2.3, 2.4_

  - [x] 4.2 Implement HistoryPill UI and styling

    - Create fixed positioned pill-shaped container at bottom-left
    - Add undo button with Undo2 icon
    - Add redo button with Redo2 icon
    - Apply semi-transparent card background with backdrop blur
    - Apply disabled styles when canUndo/canRedo is false
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

  - [x] 4.3 Implement HistoryPill button logic

    - Call onUndo handler when undo button clicked
    - Call onRedo handler when redo button clicked
    - Disable buttons based on canUndo/canRedo props
    - _Requirements: 2.7, 2.8_

  - [x] 4.4 Add HistoryPill accessibility features
    - Add aria-label to undo and redo buttons
    - Add aria-disabled attribute when buttons are disabled
    - _Requirements: 8.3, 8.4_

- [x] 5. Integrate components into canvas page

  - [x] 5.1 Update canvas page imports and layout

    - Import Toolbar, ZoomBar, and HistoryPill components in app/dashboard/[projectId]/canvas/page.tsx
    - Remove existing toolbar implementation
    - Add new components to canvas layout with proper positioning
    - _Requirements: 1.1, 2.1, 3.1, 5.4, 5.5_

  - [x] 5.2 Connect Toolbar to canvas state

    - Pass currentTool from useInfiniteCanvas to Toolbar
    - Pass selectTool function as onToolSelect prop
    - _Requirements: 1.4, 6.1, 6.2, 6.3, 6.4_

  - [x] 5.3 Connect ZoomBar to viewport state

    - Pass viewport.scale to ZoomBar
    - Create zoom in handler that dispatches ZOOM_IN action
    - Create zoom out handler that dispatches ZOOM_OUT action
    - Pass viewport min/max scale values
    - _Requirements: 3.6, 3.7, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 5.4 Connect HistoryPill with placeholder handlers
    - Create placeholder onUndo and onRedo handlers (console.log for now)
    - Pass canUndo={false} and canRedo={false} as initial values
    - Add TODO comment for future history implementation
    - _Requirements: 2.7, 2.8_

- [ ]\* 6. Add responsive mobile styles
  - Update Toolbar button sizes for mobile breakpoint (< 640px)
  - Adjust ZoomBar and HistoryPill spacing on mobile
  - Ensure touch target sizes meet 44x44px minimum
  - _Requirements: 8.1, 8.2, 8.5_
