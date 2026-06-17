/**
 * Overlay Script
 *
 * JavaScript code that gets injected into the sandbox layout file.
 * Handles element highlighting on hover, selection on click,
 * and bidirectional communication with the parent window.
 */

/**
 * The overlay script as a string template.
 * This IIFE is injected into the sandbox's layout.tsx file.
 */
export const OVERLAY_SCRIPT = `
(function() {
  'use strict';

  // ============================================================================
  // Configuration
  // ============================================================================

  const HIGHLIGHT_COLOR = 'rgba(59, 130, 246, 0.5)'; // Blue highlight
  const SELECTION_COLOR = 'rgba(249, 115, 22, 0.8)'; // Orange selection
  const LABEL_BG_COLOR = 'rgba(0, 0, 0, 0.8)';
  const OVERLAY_Z_INDEX = 999999;

  // Elements to ignore when selecting
  const IGNORED_TAGS = ['HTML', 'HEAD', 'SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT'];
  const OVERLAY_CLASS = '__edit-mode-overlay__';

  // ============================================================================
  // State
  // ============================================================================

  let isEditMode = false;
  let selectedElement = null;
  let selectedElementVerification = null; // Stores verification data for selected element
  let hoveredElement = null;
  let highlightOverlay = null;
  let selectionOverlay = null;
  let labelElement = null;

  // ============================================================================
  // Overlay Element Creation
  // ============================================================================

  function createOverlays() {
    // Create highlight overlay (for hover)
    highlightOverlay = document.createElement('div');
    highlightOverlay.className = OVERLAY_CLASS;
    highlightOverlay.style.cssText = \`
      position: fixed;
      pointer-events: none;
      border: 2px dashed \${HIGHLIGHT_COLOR};
      background: transparent;
      z-index: \${OVERLAY_Z_INDEX};
      display: none;
      box-sizing: border-box;
    \`;
    document.body.appendChild(highlightOverlay);

    // Create selection overlay (for selected element)
    selectionOverlay = document.createElement('div');
    selectionOverlay.className = OVERLAY_CLASS;
    selectionOverlay.style.cssText = \`
      position: fixed;
      pointer-events: none;
      border: 2px solid \${SELECTION_COLOR};
      background: rgba(249, 115, 22, 0.1);
      z-index: \${OVERLAY_Z_INDEX};
      display: none;
      box-sizing: border-box;
    \`;
    document.body.appendChild(selectionOverlay);

    // Create label element (shows tag name)
    labelElement = document.createElement('div');
    labelElement.className = OVERLAY_CLASS;
    labelElement.style.cssText = \`
      position: fixed;
      pointer-events: none;
      background: \${LABEL_BG_COLOR};
      color: white;
      font-size: 11px;
      font-family: ui-monospace, monospace;
      padding: 2px 6px;
      border-radius: 2px;
      z-index: \${OVERLAY_Z_INDEX + 1};
      display: none;
      white-space: nowrap;
    \`;
    document.body.appendChild(labelElement);
  }

  // ============================================================================
  // Overlay Positioning
  // ============================================================================

  function updateHighlight(element) {
    if (!element || !highlightOverlay) return;

    const rect = element.getBoundingClientRect();
    highlightOverlay.style.left = rect.left + 'px';
    highlightOverlay.style.top = rect.top + 'px';
    highlightOverlay.style.width = rect.width + 'px';
    highlightOverlay.style.height = rect.height + 'px';
    highlightOverlay.style.display = 'block';

    // Update label
    if (labelElement) {
      labelElement.textContent = element.tagName.toLowerCase();
      labelElement.style.left = rect.left + 'px';
      labelElement.style.top = (rect.top - 20) + 'px';
      labelElement.style.display = 'block';

      // Adjust if label would be off-screen
      if (rect.top < 25) {
        labelElement.style.top = (rect.bottom + 4) + 'px';
      }
    }
  }

  function hideHighlight() {
    if (highlightOverlay) {
      highlightOverlay.style.display = 'none';
    }
    if (labelElement) {
      labelElement.style.display = 'none';
    }
  }

  function updateSelection(element) {
    if (!element || !selectionOverlay) return;

    const rect = element.getBoundingClientRect();
    selectionOverlay.style.left = rect.left + 'px';
    selectionOverlay.style.top = rect.top + 'px';
    selectionOverlay.style.width = rect.width + 'px';
    selectionOverlay.style.height = rect.height + 'px';
    selectionOverlay.style.display = 'block';
  }

  function hideSelection() {
    if (selectionOverlay) {
      selectionOverlay.style.display = 'none';
    }
  }

  // ============================================================================
  // Element Path Generation
  // ============================================================================

  function getElementPath(element) {
    if (!element || element === document.body) return 'body';

    const path = [];
    let current = element;

    while (current && current !== document.body && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();

      // Use ID if available (most specific)
      if (current.id) {
        selector = '#' + current.id;
        path.unshift(selector);
        break; // ID is unique, no need to go further
      }

      // Add classes if available
      if (current.className && typeof current.className === 'string') {
        const classes = current.className
          .split(/\\s+/)
          .filter(c => c && !c.startsWith('__edit-mode'))
          .slice(0, 2) // Limit to first 2 classes
          .join('.');
        if (classes) {
          selector += '.' + classes;
        }
      }

      // Add nth-child for uniqueness
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          child => child.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += ':nth-of-type(' + index + ')';
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  // ============================================================================
  // Computed Styles Extraction
  // ============================================================================

  function getComputedStylesInfo(element) {
    const computed = window.getComputedStyle(element);

    return {
      // Typography
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      fontStyle: computed.fontStyle,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      textAlign: computed.textAlign,
      color: computed.color,
      textDecoration: computed.textDecoration,
      textTransform: computed.textTransform,

      // Layout
      display: computed.display,
      width: computed.width,
      height: computed.height,
      padding: computed.padding,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      margin: computed.margin,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft,
      gap: computed.gap,
      columnGap: computed.columnGap,
      rowGap: computed.rowGap,
      flexDirection: computed.flexDirection,
      flexWrap: computed.flexWrap,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,

      // Appearance
      backgroundColor: computed.backgroundColor,
      backgroundImage: computed.backgroundImage,
      borderRadius: computed.borderRadius,
      borderTopLeftRadius: computed.borderTopLeftRadius,
      borderTopRightRadius: computed.borderTopRightRadius,
      borderBottomLeftRadius: computed.borderBottomLeftRadius,
      borderBottomRightRadius: computed.borderBottomRightRadius,
      borderWidth: computed.borderWidth,
      borderTopWidth: computed.borderTopWidth,
      borderRightWidth: computed.borderRightWidth,
      borderBottomWidth: computed.borderBottomWidth,
      borderLeftWidth: computed.borderLeftWidth,
      borderColor: computed.borderColor,
      borderStyle: computed.borderStyle,
      outlineWidth: computed.outlineWidth,
      outlineColor: computed.outlineColor,
      outlineStyle: computed.outlineStyle,
      outlineOffset: computed.outlineOffset,
      boxShadow: computed.boxShadow,
      opacity: computed.opacity,
    };
  }

  // ============================================================================
  // Unique Identifier Generation
  // ============================================================================

  function getDataAttributes(element) {
    const dataAttrs = {};
    if (element.dataset) {
      for (const key in element.dataset) {
        if (element.dataset.hasOwnProperty(key) && !key.startsWith('__')) {
          dataAttrs[key] = element.dataset[key];
        }
      }
    }
    return dataAttrs;
  }

  function getSiblingIndex(element) {
    if (!element.parentElement) return 0;
    const siblings = Array.from(element.parentElement.children).filter(
      child => child.tagName === element.tagName
    );
    return siblings.indexOf(element);
  }

  function generateUniqueIdentifier(element) {
    // Priority 1: Use ID if available
    if (element.id) {
      return 'id:' + element.id;
    }
    
    // Priority 2: Use data-testid or data-id if available
    if (element.dataset?.testid) {
      return 'data-testid:' + element.dataset.testid;
    }
    if (element.dataset?.id) {
      return 'data-id:' + element.dataset.id;
    }
    
    // Priority 3: Generate path-based identifier
    const path = getElementPath(element);
    const siblingIdx = getSiblingIndex(element);
    return 'path:' + path + ':' + siblingIdx;
  }

  function getTextContent(element) {
    // Only get text content for text elements
    const textTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'LABEL', 'A', 'STRONG', 'EM', 'B', 'I'];
    if (!textTags.includes(element.tagName)) return undefined;
    
    // Get direct text content, limit to 200 chars
    const text = element.textContent || '';
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
  }

  // ============================================================================
  // Enhanced Element Identification
  // ============================================================================

  /**
   * Simple hash function for text content
   * Used to help identify text elements uniquely
   */
  function hashTextContent(text) {
    if (!text) return undefined;
    // Simple djb2 hash
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) + hash) + text.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get the index of an element among all its siblings (not just same-tag)
   */
  function getChildIndex(element) {
    if (!element.parentElement) return 0;
    const children = Array.from(element.parentElement.children);
    return children.indexOf(element);
  }

  /**
   * Find the nearest ancestor with an ID and build the path from it
   */
  function getNearestIdAncestor(element) {
    if (!element || element === document.body) return undefined;

    const pathParts = [];
    let current = element;
    let depth = 0;

    while (current && current !== document.body && current !== document.documentElement) {
      const parent = current.parentElement;
      if (!parent) break;

      depth++;

      // Build path segment for current element
      let segment = current.tagName.toLowerCase();
      const siblingIndex = getChildIndex(current);
      segment += ':nth-child(' + (siblingIndex + 1) + ')';
      pathParts.unshift(segment);

      // Check if parent has an ID
      if (parent.id && parent !== document.body) {
        return {
          id: parent.id,
          pathFromAncestor: pathParts.join(' > '),
          depth: depth,
        };
      }

      current = parent;
    }

    return undefined;
  }

  /**
   * Get parent element information
   */
  function getParentInfo(element) {
    const parent = element.parentElement;
    if (!parent || parent === document.body) {
      return { parentTagName: undefined, parentId: undefined };
    }
    return {
      parentTagName: parent.tagName.toLowerCase(),
      parentId: parent.id || undefined,
    };
  }

  /**
   * Create verification data for an element
   * Used to verify the element hasn't been replaced by React re-rendering
   */
  function createElementVerification(element) {
    return {
      tagName: element.tagName,
      id: element.id || null,
      className: typeof element.className === 'string' ? element.className : '',
      childIndex: getChildIndex(element),
      textContentHash: hashTextContent(getTextContent(element)),
      parentTagName: element.parentElement?.tagName || null,
    };
  }

  /**
   * Verify that the current selected element matches the stored verification data
   * Returns true if the element appears to be the same, false otherwise
   */
  function verifySelectedElement() {
    if (!selectedElement || !selectedElementVerification) return false;
    
    // Check if element is still in DOM
    if (!document.body.contains(selectedElement)) return false;
    
    // Verify basic properties match
    const current = createElementVerification(selectedElement);
    
    // Tag name must match
    if (current.tagName !== selectedElementVerification.tagName) return false;
    
    // ID must match (if present)
    if (selectedElementVerification.id && current.id !== selectedElementVerification.id) return false;
    
    // Child index should match (element position in parent)
    if (current.childIndex !== selectedElementVerification.childIndex) return false;
    
    // Parent tag should match
    if (current.parentTagName !== selectedElementVerification.parentTagName) return false;
    
    return true;
  }

  // ============================================================================
  // Element Selection Info
  // ============================================================================

  function getSelectedElementInfo(element) {
    const rect = element.getBoundingClientRect();
    const textContent = getTextContent(element);
    const parentInfo = getParentInfo(element);

    return {
      tagName: element.tagName.toLowerCase(),
      className: typeof element.className === 'string' ? element.className : '',
      id: element.id || '',
      computedStyles: getComputedStylesInfo(element),
      boundingRect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      elementPath: getElementPath(element),
      sourceFile: element.dataset?.sourceFile || undefined,
      textContent: textContent,
      uniqueIdentifier: generateUniqueIdentifier(element),
      siblingIndex: getSiblingIndex(element),
      dataAttributes: getDataAttributes(element),
      src: element.tagName === 'IMG' ? (element.getAttribute('src') || '') : undefined,
      // Enhanced identification fields
      parentTagName: parentInfo.parentTagName,
      parentId: parentInfo.parentId,
      childIndex: getChildIndex(element),
      nearestIdAncestor: getNearestIdAncestor(element),
      textContentHash: hashTextContent(textContent),
    };
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  function isOverlayElement(element) {
    return element && element.classList && element.classList.contains(OVERLAY_CLASS);
  }

  function isSelectableElement(element) {
    if (!element) return false;
    if (isOverlayElement(element)) return false;
    if (IGNORED_TAGS.includes(element.tagName)) return false;
    if (element === document.body) return false;
    return true;
  }

  function handleMouseMove(e) {
    if (!isEditMode) return;

    const target = e.target;

    // Skip overlay elements
    if (isOverlayElement(target)) return;

    // Skip if same element
    if (target === hoveredElement) return;

    // Skip non-selectable elements
    if (!isSelectableElement(target)) {
      hideHighlight();
      hoveredElement = null;
      return;
    }

    hoveredElement = target;
    updateHighlight(target);

    // Notify parent
    const rect = target.getBoundingClientRect();
    window.parent.postMessage({
      type: 'element-hovered',
      data: {
        tagName: target.tagName.toLowerCase(),
        boundingRect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      },
    }, '*');
  }

  function handleMouseLeave() {
    if (!isEditMode) return;

    hideHighlight();
    hoveredElement = null;

    window.parent.postMessage({ type: 'element-unhovered' }, '*');
  }

  function handleClick(e) {
    if (!isEditMode) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target;

    // Skip overlay elements
    if (isOverlayElement(target)) return;

    // Deselect if clicking on non-selectable element
    if (!isSelectableElement(target)) {
      if (selectedElement) {
        selectedElement = null;
        selectedElementVerification = null;
        hideSelection();
        window.parent.postMessage({ type: 'element-deselected' }, '*');
      }
      return;
    }

    // Select the element and store verification data
    selectedElement = target;
    selectedElementVerification = createElementVerification(target);
    updateSelection(target);

    // Notify parent with element info
    const info = getSelectedElementInfo(target);
    window.parent.postMessage({
      type: 'element-selected',
      data: info,
    }, '*');
  }

  function handleMessage(e) {
    const data = e.data;
    if (!data || typeof data.type !== 'string') return;

    console.log('[EditMode] Received message:', data.type);

    switch (data.type) {
      case 'enable-edit-mode':
        console.log('[EditMode] Enabling edit mode via message');
        isEditMode = true;
        document.body.style.cursor = 'crosshair';
        window.parent.postMessage({ type: 'edit-mode-ready' }, '*');
        console.log('[EditMode] Edit mode enabled, sent ready message');
        break;

      case 'disable-edit-mode':
        isEditMode = false;
        document.body.style.cursor = '';
        selectedElement = null;
        selectedElementVerification = null;
        hoveredElement = null;
        hideHighlight();
        hideSelection();
        break;

      case 'apply-style':
        if (selectedElement && data.property && data.value !== undefined) {
          try {
            // Verify element still exists and hasn't been replaced
            if (!verifySelectedElement()) {
              console.warn('[EditMode] Selected element verification failed - element may have been replaced');
              window.parent.postMessage({
                type: 'edit-mode-error',
                error: 'Selected element has changed or no longer exists. Please re-select the element.',
              }, '*');
              selectedElement = null;
              selectedElementVerification = null;
              hideSelection();
              break;
            }
            
            // 'src' is an attribute (e.g. on <img>), not a CSS style.
            if (data.property === 'src') {
              selectedElement.setAttribute('src', data.value);
            } else {
              selectedElement.style[data.property] = data.value;
            }
            // Update selection overlay position in case size changed
            updateSelection(selectedElement);
          } catch (err) {
            console.error('[EditMode] Failed to apply style:', err);
            window.parent.postMessage({
              type: 'edit-mode-error',
              error: 'Failed to apply style: ' + (err.message || 'Unknown error'),
            }, '*');
          }
        }
        break;

      case 'revert-styles':
        if (selectedElement && data.properties && Array.isArray(data.properties)) {
          try {
            // Verify element still exists
            if (!verifySelectedElement()) {
              console.warn('[EditMode] Cannot revert styles - element verification failed');
              break;
            }
            
            // Remove inline styles for the specified properties
            for (const property of data.properties) {
              selectedElement.style[property] = '';
            }
            
            // Update selection overlay position in case size changed
            updateSelection(selectedElement);
            console.log('[EditMode] Reverted styles for properties:', data.properties);
          } catch (err) {
            console.error('[EditMode] Failed to revert styles:', err);
          }
        }
        break;

      case 'deselect':
        selectedElement = null;
        selectedElementVerification = null;
        hideSelection();
        window.parent.postMessage({ type: 'element-deselected' }, '*');
        break;
    }
  }

  // ============================================================================
  // Initialization & Cleanup
  // ============================================================================

  function init() {
    // Check if already initialized - if so, just re-enable edit mode if URL param is set
    if (window.__editModeInitialized__) {
      console.log('[EditMode] Already initialized, checking if should re-enable');
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('__editMode__') === 'true' && !isEditMode) {
        isEditMode = true;
        document.body.style.cursor = 'crosshair';
        window.parent.postMessage({ type: 'edit-mode-ready' }, '*');
        console.log('[EditMode] Re-enabled via URL parameter');
      }
      return;
    }
    window.__editModeInitialized__ = true;

    try {
      createOverlays();

      // Add event listeners
      document.addEventListener('mousemove', handleMouseMove, true);
      document.addEventListener('mouseleave', handleMouseLeave, true);
      document.addEventListener('click', handleClick, true);
      window.addEventListener('message', handleMessage);

      // Update overlays on scroll/resize
      window.addEventListener('scroll', () => {
        if (hoveredElement) updateHighlight(hoveredElement);
        if (selectedElement) updateSelection(selectedElement);
      }, true);

      window.addEventListener('resize', () => {
        if (hoveredElement) updateHighlight(hoveredElement);
        if (selectedElement) updateSelection(selectedElement);
      });

      console.log('[EditMode] Overlay script initialized');
    } catch (err) {
      console.error('[EditMode] Failed to initialize:', err);
      window.parent.postMessage({
        type: 'edit-mode-error',
        error: err.message || 'Failed to initialize edit mode',
      }, '*');
    }
  }

  function cleanup() {
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('mouseleave', handleMouseLeave, true);
    document.removeEventListener('click', handleClick, true);
    window.removeEventListener('message', handleMessage);

    // Remove overlay elements
    document.querySelectorAll('.' + OVERLAY_CLASS).forEach(el => el.remove());

    console.log('[EditMode] Overlay script cleaned up');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Check URL parameter for auto-enable
  // This allows the parent to control edit mode via URL
  function checkAndEnableEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('__editMode__') === 'true' && !isEditMode) {
      isEditMode = true;
      document.body.style.cursor = 'crosshair';
      window.parent.postMessage({ type: 'edit-mode-ready' }, '*');
      console.log('[EditMode] Auto-enabled via URL parameter');
      return true;
    }
    return false;
  }

  // Initial check
  setTimeout(() => {
    if (!checkAndEnableEditMode()) {
      // Notify parent that script is loaded and ready to receive enable command
      window.parent.postMessage({ type: 'edit-mode-script-loaded' }, '*');
      console.log('[EditMode] Script loaded, waiting for enable command');
    }
  }, 100);

  // Also check periodically in case URL changed (for SPA navigation)
  setInterval(() => {
    if (!isEditMode) {
      checkAndEnableEditMode();
    }
  }, 500);

  // Expose cleanup for potential future use
  window.__editModeCleanup__ = cleanup;
})();
`;

/**
 * Script injection marker - used to identify injected script in layout file
 */
export const SCRIPT_START_MARKER = "{/* EDIT_MODE_SCRIPT_START */}";
export const SCRIPT_END_MARKER = "{/* EDIT_MODE_SCRIPT_END */}";

/**
 * Generate the import statement to add at the top of the layout file
 */
export function generateImportStatement(): string {
  return `import Script from "next/script";`;
}

/**
 * Generate the full script block to inject into layout.tsx
 * Uses Next.js Script component for proper script loading
 */
export function generateScriptBlock(): string {
  return `
              ${SCRIPT_START_MARKER}
              <Script id="edit-mode-script" strategy="afterInteractive" src="/__edit-mode__.js" />
              ${SCRIPT_END_MARKER}`;
}

/**
 * Check if a layout file already has the edit mode script injected
 */
export function hasEditModeScript(layoutContent: string): boolean {
  return (
    layoutContent.includes(SCRIPT_START_MARKER) &&
    layoutContent.includes(SCRIPT_END_MARKER)
  );
}

/**
 * Inject the edit mode script into a layout file
 * Adds the script just before the closing </body> tag
 */
export function injectScriptIntoLayout(layoutContent: string): string {
  // Don't inject if already present
  if (hasEditModeScript(layoutContent)) {
    return layoutContent;
  }

  const scriptBlock = generateScriptBlock();

  // Try to inject before </body> - handles both JSX and HTML
  // Pattern: find {children} followed by </body> and inject between them
  const childrenBodyPattern = /(\{children\}\s*)(<\/body>)/;
  if (childrenBodyPattern.test(layoutContent)) {
    return layoutContent.replace(
      childrenBodyPattern,
      `$1${scriptBlock}\n              $2`
    );
  }

  // Alternative: just before </body>
  if (layoutContent.includes("</body>")) {
    return layoutContent.replace(
      "</body>",
      `${scriptBlock}\n            </body>`
    );
  }

  // Last resort: try to find closing body tag with any whitespace
  const bodyClosePattern = /(<\/body>)/i;
  if (bodyClosePattern.test(layoutContent)) {
    return layoutContent.replace(
      bodyClosePattern,
      `${scriptBlock}\n            $1`
    );
  }

  // If nothing works, log warning and return unchanged
  console.warn(
    "[EditMode] Could not find </body> tag in layout file, script not injected"
  );
  return layoutContent;
}

/**
 * Remove the edit mode script from a layout file
 */
export function removeScriptFromLayout(layoutContent: string): string {
  if (!hasEditModeScript(layoutContent)) {
    return layoutContent;
  }

  // Simple string-based removal using indexOf
  const startIdx = layoutContent.indexOf(SCRIPT_START_MARKER);
  const endIdx = layoutContent.indexOf(SCRIPT_END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    return layoutContent;
  }

  // Find the start of the line containing start marker
  let lineStart = startIdx;
  while (lineStart > 0 && layoutContent[lineStart - 1] !== "\n") {
    lineStart--;
  }

  // Find the end of the line containing end marker
  let lineEnd = endIdx + SCRIPT_END_MARKER.length;
  while (lineEnd < layoutContent.length && layoutContent[lineEnd] !== "\n") {
    lineEnd++;
  }
  if (lineEnd < layoutContent.length) lineEnd++;

  return layoutContent.slice(0, lineStart) + layoutContent.slice(lineEnd);
}

// End of file - cleanup marker
const _endOfFile = true;
/* Removed old code:
    /[.*+?^${}()|[\]\\\/]/g,
    "\\$&"
  );
  const endMarkerEscaped = SCRIPT_END_MARKER.replace(
    /[.*+?^${}()|[\]\\\/]/g,
    "\\$&"
  );

  const pattern = new RegExp(
    `\\s*${startMarkerEscaped}[\\s\\S]*?${endMarkerEscaped}\\s*`,
    "g"
  );

  return layoutContent.replace(pattern, "");
*/
