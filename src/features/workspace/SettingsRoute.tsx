import { motion } from 'motion/react';
import SettingsPanel from '../../components/SettingsPanel';
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
  if (workspace.status === 'signed-out') return 'Sign in with SPMT to sync themes and all three dock slots across devices.';
  if (workspace.status === 'loading') return 'Loading the account-backed workspace…';
  if (workspace.status === 'saving') return 'Saving this workspace to SPMT…';
  if (workspace.status === 'unsaved') return 'Changes are waiting to save.';
  if (workspace.status === 'saved') {
    const savedAt = workspace.lastSavedAt
      ? ` at ${new Date(workspace.lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : '';
    return `Saved to SPMT${savedAt}.`;
  }
  if (workspace.status === 'offline') return 'Offline: changes are cached on this device and need a retry.';
  if (workspace.status === 'conflict') return 'Another device saved a newer revision. Choose retry or reload.';
  return 'The workspace could not be synchronized.';
}

export default function SettingsRoute({
  identityPresent,
  preferences,
  accentColor,
  portableWorkspace,
  onUpdatePreferences,
  onApplyThemePreset,
}: SettingsRouteProps) {
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
              <h3 className="text-sm font-bold text-white">Portable SPMT workspace</h3>
            </div>
            <p className="mt-1 text-xs text-zinc-400">{workspaceMessage(portableWorkspace)}</p>
            {portableWorkspace.error && <p className="mt-2 text-xs text-red-300">{portableWorkspace.error}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {['offline', 'conflict', 'error'].includes(portableWorkspace.status) && (
              <button type="button" onClick={portableWorkspace.retry} className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100">Retry save</button>
            )}
            {portableWorkspace.status === 'conflict' && (
              <button type="button" onClick={portableWorkspace.reload} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-bold text-zinc-200">Use other device version</button>
            )}
            {identityPresent && portableWorkspace.loaded && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset the account workspace theme and all three dock slots to their defaults?')) void portableWorkspace.reset();
                }}
                disabled={portableWorkspace.status === 'saving' || portableWorkspace.status === 'loading'}
                className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs font-bold text-red-200 disabled:opacity-40"
              >
                Reset workspace
              </button>
            )}
          </div>
        </div>
      </div>
      <SettingsPanel
        preferences={preferences}
        onUpdatePreferences={onUpdatePreferences}
        onApplyThemePreset={onApplyThemePreset}
        accentColor={accentColor}
        workspaceProfile={portableWorkspace.profile}
        onUpdateWorkspaceProfile={portableWorkspace.updateProfileFields}
      />
    </motion.div>
  );
}
