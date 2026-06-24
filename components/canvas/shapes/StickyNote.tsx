"use client";

import { useRef, useEffect } from "react";
import { useCanvasContext } from "@/contexts/CanvasContext";
import type { StickyNoteShape } from "@/types/canvas";

// Color-agnostic paper treatments — all expressed as alpha over the note's own
// background color, so they read correctly on every palette swatch.
const PAPER_SHEEN =
  "linear-gradient(157deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.06) 34%, rgba(0,0,0,0.05) 100%)";
const PAPER_SHADOW_RESTING =
  "0 1px 2px rgba(0,0,0,0.12), 0 12px 26px -12px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.42)";
const PAPER_SHADOW_EDITING =
  "0 2px 6px rgba(0,0,0,0.16), 0 20px 40px -14px rgba(0,0,0,0.46), inset 0 1px 0 rgba(255,255,255,0.5)";

const NOTE_RADIUS = 10;
const NOTE_PADDING = 18;
const NOTE_LINE_HEIGHT = 1.35;

export const StickyNote = ({ shape }: { shape: StickyNoteShape }) => {
  const { shapes, dispatchShapes } = useCanvasContext();
  const isEditing = shapes.editingTextId === shape.id;
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const innerHeight = shape.h - NOTE_PADDING * 2;

  // Grow the textarea to fit its content (so short text stays vertically
  // centered by the flex parent) and cap it at the note's inner height, after
  // which it scrolls. Unlike the Text shape, the note never changes size.
  const fitTextareaHeight = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, innerHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > innerHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const caretPos = inputRef.current.value.length;
      inputRef.current.setSelectionRange(caretPos, caretPos);
      fitTextareaHeight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) fitTextareaHeight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape.text, shape.fontSize, shape.h]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatchShapes({
      type: "UPDATE_SHAPE",
      payload: { id: shape.id, patch: { text: e.target.value } },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") e.currentTarget.blur();
  };

  // A blank sticky note is valid — leave edit mode without deleting it.
  const handleBlur = () => {
    dispatchShapes({ type: "SET_EDITING_TEXT", payload: null });
  };

  const paperStyle: React.CSSProperties = {
    left: shape.x,
    top: shape.y,
    width: shape.w,
    height: shape.h,
    borderRadius: NOTE_RADIUS,
    backgroundColor: shape.backgroundColor,
    backgroundImage: PAPER_SHEEN,
    boxShadow: isEditing ? PAPER_SHADOW_EDITING : PAPER_SHADOW_RESTING,
    padding: NOTE_PADDING,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    transition: "box-shadow 160ms ease",
  };

  const typographyStyle: React.CSSProperties = {
    color: shape.stroke,
    fontFamily: shape.fontFamily,
    fontSize: `${shape.fontSize}px`,
    fontWeight: shape.fontWeight,
    textAlign: shape.textAlign,
    lineHeight: NOTE_LINE_HEIGHT,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowWrap: "break-word",
  };

  // Subtle folded "dog-ear" at the bottom-right for tactile sticky-note
  // character. Pure alpha so it works on any note color.
  const dogEar = (
    <div
      aria-hidden
      className="absolute"
      style={{
        right: 0,
        bottom: 0,
        width: 22,
        height: 22,
        borderBottomRightRadius: NOTE_RADIUS,
        background:
          "linear-gradient(135deg, transparent 0%, transparent 50%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.04) 100%)",
        pointerEvents: "none",
      }}
    />
  );

  if (isEditing) {
    return (
      <div
        className="absolute pointer-events-auto"
        style={{ ...paperStyle, zIndex: 1000 }}
      >
        <textarea
          ref={inputRef}
          value={shape.text}
          onChange={handleChange}
          onInput={fitTextareaHeight}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          rows={1}
          placeholder="Type something…"
          className="w-full resize-none border-none bg-transparent p-0 placeholder:opacity-40"
          style={{
            ...typographyStyle,
            width: "100%",
            height: "auto",
            maxHeight: `${innerHeight}px`,
            overflow: "hidden",
            outline: "none",
            boxShadow: "none",
          }}
        />
        {dogEar}
      </div>
    );
  }

  return (
    <div className="absolute pointer-events-none select-none" style={paperStyle}>
      <div style={{ ...typographyStyle, width: "100%", maxHeight: "100%" }}>
        {shape.text || (
          <span style={{ opacity: 0.4 }}>Double‑click to type</span>
        )}
      </div>
      {dogEar}
    </div>
  );
};
