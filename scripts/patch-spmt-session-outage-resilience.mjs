import { readFile, writeFile } from 'node:fs/promises';

const path = 'server.ts';
let source = await readFile(path, 'utf8');
const original = source;

function replaceRequired(from, to, label) {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`SPMT session resilience patch marker missing: ${label}`);
  source = source.replace(from, to);
}

function replaceAllRequired(from, to, label) {
  if (source.includes(to) && !source.includes(from)) return;
  const occurrences = source.split(from).length - 1;
  if (!occurrences) throw new Error(`SPMT session resilience patch marker missing: ${label}`);
  source = source.replaceAll(from, to);
}

replaceRequired(
`    const data = await response.json() as any;
    if (!response.ok || !data?.access_token || !data?.refresh_token) {
      clearSpmtSessionCookies(res);
      return '';
    }
    res.cookie(SPMT_SESSION_COOKIE, data.access_token, sessionCookieOptions());
    res.cookie(SPMT_REFRESH_COOKIE, data.refresh_token, sessionCookieOptions());
    return String(data.access_token);
  } catch {
    return '';
  }`,
`    const data = await response.json().catch(() => null) as any;
    if (!response.ok || !data?.access_token || !data?.refresh_token) {
      // Only a definitive client/auth rejection proves the refresh credential is bad.
      // Upstream 5xx, malformed responses, and network failures must not sign the user out.
      if ([400, 401, 403].includes(response.status)) {
        clearSpmtSessionCookies(res);
        return '';
      }
      return null;
    }
    res.cookie(SPMT_SESSION_COOKIE, data.access_token, sessionCookieOptions());
    res.cookie(SPMT_REFRESH_COOKIE, data.refresh_token, sessionCookieOptions());
    return String(data.access_token);
  } catch {
    return null;
  }`,
  'refresh token transient failure handling',
);

replaceAllRequired(
`    if (!token) token = await refreshSpmtSession(req, res);
    if (!token) return res.status(401).json({ error: 'Not authenticated' });`,
`    if (!token) {
      const refreshed = await refreshSpmtSession(req, res);
      if (refreshed === null) return res.status(503).json({ error: 'SPMT session service temporarily unavailable' });
      token = refreshed;
    }
    if (!token) return res.status(401).json({ error: 'Not authenticated' });`,
  'missing access-token refresh handling',
);

replaceRequired(
`      let response = await fetch(\`${'${SPMT_BASE_URL}'}/api/me\`, { headers: { Authorization: \`Bearer ${'${token}'}\`, Accept: 'application/json' } });
      if (!response.ok) {
        token = await refreshSpmtSession(req, res);
        if (token) response = await fetch(\`${'${SPMT_BASE_URL}'}/api/me\`, { headers: { Authorization: \`Bearer ${'${token}'}\`, Accept: 'application/json' } });
      }
      const data = await response.json();
      if (!response.ok) {
        clearSpmtSessionCookies(res);
        return res.status(401).json({ error: 'SPMT session expired' });
      }`,
`      let response = await fetch(\`${'${SPMT_BASE_URL}'}/api/me\`, { headers: { Authorization: \`Bearer ${'${token}'}\`, Accept: 'application/json' } });
      // Refresh only when SPMT definitively rejects the access token. A 5xx is
      // an availability incident, not evidence that the browser session expired.
      if (response.status === 401 || response.status === 403) {
        const refreshed = await refreshSpmtSession(req, res);
        if (refreshed === null) return res.status(503).json({ error: 'SPMT session service temporarily unavailable' });
        token = refreshed;
        if (token) response = await fetch(\`${'${SPMT_BASE_URL}'}/api/me\`, { headers: { Authorization: \`Bearer ${'${token}'}\`, Accept: 'application/json' } });
      }
      if (!response.ok && response.status !== 401 && response.status !== 403) {
        return res.status(502).json({ error: 'SPMT session validation unavailable' });
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        clearSpmtSessionCookies(res);
        return res.status(401).json({ error: 'SPMT session expired' });
      }
      if (!data?.user?.id) return res.status(502).json({ error: 'SPMT session validation returned an invalid response' });`,
  'current session validation handling',
);

replaceRequired(
`      if (response.status === 401) {
        token = await refreshSpmtSession(req, res);
        if (token) response = await launchRequest(token);
      }`,
`      if (response.status === 401) {
        const refreshed = await refreshSpmtSession(req, res);
        if (refreshed === null) return res.status(503).json({ error: 'SPMT session service temporarily unavailable' });
        token = refreshed;
        if (token) response = await launchRequest(token);
      }`,
  'embed launch refresh handling',
);

replaceRequired(
`      if (response.status === 401) {
        token = await refreshSpmtSession(req, res);
        if (token) response = await proxyRequest(token);
      }`,
`      if (response.status === 401) {
        const refreshed = await refreshSpmtSession(req, res);
        if (refreshed === null) return res.status(503).json({ error: 'SPMT session service temporarily unavailable' });
        token = refreshed;
        if (token) response = await proxyRequest(token);
      }`,
  'SPMT proxy refresh handling',
);

if (source !== original) {
  await writeFile(path, source, 'utf8');
  console.log('patched SpaceMountain SPMT outage/session resilience');
} else {
  console.log('SpaceMountain SPMT outage/session resilience already patched');
}
