import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { EmbedSlot, UserPreferences, WorkspaceProfileV1 } from '../types';
import {
  createWorkspaceProfileDraft,
  embedSlotsToWorkspaceDockSlots,
  fetchWorkspaceProfile,
  patchWorkspaceProfile,
  resetWorkspaceProfile,
  workspaceAppearanceToPreferences,
  workspaceDockSlotsToEmbedSlots,
  workspaceDraftSignature,
  type WorkspaceProfileDraft,
} from '../lib/workspace-profile';

export type WorkspaceSaveStatus = 'signed-out' | 'loading' | 'saved' | 'unsaved' | 'saving' | 'offline' | 'conflict' | 'error';

type SaveQueueItem = { draft: WorkspaceProfileDraft; signature: string };

type PortableWorkspaceOptions = {
  identityId: string | null;
  token: string;
  baseUrl: string;
  preferences: UserPreferences;
  embedSlots: EmbedSlot[];
  defaultPreferences: UserPreferences;
  defaultEmbedSlots: EmbedSlot[];
  setPreferences: Dispatch<SetStateAction<UserPreferences>>;
  setEmbedSlots: Dispatch<SetStateAction<EmbedSlot[]>>;
};

const legacySlotsKey = 'spmtEmbedSlots';
const cacheKey = (identityId: string) => `spmtWorkspaceProfileV1Cache:${identityId}`;
const migrationKey = (identityId: string) => `spmtWorkspaceProfileV1Migrated:${identityId}`;

function readJson<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || 'null') as T | null; } catch { return null; }
}

export function usePortableWorkspace(options: PortableWorkspaceOptions) {
  const {
    identityId,
    token,
    baseUrl,
    preferences,
    embedSlots,
    defaultPreferences,
    defaultEmbedSlots,
    setPreferences,
    setEmbedSlots,
  } = options;
  const [profile, setProfile] = useState<WorkspaceProfileV1 | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<WorkspaceSaveStatus>('signed-out');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const profileRef = useRef<WorkspaceProfileV1 | null>(null);
  const lastSavedSignatureRef = useRef('');
  const savingRef = useRef(false);
  const pendingRef = useRef<SaveQueueItem | null>(null);
  const retryRef = useRef<SaveQueueItem | null>(null);
  const mountedIdentityRef = useRef<string | null>(null);
  const loadedIdentityRef = useRef<string | null>(null);
  const saveGenerationRef = useRef(0);

  const applyProfile = useCallback((next: WorkspaceProfileV1, sourceSlots = defaultEmbedSlots) => {
    const nextPreferences = workspaceAppearanceToPreferences(next.appearance, identityId || defaultPreferences.userId, defaultPreferences);
    const nextSlots = workspaceDockSlotsToEmbedSlots(next.dockSlots, sourceSlots);
    const signature = workspaceDraftSignature(createWorkspaceProfileDraft(nextPreferences, nextSlots, next));
    profileRef.current = next;
    lastSavedSignatureRef.current = signature;
    setProfile(next);
    setPreferences(nextPreferences);
    setEmbedSlots(nextSlots);
    setLastSavedAt(next.updatedAt);
    if (identityId) localStorage.setItem(cacheKey(identityId), JSON.stringify(next));
  }, [defaultEmbedSlots, defaultPreferences, identityId, setEmbedSlots, setPreferences]);

  const queueSave = useCallback((item: SaveQueueItem) => {
    pendingRef.current = item;
    if (savingRef.current || !identityId || !token) return;
    savingRef.current = true;
    const generation = saveGenerationRef.current;

    const drain = async () => {
      while (generation === saveGenerationRef.current && pendingRef.current && profileRef.current) {
        const queued = pendingRef.current;
        pendingRef.current = null;
        if (!navigator.onLine) {
          retryRef.current = queued;
          setStatus('offline');
          setError('You are offline. Your changes are cached on this device and can be retried when the connection returns.');
          break;
        }
        setStatus('saving');
        setError(null);
        try {
          const result = await patchWorkspaceProfile(baseUrl, token, profileRef.current.revision, queued.draft);
          if (generation !== saveGenerationRef.current || mountedIdentityRef.current !== identityId) return;
          profileRef.current = result.profile;
          setProfile(result.profile);
          lastSavedSignatureRef.current = queued.signature;
          retryRef.current = null;
          setLastSavedAt(result.profile.updatedAt);
          setStatus('saved');
          localStorage.setItem(cacheKey(identityId), JSON.stringify(result.profile));
        } catch (saveError: any) {
          if (generation !== saveGenerationRef.current || mountedIdentityRef.current !== identityId) return;
          if (saveError?.conflict) {
            profileRef.current = saveError.conflict;
            setProfile(saveError.conflict);
            retryRef.current = queued;
            setStatus('conflict');
            setError('This workspace changed on another device. Retry to save your current screen over the newer revision, or reload to use the other device version.');
          } else {
            retryRef.current = queued;
            setStatus(navigator.onLine ? 'error' : 'offline');
            setError(saveError instanceof Error ? saveError.message : 'Workspace save failed');
          }
          break;
        }
      }
      if (generation !== saveGenerationRef.current) return;
      savingRef.current = false;
      if (pendingRef.current && !retryRef.current) queueSave(pendingRef.current);
    };
    void drain();
  }, [baseUrl, identityId, token]);

  useEffect(() => {
    mountedIdentityRef.current = identityId;
    loadedIdentityRef.current = null;
    saveGenerationRef.current += 1;
    pendingRef.current = null;
    retryRef.current = null;
    savingRef.current = false;
    setError(null);
    if (!identityId || !token) {
      profileRef.current = null;
      lastSavedSignatureRef.current = '';
      setProfile(null);
      setLoaded(false);
      setStatus('signed-out');
      setLastSavedAt(null);
      setPreferences({ ...defaultPreferences });
      setEmbedSlots(defaultEmbedSlots.map((slot) => ({ ...slot })));
      return;
    }

    let cancelled = false;
    setLoaded(false);
    setStatus('loading');
    const load = async () => {
      try {
        const response = await fetchWorkspaceProfile(baseUrl, token);
        if (cancelled || mountedIdentityRef.current !== identityId) return;
        let next = response.profile;
        const legacySlots = readJson<EmbedSlot[]>(legacySlotsKey);
        const alreadyMigrated = localStorage.getItem(migrationKey(identityId)) === '1';
        const serverIsDefault = next.revision === 1
          && next.dockSlots[0]?.title === defaultEmbedSlots[0]?.title
          && next.dockSlots[1]?.title === defaultEmbedSlots[1]?.title
          && next.dockSlots[2]?.title === defaultEmbedSlots[2]?.title;
        if (!alreadyMigrated && serverIsDefault && Array.isArray(legacySlots) && legacySlots.length === 3) {
          const draft = createWorkspaceProfileDraft(
            workspaceAppearanceToPreferences(next.appearance, identityId, defaultPreferences),
            workspaceDockSlotsToEmbedSlots(embedSlotsToWorkspaceDockSlots(legacySlots), defaultEmbedSlots),
            next,
          );
          const migrated = await patchWorkspaceProfile(baseUrl, token, next.revision, draft);
          next = migrated.profile;
        }
        localStorage.setItem(migrationKey(identityId), '1');
        localStorage.removeItem(legacySlotsKey);
        applyProfile(next, defaultEmbedSlots);
        loadedIdentityRef.current = identityId;
        setLoaded(true);
        setStatus('saved');
      } catch (loadError) {
        if (cancelled || mountedIdentityRef.current !== identityId) return;
        const cached = readJson<WorkspaceProfileV1>(cacheKey(identityId));
        if (cached?.schemaVersion === 1) {
          applyProfile(cached, defaultEmbedSlots);
          loadedIdentityRef.current = identityId;
          setLoaded(true);
          setStatus(navigator.onLine ? 'error' : 'offline');
          setError('SPMT could not refresh this workspace. Showing the last device cache; retry before relying on it elsewhere.');
        } else {
          setLoaded(false);
          setStatus(navigator.onLine ? 'error' : 'offline');
          setError(loadError instanceof Error ? loadError.message : 'Workspace profile could not be loaded');
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [applyProfile, baseUrl, defaultEmbedSlots, defaultPreferences, identityId, setEmbedSlots, setPreferences, token]);

  useEffect(() => {
    if (!loaded || !identityId || loadedIdentityRef.current !== identityId || !profileRef.current) return;
    const draft = createWorkspaceProfileDraft(preferences, embedSlots, profileRef.current);
    const signature = workspaceDraftSignature(draft);
    const cachedProfile = { ...profileRef.current, ...draft };
    localStorage.setItem(cacheKey(identityId), JSON.stringify(cachedProfile));
    if (signature === lastSavedSignatureRef.current) return;
    setStatus(navigator.onLine ? 'unsaved' : 'offline');
    const timer = window.setTimeout(() => queueSave({ draft, signature }), 800);
    return () => window.clearTimeout(timer);
  }, [embedSlots, identityId, loaded, preferences, queueSave]);

  const retry = useCallback(() => {
    if (!identityId || !profileRef.current) return;
    const item = retryRef.current || {
      draft: createWorkspaceProfileDraft(preferences, embedSlots, profileRef.current),
      signature: workspaceDraftSignature(createWorkspaceProfileDraft(preferences, embedSlots, profileRef.current)),
    };
    retryRef.current = null;
    queueSave(item);
  }, [embedSlots, identityId, preferences, queueSave]);

  const reload = useCallback(async () => {
    if (!identityId || !token) return;
    const requestedIdentity = identityId;
    setStatus('loading');
    setError(null);
    try {
      const response = await fetchWorkspaceProfile(baseUrl, token);
      if (mountedIdentityRef.current !== requestedIdentity) return;
      applyProfile(response.profile, defaultEmbedSlots);
      loadedIdentityRef.current = requestedIdentity;
      retryRef.current = null;
      pendingRef.current = null;
      setLoaded(true);
      setStatus('saved');
    } catch (reloadError) {
      if (mountedIdentityRef.current !== requestedIdentity) return;
      setStatus(navigator.onLine ? 'error' : 'offline');
      setError(reloadError instanceof Error ? reloadError.message : 'Workspace reload failed');
    }
  }, [applyProfile, baseUrl, defaultEmbedSlots, identityId, token]);

  const reset = useCallback(async () => {
    if (!identityId || !token || !profileRef.current) return;
    const requestedIdentity = identityId;
    setStatus('saving');
    setError(null);
    try {
      const response = await resetWorkspaceProfile(baseUrl, token, profileRef.current.revision);
      if (mountedIdentityRef.current !== requestedIdentity) return;
      applyProfile(response.profile, defaultEmbedSlots);
      loadedIdentityRef.current = requestedIdentity;
      retryRef.current = null;
      pendingRef.current = null;
      setLoaded(true);
      setStatus('saved');
    } catch (resetError) {
      if (mountedIdentityRef.current !== requestedIdentity) return;
      setStatus(navigator.onLine ? 'error' : 'offline');
      setError(resetError instanceof Error ? resetError.message : 'Workspace reset failed');
    }
  }, [applyProfile, baseUrl, defaultEmbedSlots, identityId, token]);

  const updateProfileFields = useCallback((patch: Partial<Pick<WorkspaceProfileV1, 'activeOverlaySceneId' | 'ttsSubscriptions' | 'appThemeMappings' | 'savedThemes'>>) => {
    if (!loaded || !identityId || loadedIdentityRef.current !== identityId || !profileRef.current) return;
    const nextProfile = { ...profileRef.current, ...patch };
    profileRef.current = nextProfile;
    setProfile(nextProfile);
    if (identityId) localStorage.setItem(cacheKey(identityId), JSON.stringify(nextProfile));
    const draft = createWorkspaceProfileDraft(preferences, embedSlots, nextProfile);
    const signature = workspaceDraftSignature(draft);
    setStatus(navigator.onLine ? 'unsaved' : 'offline');
    queueSave({ draft, signature });
  }, [embedSlots, identityId, loaded, preferences, queueSave]);

  useEffect(() => {
    const handleOnline = () => {
      if (status === 'offline' && retryRef.current) retry();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [retry, status]);

  return { profile, loaded, status, lastSavedAt, error, retry, reload, reset, updateProfileFields };
}
