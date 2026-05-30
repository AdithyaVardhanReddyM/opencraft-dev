"use client";

import { CanvasProvider } from "@/contexts/CanvasContext";
import { useInfiniteCanvas } from "@/hooks/use-infinite-canvas";
import { Toolbar } from "@/components/canvas/Toolbar";
import { ZoomBar } from "@/components/canvas/ZoomBar";
import { HistoryPill } from "@/components/canvas/HistoryPill";

function CanvasContent() {
  const {
    viewport,
    shapes,
    currentTool,
    selectedShapes,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    attachCanvasRef,
    selectTool,
    getDraftShape,
    getFreeDrawPoints,
    zoomIn,
    zoomOut,
  } = useInfiniteCanvas();

  const draftShape = getDraftShape();
  const freeDrawPoints = getFreeDrawPoints();

  // TODO: Implement undo/redo functionality
  const handleUndo = () => {
    console.log("Undo action - to be implemented");
  };

  const handleRedo = () => {
    console.log("Redo action - to be implemented");
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-accent">
      {/* Toolbar */}
      <Toolbar currentTool={currentTool} onToolSelect={selectTool} />

      {/* Zoom Bar */}
      <ZoomBar
        scale={viewport.scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        minScale={viewport.minScale}
        maxScale={viewport.maxScale}
      />

      {/* History Pill */}
      <HistoryPill
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={false}
        canRedo={false}
      />

      {/* Canvas */}
      <div
        ref={attachCanvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="h-full w-full cursor-crosshair"
        style={{
          touchAction: "none",
        }}
      >
        <svg
          className="h-full w-full"
          style={{
            transform: `translate(${viewport.translate.x}px, ${viewport.translate.y}px) scale(${viewport.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Render shapes */}
          {shapes.map((shape) => {
            const isSelected = selectedShapes[shape.id];

            if (shape.type === "frame") {
              return (
                <rect
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.w}
                  height={shape.h}
                  fill={shape.fill || "transparent"}
                  stroke={isSelected ? "#3b82f6" : shape.stroke}
                  strokeWidth={isSelected ? 3 : shape.strokeWidth}
                  className="pointer-events-none"
                />
              );
            }

            if (shape.type === "rect") {
              return (
                <rect
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.w}
                  height={shape.h}
                  fill={shape.fill || "transparent"}
                  stroke={isSelected ? "#3b82f6" : shape.stroke}
                  strokeWidth={isSelected ? 3 : shape.strokeWidth}
                  className="pointer-events-none"
                />
              );
            }

            if (shape.type === "ellipse") {
              return (
                <ellipse
                  key={shape.id}
                  cx={shape.x + shape.w / 2}
                  cy={shape.y + shape.h / 2}
                  rx={shape.w / 2}
                  ry={shape.h / 2}
                  fill={shape.fill || "transparent"}
                  stroke={isSelected ? "#3b82f6" : shape.stroke}
                  strokeWidth={isSelected ? 3 : shape.strokeWidth}
                  className="pointer-events-none"
                />
              );
            }

            if (shape.type === "freedraw") {
              const pathData = shape.points
                .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                .join(" ");
              return (
                <path
                  key={shape.id}
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? "#3b82f6" : shape.stroke}
                  strokeWidth={isSelected ? 3 : shape.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none"
                />
              );
            }

            if (shape.type === "arrow" || shape.type === "line") {
              return (
                <g key={shape.id}>
                  <line
                    x1={shape.startX}
                    y1={shape.startY}
                    x2={shape.endX}
                    y2={shape.endY}
                    stroke={isSelected ? "#3b82f6" : shape.stroke}
                    strokeWidth={isSelected ? 3 : shape.strokeWidth}
                    className="pointer-events-none"
                  />
                  {shape.type === "arrow" && (
                    <polygon
                      points={`${shape.endX},${shape.endY} ${shape.endX - 10},${
                        shape.endY - 5
                      } ${shape.endX - 10},${shape.endY + 5}`}
                      fill={isSelected ? "#3b82f6" : shape.stroke}
                      className="pointer-events-none"
                    />
                  )}
                </g>
              );
            }

            if (shape.type === "text") {
              return (
                <text
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  fill={shape.fill || "#ffffff"}
                  fontSize={shape.fontSize}
                  fontFamily={shape.fontFamily}
                  fontWeight={shape.fontWeight}
                  fontStyle={shape.fontStyle}
                  textAnchor={
                    shape.textAlign === "center"
                      ? "middle"
                      : shape.textAlign === "right"
                      ? "end"
                      : "start"
                  }
                  className="pointer-events-none"
                >
                  {shape.text}
                </text>
              );
            }

            if (shape.type === "generatedui") {
              return (
                <foreignObject
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.w}
                  height={shape.h}
                  className="pointer-events-none"
                >
                  <div
                    className="h-full w-full overflow-hidden border border-gray-200 bg-white"
                    style={{
                      border: isSelected ? "3px solid #3b82f6" : "none",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: shape.uiSpecData || "",
                    }}
                  />
                </foreignObject>
              );
            }

            return null;
          })}

          {/* Render draft shape */}
          {draftShape && (
            <>
              {(draftShape.type === "frame" || draftShape.type === "rect") && (
                <rect
                  x={Math.min(
                    draftShape.startWorld.x,
                    draftShape.currentWorld.x
                  )}
                  y={Math.min(
                    draftShape.startWorld.y,
                    draftShape.currentWorld.y
                  )}
                  width={Math.abs(
                    draftShape.currentWorld.x - draftShape.startWorld.x
                  )}
                  height={Math.abs(
                    draftShape.currentWorld.y - draftShape.startWorld.y
                  )}
                  fill="transparent"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  className="pointer-events-none"
                />
              )}

              {draftShape.type === "ellipse" && (
                <ellipse
                  cx={(draftShape.startWorld.x + draftShape.currentWorld.x) / 2}
                  cy={(draftShape.startWorld.y + draftShape.currentWorld.y) / 2}
                  rx={
                    Math.abs(
                      draftShape.currentWorld.x - draftShape.startWorld.x
                    ) / 2
                  }
                  ry={
                    Math.abs(
                      draftShape.currentWorld.y - draftShape.startWorld.y
                    ) / 2
                  }
                  fill="transparent"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  className="pointer-events-none"
                />
              )}

              {(draftShape.type === "arrow" || draftShape.type === "line") && (
                <line
                  x1={draftShape.startWorld.x}
                  y1={draftShape.startWorld.y}
                  x2={draftShape.currentWorld.x}
                  y2={draftShape.currentWorld.y}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  className="pointer-events-none"
                />
              )}
            </>
          )}

          {/* Render freedraw preview */}
          {freeDrawPoints.length > 0 && (
            <path
              d={freeDrawPoints
                .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                .join(" ")}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
          )}
        </svg>
      </div>
    </div>
  );
}

export default function CanvasPage() {
  return (
    <CanvasProvider>
      <CanvasContent />
    </CanvasProvider>
  );
}
