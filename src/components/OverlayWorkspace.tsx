import React, { useEffect, useMemo, useRef, useState } from 'react';

export type OverlayInteractionMode = 'click-through' | 'interactive' | 'hybrid';

export type OverlayWidget = {
  id: string;
  title: string;
  kind: 'chat' | 'media' | 'avatar' | 'audio' | 'custom' | 'embed';
  url: string;
  visible: boolean;
  locked: boolean;
  /** Legacy field retained so older saved layouts continue to load. */
  interactive: boolean;
  interactionMode?: OverlayInteractionMode;
  hoverReveal?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation?: number;
  zIndex?: number;
  parallaxEnabled?: boolean;
  parallaxDepth?: number;
  groupId?: string | null;
};

type OverlayWorkspaceProps = {
  enabled: boolean;
  editing: boolean;
  widgets: OverlayWidget[];
  accentColor: string;
  onChange: (widgetId: string, patch: Partial<OverlayWidget>) => void;
  onFinishEditing: () => void;
  onSetEditing?: (editing: boolean) => void;
  onSetEnabled?: (enabled: boolean) => void;
  onFrameLoad?: (frame: HTMLIFrameElement | null) => void | Promise<void>;
};

type PointerOperation = {
  widgetId: string;
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  initial: OverlayWidget;
};

function interactionMode(widget: OverlayWidget): OverlayInteractionMode {
  return widget.interactionMode || (widget.interactive ? 'interactive' : 'click-through');
}

function widgetLayer(widget: OverlayWidget, fallback: number) {
  return Number.isFinite(widget.zIndex) ? Number(widget.zIndex) : fallback;
}

export default function OverlayWorkspace({
  enabled,
  editing,
  widgets,
  accentColor,
  onChange,
  onFinishEditing,
  onSetEditing,
  onSetEnabled,
  onFrameLoad,
}: OverlayWorkspaceProps) {
  const operation = useRef<PointerOperation | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [emergencyHidden, setEmergencyHidden] = useState(false);
  const [revealedWidgetId, setRevealedWidgetId] = useState<string | null>(null);
  const [hybridActive, setHybridActive] = useState<Record<string, boolean>>({});
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const orderedWidgets = useMemo(() => widgets
    .map((widget, index) => ({ widget, index, layer: widgetLayer(widget, index + 1) }))
    .sort((a, b) => a.layer - b.layer), [widgets]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const active = operation.current;
      if (!active) return;
      event.preventDefault();
      const viewportWidth = Math.max(1, window.innerWidth);
      const viewportHeight = Math.max(1, window.innerHeight);
      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;
      if (active.mode === 'move') {
        onChange(active.widgetId, {
          x: Math.max(0, Math.min(100 - (active.initial.width / viewportWidth) * 100, active.initial.x + (dx / viewportWidth) * 100)),
          y: Math.max(0, Math.min(100 - (active.initial.height / viewportHeight) * 100, active.initial.y + (dy / viewportHeight) * 100)),
        });
      } else {
        onChange(active.widgetId, {
          width: Math.max(120, Math.min(viewportWidth, active.initial.width + dx)),
          height: Math.max(72, Math.min(viewportHeight, active.initial.height + dy)),
        });
      }
    };
    const handleUp = () => { operation.current = null; };
    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [onChange]);

  useEffect(() => {
    if (!widgets.some((widget) => widget.parallaxEnabled)) {
      setParallax({ x: 0, y: 0 });
      return;
    }
    const handlePointerMove = (event: PointerEvent) => {
      setParallax({
        x: (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2,
        y: (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2,
      });
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [widgets]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || !event.shiftKey || event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === 'o' && onSetEnabled) {
        event.preventDefault();
        onSetEnabled(!enabled);
      } else if (key === 'e' && onSetEditing) {
        event.preventDefault();
        onSetEditing(!editing);
      } else if (key === 'l') {
        event.preventDefault();
        setLayersOpen((value) => !value);
      } else if (key === 'h') {
        event.preventDefault();
        setEmergencyHidden((value) => !value);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editing, enabled, onSetEditing, onSetEnabled]);

  const moveLayer = (widgetId: string, direction: -1 | 1) => {
    const ascending = [...orderedWidgets];
    const currentIndex = ascending.findIndex((item) => item.widget.id === widgetId);
    const swapIndex = currentIndex + direction;
    if (currentIndex < 0 || swapIndex < 0 || swapIndex >= ascending.length) return;
    const current = ascending[currentIndex];
    const swap = ascending[swapIndex];
    onChange(current.widget.id, { zIndex: swap.layer });
    onChange(swap.widget.id, { zIndex: current.layer });
  };

  if (!enabled && !editing && !layersOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[48] overflow-hidden ${editing ? 'pointer-events-auto bg-cyan-950/[0.08]' : 'pointer-events-none'}`}
      aria-label="Personal overlay workspace"
      data-overlay-emergency-hidden={emergencyHidden ? 'true' : 'false'}
    >
      {(editing || layersOpen) && (
        <div className="pointer-events-auto absolute left-2 right-2 top-2 z-[100000] flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-zinc-950/95 px-3 py-2 text-[10px] font-bold text-cyan-100 shadow-2xl sm:left-1/2 sm:right-auto sm:top-20 sm:-translate-x-1/2 sm:rounded-full sm:text-xs">
          <span className="hidden sm:inline">Drag the title bar · resize from the corner</span>
          <button type="button" onClick={() => setLayersOpen((value) => !value)} className="rounded-full border border-cyan-300/30 px-3 py-1">
            {layersOpen ? 'Close layers' : 'Layers'}
          </button>
          <button type="button" onClick={() => setEmergencyHidden((value) => !value)} className="rounded-full border border-amber-300/30 px-3 py-1 text-amber-100">
            {emergencyHidden ? 'Restore all' : 'Hide all'}
          </button>
          {editing && <button type="button" onClick={onFinishEditing} className="rounded-full bg-cyan-300 px-3 py-1 text-zinc-950">Done</button>}
        </div>
      )}

      {layersOpen && (
        <aside className="pointer-events-auto absolute bottom-3 right-3 top-16 z-[100001] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-cyan-300/25 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl sm:top-32" aria-label="Overlay layer list">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xs font-black text-white">Overlay layers</h2>
              <p className="mt-1 text-[9px] text-zinc-500">Top item draws in front. Hidden hover items remain selectable here on touch screens.</p>
            </div>
            <button type="button" onClick={() => setLayersOpen(false)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300">Close</button>
          </div>
          <div className="flex flex-col gap-2">
            {[...orderedWidgets].reverse().map(({ widget }, displayIndex, displayItems) => {
              const mode = interactionMode(widget);
              return (
                <div key={widget.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-2">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[10px] font-black text-white">{widget.title}</span>
                    <button type="button" aria-label={`${widget.visible ? 'Hide' : 'Show'} ${widget.title}`} onClick={() => onChange(widget.id, { visible: !widget.visible })} className={widget.visible ? 'text-emerald-300' : 'text-zinc-500'}>{widget.visible ? '●' : '○'}</button>
                    <button type="button" aria-label={`${widget.locked ? 'Unlock' : 'Lock'} ${widget.title}`} onClick={() => onChange(widget.id, { locked: !widget.locked })} className={widget.locked ? 'text-amber-300' : 'text-zinc-500'}>{widget.locked ? 'Locked' : 'Lock'}</button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <button type="button" disabled={displayIndex === 0} onClick={() => moveLayer(widget.id, 1)} className="rounded border border-white/10 px-2 py-1 text-[9px] text-zinc-300 disabled:opacity-30">Up</button>
                    <button type="button" disabled={displayIndex === displayItems.length - 1} onClick={() => moveLayer(widget.id, -1)} className="rounded border border-white/10 px-2 py-1 text-[9px] text-zinc-300 disabled:opacity-30">Down</button>
                    <button
                      type="button"
                      onClick={() => {
                        const next: OverlayInteractionMode = mode === 'click-through' ? 'interactive' : mode === 'interactive' ? 'hybrid' : 'click-through';
                        onChange(widget.id, { interactionMode: next, interactive: next !== 'click-through' });
                      }}
                      className="rounded border border-cyan-300/20 px-2 py-1 text-[9px] text-cyan-100"
                    >
                      {mode}
                    </button>
                    <span className="ml-auto text-[8px] uppercase tracking-wider text-zinc-600">z {widgetLayer(widget, 1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {!emergencyHidden && orderedWidgets.map(({ widget, layer }) => {
        const hidden = !widget.visible;
        const hoverReveal = Boolean(widget.hoverReveal);
        if (hidden && !hoverReveal && !editing) return null;
        const revealed = revealedWidgetId === widget.id;
        const mode = interactionMode(widget);
        const hybridIsActive = Boolean(hybridActive[widget.id]);
        const depth = widget.parallaxEnabled ? Math.max(0, Math.min(40, widget.parallaxDepth ?? 8)) : 0;
        const acceptsPointer = editing || (hidden && hoverReveal) || mode === 'interactive' || (mode === 'hybrid' && hybridIsActive);
        return (
          <section
            key={widget.id}
            className={`absolute overflow-hidden rounded-xl transition-opacity duration-150 ${editing ? 'border border-dashed bg-black/25 shadow-2xl' : ''}`}
            style={{
              left: `${widget.x}%`,
              top: `${widget.y}%`,
              width: `min(${widget.width}px, 100vw)`,
              height: `min(${widget.height}px, 100vh)`,
              opacity: hidden && !editing && !revealed ? 0 : widget.opacity,
              borderColor: editing ? `${accentColor}aa` : 'transparent',
              pointerEvents: acceptsPointer ? 'auto' : 'none',
              zIndex: layer,
              transform: `translate3d(${parallax.x * depth}px, ${parallax.y * depth}px, 0) rotate(${widget.rotation ?? 0}deg)`,
              transformOrigin: 'center',
            }}
            onPointerEnter={() => { if (hidden && hoverReveal) setRevealedWidgetId(widget.id); }}
            onPointerLeave={() => { if (hidden && hoverReveal) setRevealedWidgetId((value) => value === widget.id ? null : value); }}
          >
            {editing && (
              <div
                className={`absolute inset-x-0 top-0 z-[4] flex h-10 touch-none items-center justify-between bg-zinc-950/90 px-3 text-[10px] font-black text-white sm:h-8 ${widget.locked ? 'cursor-not-allowed' : 'cursor-move'}`}
                onPointerDown={(event) => {
                  if (widget.locked) return;
                  event.preventDefault();
                  event.currentTarget.setPointerCapture?.(event.pointerId);
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
              className={`h-full w-full border-0 bg-transparent ${editing ? 'pointer-events-none pt-10 sm:pt-8' : ''}`}
              style={{ pointerEvents: editing || mode === 'click-through' || (mode === 'hybrid' && !hybridIsActive) ? 'none' : 'auto' }}
              allow="autoplay; microphone; camera; fullscreen; clipboard-write"
            />
            {!editing && mode === 'hybrid' && !hybridIsActive && (
              <button
                type="button"
                className="absolute inset-0 z-[3] cursor-pointer bg-transparent text-transparent"
                aria-label={`Activate interaction for ${widget.title}`}
                onClick={() => setHybridActive((value) => ({ ...value, [widget.id]: true }))}
                onDoubleClick={() => setHybridActive((value) => ({ ...value, [widget.id]: false }))}
              >
                Activate {widget.title}
              </button>
            )}
            {!editing && mode === 'hybrid' && hybridIsActive && (
              <button
                type="button"
                className="absolute right-1 top-1 z-[4] rounded-full border border-cyan-200/35 bg-zinc-950/90 px-2 py-1 text-[8px] font-black text-cyan-100"
                onDoubleClick={() => setHybridActive((value) => ({ ...value, [widget.id]: false }))}
                title="Double-click to return this widget to click-through mode"
              >
                Double-click: pass through
              </button>
            )}
            {editing && !widget.locked && (
              <button
                type="button"
                aria-label={`Resize ${widget.title}`}
                className="absolute bottom-0 right-0 z-[5] h-10 w-10 touch-none cursor-se-resize border-l border-t border-cyan-300/50 bg-zinc-950/90 sm:h-7 sm:w-7"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  operation.current = { widgetId: widget.id, mode: 'resize', startX: event.clientX, startY: event.clientY, initial: { ...widget } };
                }}
              />
            )}
          </section>
        );
      })}

      <div className="sr-only" aria-live="polite">
        Overlay shortcuts: Alt Shift O toggles the overlay, Alt Shift E toggles edit mode, Alt Shift L opens layers, Alt Shift H temporarily hides or restores all widgets.
      </div>
    </div>
  );
}
