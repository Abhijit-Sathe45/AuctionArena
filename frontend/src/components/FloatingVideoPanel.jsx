import React, { useCallback, useRef, useState } from "react";

const DEFAULT_WIDTH = 380;
const DEFAULT_HEIGHT = 300;
const MIN_WIDTH = 260;
const MIN_HEIGHT = 180;

// A floating, resizable video panel docked in the bottom-right corner — like Zoom/Meet's
// self-view widget — instead of a block that pushes the rest of the page down.
//
// Resize is done manually (not via CSS `resize`) because the iframe underneath would
// otherwise capture the mouse and make the native browser resize handle unreliable to grab.
export default function FloatingVideoPanel({ title, src, onClose }) {
  const [minimized, setMinimized] = useState(false);
  const [size, setSize] = useState({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });
  const dragState = useRef(null);

  const onGripMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: size.width,
        startHeight: size.height,
      };

      function onMouseMove(ev) {
        if (!dragState.current) return;
        const { startX, startY, startWidth, startHeight } = dragState.current;
        // Dragging the bottom-right corner outward grows the panel; the panel is anchored
        // to the bottom-right of the screen, so growing width/height means moving the mouse
        // left/up relative to the start point.
        const newWidth = Math.min(
          window.innerWidth * 0.9,
          Math.max(MIN_WIDTH, startWidth - (ev.clientX - startX)),
        );
        const newHeight = Math.min(
          window.innerHeight * 0.8,
          Math.max(MIN_HEIGHT, startHeight - (ev.clientY - startY)),
        );
        setSize({ width: newWidth, height: newHeight });
      }
      function onMouseUp() {
        dragState.current = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [size],
  );

  return (
    <div
      className="fixed bottom-4 right-4 z-50 bg-black rounded-lg shadow-2xl border border-white/20 flex flex-col overflow-hidden"
      style={{
        width: size.width,
        height: minimized ? "auto" : size.height,
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-turf text-ivory text-xs shrink-0 select-none">
        <span className="truncate font-medium">{title}</span>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setMinimized((m) => !m)}
            className="hover:opacity-70 leading-none"
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? "▢" : "—"}
          </button>
          <button
            onClick={onClose}
            className="hover:opacity-70 leading-none text-base"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="relative flex-1">
          <iframe
            title={title}
            src={src}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-none"
          />
          {/* Dedicated resize grip, sitting above the iframe so it reliably receives mouse events */}
          <div
            onMouseDown={onGripMouseDown}
            title="Drag to resize"
            className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize flex items-end justify-end p-0.5"
          >
            <svg viewBox="0 0 10 10" className="w-3 h-3 opacity-70">
              <path
                d="M9 1L1 9M9 5L5 9M9 9L9 9"
                stroke="white"
                strokeWidth="1.2"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
