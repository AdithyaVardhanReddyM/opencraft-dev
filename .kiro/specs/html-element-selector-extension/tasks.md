# Implementation Plan

- [x] 1. Set up extension project structure and dependencies

  - [x] 1.1 Update extension manifest with required permissions
    - Add `clipboardWrite` permission and `activeTab` permission
    - Update `host_permissions` to `<all_urls>` for content script injection
    - _Requirements: 1.2, 8.1_
  - [x] 1.2 Install fast-check for property-based testing
    - Run `pnpm add -D fast-check @types/chrome` in unitset-extension directory
    - Configure test environment in vite.config.ts
    - _Requirements: Testing infrastructure_
  - [x] 1.3 Create extension type definitions
    - Create `unitset-extension/src/types/capture.ts` with CapturedElement, ComputedStyleMap, ElementMetadata interfaces
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 2. Implement content script for element selection

  - [x] 2.1 Create element selector core logic
    - Create `unitset-extension/src/content/element-selector.ts`
    - Implement `activateSelectionMode`, `deactivateSelectionMode` functions
    - Implement `highlightElement`, `removeHighlight` functions using outline styling
    - Add mouse event listeners for hover detection
    - Add keyboard listener for Escape key to exit
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_
  - [ ]\* 2.2 Write property test for single element highlight invariant
    - **Property 1: Single Element Highlight Invariant**
    - **Validates: Requirements 2.1, 2.2**
  - [ ]\* 2.3 Write property test for cleanup restores original state
    - **Property 2: Cleanup Restores Original State**
    - **Validates: Requirements 3.2, 3.3**

- [x] 3. Implement element capture functionality

  - [x] 3.1 Create capture utility functions
    - Create `unitset-extension/src/content/capture.ts`
    - Implement `captureElement` function to extract HTML, styles, and metadata
    - Implement `extractComputedStyles` to get all computed CSS for element and descendants
    - Implement `extractMetadata` for tagName, dimensions, position, childCount
    - _Requirements: 4.1, 4.2, 4.3, 8.2_
  - [ ]\* 3.2 Write property test for capture includes complete HTML
    - **Property 3: Capture Includes Complete HTML**
    - **Validates: Requirements 4.1, 8.2**
  - [ ]\* 3.3 Write property test for capture includes all computed styles
    - **Property 4: Capture Includes All Computed Styles**
    - **Validates: Requirements 4.2**
  - [ ]\* 3.4 Write property test for capture includes required metadata
    - **Property 5: Capture Includes Required Metadata**
    - **Validates: Requirements 4.3**
  - [x] 3.5 Implement clipboard serialization
    - Create `unitset-extension/src/utils/serialization.ts`
    - Implement `encodeForClipboard` with UNITSET_CAPTURE: prefix and base64 encoding
    - Implement `decodeFromClipboard` for parsing
    - Implement `copyToClipboard` using navigator.clipboard API
    - _Requirements: 4.4, 7.1, 7.2, 7.3, 7.4_
  - [ ]\* 3.6 Write property test for serialization round-trip
    - **Property 7: Serialization Round-Trip**
    - **Validates: Requirements 7.1, 7.4**
  - [ ]\* 3.7 Write property test for serialized content contains version
    - **Property 8: Serialized Content Contains Version**
    - **Validates: Requirements 7.2**

- [x] 4. Implement extension popup UI

  - [x] 4.1 Update popup App component
    - Replace default Vite template with UnitSet-styled popup
    - Add "Select HTML" button with click handler
    - Implement script injection using chrome.scripting.executeScript
    - Add error handling for invalid pages (chrome://, etc.)
    - Add visual feedback during selection mode
    - _Requirements: 1.1, 1.2, 1.3, 8.3_
  - [x] 4.2 Add popup styling
    - Create stunning, professional, clean styling matching UnitSet design system
    - Use dark theme colors: background #0a0a0a, surface #171717, primary #f97316
    - Style primary button with orange background, white text, hover glow effect
    - Add UnitSet logo at top of popup
    - Style error states (red), success states (green checkmark)
    - Add smooth transitions (150ms ease-out) and subtle shadows
    - Use Inter font family, proper typography hierarchy
    - Implement selection active state with pulsing orange indicator
    - _Requirements: 1.1_

- [ ] 5. Checkpoint - Ensure extension tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement extension content detection in main app

  - [x] 6.1 Create extension content utility
    - Create `lib/extension-content.ts`
    - Implement `isExtensionContentFormat` to detect UNITSET_CAPTURE: prefix
    - Implement `parseExtensionContent` to decode and validate content
    - Export CapturedElement type for use in components
    - _Requirements: 5.1, 7.3_
  - [ ]\* 6.2 Write property test for extension content detection accuracy
    - **Property 6: Extension Content Detection Accuracy**
    - **Validates: Requirements 5.1, 7.3**

- [x] 7. Implement Extension Chip component

  - [x] 7.1 Create ExtensionChip component
    - Create `components/canvas/ExtensionChip.tsx`
    - Display styled chip with "Copied from Extension" label
    - Add close button to remove the chip
    - Use project design system (bg-primary/10, border-primary/30)
    - Show element preview info (tag name, dimensions)
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 8. Integrate extension content into AI sidebar

  - [x] 8.1 Update ChatInput component to handle extension content
    - Modify ChatInput in `components/canvas/AISidebar.tsx`
    - Add state for extensionContent (CapturedElement | null)
    - Detect extension content on paste event
    - Display ExtensionChip when extension content is present
    - Clear extension content when chip is removed
    - _Requirements: 5.1, 5.2, 5.4_
  - [x] 8.2 Update message submission to include extension data
    - Modify handleSubmit to include extension content in message
    - Format message to include both user text and captured data
    - Ensure full CapturedElement data is sent to AI
    - _Requirements: 6.1_
  - [ ]\* 8.3 Write property test for message payload includes full data
    - **Property 9: Message Payload Includes Full Data**
    - **Validates: Requirements 6.1**

- [x] 9. Update AI system prompt for element replication

  - [x] 9.1 Add captured element handling instructions to AI prompt
    - Update system prompt in `inngest/functions.ts`
    - Add section explaining UNITSET_CAPTURE format
    - Add guidelines for replicating captured components
    - Include instructions for converting styles to Tailwind
    - _Requirements: 6.2, 6.3_

- [ ] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
