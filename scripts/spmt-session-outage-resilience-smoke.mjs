import fs from 'node:fs';

const source = fs.readFileSync('server.ts', 'utf8');

function requireMarker(marker, message) {
  if (!source.includes(marker)) throw new Error(message);
}

requireMarker(
  'if ([400, 401, 403].includes(response.status))',
  'Refresh credentials must only be cleared after a definitive auth/client rejection.',
);
requireMarker(
  'if (response.status === 401 || response.status === 403)',
  'Current-session validation must refresh only after an authentication rejection.',
);
requireMarker(
  "return res.status(502).json({ error: 'SPMT session validation unavailable' });",
  'Transient SPMT validation failures must remain availability failures.',
);
requireMarker(
  "return res.status(503).json({ error: 'SPMT session service temporarily unavailable' });",
  'Missing-token refresh outages must not be reported as signed-out sessions.',
);
requireMarker(
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

console.log('SpaceMountain SPMT session outage resilience contract passed.');
