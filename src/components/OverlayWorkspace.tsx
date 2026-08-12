import React, { useEffect, useState } from 'react';

export type OverlayInteractionMode = 'click-through' | 'interactive' | 'hybrid';

// Retained as a compatibility type while older workspace-profile data is phased
// out. SpaceMountain no longer renders these records itself; SPMT Overlay Bay is
// the only scene owner and the Personal tenant URL is the only runtime source.
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

type TenantSceneResponse = {
  tenant?: string;
  urls?: {
    public?: string;
    personal?: string;
  };
};

const personalEditorUrl = 'https://spmt.live/embed/overlays?mode=full&app=spacemountain-live&output=personal';
const personalVisibilityEvent = 'spmt:personal-overlay-visibility';

export default function OverlayWorkspace({
  enabled,
  editing,
  accentColor,
  onFinishEditing,
  onSetEnabled,
  onFrameLoad,
}: OverlayWorkspaceProps) {
  const [canonicalChanged, setCanonicalChanged] = useState(false);
  const [personalUrl, setPersonalUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/spmt/api/tenant-scene?output=personal', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        const data = await response.json() as TenantSceneResponse;
        if (!cancelled) setPersonalUrl(String(data?.urls?.personal || ''));
      } catch {
        // A missing session leaves the layer transparent instead of replacing the
        // application with an auth/error surface.
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

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
    const handleVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{ visible?: boolean }>;
      if (typeof customEvent.detail?.visible === 'boolean') {
        onSetEnabled?.(customEvent.detail.visible);
      }
    };
    window.addEventListener(personalVisibilityEvent, handleVisibility);
    return () => window.removeEventListener(personalVisibilityEvent, handleVisibility);
  }, [onSetEnabled]);

  if (editing) {
    return (
      <div className="fixed inset-0 z-[100000] bg-black/80 p-2 backdrop-blur-md sm:p-5" aria-label="Canonical SPMT Overlay Bay">
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-cyan-300/25 bg-zinc-950 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-sm font-black text-white">SPMT Overlay Bay</h2>
              <p className="mt-0.5 text-[10px] text-zinc-500">Editing Personal. SPMT owns the scene; SpaceMountain consumes the saved Personal URL.</p>
            </div>
            <div className="flex items-center gap-2">
              {canonicalChanged && <span className="text-[10px] font-bold text-emerald-300">Saved in SPMT</span>}
              <a href={personalEditorUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-zinc-300 no-underline">Pop out</a>
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
            src={personalEditorUrl}
            title="SPMT Overlay Bay — Personal"
            className="min-h-0 flex-1 border-0 bg-black"
            allow="autoplay; microphone; camera; fullscreen; clipboard-write"
          />
        </div>
      </div>
    );
  }

  if (!enabled || !personalUrl) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[48] overflow-hidden"
      aria-label="Canonical SPMT Personal overlay consumer"
      data-canonical-personal-overlay="true"
    >
      <iframe
        src={personalUrl}
        title="SPMT Personal overlay"
        data-embed-slot-frame="personal-overlay-canonical"
        onLoad={(event) => void onFrameLoad?.(event.currentTarget)}
        className="absolute inset-0 h-full w-full border-0 bg-transparent"
        style={{ background: 'transparent', pointerEvents: 'none' }}
        allow="autoplay; microphone; camera; fullscreen; clipboard-write"
      />
      <span className="sr-only" style={{ color: accentColor }}>Personal overlay active</span>
    </div>
  );
}
