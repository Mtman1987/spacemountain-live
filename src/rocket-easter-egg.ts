import { createRocketDiscoveryRecorder, type DiscoveryResult } from './lib/rocket-discovery';

const PORTAL_ID = 'rocketArenaBlackHole';
const PORTAL_HINT = 'ENTER HERE';
const RETRY_DELAYS = [1500, 5000, 15000];
let installed = false;
let portalVisible = false;
let frameId = 0;
let legacyTriggerObserver: MutationObserver | null = null;
let recorder: ReturnType<typeof createRocketDiscoveryRecorder> | null = null;
let retryTimer: number | undefined;
let retryAttempt = 0;

function showRocketPersistenceNotice(result: DiscoveryResult) {
  const retained = result.status === 'retained';
  if (result.status === 'idle') return;
  const id = 'rocketDiscoveryPersistenceNotice';
  document.getElementById(id)?.remove();
  const notice = document.createElement('div');
  notice.id = id;
  notice.setAttribute('role', retained ? 'status' : 'alert');
  notice.textContent = retained
    ? 'ROCKET DISCOVERY RETAINED'
    : result.status === 'pending' && recorder?.hasPending()
      ? 'ROCKET DISCOVERY WAITING TO SYNC · RETRYING AUTOMATICALLY'
      : recorder?.hasPending()
        ? 'SIGN IN TO YOUR ORIGINAL SPMT ACCOUNT TO FINISH SAVING'
        : 'ROCKET DISCOVERY NOT SAVED · SIGN IN AND RE-ENTER THE PORTAL';
  Object.assign(notice.style, {
    position: 'fixed',
    left: '50%',
    bottom: '24px',
    transform: 'translateX(-50%)',
    zIndex: '10000',
    maxWidth: 'min(92vw, 680px)',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(125,211,252,.55)',
    background: 'rgba(2,6,23,.94)',
    color: '#e0f2fe',
    boxShadow: '0 0 24px rgba(56,189,248,.22)',
    font: '800 11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace',
    letterSpacing: '.08em',
    textAlign: 'center',
    pointerEvents: 'none',
  });
  document.body.appendChild(notice);
  window.setTimeout(() => notice.remove(), retained ? 2600 : 5200);
}

function reportDiscovery(result: DiscoveryResult) {
  if (result.status === 'retained') {
    window.dispatchEvent(new CustomEvent('spmt:easter-egg-complete', {
      detail: { egg: 'rocket', completed: true, data: result.data },
    }));
  }
  showRocketPersistenceNotice(result);
  if (result.status === 'pending' && recorder?.hasPending() && retryAttempt < RETRY_DELAYS.length) {
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(retryPendingDiscovery, RETRY_DELAYS[retryAttempt++]);
  }
}

function retryPendingDiscovery() {
  if (!recorder?.hasPending()) return;
  void recorder.retry().then((result) => {
    if (result.status === 'retained' || result.status === 'pending') reportDiscovery(result);
  });
}

function recordRocketDiscovery() {
  retryAttempt = 0;
  if (recorder) void recorder.record().then(reportDiscovery);
}

function removePortal() {
  cancelAnimationFrame(frameId);
  document.getElementById(PORTAL_ID)?.remove();
  portalVisible = false;
}

function enterArena() {
  recordRocketDiscovery();
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
  let storage: Storage | undefined;
  try { storage = window.sessionStorage; } catch { /* In-memory retries remain available. */ }
  recorder = createRocketDiscoveryRecorder(window.fetch.bind(window), storage);
  const resume = () => { retryAttempt = 0; retryPendingDiscovery(); };
  window.addEventListener('online', resume);
  window.addEventListener('focus', resume);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });
  resume();
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
