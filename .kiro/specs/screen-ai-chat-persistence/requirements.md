# Requirements Document

## Introduction

This feature enhances the AI chat system for screen shapes by implementing persistent message history and sandbox lifecycle management. When a user selects a screen, the AI chat should load previous conversation history and reuse the existing sandbox instead of creating a new one. Additionally, sandboxes should auto-pause after inactivity and resume when needed, enabling cost-effective long-running sessions while preserving the full development environment state.

## Glossary

- **Screen**: A canvas shape that represents an AI-generated web UI component, associated with a sandbox environment
- **Sandbox**: An E2B isolated execution environment running a Next.js development server
- **Sandbox_ID**: A unique identifier for an E2B sandbox instance
- **Message_History**: The collection of user and assistant messages associated with a screen's chat thread
- **Auto_Pause**: E2B beta feature that automatically pauses sandboxes after a configurable timeout
- **Files_Summary**: A structured summary of generated files stored with assistant messages for context
- **Convex**: The backend database system used for persistent storage
- **Inngest**: The workflow orchestration system that manages AI agent execution

## Requirements

### Requirement 1

**User Story:** As a user, I want to see my previous chat messages when I select a screen, so that I can continue conversations where I left off.

#### Acceptance Criteria

1. WHEN a user selects a screen shape on the canvas THEN the AI_Sidebar SHALL fetch and display all previous messages for that screen ordered by creation time
2. WHEN the AI_Sidebar loads messages THEN the system SHALL display a loading indicator until messages are retrieved
3. WHEN no previous messages exist for a screen THEN the AI_Sidebar SHALL display the empty chat state with suggestions
4. WHEN a user switches between screens THEN the AI_Sidebar SHALL clear the current messages and load the new screen's message history

### Requirement 2

**User Story:** As a user, I want my follow-up messages to modify the existing sandbox, so that the AI agent has context of what was previously created.

#### Acceptance Criteria

1. WHEN a user sends a message for a screen with an existing sandbox THEN the system SHALL reuse the existing sandbox instead of creating a new one
2. WHEN the agent processes a follow-up message THEN the system SHALL include previous message history in the agent context
3. WHEN the agent completes a task THEN the system SHALL store a files summary in a structured format for future context
4. WHEN the screen has no existing sandbox THEN the system SHALL create a new sandbox and store the sandbox_id

### Requirement 3

**User Story:** As a system administrator, I want sandboxes to auto-pause after inactivity, so that compute resources are conserved when not in use.

#### Acceptance Criteria

1. WHEN a sandbox is created THEN the system SHALL use the E2B beta_create method with auto-pause enabled
2. WHEN a sandbox has been inactive for 15 minutes THEN the E2B platform SHALL automatically pause the sandbox
3. WHEN a paused sandbox is needed THEN the system SHALL resume the sandbox before invoking the agent
4. WHEN checking sandbox status THEN the system SHALL handle both running and paused states appropriately

### Requirement 4

**User Story:** As a user, I want the system to seamlessly resume paused sandboxes, so that I can continue working without manual intervention.

#### Acceptance Criteria

1. WHEN a user sends a message for a screen with a paused sandbox THEN the system SHALL resume the sandbox before processing
2. WHEN resuming a sandbox THEN the system SHALL restore the previous filesystem and memory state
3. WHEN a sandbox fails to resume THEN the system SHALL create a new sandbox and notify the user that context was lost
4. WHEN a sandbox is resumed THEN the system SHALL reset the inactivity timeout

### Requirement 5

**User Story:** As a developer, I want sandbox IDs stored with screen records, so that the system can track and manage sandbox lifecycle.

#### Acceptance Criteria

1. WHEN a new sandbox is created for a screen THEN the system SHALL store the sandbox_id in the screen record
2. WHEN updating a screen's sandbox_id THEN the system SHALL use the existing update mutation pattern
3. WHEN a screen is deleted THEN the system SHALL attempt to terminate the associated sandbox
4. WHEN querying a screen THEN the system SHALL return the sandbox_id if one exists

### Requirement 6

**User Story:** As a user, I want the AI agent to have context about previously generated files, so that modifications are accurate and consistent.

#### Acceptance Criteria

1. WHEN the agent completes a task THEN the system SHALL generate a files_summary containing file paths and one-line descriptions
2. WHEN storing assistant messages THEN the system SHALL include the files_summary in a structured format
3. WHEN building agent context THEN the system SHALL include files_summary from previous messages
4. WHEN the files_summary format is used THEN the system SHALL wrap it in files_summary tags for parsing
