import React, { useEffect, useMemo, useState } from 'react';

export type OverlayInteractionMode = 'click-through' | 'interactive' | 'hybrid';

export type OverlayWidget = {
  id: string;
  title: string;
  kind: 'chat' | 'media' | 'avatar' | 'audio' | 'custom' | 'embed';
  url: string;
  visible: boolean;
  locked: boolean;
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
  onFinishEditing,
  onSetEnabled,
  onFrameLoad,
}: OverlayWorkspaceProps) {
  const [canonicalChanged, setCanonicalChanged] = useState(false);
  const [revealedWidgetId, setRevealedWidgetId] = useState<string | null>(null);
  const [hybridActive, setHybridActive] = useState<Record<string, boolean>>({});
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const orderedWidgets = useMemo(() => widgets
    .map((widget, index) => ({ widget, layer: widgetLayer(widget, index + 1) }))
    .sort((a, b) => a.layer - b.layer), [widgets]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://spmt.live') return;
      if (event.data?.type === 'spmt.surface.updated' && event.data?.surface === 'overlays') {
        setCanonicalChanged(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

  if (editing) {
    return (
      <div className="fixed inset-0 z-[100000] bg-black/80 p-2 backdrop-blur-md sm:p-5" aria-label="Canonical SPMT Overlay Bay">
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-cyan-300/25 bg-zinc-950 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-sm font-black text-white">SPMT Overlay Bay</h2>
              <p className="mt-0.5 text-[10px] text-zinc-500">SPMT owns the overlay workspace. SpaceMountain renders the saved result.</p>
            </div>
            <div className="flex items-center gap-2">
              {canonicalChanged && <span className="text-[10px] font-bold text-emerald-300">Saved in SPMT</span>}
              <a href="https://spmt.live/embed/overlays?mode=full&app=spacemountain-live" target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-zinc-300 no-underline">Pop out</a>
              <button
                type="button"
                onClick={() => {
                  if (canonicalChanged) window.location.reload();
                  else onFinishEditing();
                }}
                className="rounded-lg bg-cyan-300 px-3 py-2 text-[10px] font-black text-zinc-950"
              >
                {canonicalChanged ? 'Reload workspace' : 'Close'}
              </button>
            </div>
          </div>
          <iframe
            src="https://spmt.live/embed/overlays?mode=full&app=spacemountain-live"
            title="SPMT Overlay Bay"
            className="min-h-0 flex-1 border-0 bg-black"
            allow="autoplay; microphone; camera; fullscreen; clipboard-write"
          />
        </div>
      </div>
    );
  }

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[48] overflow-hidden" aria-label="SPMT overlay workspace consumer">
      {orderedWidgets.map(({ widget, layer }) => {
        const hidden = !widget.visible;
        const hoverReveal = Boolean(widget.hoverReveal);
        if (hidden && !hoverReveal) return null;
        const revealed = revealedWidgetId === widget.id;
        const mode = interactionMode(widget);
        const hybridIsActive = Boolean(hybridActive[widget.id]);
        const depth = widget.parallaxEnabled ? Math.max(0, Math.min(40, widget.parallaxDepth ?? 8)) : 0;
        const acceptsPointer = (hidden && hoverReveal) || mode === 'interactive' || (mode === 'hybrid' && hybridIsActive);
        return (
          <section
            key={widget.id}
            className="absolute overflow-hidden rounded-xl transition-opacity duration-150"
            style={{
              left: `${widget.x}%`,
              top: `${widget.y}%`,
              width: `min(${widget.width}px, 100vw)`,
              height: `min(${widget.height}px, 100vh)`,
              opacity: hidden && !revealed ? 0 : widget.opacity,
              pointerEvents: acceptsPointer ? 'auto' : 'none',
              zIndex: layer,
              transform: `translate3d(${parallax.x * depth}px, ${parallax.y * depth}px, 0) rotate(${widget.rotation ?? 0}deg)`,
              transformOrigin: 'center',
            }}
            onPointerEnter={() => { if (hidden && hoverReveal) setRevealedWidgetId(widget.id); }}
            onPointerLeave={() => { if (hidden && hoverReveal) setRevealedWidgetId((value) => value === widget.id ? null : value); }}
          >
            <iframe
              key={`${widget.id}:${widget.url}`}
              src={widget.url}
              title={widget.title}
              data-embed-slot-frame={`personal-overlay-${widget.id}`}
              onLoad={(event) => void onFrameLoad?.(event.currentTarget)}
              className="h-full w-full border-0 bg-transparent"
              style={{ pointerEvents: mode === 'click-through' || (mode === 'hybrid' && !hybridIsActive) ? 'none' : 'auto' }}
              allow="autoplay; microphone; camera; fullscreen; clipboard-write"
            />
            {mode === 'hybrid' && !hybridIsActive && (
              <button
                type="button"
                className="absolute inset-0 z-[3] cursor-pointer bg-transparent text-transparent"
                aria-label={`Activate interaction for ${widget.title}`}
                onClick={() => setHybridActive((value) => ({ ...value, [widget.id]: true }))}
              >
                Activate {widget.title}
              </button>
            )}
            {mode === 'hybrid' && hybridIsActive && (
              <button
                type="button"
                className="absolute right-1 top-1 z-[4] rounded-full border border-cyan-200/35 bg-zinc-950/90 px-2 py-1 text-[8px] font-black text-cyan-100"
                onDoubleClick={() => setHybridActive((value) => ({ ...value, [widget.id]: false }))}
                title="Double-click to return this widget to click-through mode"
              >
                Double-click: pass through
              </button>
            )}
          </section>
        );
      })}

      {onSetEnabled && (
        <button
          type="button"
          className="pointer-events-auto fixed bottom-20 right-3 z-[60] hidden rounded-full border border-white/10 bg-zinc-950/85 px-3 py-1.5 text-[9px] font-bold text-zinc-400 hover:text-white sm:block"
          onClick={() => onSetEnabled(false)}
          style={{ borderColor: `${accentColor}25` }}
        >
          Hide overlays
        </button>
      )}
    </div>
  );
}
