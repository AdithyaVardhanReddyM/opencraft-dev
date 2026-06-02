# Design Document: Canvas Undo/Redo Functionality

## Overview

This document outlines the design for implementing undo/redo functionality in the Unit {set} infinite canvas system. The implementation will use a history stack pattern to track canvas state changes, enabling users to navigate through their action history using keyboard shortcuts and UI controls. The design integrates seamlessly with the existing React Context + useReducer architecture while maintaining performance and memory efficiency.

## Architecture

### High-Level Design

The undo/redo system will be implemented as an extension to the existing shapes reducer, adding history tracking capabilities without disrupting the current state management flow. The architecture follows these principles:

1. **History Stack Pattern**: Maintain a stack of historical states with a pointer indicating the current position
2. **Action-Based Recording**: Automatically record state changes when specific actions are dispatched
3. **Efficient Storage**: Store only essential state (shapes, selection, frameCounter) to minimize memory usage
4. **Integration with Persistence**: Extend the existing localStorage persistence to include limited history

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CanvasContext                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Shapes Reducer (Enhanced)                    │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │         History Manager                          │ │ │
│  │  │  - History Stack (max 50 entries)                │ │ │
│  │  │  - Current Pointer                               │ │ │
│  │  │  - Record/Undo/Redo Logic                        │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  │  Regular Actions → Record History → Update State      │ │
│  │  Undo Action → Restore Previous State                 │ │
│  │  Redo Action → Restore Next State                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              useInfiniteCanvas Hook                          │
│  - Keyboard Shortcut Handlers (Ctrl+Z, Ctrl+Shift+Z)        │
│  - Undo/Redo Functions                                       │
│  - History State Accessors (canUndo, canRedo)               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  HistoryPill Component                       │
│  - Undo Button (with disabled state)                        │
│  - Redo Button (with disabled state)                        │
│  - Tooltips with platform-specific shortcuts                │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. History State Types

New types will be added to `types/canvas.ts`:

```typescript
// History entry representing a snapshot of canvas state
export interface HistoryEntry {
  shapes: EntityState<Shape>;
  selected: SelectionMap;
  frameCounter: number;
  timestamp: number;
}

// Enhanced shapes state with history tracking
export interface ShapesState {
  tool: Tool;
  shapes: EntityState<Shape>;
  selected: SelectionMap;
  frameCounter: number;
  editingTextId: string | null;

  // History tracking
  history: HistoryEntry[];
  historyPointer: number;
}
```

### 2. History Actions

New action types will be added to `lib/canvas/shapes-reducer.ts`:

```typescript
export type ShapesAction =
  | ... // existing actions
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RECORD_HISTORY" } // Manual history recording if needed
```

### 3. History Manager Module

A new utility module `lib/canvas/history-manager.ts` will provide history management functions:

```typescript
export interface HistoryManager {
  // Create a history entry from current state
  createHistoryEntry(
    shapes: EntityState<Shape>,
    selected: SelectionMap,
    frameCounter: number
  ): HistoryEntry;

  // Add entry to history stack
  addToHistory(
    history: HistoryEntry[],
    pointer: number,
    entry: HistoryEntry,
    maxSize: number
  ): { history: HistoryEntry[]; pointer: number };

  // Navigate to previous state
  undo(
    history: HistoryEntry[],
    pointer: number
  ): { entry: HistoryEntry | null; pointer: number };

  // Navigate to next state
  redo(
    history: HistoryEntry[],
    pointer: number
  ): { entry: HistoryEntry | null; pointer: number };

  // Check if undo is available
  canUndo(pointer: number): boolean;

  // Check if redo is available
  canRedo(history: HistoryEntry[], pointer: number): boolean;
}
```

### 4. Enhanced Shapes Reducer

The shapes reducer will be enhanced to:

- Initialize with empty history state
- Record history before state-modifying actions
- Handle UNDO and REDO actions
- Clear forward history when new actions are performed after undo

**Actions that trigger history recording:**

- ADD_FRAME, ADD_RECT, ADD_ELLIPSE, ADD_FREEDRAW, ADD_ARROW, ADD_LINE, ADD_TEXT, ADD_GENERATED_UI
- UPDATE_SHAPE (for significant changes like resize, move, style updates)
- REMOVE_SHAPE, DELETE_SELECTED
- CLEAR_ALL

**Actions that do NOT trigger history recording:**

- SET_TOOL (tool selection)
- SELECT_SHAPE, DESELECT_SHAPE, CLEAR_SELECTION, SELECT_ALL (selection changes)
- SET_EDITING_TEXT (entering text edit mode)
- LOAD_PROJECT (loading persisted state)

### 5. Enhanced useInfiniteCanvas Hook

The hook will be extended to provide:

```typescript
export interface UseInfiniteCanvasReturn {
  // ... existing properties

  // History state
  canUndo: boolean;
  canRedo: boolean;

  // History actions
  undo: () => void;
  redo: () => void;
}
```

Keyboard shortcut handling will be added to the existing keyboard event listeners:

- **Ctrl+Z / Cmd+Z**: Trigger undo
- **Ctrl+Shift+Z / Cmd+Shift+Z**: Trigger redo
- **Ctrl+Y / Cmd+Y**: Trigger redo (alternative)

### 6. Enhanced Persistence

The persistence module will be extended to include history:

```typescript
export interface CanvasProjectData {
  // ... existing properties

  // History data (limited to most recent 20 entries)
  history?: HistoryEntry[];
  historyPointer?: number;
}
```

## Data Models

### History Entry Structure

Each history entry captures the minimal state needed to restore the canvas:

```typescript
{
  shapes: {
    ids: string[],
    entities: Record<string, Shape>
  },
  selected: Record<string, true>,
  frameCounter: number,
  timestamp: number
}
```

**Size Estimation:**

- Average shape: ~200-500 bytes (depending on type)
- 10 shapes: ~2-5 KB per entry
- 50 entries: ~100-250 KB total
- Acceptable memory footprint for browser applications

### History Stack Management

The history stack follows these rules:

1. **Maximum Size**: 50 entries (configurable constant)
2. **Pointer Position**: Index in the history array (0 to length-1)
3. **Current State**: Always at `history[historyPointer]`
4. **Adding Entry**:
   - If pointer < length-1, truncate forward history
   - Add new entry at end
   - If length > max, remove oldest entry
5. **Undo**: Decrement pointer (if pointer > 0)
6. **Redo**: Increment pointer (if pointer < length-1)

### State Flow Diagram

```
Initial State (Empty History)
history: []
pointer: -1

After First Action
history: [Entry0]
pointer: 0

After Second Action
history: [Entry0, Entry1]
pointer: 1

After Undo
history: [Entry0, Entry1]
pointer: 0
(Canvas shows Entry0 state)

After Redo
history: [Entry0, Entry1]
pointer: 1
(Canvas shows Entry1 state)

After New Action (while at pointer 0)
history: [Entry0, Entry2]  // Entry1 is discarded
pointer: 1
```

## Error Handling

### History Recording Failures

- **Out of Memory**: Silently fail to record, log warning
- **Invalid State**: Skip recording if state is corrupted
- **Serialization Errors**: Catch and log, continue without recording

### History Navigation Failures

- **Invalid Pointer**: Clamp to valid range [0, length-1]
- **Missing Entry**: Fall back to current state, log error
- **Deserialization Errors**: Skip corrupted entry, try previous/next

### Persistence Failures

- **localStorage Full**: Reduce history size to 10 entries, retry
- **Quota Exceeded**: Clear old history, keep only current state
- **Parse Errors**: Initialize with empty history, log error

### User Experience

- All errors are handled gracefully without disrupting the user
- Failed operations are logged to console for debugging
- UI remains responsive even if history system fails

## Testing Strategy

### Unit Tests

**History Manager Tests** (`lib/canvas/history-manager.test.ts`):

- ✓ Create history entry from state
- ✓ Add entry to empty history
- ✓ Add entry with forward history (truncation)
- ✓ Add entry at max capacity (oldest removal)
- ✓ Undo from various pointer positions
- ✓ Redo from various pointer positions
- ✓ canUndo/canRedo edge cases
- ✓ Boundary conditions (empty, single entry, max size)

**Shapes Reducer Tests** (`lib/canvas/shapes-reducer.test.ts`):

- ✓ History recorded on shape addition
- ✓ History recorded on shape update
- ✓ History recorded on shape deletion
- ✓ History NOT recorded on tool change
- ✓ History NOT recorded on selection change
- ✓ Undo restores previous state correctly
- ✓ Redo restores next state correctly
- ✓ New action clears forward history
- ✓ Frame counter restored correctly

**Persistence Tests** (`lib/canvas/persistence.test.ts`):

- ✓ Serialize state with history
- ✓ Deserialize state with history
- ✓ Handle missing history gracefully
- ✓ Limit persisted history to 20 entries
- ✓ Restore history pointer correctly

### Integration Tests

**Canvas Interaction Tests**:

- ✓ Draw shape → Undo → Shape disappears
- ✓ Draw shape → Undo → Redo → Shape reappears
- ✓ Move shape → Undo → Shape returns to original position
- ✓ Delete shape → Undo → Shape reappears
- ✓ Multiple operations → Multiple undos → Correct state restoration
- ✓ Undo/Redo with selection state preservation
- ✓ Frame numbering consistency after undo/redo

**Keyboard Shortcut Tests**:

- ✓ Ctrl+Z triggers undo
- ✓ Cmd+Z triggers undo (macOS)
- ✓ Ctrl+Shift+Z triggers redo
- ✓ Cmd+Shift+Z triggers redo (macOS)
- ✓ Ctrl+Y triggers redo
- ✓ Shortcuts disabled in text inputs
- ✓ Shortcuts work with multiple shapes selected

**UI Tests**:

- ✓ Undo button disabled when canUndo is false
- ✓ Redo button disabled when canRedo is false
- ✓ Undo button enabled after action
- ✓ Redo button enabled after undo
- ✓ Tooltips show correct shortcuts
- ✓ Button states update immediately

### Performance Tests

- ✓ History recording adds < 5ms overhead per action
- ✓ Undo/Redo completes in < 50ms
- ✓ Memory usage stays under 500KB for 50 entries
- ✓ No memory leaks after 1000 undo/redo cycles
- ✓ localStorage save/load with history < 100ms

### Manual Testing Scenarios

1. **Basic Undo/Redo Flow**:

   - Draw 5 different shapes
   - Undo 3 times
   - Verify correct shapes disappear in reverse order
   - Redo 2 times
   - Verify shapes reappear in correct order

2. **Complex Interaction**:

   - Draw frame, add text, move frame, resize text
   - Undo each operation
   - Verify each step reverses correctly
   - Redo all operations
   - Verify final state matches original

3. **Selection Preservation**:

   - Select multiple shapes
   - Move them together
   - Undo
   - Verify shapes return to original positions
   - Verify selection is preserved

4. **Frame Numbering**:

   - Create 3 frames (Frame 1, Frame 2, Frame 3)
   - Delete Frame 2
   - Verify renumbering (Frame 1, Frame 2)
   - Undo deletion
   - Verify original numbering restored (Frame 1, Frame 2, Frame 3)

5. **Persistence**:

   - Perform several actions
   - Undo some actions
   - Reload page
   - Verify history is restored
   - Verify undo/redo still works

6. **Edge Cases**:
   - Undo with no history (should do nothing)
   - Redo with no forward history (should do nothing)
   - Perform 60 actions (exceeds max history)
   - Verify oldest entries are removed
   - Verify undo still works for recent 50 actions

## Implementation Phases

### Phase 1: Core History Infrastructure

- Create history manager module
- Add history types to canvas types
- Implement history stack operations (add, undo, redo)
- Add unit tests for history manager

### Phase 2: Reducer Integration

- Enhance shapes reducer with history state
- Add UNDO and REDO action handlers
- Implement automatic history recording for modifying actions
- Add reducer tests for history functionality

### Phase 3: Hook Integration

- Extend useInfiniteCanvas with undo/redo functions
- Add keyboard shortcut handlers
- Expose canUndo/canRedo state
- Add integration tests

### Phase 4: UI Integration

- Connect HistoryPill to undo/redo functions
- Implement button disabled states
- Add tooltips with platform-specific shortcuts
- Test UI responsiveness

### Phase 5: Persistence Integration

- Extend persistence module to include history
- Implement history size limiting for storage
- Add persistence tests
- Test localStorage save/load with history

### Phase 6: Testing and Refinement

- Comprehensive manual testing
- Performance profiling and optimization
- Bug fixes and edge case handling
- Documentation updates

## Performance Considerations

### Memory Optimization

1. **Shallow Copying**: Use spread operators for immutable updates (already in place)
2. **Structural Sharing**: Entity state structure naturally shares unchanged entities
3. **History Limiting**: Cap at 50 entries to prevent unbounded growth
4. **Persistence Limiting**: Save only 20 most recent entries to localStorage

### CPU Optimization

1. **Lazy Recording**: Record history only after action completes
2. **Debouncing**: Consider debouncing rapid actions (e.g., continuous resize)
3. **RAF Batching**: Already in place for drawing operations
4. **Selective Recording**: Skip history for non-modifying actions

### Storage Optimization

1. **Compression**: Consider JSON compression for localStorage (future enhancement)
2. **Selective Persistence**: Save only essential history entries
3. **Cleanup**: Clear old localStorage entries on load

## Security Considerations

- **No Sensitive Data**: Canvas state contains only drawing data
- **localStorage Limits**: Respect browser storage quotas
- **XSS Prevention**: No user-generated HTML in canvas state
- **Input Validation**: Validate history entries on deserialization

## Accessibility Considerations

- **Keyboard Shortcuts**: Standard Ctrl+Z/Ctrl+Shift+Z shortcuts
- **Button Labels**: Clear aria-labels for undo/redo buttons
- **Disabled States**: Proper aria-disabled attributes
- **Tooltips**: Descriptive tooltips with shortcut hints
- **Focus Management**: Keyboard navigation for history buttons

## Future Enhancements

1. **History Branching**: Support for branching history (tree structure)
2. **Action Descriptions**: Show description of each history entry
3. **History Panel**: Visual timeline of actions
4. **Selective Undo**: Undo specific actions without affecting others
5. **History Export**: Export action history for debugging
6. **Collaborative History**: Merge history from multiple users
7. **Compression**: Implement delta compression for history entries
8. **Smart Grouping**: Group rapid actions (e.g., continuous drawing) into single entry

## Constants and Configuration

```typescript
// History configuration
export const HISTORY_CONFIG = {
  MAX_HISTORY_SIZE: 50, // Maximum entries in memory
  PERSISTED_HISTORY_SIZE: 20, // Maximum entries in localStorage
  DEBOUNCE_DELAY: 0, // Debounce delay for history recording (0 = disabled)
  ENABLE_HISTORY_LOGGING: false, // Enable console logging for debugging
};
```

## Migration Strategy

The implementation is additive and backward-compatible:

1. **No Breaking Changes**: Existing code continues to work
2. **Graceful Degradation**: Missing history data initializes to empty
3. **Progressive Enhancement**: History features activate automatically
4. **Rollback Safety**: Can disable history recording via feature flag

## Success Criteria

The implementation will be considered successful when:

1. ✓ All unit tests pass with >90% coverage
2. ✓ All integration tests pass
3. ✓ Manual testing scenarios complete successfully
4. ✓ Performance benchmarks meet targets (<5ms recording, <50ms undo/redo)
5. ✓ Memory usage stays under 500KB for 50 entries
6. ✓ Keyboard shortcuts work reliably across platforms
7. ✓ UI buttons respond correctly to history state
8. ✓ Persistence works with history data
9. ✓ No regressions in existing canvas functionality
10. ✓ User feedback is positive (smooth, intuitive, reliable)
