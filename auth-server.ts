import http from 'node:http';
import net from 'node:net';

const PUBLIC_PORT = Number(process.env.PORT || 3000);
const INTERNAL_PORT = Number(process.env.SPACEMOUNTAIN_INTERNAL_PORT || PUBLIC_PORT + 1);
const SPMT_BASE_URL = String(process.env.SPMT_BASE_URL || 'https://spmt.live').replace(/\/$/, '');
const SPMT_COOKIE = 'spacemountain_spmt_session';
const SPMT_REFRESH_COOKIE = 'spacemountain_spmt_refresh';
const SPMT_CLIENT_ID = 'spacemountain-live';

const PUBLIC_PREFIXES = [
  '/auth/', '/api/auth/', '/api/health', '/health', '/downloads/', '/docs/', '/assets/',
  '/favicon', '/manifest', '/sdk/', '/public/',
];
const MACHINE_PREFIXES = ['/api/webhooks/', '/api/discord/', '/api/worker/', '/api/platform/'];
const ADMIN_PREFIXES = ['/admin', '/api/admin/', '/shipyard/admin', '/api/shipyard/admin'];

function cookieValue(header: string | undefined, name: string) {
  for (const part of String(header || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function identityIsAdmin(identity: any) {
  if (identity?.isAdmin === true || identity?.is_admin === true || identity?.is_admin === 1) return true;
  const role = String(identity?.role || '').toLowerCase();
  const roles = Array.isArray(identity?.roles) ? identity.roles.map((value: unknown) => String(value).toLowerCase()) : [];
  return role === 'admin' || role === 'owner' || roles.includes('admin') || roles.includes('owner');
}

function appendSetCookie(response: http.ServerResponse, value: string) {
  const current = response.getHeader('set-cookie');
  const cookies = Array.isArray(current) ? current.map(String) : current ? [String(current)] : [];
  response.setHeader('set-cookie', [...cookies, value]);
}

function setSessionCookie(response: http.ServerResponse, name: string, value: string, maxAge: number) {
  appendSetCookie(response, `${name}=${encodeURIComponent(value)}; Max-Age=${Math.max(0, Math.floor(maxAge))}; Path=/; HttpOnly; Secure; SameSite=Lax`);
}

async function fetchIdentity(token: string) {
  const response = await fetch(`${SPMT_BASE_URL}/api/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  if (!response?.ok) return null;
  const payload = await response.json().catch(() => null);
  const identity = payload?.user || payload?.profile || payload;
  return identity?.id ? identity : null;
}

async function refreshSession(request: http.IncomingMessage, response: http.ServerResponse) {
  const refreshToken = cookieValue(request.headers.cookie, SPMT_REFRESH_COOKIE);
  const clientSecret = String(process.env.SPACEMOUNTAIN_CLIENT_SECRET || '').trim();
  if (!refreshToken || !clientSecret) return '';
  const refreshResponse = await fetch(`${SPMT_BASE_URL}/api/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: SPMT_CLIENT_ID,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  if (!refreshResponse?.ok) return '';
  const payload = await refreshResponse.json().catch(() => null);
  if (!payload?.access_token || !payload?.refresh_token) return '';
  setSessionCookie(response, SPMT_COOKIE, String(payload.access_token), Number(payload.expires_in || 604800));
  setSessionCookie(response, SPMT_REFRESH_COOKIE, String(payload.refresh_token), Number(payload.refresh_expires_in || 2592000));
  return String(payload.access_token);
}

async function resolveIdentity(request: http.IncomingMessage, response: http.ServerResponse) {
  const bearer = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  let token = cookieValue(request.headers.cookie, SPMT_COOKIE) || bearer;
  let identity = token ? await fetchIdentity(token) : null;
  if (identity || bearer) return identity;
  token = await refreshSession(request, response);
  if (!token) return null;
  return fetchIdentity(token);
}

function isStatic(pathname: string) {
  return /\.[a-z0-9]{1,8}$/i.test(pathname) && !pathname.endsWith('.html');
}

function sendJson(response: http.ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(payload));
}

function forward(request: http.IncomingMessage, response: http.ServerResponse, identity: any) {
  const headers = { ...request.headers, host: `127.0.0.1:${INTERNAL_PORT}` } as Record<string, string | string[] | undefined>;
  if (identity?.id) {
    headers['x-spmt-user-id'] = String(identity.id);
    headers['x-spmt-username'] = String(identity.username || identity.displayName || '');
    headers['x-spmt-is-admin'] = identityIsAdmin(identity) ? '1' : '0';
  }
  const proxy = http.request({ hostname: '127.0.0.1', port: INTERNAL_PORT, method: request.method, path: request.url, headers }, (upstream) => {
    response.writeHead(upstream.statusCode || 502, upstream.headers);
    upstream.pipe(response);
  });
  proxy.on('error', () => sendJson(response, 502, { error: 'SpaceMountain application unavailable' }));
  request.pipe(proxy);
}

const gateway = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix)) || MACHINE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || isStatic(pathname)) {
    return forward(request, response, null);
  }

  const identity = await resolveIdentity(request, response);
  if (!identity) {
    if (pathname.startsWith('/api/')) return sendJson(response, 401, { error: 'SPMT session required' });
    const returnPath = `${pathname}${url.search}`;
    response.writeHead(302, {
      location: `/auth/login?return=${encodeURIComponent(returnPath)}`,
      'cache-control': 'no-store',
    });
    return response.end();
  }

  if (ADMIN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix)) && !identityIsAdmin(identity)) {
    return sendJson(response, 403, { error: 'SPMT admin required' });
  }
  return forward(request, response, identity);
});

gateway.on('upgrade', (request, socket, head) => {
  const upstream = net.connect(INTERNAL_PORT, '127.0.0.1', () => {
    const lines = [`${request.method} ${request.url} HTTP/${request.httpVersion}`];
    for (const [name, value] of Object.entries(request.headers)) {
      if (value !== undefined) lines.push(`${name}: ${Array.isArray(value) ? value.join(', ') : value}`);
    }
    upstream.write(`${lines.join('\r\n')}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
});

process.env.PORT = String(INTERNAL_PORT);
await import('./server.js');
gateway.listen(PUBLIC_PORT, '0.0.0.0', () => {
  console.log(`SpaceMountain SPMT auth gateway listening on ${PUBLIC_PORT}; app on ${INTERNAL_PORT}`);
});
