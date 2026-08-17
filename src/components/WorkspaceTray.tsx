import { ExternalLink, Layout, Maximize2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { EmbedSlot } from '../types';
import { resolveCanonicalSurface } from '../lib/canonical-surfaces';

type WorkspaceTrayProps = {
  open: boolean;
  activeSlotId: number;
  slots: EmbedSlot[];
  accentColor: string;
  resolveUrl: (slot: EmbedSlot) => string;
  onOpenChange: (open: boolean) => void;
  onSelectSlot: (slotId: number) => void;
  onSlotChange: (slotId: number, patch: Partial<EmbedSlot>) => void;
  onFrameLoad: (frame: HTMLIFrameElement | null) => void | Promise<void>;
};

type TenantUrls = { public: string; personal: string };
type WorkspaceAppDetail = { appId?: string; title?: string; url?: string; popoutUrl?: string };

const personalVisibilityKey = 'spacemountain:personal-overlay-visible';
const personalVisibilityEvent = 'spmt:personal-overlay-visibility';

function storedVisible(key: string) {
  return localStorage.getItem(key) !== '0';
}

export default function WorkspaceTray({
  open,
  activeSlotId,
  slots,
  accentColor,
  resolveUrl,
  onOpenChange,
  onSelectSlot,
  onSlotChange,
  onFrameLoad,
}: WorkspaceTrayProps) {
  const [crewDeskOpen, setCrewDeskOpen] = useState(false);
  const [crewDeskUrl, setCrewDeskUrl] = useState('');
  const [personalOverlayVisible, setPersonalOverlayVisible] = useState(() => storedVisible(personalVisibilityKey));
  const [tenantUrls, setTenantUrls] = useState<TenantUrls | null>(null);
  const selectedSlot = slots.find((slot) => slot.id === activeSlotId);
  const activeSlot = (selectedSlot && !selectedSlot.collapsed)
    ? selectedSlot
    : slots.find((slot) => !slot.collapsed) || slots[0];

  useEffect(() => {
    const handlePersonalVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{ visible?: boolean }>;
      if (typeof customEvent.detail?.visible === 'boolean') setPersonalOverlayVisible(customEvent.detail.visible);
    };
    window.addEventListener(personalVisibilityEvent, handlePersonalVisibility);
    return () => window.removeEventListener(personalVisibilityEvent, handlePersonalVisibility);
  }, []);

  useEffect(() => {
    const handleToggle = (event: Event) => {
      event.preventDefault();
      if (open) {
        onOpenChange(false);
      } else {
        setCrewDeskOpen(true);
        onOpenChange(true);
      }
    };

    const handleOpenApp = (event: Event) => {
      const customEvent = event as CustomEvent<WorkspaceAppDetail>;
      const url = String(customEvent.detail?.url || '').trim();
      if (!url) return;
      customEvent.preventDefault();
      const title = String(customEvent.detail?.title || customEvent.detail?.appId || 'Workspace app').trim();
      const appId = String(customEvent.detail?.appId || '').trim().toLowerCase();
      const existing = slots.find((slot) => {
        const slotUrl = String(slot.url || '').toLowerCase();
        return slotUrl === url.toLowerCase() || (appId && slotUrl.includes(appId.replace('-live', '')));
      });
      const target = existing || slots.find((slot) => slot.collapsed || !String(slot.url || '').trim()) || slots.find((slot) => slot.id === activeSlotId) || slots[0];
      if (!target) return;
      setCrewDeskOpen(false);
      onSlotChange(target.id, { title, url, kind: 'app', collapsed: false });
      onSelectSlot(target.id);
      onOpenChange(true);
    };

    window.addEventListener('spmt:workspace-toggle', handleToggle);
    window.addEventListener('spmt:workspace-open-app', handleOpenApp);
    return () => {
      window.removeEventListener('spmt:workspace-toggle', handleToggle);
      window.removeEventListener('spmt:workspace-open-app', handleOpenApp);
    };
  }, [activeSlotId, onOpenChange, onSelectSlot, onSlotChange, open, slots]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('spmt:workspace-state', { detail: { open } }));
  }, [open]);

  useEffect(() => {
    if (!crewDeskOpen || crewDeskUrl) return;
    let cancelled = false;
    void resolveCanonicalSurface('worktray', { mode: 'dock' }).then((url) => {
      if (!cancelled) setCrewDeskUrl(url);
    });
    return () => { cancelled = true; };
  }, [crewDeskOpen, crewDeskUrl]);

  useEffect(() => {
    if (!open || tenantUrls) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [tenantResponse, personalResponse] = await Promise.all([
          fetch('/api/spmt/api/tenant-scene?output=public', { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } }),
          fetch('/api/spmt/api/personal-overlay-launch', { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } }),
        ]);
        if (!tenantResponse.ok || !personalResponse.ok) return;
        const [tenantData, personalData] = await Promise.all([tenantResponse.json(), personalResponse.json()]);
        const publicUrl = String(tenantData?.urls?.public || '');
        const personalUrl = String(personalData?.url || '');
        if (!cancelled && publicUrl && personalUrl) setTenantUrls({ public: publicUrl, personal: personalUrl });
      } catch {}
    };
    void load();
    return () => { cancelled = true; };
  }, [open, tenantUrls]);

  const openCrewDesk = () => { setCrewDeskOpen(true); onOpenChange(true); };
  const selectSlot = (slot: EmbedSlot) => {
    setCrewDeskOpen(false);
    onSelectSlot(slot.id);
    if (slot.collapsed) onSlotChange(slot.id, { collapsed: false });
    onOpenChange(true);
  };
  const hideActiveSlot = () => {
    if (!activeSlot) return;
    onSlotChange(activeSlot.id, { collapsed: true });
    const nextSlot = slots.find((slot) => slot.id !== activeSlot.id && !slot.collapsed);
    if (nextSlot) onSelectSlot(nextSlot.id); else onOpenChange(false);
  };
  const togglePersonalOverlay = () => {
    const next = !personalOverlayVisible;
    localStorage.setItem(personalVisibilityKey, next ? '1' : '0');
    setPersonalOverlayVisible(next);
    window.dispatchEvent(new CustomEvent(personalVisibilityEvent, { detail: { visible: next } }));
  };
  const copyUrl = async (url: string) => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); } catch {
      const input = document.createElement('textarea'); input.value = url; input.style.position = 'fixed'; input.style.opacity = '0';
      document.body.append(input); input.select(); try { document.execCommand('copy'); } finally { input.remove(); }
    }
  };

  if (!open) return null;

  const panelTitle = crewDeskOpen ? 'Workspace' : activeSlot?.title;
  const panelKind = crewDeskOpen ? 'Canonical shared worktray' : activeSlot?.kind;
  const popoutUrl = crewDeskOpen ? crewDeskUrl : (activeSlot ? resolveUrl(activeSlot) : '#');

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-[80] overflow-hidden rounded-2xl border bg-zinc-950/90 shadow-[0_-16px_44px_rgba(0,0,0,0.48)] backdrop-blur-2xl transition-all md:left-1/2 md:max-w-5xl md:-translate-x-1/2"
      style={{ borderColor: `${accentColor}35` }}
      aria-label="Docked workspace"
      data-workspace-footer="true"
    >
      <div className="flex min-h-14 items-center gap-2 px-2.5 py-2">
        <button type="button" onClick={openCrewDesk} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-white" aria-expanded={crewDeskOpen} aria-label="Open Workspace">
          <Layout size={15} style={{ color: accentColor }} /><span className="hidden sm:inline">Workspace</span>
        </button>
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5">
          {slots.map((slot) => (
            <button key={slot.id} type="button" onClick={() => selectSlot(slot)} className="min-w-0 rounded-xl border px-2.5 py-2 text-left"
              style={!crewDeskOpen && activeSlotId === slot.id && !slot.collapsed ? { borderColor: `${accentColor}70`, backgroundColor: `${accentColor}16` } : { borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.025)' }}>
              <span className="block truncate text-[10px] font-black text-white">{slot.title}</span>
              <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wide text-zinc-500">{slot.collapsed ? 'Hidden' : `Slot ${slot.id}`}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:text-white" aria-label="Collapse workspace into ecosystem header"><Maximize2 size={13} /></button>
      </div>

      <div className="border-t border-white/10 bg-black/35">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2" data-workspace-overlay-controls="true">
          <button type="button" onClick={togglePersonalOverlay} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-black ${personalOverlayVisible ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-black/30 text-zinc-400'}`} aria-pressed={personalOverlayVisible}>
            Personal overlay {personalOverlayVisible ? 'On' : 'Off'}
          </button>
          {tenantUrls?.public && <button type="button" onClick={() => void copyUrl(tenantUrls.public)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 hover:text-white">Copy Public URL</button>}
          {tenantUrls?.personal && <button type="button" onClick={() => void copyUrl(tenantUrls.personal)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 hover:text-white">Copy Personal URL</button>}
        </div>

        {(crewDeskOpen || activeSlot) && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0"><span className="block truncate text-xs font-black text-white">{panelTitle}</span><span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">{panelKind}</span></div>
            <div className="flex items-center gap-2">
              {popoutUrl && popoutUrl !== '#' && <a href={popoutUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 no-underline hover:text-white"><ExternalLink size={11} /> Pop out</a>}
              {!crewDeskOpen && activeSlot && <button type="button" onClick={hideActiveSlot} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 hover:text-white">Hide</button>}
            </div>
          </div>
        )}

        <div className="relative h-[min(52vh,460px)] border-t border-white/10 bg-black">
          {crewDeskOpen ? (
            crewDeskUrl ? <iframe src={crewDeskUrl} title="Canonical Workspace" data-embed-slot-frame="crew-desk" onLoad={(event) => void onFrameLoad(event.currentTarget)} className="absolute inset-0 h-full w-full border-0 bg-black" allow="autoplay; microphone; camera; fullscreen; clipboard-write" />
              : <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">Resolving the canonical Workspace from SPMT…</div>
          ) : (
            <>
              {slots.map((slot) => !slot.collapsed && <iframe key={`${slot.id}:${slot.url}`} src={resolveUrl(slot)} title={slot.title} data-embed-slot-frame={slot.id} onLoad={(event) => void onFrameLoad(event.currentTarget)} className={`absolute inset-0 h-full w-full border-0 bg-black ${activeSlot?.id === slot.id ? 'visible opacity-100' : 'invisible opacity-0'}`} allow="autoplay; microphone; camera; fullscreen; clipboard-write" />)}
              {slots.every((slot) => slot.collapsed) && <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">Choose an app from the ecosystem header to place it in a Workspace slot.</div>}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
