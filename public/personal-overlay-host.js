(() => {
  'use strict';
  if (window.__spaceMountainPersonalOverlayHostInstalled || window.self !== window.top) return;
  window.__spaceMountainPersonalOverlayHostInstalled = true;

  const visibilityKey = 'spacemountain:personal-overlay-visible';
  const frameId = 'spmt-personal-overlay-host';
  let frame = null;
  let currentUrl = '';
  let busy = false;

  function visible() {
    try { return localStorage.getItem(visibilityKey) !== '0'; } catch { return true; }
  }

  function ensureFrame(url) {
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = frameId;
      frame.title = 'SPMT Personal overlay';
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('allow', 'autoplay');
      Object.assign(frame.style, {
        position: 'fixed',
        inset: '0',
        width: '100vw',
        height: '100vh',
        border: '0',
        background: 'transparent',
        pointerEvents: 'none',
        zIndex: '90',
      });
      document.body.appendChild(frame);
    }
    frame.style.display = visible() ? 'block' : 'none';
    if (url && url !== currentUrl) {
      currentUrl = url;
      frame.src = url;
    }
  }

  async function refresh() {
    if (busy) return;
    busy = true;
    try {
      const response = await fetch('/api/spmt/api/personal-overlay-launch', {
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        if (frame) frame.style.display = 'none';
        return;
      }
      const data = await response.json().catch(() => null);
      if (typeof data?.url === 'string' && data.url.startsWith('https://spmt.live/tenant/')) ensureFrame(data.url);
    } catch {
      if (frame) frame.style.display = 'none';
    } finally {
      busy = false;
    }
  }

  window.addEventListener('spmt:personal-overlay-visibility', () => {
    if (frame) frame.style.display = visible() ? 'block' : 'none';
  });
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
  window.addEventListener('message', (event) => {
    if (event.origin === 'https://spmt.live' && event.data?.type === 'spmt.surface.updated') void refresh();
  });

  void refresh();
  setInterval(refresh, 30_000);
})();
