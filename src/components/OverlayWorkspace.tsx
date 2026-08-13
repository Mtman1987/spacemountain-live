import React, { useEffect, useState } from 'react';
import { resolveCanonicalSurface } from '../lib/canonical-surfaces';

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
  // Legacy Public-workspace props remain in the call contract until the old
  // builder state is removed from App.tsx. They must never control Personal.
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

type PersonalLaunchResponse = {
  tenant?: string;
  output?: 'personal';
  url?: string;
  canonicalUrl?: string;
};

const personalVisibilityEvent = 'spmt:personal-overlay-visibility';
const personalVisibilityKey = 'spacemountain:personal-overlay-visible';

function storedPersonalVisible() {
  if (typeof window === 'undefined') return true;
  try { return localStorage.getItem(personalVisibilityKey) !== '0'; } catch { return true; }
}

export default function OverlayWorkspace({
  editing,
  accentColor,
  onFinishEditing,
  onFrameLoad,
}: OverlayWorkspaceProps) {
  const [canonicalChanged, setCanonicalChanged] = useState(false);
  const [personalUrl, setPersonalUrl] = useState('');
  const [personalEditorUrl, setPersonalEditorUrl] = useState('');
  const [personalVisible, setPersonalVisible] = useState(storedPersonalVisible);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = 0;
    const load = async () => {
      try {
        const response = await fetch('/api/spmt/api/personal-overlay-launch', {
          credentials: 'include',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const data = await response.json() as PersonalLaunchResponse;
          if (!cancelled) setPersonalUrl(String(data?.url || ''));
          return;
        }
      } catch {
        // A missing/restoring SPMT connection leaves the layer transparent while retrying.
      }
      if (!cancelled) retryTimer = window.setTimeout(() => void load(), 3000);
    };
    void load();
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    if (!editing || personalEditorUrl) return;
    let cancelled = false;
    void resolveCanonicalSurface('overlays', { mode: 'full', output: 'personal' }).then((url) => {
      if (!cancelled) setPersonalEditorUrl(url);
    });
    return () => { cancelled = true; };
  }, [editing, personalEditorUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'spmt.surface.updated' && event.data?.surface === 'overlays') {
        setCanonicalChanged(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const setVisible = (visible: boolean) => {
      try { localStorage.setItem(personalVisibilityKey, visible ? '1' : '0'); } catch {}
      setPersonalVisible(visible);
    };
    const handleVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{ visible?: boolean }>;
      if (typeof customEvent.detail?.visible === 'boolean') setVisible(customEvent.detail.visible);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === personalVisibilityKey) setPersonalVisible(event.newValue !== '0');
    };
    window.addEventListener(personalVisibilityEvent, handleVisibility);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(personalVisibilityEvent, handleVisibility);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  if (editing) {
    return (
      <div className="fixed inset-0 z-[100000] bg-black/80 p-2 backdrop-blur-md sm:p-5" aria-label="Canonical SPMT Overlay Bay">
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-cyan-300/25 bg-zinc-950 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-sm font-black text-white">SPMT Overlay Bay</h2>
              <p className="mt-0.5 text-[10px] text-zinc-500">Editing Personal. The canonical registry decides which editor owns the scene.</p>
            </div>
            <div className="flex items-center gap-2">
              {canonicalChanged && <span className="text-[10px] font-bold text-emerald-300">Saved in SPMT</span>}
              {personalEditorUrl && <a href={personalEditorUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-zinc-300 no-underline">Pop out</a>}
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
          {personalEditorUrl ? (
            <iframe
              src={personalEditorUrl}
              title="Canonical Overlay Bay — Personal"
              className="min-h-0 flex-1 border-0 bg-black"
              allow="autoplay; microphone; camera; fullscreen; clipboard-write"
            />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-sm text-zinc-400">
              Resolving the canonical Overlay Bay from SPMT…
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!personalVisible || !personalUrl) return null;

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
