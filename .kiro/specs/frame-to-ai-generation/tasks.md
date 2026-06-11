# Implementation Plan

- [x] 1. Create containment utilities

  - [x] 1.1 Create `lib/canvas/containment-utils.ts` with shape bounds and containment functions
    - Implement `getShapeBounds()` for all shape types (frame, rect, ellipse, line, arrow, freedraw, text, screen, generatedui)
    - Implement `isShapeContainedInFrame()` to check if shape bounds are fully within frame bounds
    - Implement `getContainedShapes()` to filter shapes contained in a frame
    - Implement `getFramesWithContainedShapes()` to get frames with their contained shapes
    - _Requirements: 2.1, 2.3, 2.4_
  - [ ]\* 1.2 Write property test for shape containment
    - **Property 2: Shape containment is correctly determined**
    - **Validates: Requirements 2.1, 2.3, 2.4**

- [x] 2. Create canvas capture utilities

  - [x] 2.1 Create `lib/canvas/canvas-capture.ts` with rendering and capture functions
    - Implement `renderShapeToCanvas()` for each shape type (rect, ellipse, line, arrow, freedraw, text, frame)
    - Implement `captureFrameAsImage()` to render contained shapes to offscreen canvas and return PNG blob
    - Use white background for AI vision processing
    - Preserve relative positions by offsetting shapes by frame origin
    - Render shapes in array order to preserve z-order
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]\* 2.2 Write property test for canvas capture position and z-order preservation
    - **Property 3: Canvas capture preserves shape positions and z-order**
    - **Validates: Requirements 3.2, 3.3**

- [x] 3. Create GenerateButton component

  - [x] 3.1 Create `components/canvas/GenerateButton.tsx`
    - Position button above frame's top-right corner (world coordinates)
    - Apply viewport transform for correct screen positioning
    - Style with Sparkles icon and "Generate" text
    - Handle click to trigger generation workflow
    - _Requirements: 1.1, 1.4_
  - [ ]\* 3.2 Write property test for button position transforms
    - **Property 5: Button position transforms correctly with viewport**
    - **Validates: Requirements 1.4**

- [x] 4. Integrate GenerateButton into canvas page

  - [x] 4.1 Update canvas page to render GenerateButton for qualifying frames
    - Use `getFramesWithContainedShapes()` to identify frames needing buttons
    - Render GenerateButton for each qualifying frame
    - Pass viewport state for position transforms
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  - [ ]\* 4.2 Write property test for button visibility
    - **Property 1: Generate button visibility matches containment state**
    - **Validates: Requirements 1.1, 1.3, 1.5**

- [x] 5. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement generation workflow

  - [x] 6.1 Create generation handler in canvas page
    - Capture frame contents using `captureFrameAsImage()`
    - Create screen shape positioned to the right of frame (frame.x + frame.w + 50)
    - Use frame height for screen height, default width (1440px)
    - Register screen with Convex via `createScreenMutation`
    - Add screen shape to canvas and select it
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]\* 6.2 Write property test for screen positioning
    - **Property 4: Screen is positioned correctly relative to source frame**
    - **Validates: Requirements 4.1, 4.2**

- [x] 7. Extend AI Sidebar for pre-populated content

  - [x] 7.1 Add props to AISidebar for initial image, prompt, and model
    - Add `initialImage?: Blob` prop
    - Add `initialPrompt?: string` prop
    - Add `initialModelId?: string` prop
    - _Requirements: 5.2, 5.3, 5.4_
  - [x] 7.2 Update ChatInput to accept and display initial image
    - Convert blob to ImageAttachment format
    - Pre-populate pendingImages state
    - _Requirements: 5.2_
  - [x] 7.3 Update ChatInput to set initial prompt and model
    - Set inputValue from initialPrompt prop
    - Set selectedModel from initialModelId prop (default to GPT-5.1 for vision)
    - _Requirements: 5.3, 5.4_

- [x] 8. Wire up generation workflow to AI Sidebar

  - [x] 8.1 Pass captured image and prompt to AISidebar
    - Store generation context in canvas page state
    - Pass initialImage, initialPrompt ("Generate this"), initialModelId ("openai/gpt-5.1") to AISidebar
    - Clear generation context after sidebar receives it
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Add error handling

  - [x] 9.1 Add toast notifications for errors
    - Show toast on canvas capture failure
    - Show toast on screen creation failure
    - Show warning toast if model switch fails
    - Use sonner toast library (already in project)
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
