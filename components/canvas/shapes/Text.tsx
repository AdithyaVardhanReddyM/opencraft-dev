"use client";

import { useRef, useEffect, useMemo } from "react";
import { useCanvasContext } from "@/contexts/CanvasContext";
import type { TextShape } from "@/types/canvas";
import {
  getTextShapeDimensions,
  measureTextDimensions,
  TEXT_PLACEHOLDER,
} from "@/lib/canvas/text-utils";

export const Text = ({ shape }: { shape: TextShape }) => {
  const { shapes, dispatchShapes } = useCanvasContext();
  const isEditing = shapes.editingTextId === shape.id;
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const dimensions = useMemo(
    () => getTextShapeDimensions(shape),
    [shape.w, shape.h, shape.text, shape.fontSize, shape.lineHeight]
  );

  useEffect(() => {
    const { width, height } = measureTextDimensions(shape);
    const widthDiff =
      typeof shape.w === "number" ? Math.abs(shape.w - width) : Infinity;
    const heightDiff =
      typeof shape.h === "number" ? Math.abs(shape.h - height) : Infinity;

    if (widthDiff > 0.5 || heightDiff > 0.5) {
      dispatchShapes({
        type: "UPDATE_SHAPE",
        payload: { id: shape.id, patch: { w: width, h: height } },
      });
    }
  }, [
    dispatchShapes,
    shape.fontFamily,
    shape.fontSize,
    shape.fontStyle,
    shape.fontWeight,
    shape.id,
    shape.letterSpacing,
    shape.lineHeight,
    shape.text,
  ]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const caretPos = inputRef.current.value.length;
      inputRef.current.setSelectionRange(caretPos, caretPos);
    }
  }, [isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    const { width, height } = measureTextDimensions(shape, nextValue);

    if (inputRef.current) {
      inputRef.current.style.width = `${width}px`;
      inputRef.current.style.height = `${height}px`;
    }

    dispatchShapes({
      type: "UPDATE_SHAPE",
      payload: {
        id: shape.id,
        patch: {
          text: nextValue,
          w: width,
          h: height,
        },
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.currentTarget.blur();
    }
  };

  const handleBlur = () => {
    const latestValue = inputRef.current?.value ?? shape.text ?? "";

    if (latestValue.trim().length === 0) {
      dispatchShapes({ type: "SET_EDITING_TEXT", payload: null });
      dispatchShapes({ type: "REMOVE_SHAPE", payload: shape.id });
      return;
    }

    dispatchShapes({ type: "SET_EDITING_TEXT", payload: null });
  };

  if (isEditing) {
    return (
      <div
        className="absolute pointer-events-auto"
        style={{
          left: shape.x,
          top: shape.y,
          width: `${dimensions.width}px`,
          zIndex: 1000,
        }}
      >
        <textarea
          ref={inputRef}
          value={shape.text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onBlur={handleBlur}
          rows={1}
          className="w-full resize-none overflow-hidden bg-transparent outline-none border-none p-0 m-0"
          style={{
            color: shape.stroke,
            fontSize: `${shape.fontSize}px`,
            fontFamily: shape.fontFamily,
            fontWeight: shape.fontWeight,
            fontStyle: shape.fontStyle,
            textAlign: shape.textAlign,
            textDecoration: shape.textDecoration,
            lineHeight: shape.lineHeight,
            letterSpacing: `${shape.letterSpacing}px`,
            textTransform: shape.textTransform,
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        left: shape.x,
        top: shape.y,
        color: shape.stroke,
        fontSize: `${shape.fontSize}px`,
        fontFamily: shape.fontFamily,
        fontWeight: shape.fontWeight,
        fontStyle: shape.fontStyle,
        textAlign: shape.textAlign,
        textDecoration: shape.textDecoration,
        lineHeight: shape.lineHeight,
        letterSpacing: `${shape.letterSpacing}px`,
        textTransform: shape.textTransform,
        width: `${dimensions.width}px`,
        minWidth: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {shape.text || TEXT_PLACEHOLDER}
    </div>
  );
};
