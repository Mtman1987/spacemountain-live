import { useEffect, useMemo, useState } from 'react';
import type { EmbedSlot } from '../types';
import { buildAppSurfaceUrl } from '../lib/app-surfaces';
import OverlayWorkspace, { type OverlayWidget } from './OverlayWorkspace';

type AuthFrameHandler = (frame: HTMLIFrameElement | null) => void | Promise<void>;

declare global {
  interface Window {
    companionOverlay?: {
      getInteractionState: () => Promise<{ active: boolean; hotkey: string }>;
      finishInteraction: () => Promise<{ active: boolean; hotkey: string }>;
      onInteractionChange: (handler: (state: { active: boolean; hotkey: string }) => void) => (() => void) | void;
    };
  }
}

export function CompanionWorkspaceSurface({
  identityPresent,
  streamWeaverUrl,
  onFrameLoad,
}: {
  identityPresent: boolean;
  streamWeaverUrl: string;
  onFrameLoad: AuthFrameHandler;
}) {
  if (!identityPresent) {
    const returnPath = '/?companionWorkspace=streamweaver';
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050814] p-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-cyan-300/20 bg-black/55 p-7 text-center shadow-2xl backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">SpaceMountain Companion</p>
          <h1 className="mt-3 text-2xl font-black">Connect your StreamWeaver workspace</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Sign in once inside Companion. This window keeps its own encrypted browser session and passes StreamWeaver a short-lived, single-use embed code.
          </p>
          <a
            href={`/auth/login?return=${encodeURIComponent(returnPath)}`}
            className="mt-6 inline-flex rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-zinc-950 no-underline"
          >
            Sign in with SPMT
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#050814]">
      <iframe
        src={streamWeaverUrl}
        title="StreamWeaver Companion workspace"
        data-embed-slot-frame="companion-streamweaver"
        onLoad={(event) => void onFrameLoad(event.currentTarget)}
        className="h-full w-full border-0 bg-[#050814]"
        allow="autoplay; microphone; camera; fullscreen; clipboard-write"
      />
    </main>
  );
}

export function CompanionOverlaySurface({
  identityPresent,
  overlayEnabled,
  widgets,
  slots,
  tenantId,
  accentColor,
  onWidgetChange,
  onSlotChange,
  onOverlayEnabledChange,
  onFrameLoad,
}: {
  identityPresent: boolean;
  overlayEnabled: boolean;
  widgets: OverlayWidget[];
  slots: EmbedSlot[];
  tenantId?: string | null;
  accentColor: string;
  onWidgetChange: (widgetId: string, patch: Partial<OverlayWidget>) => void;
  onSlotChange: (slotId: number, patch: Partial<EmbedSlot>) => void;
  onOverlayEnabledChange: (enabled: boolean) => void;
  onFrameLoad: AuthFrameHandler;
}) {
  const [interaction, setInteraction] = useState({ active: false, hotkey: 'CommandOrControl+Shift+O' });
  const unifiedWidgets = useMemo(() => widgets.map((widget) => {
    const match = /^dock-slot-([123])$/.exec(widget.id);
    if (!match) return widget;
    const slot = slots.find((item) => item.id === Number(match[1]));
    if (!slot) return widget;
    const surface = buildAppSurfaceUrl(slot.url, slot.title, {
      tenantId,
      embed: true,
      scopes: ['identity:read', 'overlay:control', 'workspace:read'],
    });
    return { ...widget, title: slot.title, url: surface.valid ? surface.url : 'about:blank' };
  }), [slots, tenantId, widgets]);

  const handleWidgetChange = (widgetId: string, patch: Partial<OverlayWidget>) => {
    onWidgetChange(widgetId, patch);
    const match = /^dock-slot-([123])$/.exec(widgetId);
    if (!match) return;
    const slotId = Number(match[1]);
    onSlotChange(slotId, {
      ...(typeof patch.title === 'string' ? { title: patch.title } : {}),
      ...(typeof patch.url === 'string' ? { url: patch.url } : {}),
      ...(typeof patch.visible === 'boolean' ? { collapsed: !patch.visible } : {}),
    });
  };

  const finishInteraction = () => {
    const request = window.companionOverlay?.finishInteraction();
    if (request) void request.catch(() => setInteraction((state) => ({ ...state, active: false })));
    else setInteraction((state) => ({ ...state, active: false }));
  };

  useEffect(() => {
    let cancelled = false;
    const api = window.companionOverlay;
    if (!api) return;
    void api.getInteractionState().then((state) => {
      if (!cancelled) setInteraction(state);
    }).catch(() => {});
    const unsubscribe = api.onInteractionChange((state) => {
      if (!cancelled) setInteraction(state);
    });
    return () => {
      cancelled = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  return (
    <main className={`relative h-screen w-screen overflow-hidden bg-transparent text-white ${interaction.active ? 'ring-4 ring-inset ring-cyan-300/80' : ''}`}>
      {!identityPresent && (
        <div className="pointer-events-none absolute left-4 top-4 z-[70] rounded-full border border-cyan-300/25 bg-zinc-950/85 px-4 py-2 text-xs font-bold text-cyan-100">
          Open StreamWeaver from Companion to sign in and load this workspace.
        </div>
      )}

      {identityPresent && (
        <>
          <OverlayWorkspace
            enabled={overlayEnabled}
            editing={interaction.active}
            widgets={unifiedWidgets}
            accentColor={accentColor}
            onChange={handleWidgetChange}
            onFinishEditing={finishInteraction}
            onSetEditing={(active) => active ? setInteraction((state) => ({ ...state, active: true })) : finishInteraction()}
            onSetEnabled={onOverlayEnabledChange}
            onFrameLoad={onFrameLoad}
          />
        </>
      )}

      {interaction.active && (
        <div className="pointer-events-auto absolute left-1/2 top-4 z-[90] flex -translate-x-1/2 items-center gap-3 rounded-full border border-cyan-200/50 bg-zinc-950/95 px-4 py-2 text-xs font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.35)]">
          Overlay interaction active · {interaction.hotkey}
          <button
            type="button"
            onClick={finishInteraction}
            className="rounded-full bg-cyan-300 px-3 py-1 text-zinc-950"
          >
            Done
          </button>
        </div>
      )}
    </main>
  );
}
