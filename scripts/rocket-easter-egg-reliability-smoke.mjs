import fs from 'node:fs';

const source = fs.readFileSync('src/rocket-easter-egg.ts', 'utf8');

const required = [
  "const EGG_APP_ID = 'spacemountain-live'",
  "const EGG_NAMESPACE = 'easter-eggs'",
  'DISCOVERY_TIMEOUT_MS = 6000',
  'persistRocketDiscovery(retryOnConflict = true, signal?: AbortSignal)',
  "headers['If-Match']",
  'response.status === 409 && retryOnConflict',
  'AbortSignal.timeout(DISCOVERY_TIMEOUT_MS)',
  'discoveryInFlight',
  "detail: { egg: 'rocket'",
  'ROCKET DISCOVERY RETAINED',
  'ROCKET DISCOVERY NOT RETAINED',
  'void recordRocketDiscovery().then(showRocketPersistenceNotice)',
  "window.history.pushState({ activeTab: 'arena', easterEgg: 'rocket' }",
];

for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`Missing rocket reliability marker: ${marker}`);
}

if (!source.includes('signal,')) throw new Error('Rocket app-state write is not bounded by an abort signal');
if (!source.includes('completed: true')) throw new Error('Rocket canonical completion flag is missing');

console.log('Rocket Easter egg reliability contract passed.');
