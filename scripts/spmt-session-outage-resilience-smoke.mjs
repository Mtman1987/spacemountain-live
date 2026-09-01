import fs from 'node:fs';

const source = fs.readFileSync('server.ts', 'utf8');
const appSource = fs.readFileSync('src/App.tsx', 'utf8');
const headerSource = fs.readFileSync('src/components/CosmicHeader.tsx', 'utf8');

function requireMarker(haystack, marker, message) {
  if (!haystack.includes(marker)) throw new Error(message);
}

requireMarker(
  source,
  'if ([400, 401, 403].includes(response.status))',
  'Refresh credentials must only be cleared after a definitive auth/client rejection.',
);
requireMarker(
  source,
  'if (response.status === 401 || response.status === 403)',
  'Current-session validation must refresh only after an authentication rejection.',
);
requireMarker(
  source,
  "return res.status(502).json({ error: 'SPMT session validation unavailable' });",
  'Transient SPMT validation failures must remain availability failures.',
);
requireMarker(
  source,
  "return res.status(503).json({ error: 'SPMT session service temporarily unavailable' });",
  'Missing-token refresh outages must not be reported as signed-out sessions.',
);
requireMarker(
  source,
  "if (response.status === 401) {\n        const refreshed = await refreshSpmtSession(req, res);",
  'Authenticated SPMT proxy retries must preserve transient refresh state.',
);

if (source.includes("if (!response.ok) {\n        token = await refreshSpmtSession(req, res);")) {
  throw new Error('SpaceMountain still refreshes the user session on generic SPMT failures.');
}

const transientMarkers = source.match(/SPMT session service temporarily unavailable/g) || [];
if (transientMarkers.length < 3) {
  throw new Error(`Expected transient-session handling across session and proxy routes; found ${transientMarkers.length}.`);
}

requireMarker(
  appSource,
  "const spmtSsoRecoveryKey = 'spmt.sso.v1.spacemountain.recovery';",
  'SpaceMountain must remember a guarded silent-SSO recovery attempt.',
);
requireMarker(
  appSource,
  'recoverSpmtSsoOnce();',
  'Definitive signed-out state must attempt one SPMT SSO recovery.',
);
requireMarker(
  appSource,
  "window.location.assign('/auth/login?return=' + encodeURIComponent(returnPath || '/'));",
  'Silent SSO recovery must use the canonical SpaceMountain OAuth entrypoint.',
);
requireMarker(
  headerSource,
  "localStorage.setItem('spmt.sso.v1.spacemountain.suppressUntil'",
  'Explicit user logout must suppress automatic SSO recovery.',
);

console.log('SpaceMountain SPMT session outage and silent-recovery contracts passed.');
