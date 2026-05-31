import type { ViewportState, Point, Rect, ViewportMode } from "@/types/canvas";
import {
  clamp,
  screenToWorld,
  zoomAroundScreenPoint,
} from "./coordinate-utils";

// Action types
export type ViewportAction =
  | { type: "SET_TRANSLATE"; payload: Point }
  | { type: "SET_SCALE"; payload: { scale: number; originScreen?: Point } }
  | { type: "ZOOM_BY"; payload: { factor: number; originScreen: Point } }
  | { type: "ZOOM_IN" }
  | { type: "ZOOM_OUT" }
  | { type: "SET_ZOOM"; payload: number }
  | { type: "WHEEL_ZOOM"; payload: { deltaY: number; originScreen: Point } }
  | { type: "WHEEL_PAN"; payload: { dx: number; dy: number } }
  | { type: "PAN_START"; payload: { screen: Point; mode?: ViewportMode } }
  | { type: "PAN_MOVE"; payload: Point }
  | { type: "PAN_END" }
  | { type: "HAND_TOOL_ENABLE" }
  | { type: "HAND_TOOL_DISABLE" }
  | { type: "CENTER_ON_WORLD"; payload: { world: Point; toScreen?: Point } }
  | {
      type: "ZOOM_TO_FIT";
      payload: {
        bounds: Rect;
        viewportPx: { width: number; height: number };
        padding?: number;
      };
    }
  | { type: "RESET_VIEW" }
  | { type: "RESTORE_VIEWPORT"; payload: { scale: number; translate: Point } };

// Initial state
export const initialViewportState: ViewportState = {
  scale: 1,
  minScale: 0.1,
  maxScale: 8,
  translate: { x: 0, y: 0 },
  mode: "idle",
  panStartScreen: null,
  panStartTranslate: null,
  wheelPanSpeed: 2.0,
  zoomStep: 1.05,
};

// Reducer
export function viewportReducer(
  state: ViewportState,
  action: ViewportAction
): ViewportState {
  switch (action.type) {
    case "SET_TRANSLATE":
      return {
        ...state,
        translate: {
          x: action.payload.x,
          y: action.payload.y,
        },
      };

    case "SET_SCALE": {
      const { scale, originScreen } = action.payload;
      const clamped = clamp(scale, state.minScale, state.maxScale);

      if (originScreen) {
        const t = zoomAroundScreenPoint(
          originScreen,
          clamped,
          state.translate,
          state.scale
        );
        return {
          ...state,
          scale: clamped,
          translate: { x: t.x, y: t.y },
        };
      }

      return {
        ...state,
        scale: clamped,
      };
    }

    case "ZOOM_BY": {
      const { factor, originScreen } = action.payload;
      const next = clamp(state.scale * factor, state.minScale, state.maxScale);
      const t = zoomAroundScreenPoint(
        originScreen,
        next,
        state.translate,
        state.scale
      );

      return {
        ...state,
        scale: next,
        translate: { x: t.x, y: t.y },
      };
    }

    case "ZOOM_IN":
      return {
        ...state,
        scale: clamp(state.scale * 1.2, state.minScale, state.maxScale),
      };

    case "ZOOM_OUT":
      return {
        ...state,
        scale: clamp(state.scale / 1.2, state.minScale, state.maxScale),
      };

    case "SET_ZOOM":
      return {
        ...state,
        scale: clamp(action.payload, state.minScale, state.maxScale),
      };

    case "WHEEL_ZOOM": {
      const { deltaY, originScreen } = action.payload;
      // Adjust sensitivity for mouse wheel vs trackpad
      // Trackpads usually send smaller deltaY values more frequently
      // Mouse wheels send larger values less frequently
      const sensitivity = Math.abs(deltaY) < 50 ? 0.25 : 0.05;
      const factor = Math.pow(state.zoomStep, -deltaY * sensitivity);
      const next = clamp(state.scale * factor, state.minScale, state.maxScale);
      const t = zoomAroundScreenPoint(
        originScreen,
        next,
        state.translate,
        state.scale
      );

      return {
        ...state,
        scale: next,
        translate: { x: t.x, y: t.y },
      };
    }

    case "WHEEL_PAN":
      return {
        ...state,
        translate: {
          x: state.translate.x + action.payload.dx * state.wheelPanSpeed,
          y: state.translate.y + action.payload.dy * state.wheelPanSpeed,
        },
      };

    case "PAN_START":
      return {
        ...state,
        mode: action.payload.mode ?? "panning",
        panStartScreen: action.payload.screen,
        panStartTranslate: { x: state.translate.x, y: state.translate.y },
      };

    case "PAN_MOVE": {
      if (!(state.mode === "panning" || state.mode === "shiftPanning")) {
        return state;
      }
      if (!state.panStartScreen || !state.panStartTranslate) {
        return state;
      }

      const dx = action.payload.x - state.panStartScreen.x;
      const dy = action.payload.y - state.panStartScreen.y;

      return {
        ...state,
        translate: {
          x: state.panStartTranslate.x + dx,
          y: state.panStartTranslate.y + dy,
        },
      };
    }

    case "PAN_END":
      return {
        ...state,
        mode: "idle",
        panStartScreen: null,
        panStartTranslate: null,
      };

    case "HAND_TOOL_ENABLE":
      if (state.mode === "idle") {
        return {
          ...state,
          mode: "shiftPanning",
        };
      }
      return state;

    case "HAND_TOOL_DISABLE":
      if (state.mode === "shiftPanning") {
        return {
          ...state,
          mode: "idle",
        };
      }
      return state;

    case "CENTER_ON_WORLD": {
      const { world, toScreen = { x: 0, y: 0 } } = action.payload;
      return {
        ...state,
        translate: {
          x: toScreen.x - world.x * state.scale,
          y: toScreen.y - world.y * state.scale,
        },
      };
    }

    case "ZOOM_TO_FIT": {
      const { bounds, viewportPx, padding = 50 } = action.payload;
      const aw = Math.max(1, viewportPx.width - padding * 2);
      const ah = Math.max(1, viewportPx.height - padding * 2);
      const bw = Math.max(1e-6, bounds.width);
      const bh = Math.max(1e-6, bounds.height);

      const scaleX = aw / bw;
      const scaleY = ah / bh;
      const next = clamp(
        Math.min(scaleX, scaleY),
        state.minScale,
        state.maxScale
      );

      const centerX = viewportPx.width / 2;
      const centerY = viewportPx.height / 2;
      const boundsCenterX = bounds.x + bounds.width / 2;
      const boundsCenterY = bounds.y + bounds.height / 2;

      return {
        ...state,
        scale: next,
        translate: {
          x: centerX - boundsCenterX * next,
          y: centerY - boundsCenterY * next,
        },
      };
    }

    case "RESET_VIEW":
      return {
        ...state,
        scale: 1,
        translate: { x: 0, y: 0 },
        mode: "idle",
        panStartScreen: null,
        panStartTranslate: null,
      };

    case "RESTORE_VIEWPORT": {
      const { scale, translate } = action.payload;
      return {
        ...state,
        scale: clamp(scale, state.minScale, state.maxScale),
        translate: { x: translate.x, y: translate.y },
        mode: "idle",
        panStartScreen: null,
        panStartTranslate: null,
      };
    }

    default:
      return state;
  }
}
