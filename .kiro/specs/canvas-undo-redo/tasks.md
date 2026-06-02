# Implementation Plan

- [x] 1. Create history manager module with core utilities

  - Create `lib/canvas/history-manager.ts` with functions for creating history entries, adding to history stack, undo/redo navigation, and checking undo/redo availability
  - Implement `createHistoryEntry` to snapshot shapes, selection, and frameCounter with timestamp
  - Implement `addToHistory` to handle stack management with max size limit and forward history truncation
  - Implement `undo` and `redo` functions to navigate history stack and return appropriate entries
  - Implement `canUndo` and `canRedo` helper functions for UI state
  - Export `HISTORY_CONFIG` constant with MAX_HISTORY_SIZE (50) and PERSISTED_HISTORY_SIZE (20)
  - _Requirements: 1.1, 1.4, 2.1, 2.2, 6.5_

- [x] 2. Add history types to canvas type definitions

  - Update `types/canvas.ts` to add `HistoryEntry` interface with shapes, selected, frameCounter, and timestamp fields
  - Update `ShapesState` interface to include `history: HistoryEntry[]` and `historyPointer: number` fields
  - _Requirements: 1.1, 6.1, 6.2, 6.3_

- [x] 3. Enhance shapes reducer with history tracking

  - [x] 3.1 Update initial state and add history action types

    - Modify `initialShapesState` in `lib/canvas/shapes-reducer.ts` to include `history: []` and `historyPointer: -1`
    - Add `UNDO` and `REDO` action types to `ShapesAction` union type
    - Import history manager functions at top of file
    - _Requirements: 1.1, 2.1_

  - [x] 3.2 Implement history recording for shape creation actions

    - Modify ADD_FRAME, ADD_RECT, ADD_ELLIPSE, ADD_FREEDRAW, ADD_ARROW, ADD_LINE, ADD_TEXT, ADD_GENERATED_UI cases to record history before adding shape
    - Use `createHistoryEntry` to capture current state before modification
    - Use `addToHistory` to add entry to history stack with updated pointer
    - _Requirements: 1.1, 5.1, 6.1_

  - [x] 3.3 Implement history recording for shape modification and deletion actions

    - Modify UPDATE_SHAPE case to record history before updating shape properties
    - Modify REMOVE_SHAPE and DELETE_SELECTED cases to record history before deletion
    - Modify CLEAR_ALL case to record history before clearing all shapes
    - _Requirements: 1.1, 5.2, 5.3, 6.1_

  - [x] 3.4 Implement UNDO action handler

    - Add UNDO case to reducer that calls history manager's `undo` function
    - Restore shapes, selected, and frameCounter from returned history entry
    - Update historyPointer to new position
    - Handle case when no undo is available (return state unchanged)
    - _Requirements: 1.2, 1.3, 2.1, 6.2, 6.3_

  - [x] 3.5 Implement REDO action handler

    - Add REDO case to reducer that calls history manager's `redo` function
    - Restore shapes, selected, and frameCounter from returned history entry
    - Update historyPointer to new position
    - Handle case when no redo is available (return state unchanged)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.2, 6.3_

  - [x] 3.6 Ensure selection and tool changes do not record history
    - Verify SET_TOOL, SELECT_SHAPE, DESELECT_SHAPE, CLEAR_SELECTION, SELECT_ALL, SET_EDITING_TEXT cases do not call history recording
    - Verify LOAD_PROJECT case does not record history (it loads persisted state including history)
    - _Requirements: 5.5_

- [x] 4. Extend useInfiniteCanvas hook with undo/redo functionality

  - [x] 4.1 Add undo/redo functions and state accessors

    - Import history manager's `canUndo` and `canRedo` functions in `hooks/use-infinite-canvas.ts`
    - Create `undo` function that dispatches `{ type: "UNDO" }` action
    - Create `redo` function that dispatches `{ type: "REDO" }` action
    - Compute `canUndo` using `canUndo(shapesState.historyPointer)`
    - Compute `canRedo` using `canRedo(shapesState.history, shapesState.historyPointer)`
    - Add undo, redo, canUndo, canRedo to return object of `UseInfiniteCanvasReturn` interface
    - _Requirements: 1.2, 2.1, 4.1, 4.2_

  - [x] 4.2 Implement keyboard shortcuts for undo/redo
    - Extend existing `onKeyDown` handler to detect Ctrl+Z / Cmd+Z for undo
    - Extend existing `onKeyDown` handler to detect Ctrl+Shift+Z / Cmd+Shift+Z for redo
    - Extend existing `onKeyDown` handler to detect Ctrl+Y / Cmd+Y for redo (alternative)
    - Ensure shortcuts are disabled when typing in text inputs (check isTypingElement)
    - Call preventDefault on keyboard events to prevent browser default behavior
    - Dispatch UNDO or REDO actions when shortcuts are triggered
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Update HistoryPill component to use undo/redo state

  - Update `components/canvas/HistoryPill.tsx` to receive canUndo and canRedo props
  - Update button disabled attributes to use canUndo and canRedo values
  - Add Tooltip components from `@/components/ui/tooltip` to undo and redo buttons
  - Display "Undo (⌘Z)" or "Undo (Ctrl+Z)" in undo tooltip based on platform (detect with navigator.platform or userAgent)
  - Display "Redo (⌘⇧Z)" or "Redo (Ctrl+Shift+Z)" in redo tooltip based on platform
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Connect HistoryPill to canvas page

  - Update `app/dashboard/[projectId]/canvas/page.tsx` to get undo, redo, canUndo, canRedo from useInfiniteCanvas hook
  - Pass undo and redo functions as onUndo and onRedo props to HistoryPill component
  - Pass canUndo and canRedo boolean values to HistoryPill component
  - _Requirements: 4.5_

- [x] 7. Extend persistence module to include history

  - [x] 7.1 Update persistence types and serialization

    - Update `CanvasProjectData` interface in `lib/canvas/persistence.ts` to include optional `history?: HistoryEntry[]` and `historyPointer?: number` fields
    - Modify `serializeCanvasState` function to include history and historyPointer from shapes state
    - Limit persisted history to most recent PERSISTED_HISTORY_SIZE (20) entries to reduce storage size
    - Calculate slice range based on historyPointer to preserve relevant history around current position
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 7.2 Update persistence deserialization and loading

    - Modify `deserializeCanvasState` function to extract history and historyPointer from data
    - Handle missing history fields gracefully by defaulting to empty array and -1 pointer
    - Update `loadFromLocalStorage` to return history and historyPointer in result object
    - _Requirements: 7.2, 7.4, 7.5_

  - [x] 7.3 Update canvas persistence hook to load history
    - Modify `hooks/use-canvas-persistence.ts` to dispatch LOAD_PROJECT with history and historyPointer from loaded data
    - Ensure history is restored when loading from localStorage on mount
    - Verify auto-save includes history in serialized state
    - _Requirements: 7.2, 7.4_

- [x] 8. Add error handling and edge cases

  - Add try-catch blocks around history recording in reducer to handle serialization errors
  - Add validation in history manager to check for corrupted entries
  - Add boundary checks in undo/redo to prevent invalid pointer positions
  - Log errors to console for debugging without disrupting user experience
  - _Requirements: 6.5_

- [x] 9. Performance optimization and testing

  - Verify history recording adds minimal overhead (<5ms per action)
  - Test undo/redo performance with large canvases (50+ shapes)
  - Verify memory usage stays reasonable with full history stack
  - Test localStorage save/load performance with history data
  - _Requirements: 1.4, 6.4, 6.5_

- [x] 10. Manual testing and validation
  - Test basic undo/redo flow with multiple shape types
  - Test undo/redo with shape movement and resizing
  - Test undo/redo with shape deletion and multi-delete
  - Test selection state preservation through undo/redo
  - Test frame numbering consistency after undo/redo
  - Test keyboard shortcuts on both macOS and Windows/Linux
  - Test history persistence across page reloads
  - Test edge cases (empty history, max history, undo at start, redo at end)
  - Verify UI button states update correctly
  - Verify tooltips display correct platform-specific shortcuts
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5_
