'use strict';

// Runtime OAuth guard: signed state survives mobile/cross-host redirects without weakening CSRF checks.
const crypto = require('node:crypto');

const SPMT_BASE_URL = String(process.env.SPMT_BASE_URL || 'https://spmt.live').replace(/\/$/, '');
const SPMT_CLIENT_ID = 'spacemountain-live';
const CALLBACK_URL = 'https://spacemountain.live/auth/callback';
const SESSION_COOKIE = 'spacemountain_spmt_session';
const REFRESH_COOKIE = 'spacemountain_spmt_refresh';
const STATE_TTL_MS = 10 * 60 * 1000;

function clientSecret() {
  return String(process.env.SPACEMOUNTAIN_CLIENT_SECRET || '').trim();
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function signState(returnPath) {
  const secret = clientSecret();
  if (!secret) return '';
  const payload = base64urlJson({
    v: 1,
    exp: Date.now() + STATE_TTL_MS,
    nonce: crypto.randomBytes(24).toString('base64url'),
    returnPath: safeLocalReturnPath(returnPath),
  });
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `v1.${payload}.${signature}`;
}

function verifyState(state) {
  const secret = clientSecret();
  const parts = String(state || '').split('.');
  if (!secret || parts.length !== 3 || parts[0] !== 'v1') return null;
  const [, payload, suppliedSignature] = parts;
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data?.v !== 1 || !Number.isFinite(data?.exp) || data.exp < Date.now()) return null;
    return { returnPath: safeLocalReturnPath(data.returnPath) };
  } catch {
    return null;
  }
}

function safeLocalReturnPath(value) {
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

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    domain: '.spacemountain.live',
    maxAge,
  };
}

function installRoutes(app) {
  if (app.__spaceMountainSignedOauthStateInstalled) return;
  app.__spaceMountainSignedOauthStateInstalled = true;

  app.get('/auth/login', (req, res) => {
    const secret = clientSecret();
    if (!secret) return res.status(503).send('SpaceMountain SPMT OAuth is not configured.');

    const returnPath = safeLocalReturnPath(req.query?.return);
    const state = signState(returnPath);
    if (!state) return res.status(503).send('SpaceMountain SPMT OAuth is not configured.');

    // Keep the legacy cookies during rollout, but state validation no longer depends on them.
    res.cookie('spacemountain_oauth_state', state, cookieOptions(STATE_TTL_MS));
    res.cookie('spacemountain_oauth_return', returnPath, cookieOptions(STATE_TTL_MS));

    const authorizePath = `/api/oauth/authorize?client_id=${encodeURIComponent(SPMT_CLIENT_ID)}&redirect_uri=${encodeURIComponent(CALLBACK_URL)}&state=${encodeURIComponent(state)}`;
    return res.redirect(`${SPMT_BASE_URL}/?return=${encodeURIComponent(authorizePath)}`);
  });

  app.get('/auth/callback', async (req, res) => {
    const code = String(req.query?.code || '').trim();
    const state = String(req.query?.state || '').trim();
    const verified = verifyState(state);

    if (!code || !verified) {
      // A stale browser tab or old callback should restart authentication instead of dead-ending.
      return res.redirect('/auth/login');
    }

    const secret = clientSecret();
    if (!secret) return res.status(503).send('SpaceMountain SPMT OAuth is not configured.');

    try {
      const exchange = await fetch(`${SPMT_BASE_URL}/api/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          code,
          client_id: SPMT_CLIENT_ID,
          client_secret: secret,
          redirect_uri: CALLBACK_URL,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = await exchange.json().catch(() => null);
      if (!exchange.ok || !data?.access_token) {
        console.warn('[OAuthState] SPMT sign-in exchange failed', { status: exchange.status });
        return res.status(401).send('SPMT sign-in exchange failed.');
      }

      res.cookie(SESSION_COOKIE, String(data.access_token), cookieOptions(30 * 24 * 60 * 60 * 1000));
      if (data.refresh_token) {
        res.cookie(REFRESH_COOKIE, String(data.refresh_token), cookieOptions(30 * 24 * 60 * 60 * 1000));
      }
      res.clearCookie('spacemountain_oauth_state', cookieOptions(0));
      res.clearCookie('spacemountain_oauth_return', cookieOptions(0));
      return res.redirect(verified.returnPath);
    } catch (error) {
      console.error('[OAuthState] SPMT sign-in callback failed', error?.message || error);
      return res.status(502).send('SPMT sign-in is temporarily unavailable.');
    }
  });
}

function patchExpress() {
  const expressPath = require.resolve('express');
  const currentExpress = require(expressPath);
  if (currentExpress.__spaceMountainSignedOauthStateFactory) return;

  function wrappedExpress(...args) {
    const app = currentExpress(...args);
    installRoutes(app);
    return app;
  }
  for (const key of Object.keys(currentExpress)) wrappedExpress[key] = currentExpress[key];
  wrappedExpress.__spaceMountainSignedOauthStateFactory = true;
  require.cache[expressPath].exports = wrappedExpress;
}

patchExpress();
require('./dist/server.cjs');

module.exports = { signState, verifyState, safeLocalReturnPath };
