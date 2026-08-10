import { ChevronDown, ChevronUp, ExternalLink, Layout, Maximize2 } from 'lucide-react';
import type { EmbedSlot } from '../types';

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
  const selectedSlot = slots.find((slot) => slot.id === activeSlotId);
  const activeSlot = (selectedSlot && !selectedSlot.collapsed)
    ? selectedSlot
    : slots.find((slot) => !slot.collapsed) || slots[0];

  const selectSlot = (slot: EmbedSlot) => {
    onSelectSlot(slot.id);
    if (slot.collapsed) onSlotChange(slot.id, { collapsed: false });
    onOpenChange(true);
  };

  const hideActiveSlot = () => {
    if (!activeSlot) return;

    onSlotChange(activeSlot.id, { collapsed: true });
    const nextSlot = slots.find((slot) => slot.id !== activeSlot.id && !slot.collapsed);
    if (nextSlot) {
      onSelectSlot(nextSlot.id);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-[80] overflow-hidden rounded-2xl border bg-zinc-950/90 shadow-[0_-16px_44px_rgba(0,0,0,0.48)] backdrop-blur-2xl transition-all md:left-1/2 md:max-w-5xl md:-translate-x-1/2"
      style={{ borderColor: `${accentColor}35` }}
      aria-label="Docked workspace"
    >
      <div className="flex min-h-14 items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-white"
          aria-expanded={open}
        >
          <Layout size={15} style={{ color: accentColor }} />
          <span className="hidden sm:inline">Workspace</span>
          {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>

        <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5">
          {slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => selectSlot(slot)}
              className="min-w-0 rounded-xl border px-2.5 py-2 text-left"
              style={activeSlotId === slot.id && !slot.collapsed ? {
                borderColor: `${accentColor}70`,
                backgroundColor: `${accentColor}16`,
              } : {
                borderColor: 'rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(255,255,255,0.025)',
              }}
            >
              <span className="block truncate text-[10px] font-black text-white">{slot.title}</span>
              <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wide text-zinc-500">{slot.collapsed ? 'Hidden' : `Slot ${slot.id}`}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`grid transition-[grid-template-rows] duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-white/10 bg-black/35">
            {activeSlot && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <span className="block truncate text-xs font-black text-white">{activeSlot.title}</span>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">{activeSlot.kind}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a href={resolveUrl(activeSlot)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 no-underline hover:text-white">
                    <ExternalLink size={11} /> Pop out
                  </a>
                  <button type="button" onClick={hideActiveSlot} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 hover:text-white">
                    Hide
                  </button>
                  <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:text-white" aria-label="Collapse workspace">
                    <Maximize2 size={12} />
                  </button>
                </div>
              </div>
            )}

            <div className="relative h-[min(52vh,460px)] border-t border-white/10 bg-black">
              {slots.map((slot) => !slot.collapsed && (
                <iframe
                  key={`${slot.id}:${slot.url}`}
                  src={resolveUrl(slot)}
                  title={slot.title}
                  data-embed-slot-frame={slot.id}
                  onLoad={(event) => void onFrameLoad(event.currentTarget)}
                  className={`absolute inset-0 h-full w-full border-0 bg-black ${activeSlot?.id === slot.id ? 'visible opacity-100' : 'invisible opacity-0'}`}
                  allow="autoplay; microphone; camera; fullscreen; clipboard-write"
                />
              ))}
              {slots.every((slot) => slot.collapsed) && (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
                  Choose an app from Shipyard or Workspace to place it in a dock slot.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
