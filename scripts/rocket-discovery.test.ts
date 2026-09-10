import test from 'node:test';
import assert from 'node:assert/strict';
import { createRocketDiscoveryRecorder, ROCKET_PENDING_KEY } from '../src/lib/rocket-discovery';

function fixture() {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  let user = 'tenant-a';
  let fail = false;
  let confirm = true;
  const writes: string[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    assert.ok(init?.signal, 'both identity lookup and completion must be bounded');
    if (url.endsWith('/api/me')) return new Response(JSON.stringify({ user: { id: user } }));
    const { userId } = JSON.parse(String(init?.body));
    writes.push(userId);
    if (fail) throw new Error('response lost');
    if (userId !== user) return new Response('{}', { status: 409 });
    return new Response(JSON.stringify({ data: { eggs: { rocket: { completed: confirm } } } }));
  }) as typeof fetch;
  return { storage, writes, fetcher, setUser: (value: string) => { user = value; }, setFail: (value: boolean) => { fail = value; }, setConfirm: (value: boolean) => { confirm = value; } };
}

test('lost completion responses survive reload and retry for the original account', async () => {
  const f = fixture(); f.setFail(true);
  const first = createRocketDiscoveryRecorder(f.fetcher, f.storage);
  assert.equal((await first.record()).status, 'pending');
  assert.deepEqual(JSON.parse(f.storage.getItem(ROCKET_PENDING_KEY)!), ['tenant-a']);
  f.setFail(false);
  const reload = createRocketDiscoveryRecorder(f.fetcher, f.storage);
  assert.equal((await reload.retry()).status, 'retained');
  assert.equal(f.storage.getItem(ROCKET_PENDING_KEY), null);
  assert.deepEqual(f.writes, ['tenant-a', 'tenant-a']);
});

test('signing into another account never transfers pending completion', async () => {
  const f = fixture(); f.setFail(true);
  const recorder = createRocketDiscoveryRecorder(f.fetcher, f.storage);
  await recorder.record();
  f.setFail(false); f.setUser('tenant-b');
  assert.equal((await recorder.retry()).status, 'idle');
  assert.deepEqual(f.writes, ['tenant-a']);
  f.setUser('tenant-a');
  assert.equal((await recorder.retry()).status, 'retained');
});

test('HTTP success without confirmed canonical completion keeps the receipt pending', async () => {
  const f = fixture(); f.setConfirm(false);
  const recorder = createRocketDiscoveryRecorder(f.fetcher, f.storage);
  assert.equal((await recorder.record()).status, 'pending');
  assert.equal(recorder.hasPending(), true);
  f.setConfirm(true);
  assert.equal((await recorder.retry()).status, 'retained');
});

test('multiple retry triggers coalesce into one write and an empty queue performs no request', async () => {
  const f = fixture(); const recorder = createRocketDiscoveryRecorder(f.fetcher, f.storage);
  assert.equal((await recorder.retry()).status, 'idle');
  await Promise.all([recorder.record(), recorder.retry(), recorder.retry()]);
  assert.deepEqual(f.writes, ['tenant-a']);
});

test('guests do not leave a receipt that can be granted to a later account', async () => {
  let authenticated = false;
  const f = fixture();
  const fetcher = ((url: any, init: any) => authenticated ? f.fetcher(url, init) : Promise.resolve(new Response('{}', { status: 401 }))) as typeof fetch;
  const recorder = createRocketDiscoveryRecorder(fetcher, f.storage);
  assert.equal((await recorder.record()).status, 'sign-in');
  authenticated = true;
  assert.equal((await recorder.retry()).status, 'idle');
  assert.deepEqual(f.writes, []);
});

test('disabled browser storage still permits in-memory retries', async () => {
  const f = fixture(); f.setFail(true);
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const recorder = createRocketDiscoveryRecorder(f.fetcher, storage);
  assert.equal((await recorder.record()).status, 'pending');
  f.setFail(false);
  assert.equal((await recorder.retry()).status, 'retained');
});
