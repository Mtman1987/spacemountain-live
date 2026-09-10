export const ROCKET_PENDING_KEY = 'spmt:rocket-discovery-pending:v1';
const DISCOVERY_TIMEOUT_MS = 6000;
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type DiscoveryResult = { status: 'idle' | 'retained' | 'pending' | 'sign-in'; data?: Record<string, unknown> };

// This queue contains only an unconfirmed discovery and its account ID. SPMT
// remains the authority; neither local state nor HTTP 200 alone grants credit.
export function createRocketDiscoveryRecorder(fetcher: typeof fetch, storage?: StorageLike) {
  let pending: string[] = [];
  try {
    const saved: unknown = JSON.parse(storage?.getItem(ROCKET_PENDING_KEY) || '[]');
    if (Array.isArray(saved)) pending = saved.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length < 200).slice(-8);
  } catch { /* Storage may be disabled; the current page can still retry. */ }
  let inFlight: Promise<DiscoveryResult> | null = null;
  let newDiscovery = false;
  const save = () => {
    try {
      if (pending.length) storage?.setItem(ROCKET_PENDING_KEY, JSON.stringify(pending));
      else storage?.removeItem(ROCKET_PENDING_KEY);
    } catch { /* Keep the in-memory pending receipt. */ }
  };
  const run = (): Promise<DiscoveryResult> => {
    if (inFlight) return inFlight;
    if (!newDiscovery && !pending.length) return Promise.resolve({ status: 'idle' });
    inFlight = (async (): Promise<DiscoveryResult> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);
      try {
        const identity = await fetcher('/api/spmt/api/me', {
          credentials: 'include', cache: 'no-store', signal: controller.signal,
        });
        if (identity.status === 401 || identity.status === 403) return { status: 'sign-in' };
        if (!identity.ok) return { status: 'pending' };
        const userId = (await identity.json())?.user?.id;
        if (typeof userId !== 'string' || !userId) return { status: 'pending' };
        if (newDiscovery) {
          newDiscovery = false;
          pending = [...new Set([...pending, userId])].slice(-8);
          save();
        }
        // Switching accounts never transfers another person's pending credit.
        if (!pending.includes(userId)) return { status: 'idle' };
        const response = await fetcher('/api/spmt/api/easter-eggs/rocket/complete', {
          method: 'POST', credentials: 'include', signal: controller.signal,
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }),
        });
        if (response.status === 401 || response.status === 403) return { status: 'sign-in' };
        if (!response.ok) return { status: 'pending' };
        const record = await response.json();
        if (record?.data?.eggs?.rocket?.completed !== true) return { status: 'pending' };
        pending = pending.filter((id) => id !== userId);
        save();
        return { status: 'retained', data: record.data };
      } catch {
        return { status: 'pending' };
      } finally {
        // An unbound guest/offline attempt must not become a grant to a later
        // account. Once bound, the receipt survives reload/sign-in in this tab.
        newDiscovery = false;
        clearTimeout(timeout);
        inFlight = null;
      }
    })();
    return inFlight;
  };
  return {
    record: () => { newDiscovery = true; return run(); },
    retry: run,
    hasPending: () => pending.length > 0,
  };
}
