import fs from 'node:fs';

const source = fs.readFileSync('server.ts', 'utf8');

const required = [
  'DSH_STATUS_SUCCESS_TTL_MS = 30_000',
  'DSH_STATUS_MAX_STALE_MS = 5 * 60_000',
  'DSH_STATUS_FAILURE_BACKOFF_MS = 60_000',
  'DSH_STATUS_WARN_INTERVAL_MS = 60_000',
  'capturedAt',
  'staleDshCommunityStatus',
  'dshCommunityStatusInFlight',
  'dshCommunityStatusBackoffUntil',
  'return stale || dshCommunityStatusInFlight',
  "console.warn('[Community] DSH status unavailable; backing off upstream probes:'",
  'AbortSignal.timeout(5000)',
];

for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`Missing DSH resilience marker: ${marker}`);
}

if (source.includes("console.warn('[Community] DSH status fetch failed:', url, error)")) {
  throw new Error('Per-request DSH timeout warning remains and can amplify an upstream outage');
}
if (!source.includes('now - dshCommunityStatusCache.capturedAt <= DSH_STATUS_MAX_STALE_MS')) {
  throw new Error('DSH last-known-good status is not bounded by maximum staleness');
}

console.log('DSH community status resilience contract passed.');
