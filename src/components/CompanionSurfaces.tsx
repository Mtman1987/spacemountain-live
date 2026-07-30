import type { EmbedSlot } from '../types';
import OverlayWorkspace, { type OverlayWidget } from './OverlayWorkspace';

type AuthFrameHandler = (frame: HTMLIFrameElement | null) => void | Promise<void>;

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
  accentColor,
  onWidgetChange,
  onFrameLoad,
}: {
  identityPresent: boolean;
  overlayEnabled: boolean;
  widgets: OverlayWidget[];
  slots: EmbedSlot[];
  accentColor: string;
  onWidgetChange: (widgetId: string, patch: Partial<OverlayWidget>) => void;
  onFrameLoad: AuthFrameHandler;
}) {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-transparent text-white">
      {!identityPresent && (
        <div className="pointer-events-none absolute left-4 top-4 z-[70] rounded-full border border-cyan-300/25 bg-zinc-950/85 px-4 py-2 text-xs font-bold text-cyan-100">
          Open StreamWeaver from Companion to sign in and load this workspace.
        </div>
      )}

      {identityPresent && (
        <>
          <OverlayWorkspace
            enabled={overlayEnabled}
            editing={false}
            widgets={widgets}
            accentColor={accentColor}
            onChange={onWidgetChange}
            onFinishEditing={() => {}}
          />

          <section className="pointer-events-none absolute inset-x-3 bottom-3 z-[60] grid grid-cols-1 items-end gap-3 lg:grid-cols-3" aria-label="Companion dock slots">
            {slots.map((slot) => (
              <article key={slot.id} className="pointer-events-auto overflow-hidden rounded-2xl border border-white/10 bg-black/75 shadow-2xl backdrop-blur-xl">
                <header className="flex h-9 items-center justify-between border-b border-white/10 px-3">
                  <span className="truncate text-[10px] font-black text-white">Dock {slot.id}: {slot.title}</span>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">{slot.kind}</span>
                </header>
                {!slot.collapsed && (
                  <iframe
                    src={slot.url}
                    title={slot.title}
                    data-embed-slot-frame={`companion-dock-${slot.id}`}
                    onLoad={(event) => void onFrameLoad(event.currentTarget)}
                    className="h-[280px] w-full border-0 bg-transparent"
                    allow="autoplay; microphone; camera; fullscreen; clipboard-write"
                  />
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
