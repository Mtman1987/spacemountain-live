export type CanonicalSurfaceId = 'worktray' | 'settings' | 'overlays';

type SurfaceDefinition = {
  id?: string;
  path?: string;
  url?: string;
};

function surfaceList(payload: unknown): SurfaceDefinition[] {
  if (Array.isArray(payload)) return payload as SurfaceDefinition[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { surfaces?: unknown[] }).surfaces)) {
    return (payload as { surfaces: SurfaceDefinition[] }).surfaces;
  }
  return [];
}

export async function resolveCanonicalSurface(
  id: CanonicalSurfaceId,
  options: { mode?: 'panel' | 'dock' | 'full'; output?: 'public' | 'personal'; app?: string } = {},
) {
  const response = await fetch('/api/spmt/api/platform/surfaces', {
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return '';
  const payload = await response.json().catch(() => null);
  const surface = surfaceList(payload).find((entry) => String(entry?.id || '') === id);
  const raw = String(surface?.url || surface?.path || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw, 'https://spmt.live');
    url.searchParams.set('app', options.app || 'spacemountain-live');
    url.searchParams.set('mode', options.mode || (id === 'worktray' ? 'dock' : 'full'));
    if (id === 'overlays') url.searchParams.set('output', options.output || 'personal');
    return url.toString();
  } catch {
    return '';
  }
}
