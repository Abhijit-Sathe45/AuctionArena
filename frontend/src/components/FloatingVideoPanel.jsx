import React, { useCallback, useRef, useState, useEffect } from "react";

const MIN_WIDTH = 240;
const MIN_HEIGHT = 160;

export default function FloatingVideoPanel({ title, src, onClose }) {
  const [minimized, setMinimized] = useState(false);
  const [size, setSize] = useState(() => {
    const w = typeof window !== 'undefined' ? Math.min(360, window.innerWidth - 32) : 340;
    const h = typeof window !== 'undefined' ? Math.min(260, Math.round(window.innerHeight * 0.35)) : 240;
    return { width: Math.max(MIN_WIDTH, w), height: Math.max(MIN_HEIGHT, h) };
  });
  const dragState = useRef(null);

  // Keep size within bounds if window resizes
  useEffect(() => {
    function handleResize() {
      setSize(s => ({
        width: Math.min(window.innerWidth - 24, s.width),
        height: Math.min(window.innerHeight - 80, s.height),
      }));
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDragStart = useCallback((clientX, clientY) => {
    dragState.current = {
      startX: clientX,
      startY: clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
  }, [size]);

  const handleDragMove = useCallback((clientX, clientY) => {
    if (!dragState.current) return;
    const { startX, startY, startWidth, startHeight } = dragState.current;
    const newWidth = Math.min(
      window.innerWidth - 24,
      Math.max(MIN_WIDTH, startWidth - (clientX - startX))
    );
    const newHeight = Math.min(
      window.innerHeight * 0.8,
      Math.max(MIN_HEIGHT, startHeight - (clientY - startY))
    );
    setSize({ width: newWidth, height: newHeight });
  }, []);

  const handleDragEnd = useCallback(() => {
    dragState.current = null;
  }, []);

  const onGripMouseDown = useCallback((e) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);

    function onMouseMove(ev) {
      handleDragMove(ev.clientX, ev.clientY);
    }
    function onMouseUp() {
      handleDragEnd();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  const onGripTouchStart = useCallback((e) => {
    if (!e.touches?.[0]) return;
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);

    function onTouchMove(ev) {
      if (!ev.touches?.[0]) return;
      handleDragMove(ev.touches[0].clientX, ev.touches[0].clientY);
    }
    function onTouchEnd() {
      handleDragEnd();
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    }
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  return (
    <div
      className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50 bg-black rounded-xl shadow-2xl border border-white/20 flex flex-col overflow-hidden max-w-[calc(100vw-1rem)]"
      style={{
        width: size.width,
        height: minimized ? "auto" : size.height,
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-turf text-ivory text-xs shrink-0 select-none">
        <span className="truncate font-medium pr-2">{title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setMinimized((m) => !m)}
            className="p-1 rounded hover:bg-white/20 active:bg-white/30 leading-none text-xs"
            title={minimized ? "Expand" : "Minimize"}
            aria-label={minimized ? "Expand video" : "Minimize video"}
          >
            {minimized ? "▢" : "—"}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/20 active:bg-white/30 leading-none text-base font-bold"
            title="Close"
            aria-label="Close video"
          >
            ×
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="relative flex-1 bg-black">
          <iframe
            title={title}
            src={src}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-none"
          />
          {/* Dedicated resize grip for desktop and touch */}
          <div
            onMouseDown={onGripMouseDown}
            onTouchStart={onGripTouchStart}
            title="Drag to resize"
            className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize flex items-end justify-end p-1.5 touch-none"
          >
            <svg viewBox="0 0 10 10" className="w-4 h-4 opacity-70">
              <path
                d="M9 1L1 9M9 5L5 9M9 9L9 9"
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
