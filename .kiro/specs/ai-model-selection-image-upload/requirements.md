# Requirements Document

## Introduction

This feature enhances the AI chat sidebar with model selection capabilities and image upload functionality. Users will be able to choose from multiple AI models (Google Gemini, OpenAI GPT, Anthropic Claude, xAI Grok) and attach images to their messages. Images will be stored using Convex file storage and sent to vision-capable models for analysis.

## Glossary

- **AI_Chat_System**: The chat interface component in the canvas sidebar that enables users to communicate with AI agents
- **Model_Selector**: A UI component that allows users to choose which AI model to use for their conversation
- **Image_Attachment**: A user-uploaded image file that is attached to a chat message for AI analysis
- **Convex_File_Storage**: The backend storage system provided by Convex for persisting uploaded files
- **Storage_ID**: A unique identifier returned by Convex when a file is stored, used to reference the file
- **Vision_Model**: An AI model capable of processing and understanding image content alongside text

## Requirements

### Requirement 1

**User Story:** As a user, I want to select which AI model to use for my chat, so that I can choose the best model for my specific task.

#### Acceptance Criteria

1. WHEN the user opens the chat input THEN the AI_Chat_System SHALL display a model selector button showing the currently selected model name and provider logo
2. WHEN the user clicks the model selector button THEN the AI_Chat_System SHALL display a searchable dropdown with available models grouped by provider (OpenAI, Anthropic, Google, xAI)
3. WHEN the user selects a model from the dropdown THEN the AI_Chat_System SHALL update the displayed model and close the dropdown
4. WHEN the user sends a message THEN the AI_Chat_System SHALL route the message to the selected model via OpenRouter
5. WHEN the chat session starts THEN the AI_Chat_System SHALL default to the xAI Grok model (current default)

### Requirement 2

**User Story:** As a user, I want to upload images to my chat messages, so that I can ask the AI to analyze or reference visual content.

#### Acceptance Criteria

1. WHEN the user clicks the add attachment button THEN the AI_Chat_System SHALL open a file picker restricted to image file types (image/\*)
2. WHEN the user selects an image file THEN the AI_Chat_System SHALL display a preview chip in the input area showing a thumbnail and filename
3. WHEN the user hovers over an image chip THEN the AI_Chat_System SHALL display a larger preview of the image
4. WHEN the user clicks the remove button on an image chip THEN the AI_Chat_System SHALL remove the image from the pending attachments
5. WHEN the user pastes an image from clipboard THEN the AI_Chat_System SHALL add the image to pending attachments
6. WHEN the user drags and drops an image onto the chat input THEN the AI_Chat_System SHALL add the image to pending attachments

### Requirement 3

**User Story:** As a user, I want my uploaded images to be persisted, so that they are available in my conversation history.

#### Acceptance Criteria

1. WHEN the user submits a message with images THEN the AI_Chat_System SHALL upload each image to Convex_File_Storage and obtain a Storage_ID
2. WHEN images are uploaded THEN the AI_Chat_System SHALL store the Storage_IDs in the message record
3. WHEN loading conversation history THEN the AI_Chat_System SHALL retrieve and display images using their Storage_IDs
4. WHEN displaying a historical message with images THEN the AI_Chat_System SHALL render the image thumbnails alongside the message text

### Requirement 4

**User Story:** As a user, I want the AI to see and understand my uploaded images, so that I can get relevant responses about visual content.

#### Acceptance Criteria

1. WHEN sending a message with images to a Vision_Model THEN the AI_Chat_System SHALL include the image data in the API request
2. WHEN the selected model does not support vision THEN the AI_Chat_System SHALL display a warning that images may not be processed
3. WHEN formatting images for the AI THEN the AI_Chat_System SHALL convert images to base64 data URLs with appropriate MIME types

### Requirement 5

**User Story:** As a user, I want a clean and intuitive interface for model selection and image upload, so that the experience matches the existing design system.

#### Acceptance Criteria

1. WHEN displaying the model selector THEN the AI_Chat_System SHALL use the existing ModelSelector component from ai-elements
2. WHEN displaying image attachment chips THEN the AI_Chat_System SHALL use the existing PromptInputAttachment component styling
3. WHEN displaying the add attachment button THEN the AI_Chat_System SHALL use a "+" icon button consistent with the PromptInputActionMenu pattern
4. WHEN the chat input has pending images THEN the AI_Chat_System SHALL display them in a horizontal scrollable row above the text input
