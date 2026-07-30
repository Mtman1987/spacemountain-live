import React, { useEffect, useRef } from 'react';

export type OverlayWidget = {
  id: string;
  title: string;
  kind: 'chat' | 'media' | 'avatar' | 'audio' | 'custom';
  url: string;
  visible: boolean;
  locked: boolean;
  interactive: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
};

type OverlayWorkspaceProps = {
  enabled: boolean;
  editing: boolean;
  widgets: OverlayWidget[];
  accentColor: string;
  onChange: (widgetId: string, patch: Partial<OverlayWidget>) => void;
  onFinishEditing: () => void;
  onFrameLoad?: (frame: HTMLIFrameElement | null) => void | Promise<void>;
};

type PointerOperation = {
  widgetId: string;
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  initial: OverlayWidget;
};

export default function OverlayWorkspace({ enabled, editing, widgets, accentColor, onChange, onFinishEditing, onFrameLoad }: OverlayWorkspaceProps) {
  const operation = useRef<PointerOperation | null>(null);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const active = operation.current;
      if (!active) return;
      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;
      if (active.mode === 'move') {
        onChange(active.widgetId, {
          x: Math.max(0, Math.min(100 - (active.initial.width / window.innerWidth) * 100, active.initial.x + (dx / window.innerWidth) * 100)),
          y: Math.max(0, Math.min(100 - (active.initial.height / window.innerHeight) * 100, active.initial.y + (dy / window.innerHeight) * 100)),
        });
      } else {
        onChange(active.widgetId, {
          width: Math.max(120, Math.min(window.innerWidth, active.initial.width + dx)),
          height: Math.max(72, Math.min(window.innerHeight, active.initial.height + dy)),
        });
      }
    };
    const handleUp = () => { operation.current = null; };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [onChange]);

  if (!enabled && !editing) return null;

  return (
    <div
      className={`fixed inset-0 z-[48] overflow-hidden ${editing ? 'pointer-events-auto bg-cyan-950/[0.08]' : 'pointer-events-none'}`}
      aria-label="Personal overlay workspace"
    >
      {editing && (
        <div className="pointer-events-auto absolute left-1/2 top-24 z-[2] flex -translate-x-1/2 items-center gap-3 rounded-full border border-cyan-300/30 bg-zinc-950/95 px-4 py-2 text-xs font-bold text-cyan-100 shadow-2xl">
          Drag widgets by their title bar and resize from the lower-right corner.
          <button type="button" onClick={onFinishEditing} className="rounded-full bg-cyan-300 px-3 py-1 text-zinc-950">Done</button>
        </div>
      )}
      {widgets.filter((widget) => widget.visible).map((widget) => (
        <section
          key={widget.id}
          className={`absolute overflow-hidden rounded-xl ${editing ? 'border border-dashed bg-black/25 shadow-2xl' : ''}`}
          style={{
            left: `${widget.x}%`,
            top: `${widget.y}%`,
            width: widget.width,
            height: widget.height,
            opacity: widget.opacity,
            borderColor: editing ? `${accentColor}aa` : 'transparent',
            pointerEvents: editing || widget.interactive ? 'auto' : 'none',
          }}
        >
          {editing && (
            <div
              className={`absolute inset-x-0 top-0 z-[2] flex h-7 items-center justify-between bg-zinc-950/90 px-2 text-[10px] font-black text-white ${widget.locked ? 'cursor-not-allowed' : 'cursor-move'}`}
              onPointerDown={(event) => {
                if (widget.locked) return;
                event.preventDefault();
                operation.current = { widgetId: widget.id, mode: 'move', startX: event.clientX, startY: event.clientY, initial: { ...widget } };
              }}
            >
              <span className="truncate">{widget.title}</span>
              <span className="uppercase text-zinc-500">{widget.kind}</span>
            </div>
          )}
          <iframe
            key={`${widget.id}:${widget.url}`}
            src={widget.url}
            title={widget.title}
            data-embed-slot-frame={`personal-overlay-${widget.id}`}
            onLoad={(event) => void onFrameLoad?.(event.currentTarget)}
            className={`h-full w-full border-0 bg-transparent ${editing ? 'pointer-events-none pt-7' : ''}`}
            allow="autoplay; microphone; camera; fullscreen; clipboard-write"
          />
          {editing && !widget.locked && (
            <button
              type="button"
              aria-label={`Resize ${widget.title}`}
              className="absolute bottom-0 right-0 z-[3] h-6 w-6 cursor-se-resize border-l border-t border-cyan-300/50 bg-zinc-950/90"
              onPointerDown={(event) => {
                event.preventDefault();
                operation.current = { widgetId: widget.id, mode: 'resize', startX: event.clientX, startY: event.clientY, initial: { ...widget } };
              }}
            />
          )}
        </section>
      ))}
    </div>
  );
}
