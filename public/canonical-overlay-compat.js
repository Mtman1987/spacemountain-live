(() => {
  const legacyPath = '/api/spmt/api/overlay-workspace';
  const publicScenePath = '/api/spmt/api/tenant-scene?output=public';
  const publicSavePath = '/api/spmt/api/tenant-scene/public';
  const personalVisibilityKey = 'spacemountain:personal-overlay-visible';
  const originalFetch = window.fetch.bind(window);

  function personalVisible() {
    return localStorage.getItem(personalVisibilityKey) !== '0';
  }

  function setPersonalVisible(visible) {
    localStorage.setItem(personalVisibilityKey, visible ? '1' : '0');
    window.dispatchEvent(new CustomEvent('spmt:personal-overlay-visibility', {
      detail: { visible },
    }));
  }

  function requestUrl(input) {
    try {
      return new URL(typeof input === 'string' || input instanceof URL ? input.toString() : input.url, location.origin);
    } catch {
      return null;
    }
  }

  function requestMethod(input, init) {
    return String(init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
  }

  async function requestBody(input, init) {
    if (typeof init?.body === 'string') return init.body;
    if (typeof Request !== 'undefined' && input instanceof Request) {
      try { return await input.clone().text(); } catch {}
    }
    return '';
  }

  function jsonResponse(payload, response) {
    return new Response(JSON.stringify(payload), {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  window.fetch = async function canonicalOverlayFetch(input, init = {}) {
    const url = requestUrl(input);
    if (!url || url.origin !== location.origin || url.pathname !== legacyPath) {
      return originalFetch(input, init);
    }

    const method = requestMethod(input, init);

    if (method === 'GET') {
      const response = await originalFetch(publicScenePath, { ...init, method: 'GET', body: undefined });
      if (!response.ok) return response;
      const data = await response.json();
      return jsonResponse({
        layout: {
          ...(data?.layout || {}),
          // The old SpaceMountain canvas switch now represents only the local
          // Personal overlay consumer. It must never mirror Public enabled state.
          enabled: personalVisible(),
        },
        updatedAt: data?.updatedAt || null,
        tenant: data?.tenant || null,
        output: 'public',
        urls: data?.urls || null,
      }, response);
    }

    if (method === 'PUT') {
      let requested = {};
      try { requested = JSON.parse(await requestBody(input, init) || '{}'); } catch {}
      const requestedLayout = requested?.layout && typeof requested.layout === 'object' ? requested.layout : {};
      if (typeof requestedLayout.enabled === 'boolean') setPersonalVisible(requestedLayout.enabled);

      // SpaceMountain historically stored workflow rows in the same object as its
      // duplicate overlay canvas. Keep workflow persistence, but merge it into the
      // current canonical Public scene so the old client cannot replace Public
      // widgets, visibility, geometry, opacity, or z-order.
      const currentResponse = await originalFetch(publicScenePath, { ...init, method: 'GET', body: undefined });
      if (!currentResponse.ok) return currentResponse;
      const current = await currentResponse.json();
      const currentLayout = current?.layout && typeof current.layout === 'object' ? current.layout : {};
      const mergedLayout = {
        ...currentLayout,
        workflows: Array.isArray(requestedLayout.workflows)
          ? requestedLayout.workflows
          : (Array.isArray(currentLayout.workflows) ? currentLayout.workflows : []),
      };
      const headers = new Headers(init.headers || {});
      headers.set('Content-Type', 'application/json');
      return originalFetch(publicSavePath, {
        ...init,
        method: 'PUT',
        headers,
        body: JSON.stringify({ layout: mergedLayout }),
      });
    }

    return originalFetch(input, init);
  };
})();
