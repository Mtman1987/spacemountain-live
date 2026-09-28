import test from 'node:test';
import assert from 'node:assert/strict';
import { rollDiscoveryChance, DISCOVERY_COOLDOWN_MS } from '../src/lib/egg-discovery-chance';

const blank = () => ({ attempts: 0, lastAttemptAt: 0, lastOpenedAt: 0 });
test('both rocket clicks and normal navigation can discover the portal', () => {
  for (const source of ['rocket', 'navigation'] as const) {
    assert.equal(rollDiscoveryChance(blank(), source, 10_000, () => 0).open, true);
    assert.equal(rollDiscoveryChance(blank(), source, 10_000, () => .99).open, false);
  }
});
test('click spam does not get extra rolls, and discovering has a thirty-minute cooldown', () => {
  const failed = rollDiscoveryChance(blank(), 'navigation', 10_000, () => .99);
  let rolls = 0;
  assert.equal(rollDiscoveryChance(failed.state, 'rocket', 10_001, () => { rolls++; return 0; }).open, false);
  assert.equal(rolls, 0);
  const found = rollDiscoveryChance(failed.state, 'rocket', 20_000, () => 0);
  assert.equal(rollDiscoveryChance(found.state, 'rocket', 20_000 + DISCOVERY_COOLDOWN_MS - 1, () => 0).open, false);
  assert.equal(rollDiscoveryChance(found.state, 'rocket', 20_000 + DISCOVERY_COOLDOWN_MS, () => 0).open, true);
});
test('an unlucky hunter gets a discovery by thirty eligible interactions', () => {
  let state = blank();
  for (let i = 1; i <= 30; i++) {
    const result = rollDiscoveryChance(state, 'navigation', i * 10_000, () => .999);
    assert.equal(result.open, i === 30);
    state = result.state;
  }
  assert.equal(state.attempts, 0);
});
