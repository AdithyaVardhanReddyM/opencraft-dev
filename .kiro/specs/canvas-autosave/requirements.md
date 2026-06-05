# Requirements Document

## Introduction

This document specifies the requirements for implementing a robust autosave system for the Unit {set} canvas. The system follows a "local-first" architecture where changes are immediately persisted to localStorage for instant recovery, then synced to Convex cloud storage for permanent persistence and cross-device access. The design prioritizes user experience by ensuring no data loss while minimizing network overhead and providing clear save status feedback.

## Glossary

- **Canvas State**: The complete state of a canvas including viewport (pan/zoom), shapes (drawing entities), selection, tool, and history
- **Local Storage**: Browser's localStorage API used for immediate, synchronous persistence
- **Convex**: The cloud backend service used for permanent data storage and real-time sync
- **Debounce**: A technique to delay execution until a pause in rapid events
- **Dirty State**: Canvas state that has been modified locally but not yet synced to cloud
- **Save Status**: Visual indicator showing the current persistence state (saved, saving, error)
- **Optimistic Update**: Immediately reflecting changes in UI before server confirmation
- **Conflict Resolution**: Strategy for handling concurrent edits from multiple sources

## Requirements

### Requirement 1

**User Story:** As a user, I want my canvas changes to be automatically saved locally, so that I never lose work due to browser crashes or accidental navigation.

#### Acceptance Criteria

1. WHEN a user modifies canvas state (adds, updates, or removes shapes) THEN the Canvas Autosave System SHALL persist the changes to localStorage within 1 second
2. WHEN a user modifies viewport state (pan or zoom) THEN the Canvas Autosave System SHALL persist the viewport changes to localStorage within 1 second
3. WHEN multiple rapid changes occur within 1 second THEN the Canvas Autosave System SHALL batch the changes into a single localStorage write
4. WHEN the user reopens a canvas page THEN the Canvas Autosave System SHALL restore the most recent locally saved state
5. WHEN localStorage write fails due to quota exceeded THEN the Canvas Autosave System SHALL notify the user and attempt to clear old project data

### Requirement 2

**User Story:** As a user, I want my canvas changes to be automatically synced to the cloud, so that I can access my work from any device.

#### Acceptance Criteria

1. WHEN canvas state is persisted to localStorage THEN the Canvas Autosave System SHALL queue a cloud sync operation
2. WHEN a cloud sync is queued THEN the Canvas Autosave System SHALL debounce the sync with a 2-second delay to batch rapid changes
3. WHEN the cloud sync executes THEN the Canvas Autosave System SHALL send the complete canvas state to Convex
4. WHEN the cloud sync succeeds THEN the Canvas Autosave System SHALL update the local dirty state flag to clean
5. WHEN the cloud sync fails due to network error THEN the Canvas Autosave System SHALL retry with exponential backoff up to 3 attempts
6. WHEN all retry attempts fail THEN the Canvas Autosave System SHALL mark the state as pending sync and notify the user

### Requirement 3

**User Story:** As a user, I want to see the current save status, so that I know whether my work is safely persisted.

#### Acceptance Criteria

1. WHEN canvas state matches the cloud state THEN the Canvas Autosave System SHALL display a "Saved" indicator
2. WHEN canvas state has local changes pending cloud sync THEN the Canvas Autosave System SHALL display a "Saving..." indicator
3. WHEN cloud sync fails after retries THEN the Canvas Autosave System SHALL display an "Offline - Changes saved locally" indicator
4. WHEN cloud sync recovers after failure THEN the Canvas Autosave System SHALL automatically sync pending changes and update the indicator
5. WHEN the save status indicator is displayed THEN the Canvas Autosave System SHALL position it in a non-intrusive location on the canvas

### Requirement 4

**User Story:** As a user, I want to load my canvas from the cloud when I open a project, so that I see my latest work regardless of which device I used.

#### Acceptance Criteria

1. WHEN a user opens a canvas page THEN the Canvas Autosave System SHALL fetch the canvas state from Convex
2. WHEN both local and cloud states exist THEN the Canvas Autosave System SHALL compare timestamps and use the most recent state
3. WHEN only local state exists THEN the Canvas Autosave System SHALL use the local state and queue a cloud sync
4. WHEN only cloud state exists THEN the Canvas Autosave System SHALL use the cloud state and update localStorage
5. WHEN neither local nor cloud state exists THEN the Canvas Autosave System SHALL initialize an empty canvas state
6. WHILE canvas state is loading THEN the Canvas Autosave System SHALL display a loading indicator

### Requirement 5

**User Story:** As a user, I want the autosave system to handle errors gracefully, so that I am informed of issues without losing my work.

#### Acceptance Criteria

1. WHEN localStorage write fails THEN the Canvas Autosave System SHALL log the error and continue operating with in-memory state
2. WHEN Convex mutation fails with authentication error THEN the Canvas Autosave System SHALL prompt the user to re-authenticate
3. WHEN Convex mutation fails with validation error THEN the Canvas Autosave System SHALL log the error details for debugging
4. WHEN network connectivity is lost THEN the Canvas Autosave System SHALL continue saving to localStorage and queue cloud syncs for when connectivity returns
5. WHEN the user attempts to leave the page with unsaved cloud changes THEN the Canvas Autosave System SHALL warn the user about pending changes

### Requirement 6

**User Story:** As a user, I want the canvas to restore my exact viewport position when I return, so that I can continue working from where I left off.

#### Acceptance Criteria

1. WHEN canvas state is saved THEN the Canvas Autosave System SHALL persist the viewport translate coordinates (pan position)
2. WHEN canvas state is saved THEN the Canvas Autosave System SHALL persist the viewport scale (zoom level)
3. WHEN a user returns to a canvas THEN the Canvas Autosave System SHALL restore the exact viewport position and zoom level
4. WHEN viewport state is restored THEN the Canvas Autosave System SHALL display the same canvas area the user was viewing before

### Requirement 7

**User Story:** As a developer, I want the autosave system to serialize and deserialize canvas state correctly, so that no data is lost during persistence.

#### Acceptance Criteria

1. WHEN canvas state is serialized THEN the Canvas Autosave System SHALL include all shape properties without data loss
2. WHEN canvas state is deserialized THEN the Canvas Autosave System SHALL reconstruct the exact same state structure
3. WHEN serializing canvas state THEN the Canvas Autosave System SHALL include a version number for future migration support
4. WHEN deserializing an older version THEN the Canvas Autosave System SHALL migrate the data to the current schema
5. WHEN serializing and then deserializing canvas state THEN the Canvas Autosave System SHALL produce an equivalent state (round-trip consistency)
