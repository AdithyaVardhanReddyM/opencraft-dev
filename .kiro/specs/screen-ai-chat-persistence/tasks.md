# Implementation Plan

- [x] 1. Update Convex schema and screen mutations

  - [x] 1.1 Add sandboxId field to screens table in schema.ts
    - Add `sandboxId: v.optional(v.string())` to screens table definition
    - _Requirements: 5.1, 5.4_
  - [x] 1.2 Update internalUpdateScreen mutation to accept sandboxId
    - Add sandboxId to args and patch object in screens.ts
    - _Requirements: 5.1, 5.2_
  - [x] 1.3 Create internalGetScreen query for Inngest
    - Add new internalQuery that returns screen by ID
    - _Requirements: 5.4_

- [x] 2. Add message history queries

  - [x] 2.1 Create internalGetMessages query in messages.ts
    - Query messages by screenId with limit, order desc, then reverse
    - _Requirements: 1.1, 2.2_
  - [ ]\* 2.2 Write property test for message ordering
    - **Property 1: Message ordering preservation**
    - **Validates: Requirements 1.1**

- [x] 3. Add HTTP routes for Inngest communication

  - [x] 3.1 Add /inngest/getScreen HTTP route
    - POST endpoint that calls internalGetScreen query
    - _Requirements: 5.4_
  - [x] 3.2 Add /inngest/getMessages HTTP route
    - POST endpoint that calls internalGetMessages query
    - _Requirements: 1.1, 2.2_

- [x] 4. Create utility functions for message and files handling

  - [x] 4.1 Create formatMessagesForAgent utility function
    - Transform Convex messages to AgentMessage format
    - Preserve order and content including files_summary
    - _Requirements: 2.2, 6.3_
  - [ ]\* 4.2 Write property test for message formatting
    - **Property 3: Message history formatting**
    - **Validates: Requirements 2.2**
  - [x] 4.3 Create generateFilesSummary utility function
    - Generate files_summary string from files object
    - Wrap in files_summary tags
    - _Requirements: 2.3, 6.1, 6.4_
  - [ ]\* 4.4 Write property test for files summary generation
    - **Property 4: Files summary generation**
    - **Validates: Requirements 2.3, 6.1, 6.4**
  - [x] 4.5 Create shouldCreateNewSandbox utility function
    - Decision logic based on screen.sandboxId presence
    - _Requirements: 2.1, 2.4_
  - [ ]\* 4.6 Write property test for sandbox decision logic
    - **Property 2: Sandbox reuse decision**
    - **Validates: Requirements 2.1, 2.4**

- [x] 5. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update Inngest function for sandbox lifecycle

  - [x] 6.1 Add step to fetch screen with sandboxId
    - Call /inngest/getScreen to get current screen state
    - _Requirements: 5.4_
  - [x] 6.2 Implement sandbox get-or-create logic with beta_create
    - Use Sandbox.betaCreate with autoPause for new sandboxes
    - Use Sandbox.connect for existing sandboxes
    - Handle paused sandbox resume automatically
    - _Requirements: 2.1, 2.4, 3.1, 3.3, 4.1_
  - [x] 6.3 Add step to fetch and format previous messages
    - Call /inngest/getMessages and format for agent
    - _Requirements: 2.2, 6.3_
  - [x] 6.4 Update agent state initialization with message history
    - Pass previousMessages to createState for agent context
    - _Requirements: 2.2_
  - [x] 6.5 Update assistant message creation to include files_summary
    - Generate and append files_summary to assistant response
    - _Requirements: 2.3, 6.1, 6.2_

- [x] 7. Update AISidebar to load message history

  - [x] 7.1 Add Convex query hook for messages
    - Use useQuery with api.messages.getMessages
    - Skip query when no screenId selected
    - _Requirements: 1.1_
  - [x] 7.2 Convert Convex messages to local message format
    - Map \_id, role, content, createdAt to Message interface
    - _Requirements: 1.1_
  - [x] 7.3 Add loading state while fetching messages
    - Show loading indicator during message fetch
    - _Requirements: 1.2_
  - [x] 7.4 Handle screen switching with message clearing
    - Clear local messages when screenId changes before new fetch
    - _Requirements: 1.4_

- [x] 8. Add error handling for sandbox failures

  - [x] 8.1 Handle sandbox connection failures in Inngest
    - Catch connect errors, create new sandbox as fallback
    - Update screen with new sandboxId
    - _Requirements: 4.3_
  - [x] 8.2 Add error message for context loss notification
    - Create assistant message noting previous context was lost
    - _Requirements: 4.3_

- [x] 9. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
