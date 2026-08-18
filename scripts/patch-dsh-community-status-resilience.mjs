import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'server.ts');
const original = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
let source = original;

const before = `async function fetchDshCommunityStatus() {
  const urls = [DSH_COMMUNITY_SPOTLIGHT_URL, DSH_COMMUNITY_ONLINE_URL].filter(Boolean);
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (!response.ok) continue;
      const data = await response.json();
      const users = Array.isArray(data?.users) ? data.users : [];
      return {
        source: data?.source || 'discord-stream-hub',
        users,
        spotlight: data?.spotlight || null,
      };
    } catch (error) {
      console.warn('[Community] DSH status fetch failed:', url, error);
    }
  }
  return null;
}`;

const after = `const DSH_STATUS_SUCCESS_TTL_MS = 30_000;
const DSH_STATUS_MAX_STALE_MS = 5 * 60_000;
const DSH_STATUS_FAILURE_BACKOFF_MS = 60_000;
const DSH_STATUS_WARN_INTERVAL_MS = 60_000;
let dshCommunityStatusCache: { value: any; expiresAt: number; capturedAt: number } = { value: null, expiresAt: 0, capturedAt: 0 };
let dshCommunityStatusInFlight: Promise<any> | null = null;
let dshCommunityStatusBackoffUntil = 0;
let dshCommunityStatusLastWarnAt = 0;

function staleDshCommunityStatus(now = Date.now()) {
  if (!dshCommunityStatusCache.value || !dshCommunityStatusCache.capturedAt) return null;
  return now - dshCommunityStatusCache.capturedAt <= DSH_STATUS_MAX_STALE_MS
    ? dshCommunityStatusCache.value
    : null;
}

async function fetchDshCommunityStatus() {
  const now = Date.now();
  if (dshCommunityStatusCache.expiresAt > now) return dshCommunityStatusCache.value;

  const stale = staleDshCommunityStatus(now);
  if (dshCommunityStatusInFlight) return stale || dshCommunityStatusInFlight;
  if (dshCommunityStatusBackoffUntil > now) return stale;

  dshCommunityStatusInFlight = (async () => {
    const urls = [DSH_COMMUNITY_SPOTLIGHT_URL, DSH_COMMUNITY_ONLINE_URL].filter(Boolean);
    let lastFailure = 'no DSH community endpoint configured';
    for (const url of urls) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) {
          lastFailure = \`${'${url}'} HTTP ${'${response.status}'}\`;
          continue;
        }
        const data = await response.json();
        const users = Array.isArray(data?.users) ? data.users : [];
        const value = {
          source: data?.source || 'discord-stream-hub',
          users,
          spotlight: data?.spotlight || null,
        };
        const capturedAt = Date.now();
        dshCommunityStatusCache = {
          value,
          capturedAt,
          expiresAt: capturedAt + DSH_STATUS_SUCCESS_TTL_MS,
        };
        dshCommunityStatusBackoffUntil = 0;
        return value;
      } catch (error) {
        lastFailure = \`${'${url}'} ${'${error instanceof Error ? error.message : String(error)}'}\`;
      }
    }

    dshCommunityStatusBackoffUntil = Date.now() + DSH_STATUS_FAILURE_BACKOFF_MS;
    if (Date.now() - dshCommunityStatusLastWarnAt >= DSH_STATUS_WARN_INTERVAL_MS) {
      dshCommunityStatusLastWarnAt = Date.now();
      console.warn('[Community] DSH status unavailable; backing off upstream probes:', lastFailure);
    }
    return staleDshCommunityStatus();
  })().finally(() => {
    dshCommunityStatusInFlight = null;
  });

  // Stale-while-revalidate: callers keep a bounded last-known-good view while
  // one background probe refreshes it. With no safe stale value, await the probe
  // so the first successful fetch can still populate the response.
  return stale || dshCommunityStatusInFlight;
}`;

if (source.includes(before)) {
  source = source.replace(before, after);
} else if (!source.includes('DSH_STATUS_MAX_STALE_MS') || !source.includes('staleDshCommunityStatus')) {
  throw new Error('DSH community status fetch marker missing or stale resilience implementation detected');
}

if (source !== original) fs.writeFileSync(file, source, 'utf8');
console.log('DSH community status resilience patch applied.');
