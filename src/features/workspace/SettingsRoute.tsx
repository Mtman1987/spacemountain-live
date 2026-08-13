import { useEffect } from 'react';
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

const CANONICAL_SETTINGS_URL = 'https://spmt.live/embed/settings?mode=full&app=spacemountain-live';

export default function SettingsRoute({ identityPresent }: SettingsRouteProps) {
  useEffect(() => {
    if (identityPresent) window.location.replace(CANONICAL_SETTINGS_URL);
  }, [identityPresent]);

  if (!identityPresent) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/35 p-8 text-center text-sm text-zinc-400">
        Sign in with SPMT to open Universal Settings.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-8 text-center text-sm text-zinc-300">
      Opening the canonical SPMT Universal Settings…{' '}
      <a className="font-bold text-cyan-300 underline" href={CANONICAL_SETTINGS_URL}>Open now</a>
    </div>
  );
}
