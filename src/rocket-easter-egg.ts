const EGG_APP_ID = 'spacemountain-live';
const EGG_NAMESPACE = 'easter-eggs';
const PORTAL_ID = 'rocketArenaBlackHole';
const PORTAL_HINT = 'ENTER HERE';

type EggStateRecord = {
  schemaVersion?: number;
  revision?: number;
  data?: {
    eggs?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

let installed = false;
let portalVisible = false;
let completing = false;
let eggRevision: number | null = null;
let eggData: Record<string, unknown> = {};
let frameId = 0;
let legacyTriggerObserver: MutationObserver | null = null;

async function loadEggState() {
  try {
    const response = await fetch(`/api/spmt/api/app-state/${EGG_APP_ID}/${EGG_NAMESPACE}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!response.ok) return;
    const record = await response.json() as EggStateRecord;
    eggRevision = Number.isInteger(Number(record.revision)) ? Number(record.revision) : null;
    eggData = record.data && typeof record.data === 'object' ? { ...record.data } : {};
  } catch {
    // Guests can still discover and play the Arena; signed-in state sync is best-effort.
  }
}

function buildRocketDiscoveryData() {
  const now = new Date().toISOString();
  const currentEggs = eggData.eggs && typeof eggData.eggs === 'object' && !Array.isArray(eggData.eggs)
    ? eggData.eggs as Record<string, unknown>
    : {};
  const existingRocket = currentEggs.rocket && typeof currentEggs.rocket === 'object'
    ? currentEggs.rocket as Record<string, unknown>
    : {};
  return {
    ...eggData,
    eggs: {
      ...currentEggs,
      rocket: {
        ...existingRocket,
        completed: true,
        discoveredAt: existingRocket.discoveredAt || now,
        source: 'spacemountain-live',
      },
    },
  };
}

async function persistRocketDiscovery(retryOnConflict = true): Promise<boolean> {
  const nextData = buildRocketDiscoveryData();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (eggRevision !== null) {
    headers['If-Match'] = `\"app-state-${EGG_APP_ID}-${EGG_NAMESPACE}-${eggRevision}\"`;
  }
  const response = await fetch(`/api/spmt/api/app-state/${EGG_APP_ID}/${EGG_NAMESPACE}`, {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      schemaVersion: 1,
      ...(eggRevision !== null ? { revision: eggRevision } : {}),
      data: nextData,
    }),
  });
  if (response.status === 409 && retryOnConflict) {
    await loadEggState();
    return persistRocketDiscovery(false);
  }
  if (!response.ok) return false;
  const record = await response.json() as EggStateRecord;
  eggRevision = Number(record.revision) || eggRevision;
  eggData = nextData;
  window.dispatchEvent(new CustomEvent('spmt:easter-egg-complete', {
    detail: { egg: 'rocket', data: nextData },
  }));
  return true;
}

async function recordRocketDiscovery() {
  if (completing) return;
  completing = true;
  try {
    await persistRocketDiscovery();
  } catch {
    // Discovery should never block Arena access if account sync is temporarily unavailable.
  } finally {
    completing = false;
  }
}

function removePortal() {
  cancelAnimationFrame(frameId);
  document.getElementById(PORTAL_ID)?.remove();
  portalVisible = false;
}

function enterArena() {
  void recordRocketDiscovery();
  removePortal();
  if (window.location.pathname === '/arena') {
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }
  window.history.pushState({ activeTab: 'arena', easterEgg: 'rocket' }, '', '/arena');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function monitorPortalCollision() {
  cancelAnimationFrame(frameId);
  const tick = () => {
    const rocket = document.getElementById('rocketLauncher');
    const portal = document.getElementById(PORTAL_ID);
    if (!portal || !portalVisible) return;
    if (rocket?.classList.contains('free')) {
      const r = rocket.getBoundingClientRect();
      const p = portal.getBoundingClientRect();
      const rx = r.left + r.width / 2;
      const ry = r.top + r.height / 2;
      const px = p.left + p.width / 2;
      const py = p.top + p.height / 2;
      const portalRadius = Math.min(p.width, p.height) * 0.43;
      if (Math.hypot(rx - px, ry - py) <= portalRadius) {
        enterArena();
        return;
      }
    }
    frameId = requestAnimationFrame(tick);
  };
  frameId = requestAnimationFrame(tick);
}

function showPortal() {
  if (portalVisible || document.getElementById(PORTAL_ID)) return;
  portalVisible = true;
  const portal = document.createElement('div');
  portal.id = PORTAL_ID;
  portal.setAttribute('aria-label', 'Black hole entrance to the Arena');
  Object.assign(portal.style, {
    position: 'fixed',
    right: 'clamp(28px, 9vw, 150px)',
    top: 'clamp(150px, 31vh, 340px)',
    width: 'clamp(132px, 16vw, 220px)',
    height: 'clamp(132px, 16vw, 220px)',
    borderRadius: '9999px',
    zIndex: '118',
    pointerEvents: 'none',
    background: 'radial-gradient(circle at 50% 50%, #000 0 29%, #050509 30% 39%, rgba(69,28,120,.86) 49%, rgba(15,107,154,.62) 59%, rgba(0,0,0,0) 72%)',
    boxShadow: '0 0 24px rgba(103,58,183,.72), 0 0 70px rgba(32,153,210,.34), inset 0 0 24px #000',
    animation: 'spmtBlackHolePulse 1.8s ease-in-out infinite',
  });
  portal.innerHTML = `<style>@keyframes spmtBlackHolePulse{0%,100%{transform:scale(.94);filter:brightness(.9)}50%{transform:scale(1.05);filter:brightness(1.22)}}</style><span style="position:absolute;left:50%;bottom:-27px;transform:translateX(-50%);white-space:nowrap;font:900 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.22em;color:#c7f3ff;text-shadow:0 0 10px #38bdf8">${PORTAL_HINT}</span>`;
  document.body.appendChild(portal);
  monitorPortalCollision();
}

function retireLegacyArenaTrigger() {
  const legacy = document.getElementById('arenaRocketTrigger');
  if (!legacy) return;
  legacy.removeAttribute('id');
  legacy.setAttribute('data-arena-flight-deck', 'true');
}

export function installRocketEasterEgg() {
  if (installed) return;
  installed = true;
  void loadEggState();
  retireLegacyArenaTrigger();
  legacyTriggerObserver = new MutationObserver(retireLegacyArenaTrigger);
  legacyTriggerObserver.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('dblclick', (event) => {
    const target = event.target as HTMLElement | null;
    const rocket = target?.closest('#rocketLauncher');
    if (!rocket?.classList.contains('docked')) return;
    // AppRocketLogic performs the release on the same double-click; the portal appears immediately after it does.
    window.setTimeout(showPortal, 0);
  }, true);

  window.addEventListener('popstate', () => {
    if (window.location.pathname === '/arena') removePortal();
  });
}
