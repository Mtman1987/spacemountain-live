import { useEffect, useState } from 'react';
import type { UserPreferences } from '../../types';
import type { usePortableWorkspace } from '../../hooks/usePortableWorkspace';
import { resolveCanonicalSurface } from '../../lib/canonical-surfaces';

type PortableWorkspaceController = ReturnType<typeof usePortableWorkspace>;

type SettingsRouteProps = {
  identityPresent: boolean;
  preferences: UserPreferences;
  accentColor: string;
  portableWorkspace: PortableWorkspaceController;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onApplyThemePreset: (preset: 'solar-flare' | 'nebula-purple' | 'oceanic-blue' | 'aurora-green') => void;
};

export default function SettingsRoute({ identityPresent }: SettingsRouteProps) {
  const [settingsUrl, setSettingsUrl] = useState('');

  useEffect(() => {
    if (!identityPresent) return;
    let cancelled = false;
    void resolveCanonicalSurface('settings', { mode: 'full' }).then((url) => {
      if (cancelled || !url) return;
      setSettingsUrl(url);
      window.location.replace(url);
    });
    return () => { cancelled = true; };
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
      {settingsUrl ? 'Opening the canonical Universal Settings…' : 'Resolving the canonical Universal Settings from SPMT…'}{' '}
      {settingsUrl && <a className="font-bold text-cyan-300 underline" href={settingsUrl}>Open now</a>}
    </div>
  );
}
