import { readFile, writeFile } from 'node:fs/promises';

function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`session cache patch marker missing: ${label}`);
  return source.replace(from, to);
}

async function patchApp() {
  const path = 'src/App.tsx';
  let source = await readFile(path, 'utf8');
  if (source.includes("spmt.cache.v1.spacemountain.session")) return;

  const oldHelpers = `function storeSpmtSession(_token: string, _profile: UserProfile) {\n  localStorage.removeItem('spmtToken');\n  localStorage.removeItem('spmt_token');\n  localStorage.removeItem('spmtIdentity');\n}\n\nfunction clearSpmtSession() {\n  localStorage.removeItem('spmtToken');\n  localStorage.removeItem('spmt_token');\n  localStorage.removeItem('spmtIdentity');\n}`;
  const newHelpers = `const spmtSessionCacheKey = 'spmt.cache.v1.spacemountain.session';\n\nfunction readCachedSpmtIdentity(): UserProfile | null {\n  try {\n    const cached = JSON.parse(localStorage.getItem(spmtSessionCacheKey) || 'null');\n    return cached?.version === 1 && cached?.profile?.id ? cached.profile as UserProfile : null;\n  } catch {\n    return null;\n  }\n}\n\nfunction storeSpmtSession(_token: string, profile: UserProfile) {\n  localStorage.removeItem('spmtToken');\n  localStorage.removeItem('spmt_token');\n  localStorage.removeItem('spmtIdentity');\n  try {\n    localStorage.setItem(spmtSessionCacheKey, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), profile }));\n  } catch {}\n}\n\nfunction clearSpmtSession() {\n  localStorage.removeItem('spmtToken');\n  localStorage.removeItem('spmt_token');\n  localStorage.removeItem('spmtIdentity');\n  localStorage.removeItem(spmtSessionCacheKey);\n}`;
  source = replaceRequired(source, oldHelpers, newHelpers, 'SPMT identity cache helpers');

  source = replaceRequired(
    source,
    `  const [identity, setIdentity] = useState<UserProfile | null>(null);`,
    `  const [identity, setIdentity] = useState<UserProfile | null>(() => readCachedSpmtIdentity());`,
    'cached identity initial state',
  );

  const oldFailure = `    if (!response.ok) {\n      clearSpmtSession();\n      setIdentity(null);\n      return null;\n    }`;
  const newFailure = `    if (!response.ok) {\n      if (response.status === 401 || response.status === 403) {\n        clearSpmtSession();\n        setIdentity(null);\n        return null;\n      }\n      // Keep the restored shell on transient upstream failures.\n      return identity;\n    }`;
  source = replaceRequired(source, oldFailure, newFailure, 'definitive auth failure handling');

  await writeFile(path, source);
  console.log('patched SpaceMountain identity cache bootstrap');
}

async function patchWorkspace() {
  const path = 'src/hooks/usePortableWorkspace.ts';
  let source = await readFile(path, 'utf8');
  if (source.includes('const restoredCache = readJson<WorkspaceProfileV1>')) return;

  const oldStart = `    let cancelled = false;\n    setLoaded(false);\n    setStatus('loading');\n    const load = async () => {`;
  const newStart = `    let cancelled = false;\n    const restoredCache = readJson<WorkspaceProfileV1>(cacheKey(identityId));\n    if (restoredCache?.schemaVersion === 1) {\n      applyProfile(restoredCache, defaultEmbedSlots);\n      loadedIdentityRef.current = identityId;\n      setLoaded(true);\n      setStatus('loading');\n    } else {\n      setLoaded(false);\n      setStatus('loading');\n    }\n    const load = async () => {`;
  source = replaceRequired(source, oldStart, newStart, 'workspace cache-first restore');

  const oldCatch = `        const cached = readJson<WorkspaceProfileV1>(cacheKey(identityId));\n        if (cached?.schemaVersion === 1) {\n          applyProfile(cached, defaultEmbedSlots);\n          loadedIdentityRef.current = identityId;\n          setLoaded(true);\n          setStatus(navigator.onLine ? 'error' : 'offline');\n          setError('SPMT could not refresh this workspace. Showing the last device cache; retry before relying on it elsewhere.');`;
  const newCatch = `        const cached = readJson<WorkspaceProfileV1>(cacheKey(identityId));\n        if (cached?.schemaVersion === 1) {\n          if (!restoredCache) applyProfile(cached, defaultEmbedSlots);\n          loadedIdentityRef.current = identityId;\n          setLoaded(true);\n          setStatus(navigator.onLine ? 'error' : 'offline');\n          setError('SPMT could not refresh this workspace. Showing the last device cache; retry before relying on it elsewhere.');`;
  source = replaceRequired(source, oldCatch, newCatch, 'workspace transient fallback');

  await writeFile(path, source);
  console.log('patched SpaceMountain workspace cache bootstrap');
}

await patchApp();
await patchWorkspace();
