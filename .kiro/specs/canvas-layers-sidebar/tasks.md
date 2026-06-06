# Implementation Plan

- [x] 1. Create utility functions for layers sidebar

  - [x] 1.1 Create `lib/canvas/layers-sidebar-utils.ts` with shape utility functions

    - Implement `getShapeIcon(type)` to map shape types to Lucide icons
    - Implement `getShapeName(shape)` to generate readable names
    - Implement `getShapeCenter(shape)` to calculate center point
    - Implement `getShapeBounds(shape)` to get shape bounding box
    - _Requirements: 1.4, 1.5, 2.1, 2.3_

  - [ ]\* 1.2 Write property test for shape icon mapping

    - **Property 2: Shape item rendering correctness**
    - **Validates: Requirements 1.4, 1.5**

  - [ ]\* 1.3 Write property test for viewport centering calculation
    - **Property 3: Viewport centering calculation**
    - **Validates: Requirements 2.1, 2.3**

- [x] 2. Create LayersSidebar component

  - [x] 2.1 Create `components/canvas/LayersSidebar.tsx`

    - Build floating sidebar container with toggle button
    - Implement collapse/expand animation with CSS transitions
    - Style to match existing canvas UI (card background, shadows, borders)
    - Position fixed on right side of canvas
    - _Requirements: 1.1, 1.2, 5.1, 5.2_

  - [x] 2.2 Create ShapeItem sub-component within LayersSidebar

    - Display shape icon based on type
    - Display shape name
    - Show selected state styling
    - Handle click events
    - _Requirements: 1.4, 1.5, 3.1, 3.2, 3.3, 5.3_

  - [x] 2.3 Implement empty state display

    - Show helpful message when no shapes exist
    - Include icon and guidance text
    - _Requirements: 4.1, 4.2_

  - [ ]\* 2.4 Write property test for shape list completeness

    - **Property 1: Shape list completeness**
    - **Validates: Requirements 1.3, 4.3**

  - [ ]\* 2.5 Write property test for selection state synchronization
    - **Property 4: Selection state synchronization**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 3. Integrate sidebar with canvas page

  - [x] 3.1 Add sidebar state management to canvas page

    - Add `isLayersSidebarOpen` state with useState
    - Create toggle handler function
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Implement shape click handler with viewport navigation

    - Calculate shape center using utility function
    - Dispatch CENTER_ON_WORLD viewport action
    - Dispatch SELECT_SHAPE action to select the shape
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Add LayersSidebar to canvas page render
    - Pass shapes, selectedShapes, handlers, and state
    - Position appropriately in the component tree
    - _Requirements: 1.3, 3.1, 3.2, 3.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
