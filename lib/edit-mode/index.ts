/**
 * Edit Mode Module
 *
 * Exports all edit mode utilities, types, and functions.
 */

// Types
export * from "./types";

// Style Mapper
export {
  cssToTailwind,
  fontSizeToTailwind,
  colorToTailwind,
  spacingToTailwind,
  borderRadiusToTailwind,
  fontWeightToTailwind,
  opacityToTailwind,
  updateElementClassName,
  updateElementClassNameWithResult,
  isValidTailwindClass,
  parseNumericValue,
  rgbToHex,
  normalizeColor,
  kebabToCamelCase,
  camelToKebabCase,
  FONT_SIZE_MAP,
  SPACING_MAP,
  BORDER_RADIUS_MAP,
  FONT_WEIGHT_MAP,
  COLOR_MAP,
  type UpdateClassNameResult,
} from "./style-mapper";

// Overlay Script
export {
  OVERLAY_SCRIPT,
  SCRIPT_START_MARKER,
  SCRIPT_END_MARKER,
  generateScriptBlock,
  hasEditModeScript,
  injectScriptIntoLayout,
  removeScriptFromLayout,
} from "./overlay-script";

// Sandbox Files
export {
  LAYOUT_FILE_PATH,
  ALTERNATIVE_LAYOUT_PATHS,
  storeOriginalContent,
  getOriginalContent,
  clearOriginalContent,
  readSandboxFile,
  writeSandboxFile,
  findLayoutFile,
  injectOverlayScript,
  removeOverlayScript,
  readSourceFile,
  writeSourceFile,
} from "./sandbox-files";

// Selector Generator
export {
  generateUniqueSelector,
  validateSelectorUniqueness,
  findBestSelector,
  selectorToSourcePattern,
  type UniqueSelector,
  type SelectorConfidence,
  type SelectorMethod,
} from "./selector-generator";

// Element Finder
export {
  findElementInSource,
  verifyElementMatch,
  updateClassNameAtLocation,
  getConflictGroup,
  getConflictingClasses,
  validateElementLocation,
  type FindElementOptions,
  type ElementLocation,
  type ElementValidationResult,
} from "./element-finder-temp";
