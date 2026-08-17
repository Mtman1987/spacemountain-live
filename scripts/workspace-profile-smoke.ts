import assert from 'node:assert/strict';
import {
  createWorkspaceProfileDraft,
  embedSlotsToWorkspaceDockSlots,
  preferencesToWorkspaceAppearance,
  workspaceAppearanceToPreferences,
  workspaceDockSlotsToEmbedSlots,
  workspaceDraftSignature,
} from '../src/lib/workspace-profile';
import type { EmbedSlot, UserPreferences, WorkspaceProfileV1 } from '../src/types';
import { buildSpmtProxyHeaders } from '../src/lib/spmt-proxy';
import { appSurfaces, buildAppSurfaceUrl, normalizeAppSurface } from '../src/lib/app-surfaces';
import { parseCanonicalXpBalance } from '../src/lib/canonical-xp';
import { createThemeMessage } from '../src/lib/theme-bridge';
import { getThemePreset } from '../src/lib/theme-presets';

const preferences: UserPreferences = {
  userId: 'workspace-smoke-user',
  theme: 'nebula-purple',
  accentColor: '#8B5CF6',
  accentSaturation: 88,
  glowIntensity: 73,
  starDensity: 84,
  shootingStars: false,
  sidebarCollapsed: true,
  glassOpacity: 51,
  blurStrength: 18,
  nebulaIntensity: 62,
  parallaxDepth: 44,
  uiDensity: 'compact',
  borderStrength: 37,
  borderGlow: true,
  hoverGlow: false,
  cornerRadius: 'lg',
  sidebarStyle: 'floating',
  sidebarPosition: 'right',
  topbarStyle: 'glass',
  tabStyle: 'cards',
  tabPosition: 'bottom',
  chatTransparency: 46,
  showAvatars: false,
  uiAnimations: false,
  particleEffects: false,
  smoothTransitions: false,
  animationSpeed: 120,
  pushToTalk: false,
  pushToTalkKey: 'V',
  micButtonStyle: 'outline',
  voiceWaveStyle: 'bars',
  highContrast: true,
  colorVisionMode: 'deuteranopia',
  textScale: 'lg',
  reduceMotion: true,
  focusHighlight: true,
};
const slots: EmbedSlot[] = [
  { id: 1, title: 'Overlay', url: 'https://example.com/overlay', kind: 'overlay', collapsed: false, volume: 0.5, muted: true },
  { id: 2, title: 'Game', url: 'https://example.com/game', kind: 'game', collapsed: true, volume: 1, muted: false },
  { id: 3, title: 'Dashboard', url: 'https://example.com/dashboard', kind: 'dashboard', collapsed: false, volume: 0.25, muted: false },
];
const appearance = preferencesToWorkspaceAppearance(preferences);
const roundTripPreferences = workspaceAppearanceToPreferences(appearance, preferences.userId, preferences);
assert.deepEqual(roundTripPreferences, preferences);

const dockSlots = embedSlotsToWorkspaceDockSlots(slots);
assert.equal(dockSlots.length, 3);
assert.equal(dockSlots[0].muted, true);
assert.equal(dockSlots[2].volume, 0.25);
assert.deepEqual(workspaceDockSlotsToEmbedSlots(dockSlots, slots), slots);

const profile: WorkspaceProfileV1 = {
  schemaVersion: 1,
  revision: 7,
  appearance,
  dockSlots,
  activeOverlaySceneId: 'main-scene',
  ttsSubscriptions: ['streamweaver-main'],
  appThemeMappings: { streamweaver: 'follow-workspace' },
  savedThemes: [{
    id: 'theme-nebula-readable',
    name: 'Nebula Readable',
    appearance,
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z',
  }],
  updatedAt: '2026-07-13T00:00:00.000Z',
};
const draft = createWorkspaceProfileDraft(preferences, slots, profile);
assert.equal(draft.activeOverlaySceneId, 'main-scene');
assert.deepEqual(draft.ttsSubscriptions, ['streamweaver-main']);
assert.equal(draft.savedThemes?.[0]?.name, 'Nebula Readable');
assert.equal(workspaceDraftSignature(draft), workspaceDraftSignature(createWorkspaceProfileDraft(preferences, slots, profile)));

const themeMessage = createThemeMessage(getThemePreset(preferences.theme), preferences);
assert.equal(themeMessage.version, 2);
assert.equal(themeMessage.appearance.accentSaturation, 88);
assert.equal(themeMessage.appearance.highContrast, true);
assert.equal(themeMessage.theme.motion, false);

const proxyHeaders = buildSpmtProxyHeaders(
  { 'if-match': '"workspace-7"', cookie: 'must-not-forward=1' },
  'server-session-token',
  true,
);
assert.equal(proxyHeaders['If-Match'], '"workspace-7"');
assert.equal(proxyHeaders.Authorization, 'Bearer server-session-token');
assert.equal(proxyHeaders['Content-Type'], 'application/json');
assert.equal(proxyHeaders.cookie, undefined);

assert.deepEqual(
  normalizeAppSurface('StreamWeaver Commands', 'https://streamweaver-new.fly.dev/login?next=%2Fcommands'),
  { title: 'StreamWeaver Commands', url: appSurfaces.streamweaver.commands, valid: true, error: null },
);
assert.deepEqual(
  normalizeAppSurface('Quackverse Game', 'https://spacemountain.live/chat-tag/quackverse'),
  { title: 'Quackverse Game', url: appSurfaces.chatTag.quackverse, valid: true, error: null },
);
assert.deepEqual(
  normalizeAppSurface('ChatTag Overlay', 'https://streamweaver-new.fly.dev/tts-player?tenant=94371378'),
  { title: 'All-Tenant TTS Studio', url: `${appSurfaces.streamweaver.ttsMixer}?streams=94371378`, valid: true, error: null },
);

const scopedSurface = buildAppSurfaceUrl('http://0.0.0.0:3000/shared-chat', 'Commlink Live Chat', {
  tenantId: 'tenant-42',
  scopes: ['workspace:read', 'identity:read'],
  embed: true,
});
assert.equal(scopedSurface.valid, true);
assert.equal(new URL(scopedSurface.url).origin, 'https://spmt.live');
assert.equal(new URL(scopedSurface.url).pathname, '/commlink/');
assert.equal(new URL(scopedSurface.url).searchParams.get('embedded'), '1');
assert.equal(new URL(scopedSurface.url).searchParams.get('tenant'), 'tenant-42');
assert.equal(new URL(scopedSurface.url).searchParams.get('scopes'), 'identity:read,workspace:read');
assert.equal(buildAppSurfaceUrl('http://localhost:9999/unknown', 'Unknown').valid, false);

assert.deepEqual(parseCanonicalXpBalance({ xp: 625, level: 3 }), { xp: 625, level: 3 });
assert.equal(parseCanonicalXpBalance({ xp: 'not-a-number', level: 3 }), null);

console.log(JSON.stringify({ status: 'passed', checks: 30 }));
