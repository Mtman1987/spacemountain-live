import crypto from 'node:crypto';
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

function safeLocalReturnPath(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  try {
    const parsed = new URL(raw, 'https://spacemountain.live');
    return parsed.origin === 'https://spacemountain.live'
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : '/';
  } catch {
    return '/';
  }
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

function sendLoginPage(response: http.ServerResponse, returnPath: string) {
  const continueUrl = `/auth/continue?return=${encodeURIComponent(returnPath)}`;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to SpaceMountain.live</title>
  <style>
    *{box-sizing:border-box}html{color-scheme:dark}body{margin:0;min-height:100vh;color:#f8fafc;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#03050b;overflow-x:hidden}body:before{content:"";position:fixed;inset:-3%;z-index:-2;background-image:linear-gradient(180deg,rgba(2,6,18,.24),rgba(2,6,18,.72)),url('/assets/theme-solar-flare-background.webp');background-size:cover;background-position:center;filter:saturate(1.05) brightness(.9)}body:after{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(circle at 22% 18%,rgba(249,115,22,.18),transparent 30rem),radial-gradient(circle at 80% 72%,rgba(251,191,36,.1),transparent 28rem)}a{text-decoration:none}.page{width:min(1160px,calc(100% - 32px));margin:0 auto;padding:6vh 0}.hero{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.72fr);gap:34px;align-items:center;border:1px solid rgba(249,115,22,.28);border-radius:26px;padding:clamp(28px,5vw,54px);background:linear-gradient(135deg,rgba(249,115,22,.12),rgba(0,0,0,.12)),rgba(6,8,20,.46);backdrop-filter:blur(24px);box-shadow:0 28px 90px rgba(0,0,0,.42),0 0 34px rgba(249,115,22,.12)}.hero:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 15% 15%,rgba(249,115,22,.2),transparent 36%);pointer-events:none}.copy,.art{position:relative;z-index:1}.logo{width:min(340px,78vw);max-height:150px;object-fit:contain;filter:drop-shadow(0 0 24px rgba(249,115,22,.34))}.kicker{display:inline-flex;align-items:center;gap:8px;margin-top:20px;border:1px solid rgba(249,115,22,.25);border-radius:999px;background:rgba(0,0,0,.28);padding:7px 11px;color:#e8edf5;font-size:10px;font-weight:900;letter-spacing:.17em;text-transform:uppercase}.kicker:before{content:"";width:7px;height:7px;border-radius:50%;background:#f97316;box-shadow:0 0 12px #f97316}h1{margin:16px 0 0;max-width:720px;font-size:clamp(36px,6vw,68px);line-height:.98;letter-spacing:-.05em}p{max-width:680px;margin:18px 0 0;color:#b2bccd;font-size:clamp(14px,2vw,17px);line-height:1.7}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border:1px solid rgba(255,255,255,.12);border-radius:13px;padding:10px 16px;background:rgba(255,255,255,.04);color:#f8fafc;font-size:13px;font-weight:900}.button.primary{border-color:transparent;background:linear-gradient(135deg,#f97316,#fbbf24);color:#090b10;box-shadow:0 10px 28px rgba(249,115,22,.2)}.art{display:grid;place-items:center}.rocket-wrap{width:min(280px,68vw);aspect-ratio:1;border:1px solid rgba(249,115,22,.2);border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,rgba(249,115,22,.14),rgba(0,0,0,.12) 58%,rgba(0,0,0,.28));box-shadow:inset 0 0 70px rgba(0,0,0,.55),0 0 44px rgba(249,115,22,.1)}.rocket{width:64%;height:64%;object-fit:contain;filter:drop-shadow(0 0 24px rgba(249,115,22,.55))}.note{margin-top:18px;text-align:center;color:#798296;font-size:11px}.note a{color:#c7ceda}.note a:hover{color:white}@media(max-width:800px){.page{padding:20px 0}.hero{grid-template-columns:1fr;padding:26px}.art{order:-1}.rocket-wrap{width:150px}.logo{max-height:92px}}
  </style>
</head>
<body>
  <main class="page">
    <section class="hero" aria-labelledby="welcome-title">
      <div class="copy">
        <img class="logo" src="/assets/space-logo-main.png" alt="SpaceMountain.live">
        <span class="kicker">One SPMT identity · every SpaceMountain app</span>
        <h1 id="welcome-title">Welcome to your SpaceMountain.</h1>
        <p>Sign in once through SPMT and your identity, workspace appearance, Worktray, overlays, messages, and connected creator apps come with you.</p>
        <div class="actions">
          <a class="button primary" href="${continueUrl}">Continue with SPMT</a>
          <a class="button" href="/docs.html">Open Docs</a>
          <a class="button" href="https://spmt.live">Open SPMT</a>
        </div>
      </div>
      <div class="art" aria-hidden="true"><div class="rocket-wrap"><img class="rocket" src="/assets/model-rocket.png" alt=""></div></div>
    </section>
    <div class="note">SPMT is the account and workspace source of truth for SpaceMountain.live.</div>
  </main>
</body>
</html>`;
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'content-security-policy': "default-src 'self' https://spmt.live; img-src 'self' data: https:; style-src 'unsafe-inline'; frame-ancestors 'self'",
  });
  response.end(html);
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

  if (pathname === '/auth/login') {
    return sendLoginPage(response, safeLocalReturnPath(url.searchParams.get('return')));
  }

  if (pathname === '/auth/continue') {
    const state = crypto.randomBytes(24).toString('base64url');
    const returnPath = safeLocalReturnPath(url.searchParams.get('return'));
    setSessionCookie(response, 'spacemountain_oauth_state', state, 10 * 60);
    setSessionCookie(response, 'spacemountain_oauth_return', returnPath, 10 * 60);
    const callbackUrl = 'https://spacemountain.live/auth/callback';
    const authorizePath = `/api/oauth/authorize?client_id=${encodeURIComponent(SPMT_CLIENT_ID)}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(state)}`;
    response.writeHead(302, {
      location: `${SPMT_BASE_URL}/?return=${encodeURIComponent(authorizePath)}`,
      'cache-control': 'no-store',
    });
    return response.end();
  }

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
async function startGateway() {
  await import('./server.js');
  gateway.listen(PUBLIC_PORT, '0.0.0.0', () => {
    console.log(`SpaceMountain SPMT auth gateway listening on ${PUBLIC_PORT}; app on ${INTERNAL_PORT}`);
  });
}

void startGateway().catch((error) => {
  console.error('SpaceMountain SPMT auth gateway failed to start', error);
  process.exitCode = 1;
});
