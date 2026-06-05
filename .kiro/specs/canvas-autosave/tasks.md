# Implementation Plan

- [x] 1. Set up testing infrastructure and Convex schema

  - [x] 1.1 Install fast-check for property-based testing
    - Run `pnpm add -D fast-check`
    - _Requirements: 7.5_
  - [x] 1.2 Update Convex schema with canvas persistence fields
    - Add `canvasVersion` field to projects table
    - Ensure `viewportData` field structure matches design
    - Ensure `sketchesData` field can store EntityState<Shape>
    - _Requirements: 7.3_

- [x] 2. Implement Convex mutations and queries for canvas persistence

  - [x] 2.1 Create saveCanvasState mutation
    - Validate authentication
    - Validate project ownership
    - Update sketchesData, viewportData, canvasVersion, lastModified
    - _Requirements: 2.3_
  - [x] 2.2 Create getCanvasState query
    - Validate authentication
    - Validate project ownership
    - Return canvas data with viewport, shapes, version, lastModified
    - _Requirements: 4.1_
  - [ ]\* 2.3 Write unit tests for Convex mutations
    - Test authentication validation
    - Test ownership validation
    - Test data persistence
    - _Requirements: 2.3, 4.1_

- [x] 3. Implement serialization utilities with versioning

  - [x] 3.1 Update serializeCanvasState to include version
    - Add version field to CanvasProjectData
    - Ensure all shape properties are included
    - _Requirements: 7.1, 7.3_
  - [x] 3.2 Implement schema migration support in deserializeCanvasState
    - Check version field on deserialization
    - Apply migrations for older versions
    - _Requirements: 7.4_
  - [ ]\* 3.3 Write property test for canvas state round-trip
    - **Property 1: Canvas state round-trip consistency**
    - **Validates: Requirements 1.4, 7.1, 7.2, 7.5**
  - [ ]\* 3.4 Write property test for viewport state round-trip
    - **Property 2: Viewport state round-trip consistency**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  - [ ]\* 3.5 Write property test for serialization version inclusion
    - **Property 6: Serialization version inclusion**
    - **Validates: Requirements 7.3, 7.4**

- [x] 4. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement conflict resolution logic

  - [x] 5.1 Create resolveConflict utility function
    - Compare lastModified timestamps
    - Return state with higher timestamp
    - Handle null cases (local-only, cloud-only, neither)
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  - [ ]\* 5.2 Write property test for timestamp-based conflict resolution
    - **Property 4: Timestamp-based conflict resolution**
    - **Validates: Requirements 4.2**

- [x] 6. Implement save status derivation

  - [x] 6.1 Create deriveSaveStatus utility function
    - Accept isDirty, isSyncing, hasError, isOffline flags
    - Return deterministic SaveStatus based on priority
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]\* 6.2 Write property test for save status derivation
    - **Property 5: Save status derivation**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 7. Implement useAutosave hook core logic

  - [x] 7.1 Create useAutosave hook with debounced local save
    - Accept projectId and options
    - Set up 1-second debounced localStorage save
    - Track dirty state
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 7.2 Add cloud sync with debounce and retry logic
    - Set up 2-second debounced Convex sync
    - Implement exponential backoff retry (max 3 attempts)
    - Update dirty state on success
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6_
  - [x] 7.3 Add initial load logic with conflict resolution
    - Fetch from both localStorage and Convex on mount
    - Use resolveConflict to pick winner
    - Dispatch to restore canvas state
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ]\* 7.4 Write property test for debounce batching behavior
    - **Property 3: Debounce batching behavior**
    - **Validates: Requirements 1.3, 2.2**

- [x] 8. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement error handling

  - [x] 9.1 Add localStorage error handling
    - Catch QuotaExceeded errors
    - Attempt to clear old project data
    - Fall back to in-memory if still failing
    - _Requirements: 1.5, 5.1_
  - [x] 9.2 Add Convex error handling
    - Detect auth errors and set error status
    - Detect validation errors and log details
    - Handle network errors with retry
    - _Requirements: 5.2, 5.3, 5.4_
  - [x] 9.3 Add beforeunload warning for unsaved changes
    - Listen for beforeunload event
    - Warn if isDirty is true
    - _Requirements: 5.5_
  - [ ]\* 9.4 Write unit tests for error handling scenarios
    - Test localStorage quota exceeded
    - Test network error retry
    - Test auth error handling
    - _Requirements: 1.5, 5.1, 5.2, 5.3_

- [x] 10. Implement SaveIndicator component

  - [x] 10.1 Create SaveIndicator component
    - Display status text based on SaveStatus
    - Show relative time for lastSavedAt
    - Style with appropriate colors for each status
    - _Requirements: 3.1, 3.2, 3.3, 3.5_
  - [x] 10.2 Integrate SaveIndicator into canvas page
    - Position in bottom-right corner above zoom controls
    - Connect to useAutosave hook
    - _Requirements: 3.5_

- [x] 11. Integrate useAutosave with canvas page

  - [x] 11.1 Update canvas page to use useAutosave hook
    - Replace existing useCanvasPersistence with useAutosave
    - Pass projectId from route params
    - Handle loading state
    - _Requirements: 1.1, 1.2, 4.1, 4.6_
  - [x] 11.2 Add loading indicator during initial load
    - Show spinner while fetching initial state
    - Prevent interaction until loaded
    - _Requirements: 4.6_

- [x] 12. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
