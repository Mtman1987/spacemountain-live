import { useEffect } from 'react';
import { motion } from 'motion/react';
import type { UserPreferences } from '../../types';
import type { usePortableWorkspace } from '../../hooks/usePortableWorkspace';

type PortableWorkspaceController = ReturnType<typeof usePortableWorkspace>;

type SettingsRouteProps = {
  identityPresent: boolean;
  preferences: UserPreferences;
  accentColor: string;
  portableWorkspace: PortableWorkspaceController;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onApplyThemePreset: (preset: 'solar-flare' | 'nebula-purple' | 'oceanic-blue' | 'aurora-green') => void;
};

function workspaceMessage(workspace: PortableWorkspaceController) {
  if (workspace.status === 'signed-out') return 'Sign in with SPMT to edit the universal workspace.';
  if (workspace.status === 'loading') return 'Loading the canonical SPMT workspace…';
  if (workspace.status === 'saving') return 'Synchronizing with SPMT…';
  if (workspace.status === 'saved') return 'SPMT is the source of truth. This SpaceMountain view is a consumer.';
  if (workspace.status === 'offline') return 'SPMT is temporarily unavailable; the last loaded workspace remains visible.';
  if (workspace.status === 'conflict') return 'A newer SPMT workspace revision exists. Reloading the canonical surface will resolve it.';
  return 'The canonical workspace could not be synchronized.';
}

export default function SettingsRoute({
  identityPresent,
  portableWorkspace,
}: SettingsRouteProps) {
  useEffect(() => {
    const handleSurfaceUpdate = (event: MessageEvent) => {
      if (event.origin !== 'https://spmt.live') return;
      if (event.data?.type !== 'spmt.surface.updated' || event.data?.surface !== 'settings') return;
      void portableWorkspace.reload();
    };
    window.addEventListener('message', handleSurfaceUpdate);
    return () => window.removeEventListener('message', handleSurfaceUpdate);
  }, [portableWorkspace]);

  const indicator = portableWorkspace.status === 'saved'
    ? 'bg-emerald-400'
    : portableWorkspace.status === 'saving' || portableWorkspace.status === 'loading'
      ? 'bg-amber-300 animate-pulse'
      : portableWorkspace.status === 'signed-out'
        ? 'bg-zinc-500'
        : 'bg-red-400';

  return (
    <motion.div key="settings" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
      <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${indicator}`} />
              <h3 className="text-sm font-bold text-white">Universal SPMT workspace</h3>
            </div>
            <p className="mt-1 text-xs text-zinc-400">{workspaceMessage(portableWorkspace)}</p>
            {portableWorkspace.error && <p className="mt-2 text-xs text-red-300">{portableWorkspace.error}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {identityPresent && (
              <a
                href="https://spmt.live/embed/settings?mode=full&app=spacemountain-live"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-bold text-zinc-200 no-underline hover:text-white"
              >
                Open in SPMT
              </a>
            )}
            {['offline', 'conflict', 'error'].includes(portableWorkspace.status) && (
              <button type="button" onClick={portableWorkspace.reload} className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100">Reload from SPMT</button>
            )}
          </div>
        </div>
      </div>

      {identityPresent ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/35 shadow-2xl">
          <iframe
            src="https://spmt.live/embed/settings?mode=full&app=spacemountain-live"
            title="Universal SPMT settings"
            className="h-[min(74vh,900px)] min-h-[620px] w-full border-0 bg-black"
            allow="clipboard-write"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/35 p-8 text-center text-sm text-zinc-400">
          Sign in with SPMT to load the universal workspace editor.
        </div>
      )}
    </motion.div>
  );
}
