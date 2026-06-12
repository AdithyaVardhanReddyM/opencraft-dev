# Implementation Plan

- [x] 1. Fix class conflict resolution in style-mapper.ts

  - [x] 1.1 Implement comprehensive Tailwind class conflict groups
    - Add CLASS_CONFLICT_GROUPS constant with regex patterns for all Tailwind categories
    - Implement getConflictGroup function to identify which group a class belongs to
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 1.2 Implement getConflictingClasses function
    - Create function that returns all classes from existing list that conflict with new class
    - Handle arbitrary value classes with bracket notation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 1.3 Update extractClassPrefixes to use conflict groups
    - Replace simple prefix extraction with conflict group matching
    - Ensure flex-row/flex-col are properly detected as conflicts
    - _Requirements: 3.6, 5.4_
  - [ ]\* 1.4 Write property test for class conflict resolution
    - **Property 7: Class conflict resolution**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6**

- [x] 2. Implement enhanced element finder in style-mapper.ts

  - [x] 2.1 Create findElementInSource function
    - Implement ID-based element finding with regex
    - Implement data-testid based element finding
    - Implement text content based element finding for unique text
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 2.2 Implement element verification logic
    - Verify found element matches expected tag name
    - Verify sibling index matches when using positional selectors
    - Return null if verification fails
    - _Requirements: 4.4_
  - [x] 2.3 Create updateClassNameAtLocation function
    - Update className at specific character positions in source
    - Handle all quote styles (single, double, template literal)
    - Preserve existing non-conflicting classes
    - _Requirements: 1.2_
  - [ ]\* 2.4 Write property test for source file single-element update
    - **Property 2: Source file single-element update**
    - **Validates: Requirements 1.2**

- [ ] 3. Checkpoint - Make sure all tests are passing

  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Enhance selector generator

  - [x] 4.1 Add nearestIdAncestor to element info extraction
    - Traverse up DOM tree to find nearest ancestor with ID
    - Store path from ancestor to element
    - Update overlay script to extract this info
    - _Requirements: 4.3_
  - [x] 4.2 Implement structural selector generation
    - Generate selectors using parent context and child index
    - Include text content hash for text elements
    - _Requirements: 1.3, 4.3_
  - [x] 4.3 Add selector uniqueness validation
    - Implement function to verify selector matches exactly one element
    - Return confidence level based on validation result
    - _Requirements: 1.4_
  - [ ]\* 4.4 Write property test for unique selector generation
    - **Property 3: Unique selector generation for duplicates**
    - **Validates: Requirements 1.3**
  - [ ]\* 4.5 Write property test for selector method priority
    - **Property 8: Selector method priority**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 5. Fix CSS to Tailwind mapping

  - [x] 5.1 Add missing flex property mappings
    - Add columnGap and rowGap to PROPERTY_PREFIX_MAP
    - Ensure gap-x-_ and gap-y-_ classes are generated correctly
    - _Requirements: 3.4_
  - [x] 5.2 Fix flexWrap mapping
    - Add flexWrap case to cssToTailwind switch
    - Map wrap/nowrap/wrap-reverse to Tailwind classes
    - _Requirements: 3.6_
  - [x] 5.3 Improve arbitrary value handling
    - Properly escape special characters in arbitrary values
    - Handle rgba colors with proper formatting
    - _Requirements: 5.5_
  - [ ]\* 5.4 Write property test for CSS to Tailwind mapping
    - **Property 6: CSS to Tailwind mapping correctness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
  - [ ]\* 5.5 Write property test for arbitrary value escaping
    - **Property 10: Arbitrary value escaping**
    - **Validates: Requirements 5.5**

- [ ] 6. Checkpoint - Make sure all tests are passing

  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update overlay script for better element identification

  - [x] 7.1 Enhance getSelectedElementInfo function
    - Add parentTagName and parentId to returned info
    - Add childIndex (position among all siblings)
    - Add nearestIdAncestor with path
    - _Requirements: 4.3_
  - [x] 7.2 Improve apply-style message handling
    - Verify element still exists before applying style
    - Use element reference instead of re-querying
    - _Requirements: 1.1, 6.1_
  - [x] 7.3 Add element verification on style application
    - Store reference to selected element
    - Verify element hasn't changed before applying styles
    - _Requirements: 1.1_

- [x] 8. Update use-edit-mode hook

  - [x] 8.1 Add save validation before persisting
    - Verify element can be uniquely located in source
    - Show warning if multiple matches found
    - _Requirements: 1.4, 4.5_
  - [x] 8.2 Improve error handling and user feedback
    - Display specific error messages for different failure modes
    - Add retry mechanism for transient failures
    - _Requirements: 1.5, 4.5_
  - [x] 8.3 Fix discard changes to properly revert styles
    - Send message to iframe to remove inline styles
    - Clear pending changes state
    - _Requirements: 6.2_

- [x] 9. Add helper functions for property display

  - [x] 9.1 Implement rgbToHex improvements
    - Handle rgba with alpha channel
    - Handle edge cases (transparent, inherit, etc.)
    - _Requirements: 2.3_
  - [x] 9.2 Add CSS property name conversion utility
    - Convert kebab-case to camelCase for JS style assignment
    - Handle vendor prefixes correctly
    - _Requirements: 6.4_
  - [ ]\* 9.3 Write property test for RGB to hex conversion
    - **Property 5: RGB to hex conversion correctness**
    - **Validates: Requirements 2.3**
  - [ ]\* 9.4 Write property test for CSS property name formatting
    - **Property 9: CSS property name formatting**
    - **Validates: Requirements 6.4**

- [x] 10. Update updateElementClassName to use new element finder

  - [x] 10.1 Refactor updateElementClassName to use findElementInSource
    - Replace regex-based first-match with precise element finding
    - Use verification data to confirm correct element
    - _Requirements: 1.2, 4.4_
  - [x] 10.2 Add fallback behavior with user warning
    - If element cannot be found precisely, warn user
    - Optionally allow user to proceed with best-effort match
    - _Requirements: 1.4, 1.5_
  - [x] 10.3 Integrate conflict resolution into class update
    - Call getConflictingClasses before adding new classes
    - Remove all conflicting classes from existing className
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 11. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.
