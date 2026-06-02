import type {
  ShapesState,
  Tool,
  Shape,
  EntityState,
  Point,
} from "@/types/canvas";
import {
  createEntityState,
  addEntity,
  updateEntity,
  removeEntity,
  removeMany,
  removeAll,
} from "./entity-adapter";
import {
  createFrame,
  createRect,
  createEllipse,
  createFreeDraw,
  createArrow,
  createLine,
  createText,
  createGeneratedUI,
} from "./shape-factories";

// Action types
export type ShapesAction =
  | { type: "SET_TOOL"; payload: Tool }
  | {
      type: "ADD_FRAME";
      payload: { x: number; y: number; w: number; h: number };
    }
  | {
      type: "ADD_RECT";
      payload: { x: number; y: number; w: number; h: number };
    }
  | {
      type: "ADD_ELLIPSE";
      payload: { x: number; y: number; w: number; h: number };
    }
  | { type: "ADD_FREEDRAW"; payload: { points: Point[] } }
  | {
      type: "ADD_ARROW";
      payload: { startX: number; startY: number; endX: number; endY: number };
    }
  | {
      type: "ADD_LINE";
      payload: { startX: number; startY: number; endX: number; endY: number };
    }
  | { type: "ADD_TEXT"; payload: { x: number; y: number } }
  | {
      type: "ADD_GENERATED_UI";
      payload: {
        x: number;
        y: number;
        w: number;
        h: number;
        uiSpecData: string | null;
        sourceFrameId: string;
      };
    }
  | { type: "UPDATE_SHAPE"; payload: { id: string; patch: Partial<Shape> } }
  | { type: "REMOVE_SHAPE"; payload: string }
  | { type: "CLEAR_ALL" }
  | { type: "SELECT_SHAPE"; payload: string }
  | { type: "DESELECT_SHAPE"; payload: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "SELECT_ALL" }
  | { type: "DELETE_SELECTED" }
  | { type: "SET_EDITING_TEXT"; payload: string | null }
  | {
      type: "LOAD_PROJECT";
      payload: {
        shapes: EntityState<Shape>;
        tool: Tool;
        selected: Record<string, true>;
        frameCounter: number;
      };
    };

// Initial state
export const initialShapesState: ShapesState = {
  tool: "select",
  shapes: createEntityState<Shape>(),
  selected: {},
  frameCounter: 0,
  editingTextId: null,
};

// Reducer
export function shapesReducer(
  state: ShapesState,
  action: ShapesAction
): ShapesState {
  switch (action.type) {
    case "SET_TOOL": {
      const preservesSelection =
        action.payload === "select" || action.payload === "hand";
      return {
        ...state,
        tool: action.payload,
        selected: preservesSelection ? state.selected : {},
      };
    }

    case "ADD_FRAME": {
      const frameCounter = state.frameCounter + 1;
      const frame = createFrame({
        ...action.payload,
        frameNumber: frameCounter,
      });

      return {
        ...state,
        shapes: addEntity(state.shapes, frame),
        frameCounter,
      };
    }

    case "ADD_RECT": {
      const rect = createRect(action.payload);
      return {
        ...state,
        shapes: addEntity(state.shapes, rect),
      };
    }

    case "ADD_ELLIPSE": {
      const ellipse = createEllipse(action.payload);
      return {
        ...state,
        shapes: addEntity(state.shapes, ellipse),
      };
    }

    case "ADD_FREEDRAW": {
      const { points } = action.payload;
      // Validate points array
      if (!points || points.length === 0) {
        return state;
      }

      const freedraw = createFreeDraw({ points });
      return {
        ...state,
        shapes: addEntity(state.shapes, freedraw),
      };
    }

    case "ADD_ARROW": {
      const arrow = createArrow(action.payload);
      return {
        ...state,
        shapes: addEntity(state.shapes, arrow),
      };
    }

    case "ADD_LINE": {
      const line = createLine(action.payload);
      return {
        ...state,
        shapes: addEntity(state.shapes, line),
      };
    }

    case "ADD_TEXT": {
      const text = createText(action.payload);
      return {
        ...state,
        shapes: addEntity(state.shapes, text),
        editingTextId: text.id,
      };
    }

    case "ADD_GENERATED_UI": {
      const generatedUI = createGeneratedUI(action.payload);
      return {
        ...state,
        shapes: addEntity(state.shapes, generatedUI),
      };
    }

    case "UPDATE_SHAPE": {
      const { id, patch } = action.payload;
      return {
        ...state,
        shapes: updateEntity(state.shapes, id, patch),
      };
    }

    case "REMOVE_SHAPE": {
      const id = action.payload;

      // Remove from selection if selected
      const newSelected = { ...state.selected };
      delete newSelected[id];

      const removed = removeEntity(state.shapes, id);
      const { shapes: renumberedShapes, frameCount } =
        renumberFramesState(removed);

      return {
        ...state,
        shapes: renumberedShapes,
        selected: newSelected,
        frameCounter: frameCount,
      };
    }

    case "CLEAR_ALL":
      return {
        ...state,
        shapes: removeAll<Shape>(),
        selected: {},
        frameCounter: 0,
      };

    case "SELECT_SHAPE":
      return {
        ...state,
        selected: {
          ...state.selected,
          [action.payload]: true,
        },
      };

    case "DESELECT_SHAPE": {
      const newSelected = { ...state.selected };
      delete newSelected[action.payload];
      return {
        ...state,
        selected: newSelected,
      };
    }

    case "CLEAR_SELECTION":
      return {
        ...state,
        selected: {},
      };

    case "SELECT_ALL": {
      const allSelected: Record<string, true> = {};
      state.shapes.ids.forEach((id) => {
        allSelected[id] = true;
      });
      return {
        ...state,
        selected: allSelected,
      };
    }

    case "DELETE_SELECTED": {
      const idsToDelete = Object.keys(state.selected);
      if (idsToDelete.length === 0) {
        return state;
      }

      const removed = removeMany(state.shapes, idsToDelete);
      const { shapes: renumberedShapes, frameCount } =
        renumberFramesState(removed);

      return {
        ...state,
        shapes: renumberedShapes,
        selected: {},
        editingTextId: null,
        frameCounter: frameCount,
      };
    }

    case "SET_EDITING_TEXT":
      return {
        ...state,
        editingTextId: action.payload,
      };

    case "LOAD_PROJECT":
      return {
        ...state,
        shapes: action.payload.shapes,
        tool: action.payload.tool,
        selected: action.payload.selected,
        frameCounter: action.payload.frameCounter,
        editingTextId: null,
      };

    default:
      return state;
  }
}

function renumberFramesState(shapes: EntityState<Shape>): {
  shapes: EntityState<Shape>;
  frameCount: number;
} {
  let frameCount = 0;
  const entities: EntityState<Shape>["entities"] = { ...shapes.entities };

  shapes.ids.forEach((id) => {
    const shape = entities[id];
    if (shape?.type === "frame") {
      frameCount += 1;
      entities[id] = {
        ...shape,
        frameNumber: frameCount,
      };
    }
  });

  return {
    shapes: {
      ids: shapes.ids,
      entities,
    },
    frameCount,
  };
}
