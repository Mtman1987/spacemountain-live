import type {
  EmbedSlot,
  UserPreferences,
  WorkspaceAppearanceV1,
  WorkspaceDockSlotV1,
  WorkspaceProfileV1,
} from '../types';
import { normalizeAppSurface } from './app-surfaces';

export type WorkspaceProfileResponse = {
  profile: WorkspaceProfileV1;
  created?: boolean;
  changed?: string[];
  reset?: boolean;
};

export type WorkspaceProfileDraft = Pick<
  WorkspaceProfileV1,
  'appearance' | 'dockSlots' | 'activeOverlaySceneId' | 'ttsSubscriptions' | 'appThemeMappings' | 'savedThemes'
>;

export function preferencesToWorkspaceAppearance(preferences: UserPreferences): WorkspaceAppearanceV1 {
  return {
    themeId: preferences.theme,
    accentColor: preferences.accentColor,
    accentSaturation: preferences.accentSaturation,
    glowIntensity: preferences.glowIntensity,
    starDensity: preferences.starDensity,
    glassOpacity: preferences.glassOpacity,
    blurStrength: preferences.blurStrength,
    nebulaIntensity: preferences.nebulaIntensity,
    parallaxDepth: preferences.parallaxDepth,
    borderStrength: preferences.borderStrength,
    borderGlow: preferences.borderGlow,
    hoverGlow: preferences.hoverGlow,
    cornerRadius: preferences.cornerRadius,
    density: preferences.uiDensity,
    sidebarCollapsed: preferences.sidebarCollapsed,
    sidebarStyle: preferences.sidebarStyle,
    sidebarPosition: preferences.sidebarPosition,
    topbarStyle: preferences.topbarStyle,
    tabStyle: preferences.tabStyle,
    tabPosition: preferences.tabPosition,
    chatTransparency: preferences.chatTransparency,
    showAvatars: preferences.showAvatars,
    smoothTransitions: preferences.smoothTransitions,
    pushToTalk: preferences.pushToTalk,
    pushToTalkKey: preferences.pushToTalkKey,
    micButtonStyle: preferences.micButtonStyle,
    voiceWaveStyle: preferences.voiceWaveStyle,
    accessibility: {
      highContrast: preferences.highContrast,
      colorVisionMode: preferences.colorVisionMode,
      textScale: preferences.textScale,
      reduceMotion: preferences.reduceMotion,
      focusHighlight: preferences.focusHighlight,
    },
    animation: {
      enabled: preferences.uiAnimations,
      speed: preferences.animationSpeed,
      particles: preferences.particleEffects,
      shootingStars: preferences.shootingStars,
    },
  };
}

export function workspaceAppearanceToPreferences(
  appearance: WorkspaceAppearanceV1,
  userId: string,
  fallback: UserPreferences,
): UserPreferences {
  return {
    ...fallback,
    userId,
    theme: appearance.themeId,
    accentColor: appearance.accentColor ?? fallback.accentColor,
    accentSaturation: appearance.accentSaturation ?? fallback.accentSaturation,
    glowIntensity: appearance.glowIntensity,
    starDensity: appearance.starDensity,
    glassOpacity: appearance.glassOpacity,
    blurStrength: appearance.blurStrength,
    nebulaIntensity: appearance.nebulaIntensity,
    parallaxDepth: appearance.parallaxDepth,
    uiDensity: appearance.density,
    borderStrength: appearance.borderStrength,
    borderGlow: appearance.borderGlow ?? fallback.borderGlow,
    hoverGlow: appearance.hoverGlow ?? fallback.hoverGlow,
    cornerRadius: appearance.cornerRadius,
    sidebarCollapsed: appearance.sidebarCollapsed,
    sidebarStyle: appearance.sidebarStyle,
    sidebarPosition: appearance.sidebarPosition,
    topbarStyle: appearance.topbarStyle,
    tabStyle: appearance.tabStyle,
    tabPosition: appearance.tabPosition,
    chatTransparency: appearance.chatTransparency,
    showAvatars: appearance.showAvatars,
    smoothTransitions: appearance.smoothTransitions,
    pushToTalk: appearance.pushToTalk,
    pushToTalkKey: appearance.pushToTalkKey ?? fallback.pushToTalkKey,
    micButtonStyle: appearance.micButtonStyle ?? fallback.micButtonStyle,
    voiceWaveStyle: appearance.voiceWaveStyle ?? fallback.voiceWaveStyle,
    highContrast: appearance.accessibility?.highContrast ?? fallback.highContrast,
    colorVisionMode: appearance.accessibility?.colorVisionMode ?? fallback.colorVisionMode,
    textScale: appearance.accessibility?.textScale ?? fallback.textScale,
    reduceMotion: appearance.accessibility?.reduceMotion ?? fallback.reduceMotion,
    focusHighlight: appearance.accessibility?.focusHighlight ?? fallback.focusHighlight,
    uiAnimations: appearance.animation.enabled,
    animationSpeed: appearance.animation.speed,
    particleEffects: appearance.animation.particles,
    shootingStars: appearance.animation.shootingStars,
  };
}

export function embedSlotsToWorkspaceDockSlots(slots: EmbedSlot[]): WorkspaceDockSlotV1[] {
  return ([1, 2, 3] as const).map((id) => {
    const slot = slots.find((item) => item.id === id);
    return {
      id,
      title: slot?.title || `Slot ${id}`,
      url: slot?.url || '',
      collapsed: slot?.collapsed ?? true,
      volume: slot?.volume ?? 1,
      muted: slot?.muted ?? false,
    };
  });
}

function inferEmbedKind(title: string, url: string): EmbedSlot['kind'] {
  const value = `${title} ${url}`.toLowerCase();
  if (value.includes('overlay')) return 'overlay';
  if (value.includes('game') || value.includes('quackverse') || value.includes('arena')) return 'game';
  if (value.includes('dashboard') || value.includes('calendar') || value.includes('leaderboard')) return 'dashboard';
  return 'app';
}

export function workspaceDockSlotsToEmbedSlots(slots: WorkspaceDockSlotV1[], fallback: EmbedSlot[]): EmbedSlot[] {
  return ([1, 2, 3] as const).map((id, index) => {
    const slot = slots.find((item) => item.id === id);
    const prior = fallback.find((item) => item.id === id) || fallback[index];
    const savedTitle = slot?.title || prior?.title || `Slot ${id}`;
    const savedUrl = slot?.url || prior?.url || '';
    const normalized = normalizeAppSurface(savedTitle, savedUrl);
    const title = normalized.title;
    const url = normalized.url;
    return {
      id,
      title,
      url,
      kind: prior?.url === url ? prior.kind : inferEmbedKind(title, url),
      collapsed: slot?.collapsed ?? prior?.collapsed ?? true,
      volume: slot?.volume ?? prior?.volume ?? 1,
      muted: slot?.muted ?? prior?.muted ?? false,
    };
  });
}

export function createWorkspaceProfileDraft(
  preferences: UserPreferences,
  embedSlots: EmbedSlot[],
  current?: WorkspaceProfileV1 | null,
): WorkspaceProfileDraft {
  return {
    appearance: preferencesToWorkspaceAppearance(preferences),
    dockSlots: embedSlotsToWorkspaceDockSlots(embedSlots),
    activeOverlaySceneId: current?.activeOverlaySceneId ?? null,
    ttsSubscriptions: current?.ttsSubscriptions ?? [],
    appThemeMappings: current?.appThemeMappings ?? {},
    savedThemes: current?.savedThemes ?? [],
  };
}

export function workspaceDraftSignature(draft: WorkspaceProfileDraft) {
  return JSON.stringify(draft);
}

export async function fetchWorkspaceProfile(baseUrl: string, token: string): Promise<WorkspaceProfileResponse> {
  const response = await fetch(`${baseUrl}/api/workspace-profile`, {
    headers: token && token !== 'http-only-session' ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Workspace profile load failed (${response.status})`);
  return data;
}

export async function patchWorkspaceProfile(
  baseUrl: string,
  token: string,
  revision: number,
  profile: WorkspaceProfileDraft,
): Promise<WorkspaceProfileResponse> {
  const response = await fetch(`${baseUrl}/api/workspace-profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token && token !== 'http-only-session' ? { Authorization: `Bearer ${token}` } : {}),
      'If-Match': `"workspace-${revision}"`,
    },
    credentials: 'include',
    body: JSON.stringify({ profile }),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 409) {
    const error = new Error(data.error || 'Workspace profile changed on another device') as Error & { conflict?: WorkspaceProfileV1 };
    error.conflict = data.profile;
    throw error;
  }
  if (!response.ok) {
    const details = data.fields ? ` ${Object.entries(data.fields).map(([field, message]) => `${field}: ${message}`).join('; ')}` : '';
    throw new Error(`${data.error || `Workspace profile save failed (${response.status})`}${details}`);
  }
  return data;
}

export async function resetWorkspaceProfile(baseUrl: string, token: string, revision: number): Promise<WorkspaceProfileResponse> {
  const response = await fetch(`${baseUrl}/api/workspace-profile/reset`, {
    method: 'POST',
    headers: { ...(token && token !== 'http-only-session' ? { Authorization: `Bearer ${token}` } : {}), 'If-Match': `"workspace-${revision}"` },
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Workspace profile reset failed (${response.status})`);
  return data;
}
