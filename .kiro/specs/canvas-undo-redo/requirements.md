# Requirements Document

## Introduction

This document specifies the requirements for implementing undo/redo functionality in the Unit {set} infinite canvas system. The feature will enable users to reverse and reapply their drawing actions, providing a safety net for experimentation and error correction. The implementation will track canvas state changes and allow users to navigate through their action history using keyboard shortcuts and UI controls.

## Glossary

- **Canvas System**: The infinite drawing canvas component that manages viewport state and shape entities
- **History Stack**: A data structure that stores sequential snapshots of canvas state for undo/redo operations
- **Action**: Any user interaction that modifies the canvas state (adding, updating, moving, deleting shapes)
- **History Entry**: A snapshot of canvas state at a specific point in time, including shapes and selection state
- **History Pointer**: An index indicating the current position within the history stack
- **Shapes Reducer**: The state management reducer responsible for shape operations and selection
- **History Pill**: The UI component displaying undo/redo controls in the canvas interface
- **Keyboard Shortcut**: A key combination that triggers undo or redo operations

## Requirements

### Requirement 1

**User Story:** As a designer, I want to undo my recent canvas actions, so that I can quickly correct mistakes without manually reverting changes

#### Acceptance Criteria

1. WHEN THE User performs an action that modifies canvas state (add, update, move, delete shapes), THE Canvas System SHALL record the state change in the history stack
2. WHEN THE User triggers an undo operation, THE Canvas System SHALL restore the canvas to the previous state in the history stack
3. WHEN THE User triggers an undo operation and no previous states exist, THE Canvas System SHALL maintain the current state without changes
4. THE Canvas System SHALL support undoing at least 50 sequential actions
5. WHEN THE User performs a new action after undoing, THE Canvas System SHALL clear all forward history entries beyond the current pointer

### Requirement 2

**User Story:** As a designer, I want to redo actions I previously undid, so that I can restore changes I decided to keep after all

#### Acceptance Criteria

1. WHEN THE User triggers a redo operation after undoing actions, THE Canvas System SHALL restore the canvas to the next state in the history stack
2. WHEN THE User triggers a redo operation and no forward states exist, THE Canvas System SHALL maintain the current state without changes
3. THE Canvas System SHALL preserve redo history until a new modifying action is performed
4. WHILE THE User navigates through history with undo/redo, THE Canvas System SHALL maintain selection state for each history entry

### Requirement 3

**User Story:** As a designer, I want to use keyboard shortcuts for undo and redo, so that I can quickly navigate my action history without interrupting my workflow

#### Acceptance Criteria

1. WHEN THE User presses Ctrl+Z (Windows/Linux) or Cmd+Z (macOS), THE Canvas System SHALL perform an undo operation
2. WHEN THE User presses Ctrl+Shift+Z (Windows/Linux) or Cmd+Shift+Z (macOS), THE Canvas System SHALL perform a redo operation
3. WHEN THE User presses Ctrl+Y (Windows/Linux) or Cmd+Y (macOS), THE Canvas System SHALL perform a redo operation as an alternative shortcut
4. WHILE THE User is editing text in a text input field, THE Canvas System SHALL not intercept undo/redo keyboard shortcuts
5. THE Canvas System SHALL prevent default browser behavior for undo/redo shortcuts to avoid conflicts

### Requirement 4

**User Story:** As a designer, I want visual feedback on undo/redo availability, so that I know when these operations are possible

#### Acceptance Criteria

1. WHEN no previous states exist in the history stack, THE History Pill SHALL display the undo button in a disabled state
2. WHEN no forward states exist in the history stack, THE History Pill SHALL display the redo button in a disabled state
3. WHEN THE User hovers over the undo button, THE History Pill SHALL display a tooltip showing "Undo (Ctrl+Z)" or "Undo (⌘Z)" based on platform
4. WHEN THE User hovers over the redo button, THE History Pill SHALL display a tooltip showing "Redo (Ctrl+Shift+Z)" or "Redo (⌘⇧Z)" based on platform
5. THE History Pill SHALL update button states immediately after any history navigation or state change

### Requirement 5

**User Story:** As a designer, I want undo/redo to work with all canvas operations, so that I have consistent history tracking across all my actions

#### Acceptance Criteria

1. THE Canvas System SHALL track history for shape creation operations (frame, rectangle, ellipse, line, arrow, freedraw, text)
2. THE Canvas System SHALL track history for shape modification operations (resize, move, style changes)
3. THE Canvas System SHALL track history for shape deletion operations (single delete, multi-delete, eraser tool)
4. THE Canvas System SHALL track history for selection changes that result from undo/redo operations
5. THE Canvas System SHALL not track history for viewport operations (pan, zoom) or tool selection changes
6. THE Canvas System SHALL not track history for text editing within a text shape (only final text changes)

### Requirement 6

**User Story:** As a designer, I want undo/redo to preserve my canvas state accurately, so that I can trust the history system to restore exactly what I had before

#### Acceptance Criteria

1. WHEN THE Canvas System restores a history entry, THE Canvas System SHALL restore all shape properties including position, size, style, and content
2. WHEN THE Canvas System restores a history entry, THE Canvas System SHALL restore the selection state to match the historical state
3. WHEN THE Canvas System restores a history entry, THE Canvas System SHALL restore the frame counter to maintain consistent frame numbering
4. THE Canvas System SHALL serialize history entries efficiently to minimize memory usage
5. THE Canvas System SHALL limit history stack size to prevent excessive memory consumption

### Requirement 7

**User Story:** As a designer, I want undo/redo to work seamlessly with canvas persistence, so that my history is preserved when I reload the page

#### Acceptance Criteria

1. WHEN THE Canvas System saves canvas state to localStorage, THE Canvas System SHALL include the current history stack up to the current pointer
2. WHEN THE Canvas System loads canvas state from localStorage, THE Canvas System SHALL restore the history stack and pointer position
3. THE Canvas System SHALL limit persisted history to the most recent 20 entries to balance functionality with storage constraints
4. WHEN THE User performs actions after loading persisted state, THE Canvas System SHALL continue building history from the loaded state
5. THE Canvas System SHALL handle history deserialization errors gracefully by initializing with empty history
