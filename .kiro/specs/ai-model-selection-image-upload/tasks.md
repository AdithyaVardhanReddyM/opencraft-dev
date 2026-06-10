# Implementation Plan

- [x] 1. Create AI models configuration

  - [x] 1.1 Create lib/ai-models.ts with model definitions
    - Define AIModel interface with id, name, provider, providerSlug, supportsVision
    - Add models: xAI Grok (default), OpenAI GPT-4.1, Anthropic Claude Opus 4.5, Google Gemini 3 Pro
    - Export DEFAULT_MODEL_ID, getModelById, getModelsByProvider utilities
    - _Requirements: 1.1, 1.2, 1.5_
  - [ ]\* 1.2 Write property test for model configuration
    - **Property 1: Model selection state consistency**
    - **Validates: Requirements 1.3**

- [x] 2. Update Convex schema and mutations for image storage

  - [x] 2.1 Update convex/schema.ts messages table
    - Add modelId field (optional string)
    - Add imageIds field (optional array of storage IDs)
    - _Requirements: 3.2_
  - [x] 2.2 Add image upload mutations to convex/messages.ts
    - Add generateUploadUrl mutation using ctx.storage.generateUploadUrl()
    - Add getImageUrl query to retrieve image URLs from storage IDs
    - Update createMessage mutation to accept modelId and imageIds
    - _Requirements: 3.1, 3.2_
  - [ ]\* 2.3 Write property test for image persistence
    - **Property 5: Image upload persistence**
    - **Validates: Requirements 3.1, 3.2**

- [x] 3. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update ChatInput component with model selector and image attachments

  - [x] 4.1 Add model selector to ChatInput
    - Import ModelSelector components from ai-elements
    - Add selectedModel state with DEFAULT_MODEL_ID
    - Render model selector button in PromptInputTools showing current model name and logo
    - Implement searchable dropdown with models grouped by provider
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 4.2 Add image attachment functionality to ChatInput
    - Add pendingImages state array
    - Add PromptInputActionMenu with "+" button for adding photos
    - Implement file picker restricted to image/\* types
    - Display image chips using PromptInputAttachment component
    - Implement remove functionality with blob URL cleanup
    - Support paste and drag-drop for images
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [ ]\* 4.3 Write property test for image attachments
    - **Property 3: Image attachment display**
    - **Property 4: Image removal**
    - **Validates: Requirements 2.2, 2.4, 2.5, 2.6**

- [x] 5. Update useChatStreaming hook for model and image support

  - [x] 5.1 Update sendMessage to handle images and model
    - Accept modelId and images parameters
    - Upload images to Convex storage before sending message
    - Convert images to base64 data URLs for API
    - Pass modelId and imageUrls to agentSendMessage
    - Update createMessage call to include modelId and imageIds
    - _Requirements: 1.4, 3.1, 4.1, 4.3_
  - [ ]\* 5.2 Write property test for model routing
    - **Property 2: Selected model routing**
    - **Validates: Requirements 1.4**
  - [ ]\* 5.3 Write property test for vision model image inclusion
    - **Property 7: Vision model image inclusion**
    - **Validates: Requirements 4.1, 4.3**

- [x] 6. Update API route and Inngest function for dynamic model

  - [x] 6.1 Update app/api/chat/route.ts
    - Add modelId and imageUrls to request schema
    - Pass modelId and imageUrls in Inngest event data
    - _Requirements: 1.4, 4.1_
  - [x] 6.2 Update inngest/functions.ts for dynamic model selection
    - Extract modelId from event data, default to DEFAULT_MODEL_ID
    - Configure openrouter with dynamic model ID
    - Format message content with images for vision models (text + image_url parts)
    - _Requirements: 1.4, 4.1, 4.3_

- [x] 7. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Display images in message history

  - [x] 8.1 Update ChatMessageItem to display images
    - Fetch image URLs for messages with imageIds
    - Render image thumbnails in user messages
    - Add hover preview for images using existing HoverCard pattern
    - _Requirements: 3.3, 3.4_
  - [ ]\* 8.2 Write property test for image retrieval
    - **Property 6: Image retrieval from history**
    - **Validates: Requirements 3.3, 3.4**

- [x] 9. Add non-vision model warning

  - [x] 9.1 Implement vision support warning
    - Check if selected model supports vision when images are attached
    - Display warning toast or inline message if model doesn't support vision
    - _Requirements: 4.2_
  - [ ]\* 9.2 Write property test for non-vision warning
    - **Property 8: Non-vision model warning**
    - **Validates: Requirements 4.2**

- [x] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
