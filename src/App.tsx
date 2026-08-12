import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, LayoutGrid, Mail, MessageSquare, Headphones, Users,
  Settings, HelpCircle, Rocket, Play, Activity, CheckCircle2, Sliders,
  Send, Plus, Trash2, ArrowRight, Heart, RefreshCw, Star, Compass, Volume2, Gamepad2, Eye, Layout,
  Search, Mic, Bot
} from 'lucide-react';
import {
  CommunityTool,
  BrandingConfig,
  DashboardStats,
  UserProfile,
  UserPreferences,
  HearMeOutRoom,
  ChatTagState,
  CommunityShoutout,
  CommunityShoutoutFeed,
  QuackverseSummary,
  EmbeddedAppTarget,
  EmbedSlot,
} from './types';
import { parseCanonicalXpBalance } from './lib/canonical-xp';

// Importing high-fidelity sub components
import RocketDock from './components/RocketDock';
import CosmicHeader from './components/CosmicHeader';
import MainAppSuite from './components/MainAppSuite';
import Shop from './components/Shop';
import Arena from './components/Arena';
import OverlayWorkspace, { OverlayWidget } from './components/OverlayWorkspace';
import WorkspaceTray from './components/WorkspaceTray';
import { CompanionOverlaySurface, CompanionWorkspaceSurface } from './components/CompanionSurfaces';
import { appOrigins, appSurfaces, buildAppSurfaceUrl, canonicalEmbedPresets, normalizeAppSurface } from './lib/app-surfaces';
import { resolveThemePreset } from './lib/theme-presets';
import { createThemeMessage } from './lib/theme-bridge';
import { usePortableWorkspace } from './hooks/usePortableWorkspace';
import type { WorkflowStep } from './features/workspace/BuilderRoute';

const HomeRoute = React.lazy(() => import('./features/home/HomeRoute'));
const BuilderRoute = React.lazy(() => import('./features/workspace/BuilderRoute'));
const HelpRoute = React.lazy(() => import('./features/workspace/HelpRoute'));
const SettingsRoute = React.lazy(() => import('./features/workspace/SettingsRoute'));

const sleekRocketIcon = '/assets/model-rocket.png';

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const normalized = clean.length === 3
    ? clean.split('').map((char) => char + char).join('')
    : clean;
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbaFromHex(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ProcessedRocketImage({ className, glowHex }: { className?: string; glowHex: string }) {
  return (
    <img 
      src={sleekRocketIcon} 
      alt="SpaceMountain model rocket" 
      className={className}
      style={{ 
        transform: 'rotate(var(--angle))',
        filter: `drop-shadow(0 0 10px ${glowHex})`
      }}
    />
  );
}

function formatShoutoutTime(value?: string | null) {
  if (!value) return 'Waiting';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getShoutoutImage(shoutout?: CommunityShoutout | null) {
  const image = shoutout?.bannerUrl || shoutout?.imageUrl || shoutout?.avatarUrl || '/assets/space-logo-main.png';
  return image.replace(/\{width\}/g, '640').replace(/\{height\}/g, '360');
}

function getShoutoutVideo(shoutout?: CommunityShoutout | null) {
  const video = shoutout?.videoUrl;
  if (!video) return null;
  return video.replace(/\{width\}/g, '1280').replace(/\{height\}/g, '720');
}

function getTwitchEmbedUrl(twitchLogin?: string | null) {
  const login = String(twitchLogin || '').trim().toLowerCase();
  if (!login) return null;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'spacemountain.live';
  const params = new URLSearchParams({
    channel: login,
    parent: hostname,
    muted: 'true',
    autoplay: 'true',
  });
  return `https://player.twitch.tv/?${params.toString()}`;
}

const dshDashboardUrl = appSurfaces.discordHub.home;
const dshCalendarUrl = appSurfaces.discordHub.calendar;
const dshLeaderboardUrl = appSurfaces.discordHub.leaderboard;
const streamweaverCommandsUrl = appSurfaces.streamweaver.commands;
const streamweaverCommunityUrl = appSurfaces.streamweaver.community;
const streamweaverIntegrationsUrl = appSurfaces.streamweaver.integrations;
const streamweaverWorkflowsUrl = appSurfaces.streamweaver.workflows;
const spmtBaseUrl = '/api/spmt';

function getStoredSpmtToken() {
  return 'http-only-session';
}

function getLegacySpmtToken() {
  return localStorage.getItem('spmtToken') || localStorage.getItem('spmt_token') || '';
}

function storeSpmtSession(_token: string, _profile: UserProfile) {
  localStorage.removeItem('spmtToken');
  localStorage.removeItem('spmt_token');
  localStorage.removeItem('spmtIdentity');
}

function clearSpmtSession() {
  localStorage.removeItem('spmtToken');
  localStorage.removeItem('spmt_token');
  localStorage.removeItem('spmtIdentity');
}

function mapSpmtUserToProfile(user: any, previous?: UserProfile | null): UserProfile {
  const canonicalXp = Number(user.xp);
  const canonicalLevel = Number(user.level);
  return {
    id: user.id,
    displayName: user.displayName || user.display_name || user.username,
    username: user.username,
    handle: user.handle || `${user.username}@spmt.live`,
    recoveryEmail: user.email || null,
    role: 'Captain',
    status: 'Online',
    points: previous?.points || 0,
    xp: Number.isFinite(canonicalXp) ? Math.max(0, Math.trunc(canonicalXp)) : previous?.xp || 0,
    level: Number.isFinite(canonicalLevel) ? Math.max(1, Math.trunc(canonicalLevel)) : previous?.level || 1,
    avatarSpeaking: previous?.avatarSpeaking || false,
    createdAt: user.createdAt || user.created_at || new Date().toISOString(),
    discordUsername: user.discordUsername || user.discord_username || null,
    discordId: user.discordId || user.discord_id || null,
    twitchUsername: user.twitchUsername || user.twitch_username || null,
    twitchId: user.twitchId || user.twitch_id || null,
  };
}

function normalizeSpmtAppId(id: string) {
  if (id === 'discord-stream-hub') return 'discord-hub';
  return id;
}

type AppNotification = {
  id: number | string;
  title: string;
  body: string;
  createdAt: string;
};

type CommlinkNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  source_app?: string | null;
  link_url?: string | null;
  read_at?: string | null;
  created_at: string;
};

type PlatformEvent = {
  id: string;
  type: string;
  sourceApp?: string | null;
  timestamp?: string | null;
  createdAt?: string | null;
  payload?: Record<string, unknown> | null;
};

type SdkStatusCardData = {
  id: string;
  name: string;
  sourceApp: string;
  eventType: string;
  author: string | null;
  summary: string | null;
  updatedAt: string | null;
  metrics: Array<{ label: string; value: string }>;
};

function firstPayloadValue(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

function displayPayloadValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

function payloadLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function buildSdkStatusCards(events: PlatformEvent[]): SdkStatusCardData[] {
  const latestByName = new Map<string, SdkStatusCardData>();

  for (const event of events) {
    const eventType = String(event.type || '').toLowerCase();
    if (eventType !== 'status' && !eventType.endsWith('.status')) continue;

    const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
      ? event.payload
      : {};
    const sourceApp = String(event.sourceApp || 'sdk-app');
    const name = String(firstPayloadValue(payload, [
      'AppName', 'appName', 'ApplicationName', 'applicationName', 'Name', 'name',
    ]) || sourceApp);
    const cardKey = name.trim().toLowerCase();
    if (!cardKey || latestByName.has(cardKey)) continue;

    const usedKeys = new Set([
      'AppName', 'appName', 'ApplicationName', 'applicationName', 'Name', 'name',
      'Author', 'author', 'DeveloperName', 'developerName', 'summary', 'Summary',
      'LastUpdated', 'lastUpdated', 'updatedAt',
    ]);
    const metrics: Array<{ label: string; value: string }> = [];
    const addMetric = (label: string, value: unknown, keys: string[]) => {
      keys.forEach((key) => usedKeys.add(key));
      if (value === null || value === undefined || String(value).trim() === '') return;
      metrics.push({ label, value: displayPayloadValue(value) });
    };

    const playerDisplay = firstPayloadValue(payload, ['PlayerDisplay', 'playerDisplay']);
    const onlinePlayers = firstPayloadValue(payload, ['OnlinePlayers', 'onlinePlayers']);
    const maxPlayers = firstPayloadValue(payload, ['MaxPlayers', 'maxPlayers']);
    const playerCount = firstPayloadValue(payload, ['PlayerCount', 'playerCount']);
    addMetric(
      'Players',
      playerDisplay || (onlinePlayers !== null && maxPlayers !== null ? `${onlinePlayers}/${maxPlayers}` : onlinePlayers ?? playerCount),
      ['PlayerDisplay', 'playerDisplay', 'OnlinePlayers', 'onlinePlayers', 'MaxPlayers', 'maxPlayers', 'PlayerCount', 'playerCount'],
    );

    const year = firstPayloadValue(payload, ['Year', 'year']);
    const day = firstPayloadValue(payload, ['DayOfYear', 'dayOfYear']);
    addMetric(
      'World',
      year !== null || day !== null ? [year !== null ? `Year ${year}` : '', day !== null ? `Day ${day}` : ''].filter(Boolean).join(', ') : null,
      ['Year', 'year', 'DayOfYear', 'dayOfYear'],
    );
    addMetric('Season', firstPayloadValue(payload, ['Season', 'season']), ['Season', 'season']);
    addMetric('Rift', firstPayloadValue(payload, ['RiftActivity', 'riftActivity']), ['RiftActivity', 'riftActivity']);
    addMetric('Storm', firstPayloadValue(payload, ['IsTemporalStormActive', 'isTemporalStormActive']), ['IsTemporalStormActive', 'isTemporalStormActive']);
    addMetric('Version', firstPayloadValue(payload, ['ServerVersion', 'serverVersion', 'Version', 'version']), ['ServerVersion', 'serverVersion', 'Version', 'version']);
    addMetric('Loaded mods', firstPayloadValue(payload, ['LoadedMods', 'loadedMods']), ['LoadedMods', 'loadedMods']);

    for (const [key, value] of Object.entries(payload)) {
      if (metrics.length >= 8 || usedKeys.has(key) || value === null || value === undefined) continue;
      if (!['string', 'number', 'boolean'].includes(typeof value)) continue;
      metrics.push({ label: payloadLabel(key), value: displayPayloadValue(value) });
    }

    latestByName.set(cardKey, {
      id: event.id,
      name,
      sourceApp,
      eventType: event.type,
      author: String(firstPayloadValue(payload, ['Author', 'author', 'DeveloperName', 'developerName']) || '').trim() || null,
      summary: String(firstPayloadValue(payload, ['summary', 'Summary']) || '').trim() || null,
      updatedAt: String(firstPayloadValue(payload, ['LastUpdated', 'lastUpdated', 'updatedAt']) || event.timestamp || event.createdAt || '').trim() || null,
      metrics,
    });
  }

  return Array.from(latestByName.values());
}

const defaultEmbedSlots: EmbedSlot[] = [
  { id: 1, title: 'ChatTag Overlay', url: appSurfaces.chatTag.overlay, kind: 'overlay', collapsed: true, volume: 1, muted: false },
  { id: 2, title: 'All-Tenant TTS Studio', url: appSurfaces.streamweaver.ttsMixer, kind: 'overlay', collapsed: false, volume: 1, muted: false },
  { id: 3, title: 'DSH Dashboard', url: dshDashboardUrl, kind: 'dashboard', collapsed: true, volume: 1, muted: false },
];

const defaultUserPreferences: UserPreferences = {
  userId: 'u_novastar',
  theme: 'solar-flare',
  accentColor: null,
  accentSaturation: 100,
  glowIntensity: 80,
  starDensity: 70,
  shootingStars: true,
  sidebarCollapsed: false,
  glassOpacity: 65,
  blurStrength: 22,
  nebulaIntensity: 80,
  parallaxDepth: 65,
  uiDensity: 'comfortable',
  borderStrength: 60,
  borderGlow: true,
  hoverGlow: true,
  cornerRadius: 'md',
  sidebarStyle: 'docked',
  sidebarPosition: 'left',
  topbarStyle: 'transparent',
  tabStyle: 'pills',
  tabPosition: 'top',
  chatTransparency: 65,
  showAvatars: true,
  uiAnimations: true,
  particleEffects: true,
  smoothTransitions: true,
  animationSpeed: 85,
  pushToTalk: true,
  pushToTalkKey: 'V',
  micButtonStyle: 'filled',
  voiceWaveStyle: 'wave',
  highContrast: false,
  colorVisionMode: 'default',
  textScale: 'md',
  reduceMotion: false,
  focusHighlight: true,
};

const defaultOverlayWidgets: OverlayWidget[] = [
  {
    id: 'chat-tag-overlay', title: 'ChatTag Overlay', kind: 'chat', url: appSurfaces.chatTag.overlay,
    visible: false, locked: false, interactive: false, x: 72, y: 66, width: 360, height: 220, opacity: 1,
  },
  {
    id: 'hearmeout-now-playing', title: 'HearMeOut Now Playing', kind: 'media', url: appSurfaces.hearmeout.nowPlaying,
    visible: false, locked: false, interactive: false, x: 2, y: 12, width: 420, height: 240, opacity: 1,
  },
  {
    id: 'streamweaver-avatar', title: 'StreamWeaver Bot Avatar', kind: 'avatar', url: 'https://streamweaver-new.fly.dev/overlay/avatar',
    visible: false, locked: false, interactive: true, x: 75, y: 54, width: 320, height: 320, opacity: 1,
  },
  {
    id: 'streamweaver-tts-mixer', title: 'All-Tenant TTS Studio', kind: 'audio', url: appSurfaces.streamweaver.ttsMixer,
    visible: false, locked: false, interactive: true, x: 2, y: 64, width: 520, height: 300, opacity: 1,
  },
  {
    id: 'commlink-live-chat', title: 'Commlink Live Chat', kind: 'chat', url: appSurfaces.streamweaver.liveChat,
    visible: false, locked: false, interactive: true, x: 2, y: 30, width: 520, height: 420, opacity: 1,
  },
  {
    id: 'dock-slot-1', title: defaultEmbedSlots[0].title, kind: 'embed', url: defaultEmbedSlots[0].url,
    visible: !defaultEmbedSlots[0].collapsed, locked: false, interactive: true, x: 1, y: 67, width: 420, height: 280, opacity: 0.92,
  },
  {
    id: 'dock-slot-2', title: defaultEmbedSlots[1].title, kind: 'embed', url: defaultEmbedSlots[1].url,
    visible: !defaultEmbedSlots[1].collapsed, locked: false, interactive: true, x: 34, y: 67, width: 520, height: 280, opacity: 0.92,
  },
  {
    id: 'dock-slot-3', title: defaultEmbedSlots[2].title, kind: 'embed', url: defaultEmbedSlots[2].url,
    visible: !defaultEmbedSlots[2].collapsed, locked: false, interactive: true, x: 67, y: 67, width: 420, height: 280, opacity: 0.92,
  },
];

function dockOverlayWidgetId(slotId: number) {
  return `dock-slot-${slotId}`;
}

function dockSlotIdFromWidget(widgetId: string) {
  const match = /^dock-slot-([123])$/.exec(widgetId);
  return match ? Number(match[1]) : null;
}

function addStreamWeaverTenant(url: string, tenantId?: string | null) {
  if (!tenantId || !url.startsWith('https://streamweaver-new.fly.dev/')) return url;
  const nextUrl = new URL(url);
  nextUrl.searchParams.set('tenant', tenantId);
  return nextUrl.toString();
}

function embeddedSurfaceUrl(title: string, url: string, tenantId?: string | null) {
  const surface = buildAppSurfaceUrl(url, title, {
    tenantId: tenantId || 'spmt',
    embed: true,
    scopes: ['identity:read', 'overlay:control', 'workspace:read'],
  });
  return surface.valid ? surface.url : 'about:blank';
}

function normalizeOverlayWidgets(savedWidgets: OverlayWidget[] | null | undefined, tenantId?: string | null) {
  const savedById = new Map((savedWidgets || []).map((widget) => [widget.id, widget]));
  const normalizeWidget = (defaultWidget: OverlayWidget, saved: OverlayWidget | undefined, index: number) => {
    const legacyInteractive = saved?.interactive ?? defaultWidget.interactive;
    const interactionMode = saved?.interactionMode || defaultWidget.interactionMode || (legacyInteractive ? 'interactive' : 'click-through');
    return {
      ...defaultWidget,
      ...saved,
      interactive: interactionMode !== 'click-through',
      interactionMode,
      hoverReveal: saved?.hoverReveal ?? defaultWidget.hoverReveal ?? false,
      rotation: Number.isFinite(saved?.rotation) ? Number(saved?.rotation) : (defaultWidget.rotation ?? 0),
      zIndex: Number.isFinite(saved?.zIndex) ? Number(saved?.zIndex) : (defaultWidget.zIndex ?? index + 1),
      parallaxEnabled: saved?.parallaxEnabled ?? defaultWidget.parallaxEnabled ?? false,
      parallaxDepth: Number.isFinite(saved?.parallaxDepth) ? Number(saved?.parallaxDepth) : (defaultWidget.parallaxDepth ?? 8),
      groupId: saved?.groupId ?? defaultWidget.groupId ?? null,
    } satisfies OverlayWidget;
  };
  const normalizedDefaults = defaultOverlayWidgets.map((defaultWidget, index) => {
    const saved = savedById.get(defaultWidget.id);
    const widget = normalizeWidget(defaultWidget, saved, index);
    if (widget.id === 'streamweaver-avatar') {
      widget.title = 'StreamWeaver Bot Avatar';
      widget.url = addStreamWeaverTenant('https://streamweaver-new.fly.dev/overlay/avatar', tenantId);
    }
    if (widget.id === 'streamweaver-tts-mixer') {
      widget.title = 'All-Tenant TTS Studio';
      widget.url = appSurfaces.streamweaver.ttsMixer;
    }
    if (widget.id === 'commlink-live-chat') {
      widget.title = 'Commlink Live Chat';
      widget.url = appSurfaces.streamweaver.liveChat;
    }
    const scopedSurface = buildAppSurfaceUrl(widget.url, widget.title, {
      tenantId,
      embed: true,
      scopes: ['identity:read', 'overlay:control', 'workspace:read'],
    });
    if (scopedSurface.valid) widget.url = scopedSurface.url;
    return widget;
  });
  const customWidgets = (savedWidgets || [])
    .filter((widget) => !defaultOverlayWidgets.some((item) => item.id === widget.id))
    .map((widget, index) => normalizeWidget(widget, widget, normalizedDefaults.length + index));
  return [...normalizedDefaults, ...customWidgets];
}

const defaultWorkflowSteps: WorkflowStep[] = [
  { id: 'shared-chat-context', trigger: 'Shared chat message', condition: 'Any connected source', action: 'Add to bot context', destination: 'StreamWeaver memory', enabled: true },
  { id: 'chat-tag-overlay', trigger: 'ChatTag event', condition: 'Player tagged', action: 'Show overlay widget', destination: 'ChatTag Overlay', enabled: true },
];

const embedPresets: EmbeddedAppTarget[] = canonicalEmbedPresets;

const tabPathMap: Record<string, string> = {
  dashboard: '/',
  bridge: '/bridge',
  settings: '/settings',
  shop: '/shop',
  arena: '/arena',
  apps: '/apps',
  inbox: '/inbox',
  forums: '/forums',
  rooms: '/rooms',
  builder: '/builder',
  crew: '/crew',
  help: '/help',
};

const pathTabMap = {
  ...Object.fromEntries(Object.entries(tabPathMap).map(([tab, path]) => [path, tab])),
  // MountainView is an app, not a SpaceMountain workspace destination.
  '/mtnview': 'apps',
} as Record<string, string>;

function getPlayerName(player: any) {
  return player?.displayName || player?.twitchUsername || player?.username || player?.name || player?.id || 'Player';
}

function formatRelativeMinutes(value?: number | string | null) {
  if (!value) return 'Waiting';
  const timestamp = typeof value === 'number' ? value : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Recently';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

function formatChatTagEvent(event: any) {
  const action = String(event?.action || '').toLowerCase();
  if (event?.tagger || event?.target || event?.tagged) {
    return `${event.tagger || event.performedBy || 'Someone'} tagged ${event.target || event.tagged || event.targetUser || 'someone'}`;
  }
  if (action.includes('set-it')) {
    return `${event.performedBy || 'bot-auto-rotate'} tagged ${event.targetUser || 'someone'}`;
  }
  if (action.includes('auto-rotate')) {
    const details = event.details ? ` (${event.details})` : '';
    return `${event.performedBy || 'bot-auto-rotate'} rotated IT${details}`;
  }
  return event?.details || `${event?.performedBy || 'Chat Tag'} updated the game`;
}

function getLiveSince(value?: string | null) {
  if (!value) return 'Live';
  const started = new Date(value).getTime();
  if (Number.isNaN(started)) return 'Live';
  const minutes = Math.max(1, Math.floor((Date.now() - started) / 60000));
  if (minutes < 60) return `Live ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `Live ${hours}h${remainder ? ` ${remainder}m` : ''}`;
}

const ShoutoutCard: React.FC<{
  shoutout: CommunityShoutout;
  compact?: boolean;
}> = ({
  shoutout,
  compact = false,
}) => {
  return (
    <article className="rounded-lg border border-white/10 bg-zinc-950/55 overflow-hidden">
      <div className={`${compact ? 'h-24' : 'h-32'} relative overflow-hidden bg-zinc-900`}>
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url("${getShoutoutImage(shoutout)}")` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 to-black/70" />
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src={shoutout.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(shoutout.displayName)}&background=111827&color=ffffff`}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover bg-zinc-900"
            />
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-white truncate">{shoutout.displayName}</p>
              <p className="text-[11px] text-zinc-400 truncate">{shoutout.gameName || shoutout.groupName || 'Live shoutout'}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-md bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300">
            {shoutout.isLive ? 'Live' : 'Seen'}
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-300">{shoutout.title || shoutout.description || 'Discord Stream Hub generated this shoutout.'}</p>
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
          <span>{Number(shoutout.viewerCount || 0).toLocaleString()} viewers · {getLiveSince(shoutout.startedAt)}</span>
          {shoutout.streamUrl && (
            <a className="font-bold text-cyan-300 hover:text-cyan-200" href={shoutout.streamUrl} target="_blank" rel="noreferrer">
              Watch
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

const ShoutoutProfileCard: React.FC<{
  shoutout: CommunityShoutout | null;
  label: string;
  onForumClick: () => void;
  emptyLabel?: string;
  feature?: boolean;
}> = ({ shoutout, label, onForumClick, emptyLabel = 'Waiting for the next live creator', feature = false }) => {
  const twitchEmbedUrl = shoutout?.isLive ? getTwitchEmbedUrl(shoutout.twitchLogin) : null;
  const videoUrl = getShoutoutVideo(shoutout);
  const imageUrl = getShoutoutImage(shoutout);

  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950/50">
      <div className={`relative overflow-hidden bg-zinc-950 ${feature ? 'min-h-[330px]' : ''}`}>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{ backgroundImage: `url("${imageUrl}")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/35" />
        <div className="relative z-10 flex min-h-[inherit] flex-col justify-end p-5 md:p-7">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
              <span className="rounded-md bg-amber-300 px-2 py-1 text-black">{label}</span>
              <span className="rounded-md bg-white/10 px-2 py-1 text-zinc-200">
                {shoutout ? formatShoutoutTime(shoutout.updatedAt) : 'Awaiting DSH'}
              </span>
            </div>
            <div className="mt-4 flex min-w-0 items-end gap-4">
              {shoutout && (
                <img
                  src={shoutout.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(shoutout.displayName)}&background=111827&color=ffffff`}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-full border border-white/15 bg-zinc-900 object-cover"
                />
              )}
              <div className="min-w-0">
                <h2 className={`${feature ? 'text-3xl xl:text-4xl 2xl:text-5xl' : 'text-2xl md:text-3xl'} break-words font-black tracking-tight text-white`}>
                  {shoutout?.displayName || emptyLabel}
                </h2>
                <p className="mt-2 max-w-xl break-words text-sm leading-relaxed text-zinc-300">
                  {shoutout?.title || shoutout?.description || 'Discord Stream Hub generated shoutouts land here when creators are live.'}
                </p>
              </div>
            </div>
            {shoutout && (
              <div className="mt-4 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-md bg-black/35 p-3">
                  <p className="text-[10px] uppercase text-zinc-500">Playing</p>
                  <p className="mt-1 break-words text-xs font-bold text-white">{shoutout.gameName || 'Unknown game'}</p>
                </div>
                <div className="rounded-md bg-black/35 p-3">
                  <p className="text-[10px] uppercase text-zinc-500">Viewers</p>
                  <p className="mt-1 text-xs font-bold text-white">{Number(shoutout.viewerCount || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-md bg-black/35 p-3">
                  <p className="text-[10px] uppercase text-zinc-500">Live since</p>
                  <p className="mt-1 text-xs font-bold text-white">{getLiveSince(shoutout.startedAt)}</p>
                </div>
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {shoutout?.streamUrl && (
                <a
                  href={shoutout.streamUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-xs font-extrabold text-zinc-950"
                >
                  <Play size={14} />
                  Watch Twitch
                </a>
              )}
              <button
                onClick={onForumClick}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
              >
                Website Forum
              </button>
              <span className="text-xs text-zinc-400">
                {shoutout ? `${Number(shoutout.viewerCount || 0).toLocaleString()} viewers` : 'POST /api/integrations/dsh/shoutout'}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className={`bg-black ${feature ? 'h-[360px]' : 'h-[240px]'}`}>
        {twitchEmbedUrl ? (
          <iframe
            className="h-full w-full"
            src={twitchEmbedUrl}
            title={`${shoutout?.displayName || label} live stream`}
            allow="autoplay; fullscreen"
          />
        ) : videoUrl ? (
          <video
            className="h-full w-full object-cover"
            src={videoUrl}
            poster={imageUrl}
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
          />
        ) : (
          <div
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url("${imageUrl}")` }}
          />
        )}
      </div>
    </article>
  );
};

export default function App() {
  // SPMT is the authoritative identity; the browser only receives the profile, never the session token.
  const [identity, setIdentity] = useState<UserProfile | null>(null);

  const refreshCanonicalXp = useCallback(async () => {
    const response = await fetch('/api/spmt/api/xp', { credentials: 'include' });
    if (!response.ok) return;
    const balance = parseCanonicalXpBalance(await response.json());
    if (!balance) return;
    setIdentity((previous) => previous ? { ...previous, ...balance } : previous);
  }, []);

  // Navigation & Interactive Tabs
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return pathTabMap[window.location.pathname] || 'dashboard';
    }
    return 'dashboard';
  });

  // Easter Egg States
  const [rocketFlying, setRocketFlying] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState({ x: 300, y: 300 });
  const [rocketTrail, setRocketTrail] = useState<{ id: number; x: number; y: number; opacity: number }[]>([]);
  const starField = useMemo(() => Array.from({ length: 90 }, (_, index) => {
    const x = (index * 37 + 13) % 100;
    const y = (index * 61 + 29) % 100;
    const size = index % 5 === 0 ? 1.5 : index % 3 === 0 ? 1 : 0.5;
    const baseDuration = index % 3 === 0 ? 10 : index % 3 === 1 ? 16 : 24;
    const delay = -((index * 0.73) % baseDuration);
    return { id: index, x, y, size, baseDuration, delay };
  }), []);

  const rocketStateRef = React.useRef({
    mouseX: 60,
    mouseY: 34,
    prevMouseX: 60,
    prevMouseY: 34,
    rocketX: 25,
    rocketY: 15,
    angleDeg: 0,
    mode: 'docked' as 'docked' | 'free',
    dragRocket: false,
    moved: false,
    downX: 0,
    downY: 0,
    startRX: 0,
    startRY: 0,
    startPX: 0,
    startPY: 0,
    dragPanel: false,
    dsx: 0,
    dsy: 0,
    psx: 0,
    psy: 0,
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = rocketStateRef.current;
      state.prevMouseX = state.mouseX;
      state.prevMouseY = state.mouseY;
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Trail updates & decay logic
  useEffect(() => {
    if (!rocketFlying) {
      setRocketTrail([]);
      return;
    }
    const interval = setInterval(() => {
      setRocketTrail(prev => {
        const decayed = prev
          .map(p => ({ ...p, opacity: p.opacity - 0.15 }))
          .filter(p => p.opacity > 0);
        const state = rocketStateRef.current;
        const angleRad = (state.angleDeg || 0) * Math.PI / 180;
        const headingX = Math.sin(angleRad);
        const headingY = -Math.cos(angleRad);
        const exhaustX = state.rocketX + 36 - headingX * 30;
        const exhaustY = state.rocketY + 36 - headingY * 30;
        return [
          { 
            id: Math.random(), 
            x: exhaustX + (Math.random() * 8 - 4), 
            y: exhaustY + (Math.random() * 8 - 4), 
            opacity: 1.0 
          },
          ...decayed
        ];
      });
    }, 45);
    return () => clearInterval(interval);
  }, [rocketFlying]);

  useEffect(() => {
    const nextPath = tabPathMap[activeTab] || '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ activeTab }, '', nextPath);
    }
  }, [activeTab]);

  // SPMT is the canonical cross-app XP and level display.
  useEffect(() => {
    if (!identity?.id) return;
    void refreshCanonicalXp().catch(() => {});
  }, [activeTab, identity?.id, refreshCanonicalXp]);

  // DSH points remain an app-specific spendable balance for the arena shop.
  useEffect(() => {
    const user = identity;
    if (!user?.username) return;
      fetch(`/api/spmt/api/user/lookup?username=${encodeURIComponent(user.username)}`)
        .then(r => r.ok ? r.json() : null)
        .then(spmtUser => {
          if (!spmtUser?.discord_id) return;
          return fetch('/api/integrations/dsh/points/balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: spmtUser.discord_id, username: user.username }),
          });
        })
        .then(r => r?.ok ? r.json() : null)
        .then(data => {
          if (data?.points !== undefined) {
            setIdentity(prev => prev ? { ...prev, points: data.points } : prev);
          }
        })
        .catch(() => {});
  }, [activeTab, identity?.username]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setActiveTab(pathTabMap[path] || 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // User Preferences / Appearance states matching the customizable customizer exactly
  const [preferences, setPreferences] = useState<UserPreferences>(() => ({ ...defaultUserPreferences }));

  // Backend branding config fallback state
  const [branding, setBranding] = useState<BrandingConfig>({
    domain: 'spacemountain.live',
    title: 'spacemountain.live',
    tagline: 'one universe. endless connections.',
    brandColor: '#F97316', // Orange Red
    accentColor: '#3B82F6', // Blue
    themeMode: 'cosmic-space',
    heroTitle: 'Everything routes through spacemountain.live.',
    logoMark: '🚀',
    backgroundGradient: 'radial-gradient(circle at 46% 34%, rgba(249, 115, 22, 0.1) 0%, transparent 60%)',
    accentPing: 'Solar Flare (#F97316)',
    glowColor: 'rgba(249, 115, 22, 0.35)',
  });

  // Database-backed tools lists & aggregate stats
  const [tools, setTools] = useState<CommunityTool[]>([]);
  const [spmtApps, setSpmtApps] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTools: 0,
    pointsAwarded: 0,
    onlineApps: 0,
    checkedApps: 0,
    scansCount: 0,
    mediaJobsCount: 0,
  });

  const mergeSpmtAppsIntoTools = React.useCallback((localTools: CommunityTool[], apps: any[]) => {
    const safeLocalTools = Array.isArray(localTools) ? localTools : [];
    if (!apps.length) return safeLocalTools;
    const appMap = new Map(apps.map((app) => [normalizeSpmtAppId(String(app.id)), app]));
    const merged = safeLocalTools.map((tool) => {
      const app = appMap.get(tool.id);
      if (!app) return tool;
      return {
        ...tool,
        appUrl: app.url || tool.appUrl || app.authUrl,
        authUrl: tool.authUrl || app.authUrl || app.url || tool.appUrl,
        installed: app.installed,
        enabled: app.enabled,
        permissions: app.permissions,
        version: app.version,
        latestVersion: app.latestVersion,
        updateAvailable: app.updateAvailable,
        distribution: app.distribution || tool.distribution,
        downloadUrl: app.downloadUrl || tool.downloadUrl,
        signed: app.signed ?? tool.signed,
        statusText: app.installed === false ? 'Available' : app.enabled === false ? 'Disabled' : tool.statusText,
      };
    });

    for (const app of apps) {
      const id = normalizeSpmtAppId(String(app.id));
      if (merged.some((tool) => tool.id === id)) continue;
      merged.push({
        id,
        name: app.name,
        description: app.description || 'Registered through SPMT.',
        badge: String(app.name || id).slice(0, 4).toUpperCase(),
        miniLabel: app.installed ? 'Installed App' : 'Available App',
        statusText: app.installed ? 'Installed' : 'Available',
        statusType: app.status === 'connected' || app.status === 'bridge-ready' ? 'live' : 'default',
        route: '/apps',
        pointsFlow: 0,
        appUrl: app.url || app.authUrl,
        authUrl: app.authUrl || app.url,
        healthUrl: null,
        installed: app.installed,
        enabled: app.enabled,
        permissions: app.permissions,
        version: app.version,
        latestVersion: app.latestVersion,
        updateAvailable: app.updateAvailable,
        distribution: app.distribution,
        downloadUrl: app.downloadUrl,
        signed: app.signed,
      });
    }

    return merged;
  }, []);

  const refreshSpmtApps = React.useCallback(async (token = getStoredSpmtToken()) => {
    const response = await fetch(`${spmtBaseUrl}/api/apps`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    const data = response.ok ? await response.json() : { apps: [] };
    const apps = Array.isArray(data?.apps) ? data.apps : [];
    setSpmtApps(apps);
    setTools((current) => mergeSpmtAppsIntoTools(current, apps));
    return apps;
  }, [mergeSpmtAppsIntoTools]);

  const refreshSpmtIdentity = React.useCallback(async (token = getStoredSpmtToken()) => {
    if (!token) return null;

    let response = await fetch('/api/session', { credentials: 'include' });

    if (!response.ok) {
      const legacyToken = getLegacySpmtToken();
      if (legacyToken) {
        const upgrade = await fetch('/api/session/upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: legacyToken }),
          credentials: 'include',
        }).catch(() => null);
        if (upgrade?.ok) response = await fetch('/api/session', { credentials: 'include' });
      }
    }

    if (!response.ok) {
      clearSpmtSession();
      setIdentity(null);
      return null;
    }

    const data = await response.json();
    const profile = mapSpmtUserToProfile(data.user, identity);
    const nextToken = token;
    storeSpmtSession(nextToken, profile);
    setIdentity(profile);
    const apps = Array.isArray(data?.apps) ? data.apps : await refreshSpmtApps(nextToken);
    setSpmtApps(apps);
    setTools((current) => mergeSpmtAppsIntoTools(current, apps));
    return profile;
  }, [identity, mergeSpmtAppsIntoTools, refreshSpmtApps]);

  const updateSpmtAppInstall = async (appId: string, action: 'install' | 'disable') => {
    const token = getStoredSpmtToken();
    if (!token) {
      alert('Please sign in with SPMT first.');
      return;
    }

    const response = await fetch(`${spmtBaseUrl}/api/apps/${appId}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      alert(data.error || `Failed to ${action} app`);
      return;
    }

    const apps = Array.isArray(data?.apps) ? data.apps : await refreshSpmtApps(token);
    setSpmtApps(apps);
    setTools((current) => mergeSpmtAppsIntoTools(current, apps));
  };

  // SPMT internal messages are tenant-scoped and stored by this SpaceMountain app.
  const [mails, setMails] = useState<any[]>([]);
  const [composeTo, setComposeTo] = useState('');
  const [composeRecipients, setComposeRecipients] = useState<string[]>([]);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeGroupTitle, setComposeGroupTitle] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [commlinkNotifications, setCommlinkNotifications] = useState<CommlinkNotification[]>([]);
  const [platformEvents, setPlatformEvents] = useState<PlatformEvent[]>([]);
  const [platformEventsCheckedAt, setPlatformEventsCheckedAt] = useState<string | null>(null);
  const [platformEventsListening, setPlatformEventsListening] = useState(false);
  const [commlinkSearch, setCommlinkSearch] = useState('');
  const [commlinkFilter, setCommlinkFilter] = useState<'all' | 'unread' | 'direct' | 'app'>('all');
  const [commlinkLane, setCommlinkLane] = useState<'mail' | 'live' | 'notifications' | 'apps'>('mail');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationMessages, setActiveConversationMessages] = useState<any[]>([]);
  const [threadReplyBody, setThreadReplyBody] = useState('');

  const getSpmtHandle = () => {
    if (identity?.username) return identity.username;
    return 'spmtmessaging';
  };

  const normalizeRecipientHandle = (value: string) => value
    .trim()
    .replace(/^@/, '')
    .replace(/@spmt\.live$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');

  const addComposeRecipient = (value = composeTo) => {
    const handles = value
      .split(/[,\s]+/)
      .map(normalizeRecipientHandle)
      .filter(Boolean);
    if (!handles.length) return;
    setComposeRecipients((current) => Array.from(new Set([...current, ...handles])));
    setComposeTo('');
  };

  const removeComposeRecipient = (handle: string) => {
    setComposeRecipients((current) => current.filter((item) => item !== handle));
  };

  const refreshPlatformEvents = useCallback(async () => {
    if (!identity) {
      setPlatformEventsListening(false);
      return;
    }
    const token = getStoredSpmtToken();
    if (!token) {
      setPlatformEventsListening(false);
      return;
    }

    const response = await fetch(`${spmtBaseUrl}/api/events?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`SPMT event feed returned ${response.status}`);

    const data = await response.json();
    setPlatformEvents(Array.isArray(data?.events) ? data.events : []);
    setPlatformEventsCheckedAt(new Date().toISOString());
    setPlatformEventsListening(true);
  }, [identity]);

  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    const refresh = async () => {
      if (stopped || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        await refreshPlatformEvents();
      } catch (error) {
        console.warn('SPMT live status refresh failed', error);
        setPlatformEventsListening(false);
      } finally {
        inFlight = false;
      }
    };
    const handleFocus = () => void refresh();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 4000);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshPlatformEvents]);

  const refreshSpmtInbox = async () => {
    if (!identity) {
      setMails([]);
      setCommlinkNotifications([]);
      setPlatformEvents([]);
      return;
    }
    const token = getStoredSpmtToken();
    if (token) {
      const [conversationResponse, notificationResponse, eventResponse] = await Promise.all([
        fetch(`${spmtBaseUrl}/api/messages?${new URLSearchParams({
          ...(commlinkSearch.trim() ? { q: commlinkSearch.trim() } : {}),
          ...(commlinkFilter === 'unread' ? { unread: 'true' } : {}),
          ...(commlinkFilter === 'direct' || commlinkFilter === 'app' ? { type: commlinkFilter } : {}),
        }).toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
        fetch(`${spmtBaseUrl}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
        fetch(`${spmtBaseUrl}/api/events?limit=60`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
      ]);
      const messageData = conversationResponse.ok ? await conversationResponse.json() : { messages: [] };
      const notificationData = notificationResponse.ok ? await notificationResponse.json() : { notifications: [] };
      const eventData = eventResponse.ok ? await eventResponse.json() : { events: [] };
      const messages = Array.isArray(messageData?.messages) ? messageData.messages : [];
      const nextNotifications = Array.isArray(notificationData?.notifications) ? notificationData.notifications : [];

      setCommlinkNotifications(nextNotifications);
      setPlatformEvents(Array.isArray(eventData?.events) ? eventData.events : []);
      setMails(messages.map((message: any) => ({
        id: message.id,
        folder: 'commlink',
        conversationId: message.conversation_id,
        from: `@${message.from_user || 'spmt'}`,
        to: `@${message.to_user || identity?.username || 'spmt'}`,
        subject: message.subject || 'Commlink message',
        preview: `${message.body || ''}`.slice(0, 70),
        body: message.body || 'No message body.',
        time: new Date(message.created_at || Date.now()).toLocaleString(),
        tag: message.read_at ? (message.message_type || 'SPMT') : 'unread',
        attachments: message.attachments ? JSON.parse(message.attachments) : [],
        mentions: message.mentioned_users ? JSON.parse(message.mentioned_users) : [],
      })));
      return;
    }

    const handle = getSpmtHandle();
    const params = new URLSearchParams({ handle, tenantId: 'spmt' });
    const response = await fetch(`/api/messages/inbox?${params.toString()}`, {
      headers: { 'x-spmt-handle': handle, 'x-spmt-tenant': 'spmt' },
    });
    const messages = response.ok ? await response.json() : [];

    setMails(messages.map((m: any) => ({
      id: m.id,
      folder: 'inbox',
      conversationId: m.conversationId || null,
      from: `@${m.fromHandle || m.fromUser || 'spmtmessaging'}`,
      to: `@${m.toHandle || m.toUser || handle}`,
      subject: m.subject || 'No subject',
      preview: `${m.body || ''}`.slice(0, 70),
      body: m.body,
      time: new Date(m.createdAt || m.created_at || Date.now()).toLocaleString(),
      tag: m.fromType === 'bot' ? 'AI Bot' : m.toType === 'app' ? 'App' : 'SPMT',
    })));
  };

  const markCommlinkNotificationRead = async (notificationId: string, refresh = true) => {
    const token = getStoredSpmtToken();
    if (!token) return;

    const response = await fetch(`${spmtBaseUrl}/api/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Unable to clear notification');

    const readAt = new Date().toISOString();
    setCommlinkNotifications((current) => current.map((item) => (
      item.id === notificationId ? { ...item, read_at: item.read_at || readAt } : item
    )));
    if (refresh) refreshSpmtInbox().catch(() => {});
  };

  const markAllCommlinkNotificationsRead = async () => {
    const token = getStoredSpmtToken();
    if (!token) return;

    const response = await fetch(`${spmtBaseUrl}/api/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Unable to clear notifications');

    const readAt = new Date().toISOString();
    setCommlinkNotifications((current) => current.map((item) => ({
      ...item,
      read_at: item.read_at || readAt,
    })));
    refreshSpmtInbox().catch(() => {});
  };

  const openCommlinkNotification = async (notification: CommlinkNotification) => {
    await markCommlinkNotificationRead(notification.id, false);
    const conversationId = notification.link_url?.match(/^\/messages\/([^/?#]+)/)?.[1];
    if (conversationId) await openCommlinkThread(conversationId);
  };

  // Forums Threads state - fetched from spmt.live
  const [forumThreads, setForumThreads] = useState<any[]>([]);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadCategory, setNewThreadCategory] = useState('Technical Support');
  const [newThreadBody, setNewThreadBody] = useState('');
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [activeForumThread, setActiveForumThread] = useState<any | null>(null);
  const [activeForumPosts, setActiveForumPosts] = useState<any[]>([]);
  const [forumReplyBody, setForumReplyBody] = useState('');
  const [forwardedForumPosts, setForwardedForumPosts] = useState<any[]>([]);
  const [forwardedForumLoading, setForwardedForumLoading] = useState(false);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [lastSeenTimestamps, setLastSeenTimestamps] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('forumLastSeen') || '{}'); } catch { return {}; }
  });
  const forwardedForumChannels = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; posts: any[]; lastPostAt: string | null }>();

    for (const post of forwardedForumPosts) {
      const id = String(post.sourceChannelId || post.sourceChannelName || 'discord-channel');
      const name = post.sourceChannelName || post.sourceChannelId || 'Discord channel';
      const existing = groups.get(id) || { id, name, posts: [], lastPostAt: null };
      existing.posts.push(post);
      const postedAt = post.postedAt || post.createdAt || null;
      if (postedAt && (!existing.lastPostAt || new Date(postedAt).getTime() > new Date(existing.lastPostAt).getTime())) {
        existing.lastPostAt = postedAt;
      }
      groups.set(id, existing);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        posts: group.posts.sort((a, b) => new Date(a.postedAt || a.createdAt || 0).getTime() - new Date(b.postedAt || b.createdAt || 0).getTime()),
      }))
      .sort((a, b) => new Date(b.lastPostAt || 0).getTime() - new Date(a.lastPostAt || 0).getTime());
  }, [forwardedForumPosts]);

  // Voice rooms state
  const [voiceRoomActive, setVoiceRoomActive] = useState(false);
  const [micState, setMicState] = useState<'muted' | 'listening'>('muted');
  const [speakingUsers, setSpeakingUsers] = useState<string[]>([]);
  const [hearmeoutRooms, setHearmeoutRooms] = useState<HearMeOutRoom[]>([]);
  const [hearmeoutLoading, setHearmeoutLoading] = useState(false);
  const [embeddedRoomUrl, setEmbeddedRoomUrl] = useState<string | null>(null);

  // ChatTag tracker state
  const [chatTagState, setChatTagState] = useState<ChatTagState | null>(null);
  const [chatTagLoading, setChatTagLoading] = useState(false);
  const [embedSlots, setEmbedSlots] = useState<EmbedSlot[]>(() => defaultEmbedSlots.map((slot) => ({ ...slot })));
  const [activeEmbedSlot, setActiveEmbedSlot] = useState(2);
  const [workspaceTrayOpen, setWorkspaceTrayOpen] = useState(false);
  const [overlayWorkspaceEnabled, setOverlayWorkspaceEnabled] = useState(true);
  const [overlayEditing, setOverlayEditing] = useState(false);
  const [overlayWidgets, setOverlayWidgets] = useState<OverlayWidget[]>(() => normalizeOverlayWidgets(defaultOverlayWidgets));
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>(defaultWorkflowSteps);
  const [workflowDraft, setWorkflowDraft] = useState<Omit<WorkflowStep, 'id' | 'enabled'>>({
    trigger: 'Shared chat message', condition: 'Any connected source', action: 'Add to bot context', destination: 'StreamWeaver memory',
  });
  const [overlayWorkspaceLoaded, setOverlayWorkspaceLoaded] = useState(false);
  const portableWorkspace = usePortableWorkspace({
    identityId: identity?.id || null,
    token: identity ? getStoredSpmtToken() : '',
    baseUrl: spmtBaseUrl,
    preferences,
    embedSlots,
    defaultPreferences: defaultUserPreferences,
    defaultEmbedSlots,
    setPreferences,
    setEmbedSlots,
  });
  useEffect(() => {
    if (!portableWorkspace.loaded) return;
    setOverlayWidgets((widgets) => widgets.map((widget) => {
      const slotId = dockSlotIdFromWidget(widget.id);
      const slot = slotId ? embedSlots.find((item) => item.id === slotId) : null;
      if (!slot) return widget;
      if (widget.title === slot.title && widget.url === slot.url && widget.visible === !slot.collapsed) return widget;
      return { ...widget, title: slot.title, url: slot.url, visible: !slot.collapsed };
    }));
  }, [embedSlots, portableWorkspace.loaded]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [bridgeSearch, setBridgeSearch] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceListening, setVoiceListening] = useState(false);
  const [athenaOs, setAthenaOs] = useState<any | null>(null);
  const [platformInfo, setPlatformInfo] = useState<any | null>(null);
  const [bridgeRemoteResults, setBridgeRemoteResults] = useState<any | null>(null);
  const [platformDocs, setPlatformDocs] = useState<any | null>(null);
  const [platformPlugins, setPlatformPlugins] = useState<any[]>([]);
  const [bridgeSections, setBridgeSections] = useState<Record<string, boolean>>({
    operations: false,
    search: false,
    workspace: false,
    platform: false,
    stage: false,
  });
  const [voiceStatus, setVoiceStatus] = useState<'ready' | 'listening' | 'unsupported' | 'error'>('ready');
  const notify = (title: string, body: string) => {
    setNotifications((items) => [{ id: Date.now(), title, body, createdAt: new Date().toISOString() }, ...items].slice(0, 8));
  };
  const openEmbeddedApp = (
    title: string,
    url: string,
    kind: EmbeddedAppTarget['kind'] = 'app',
    slotId = activeEmbedSlot
  ) => {
    const normalized = normalizeAppSurface(title, url);
    setEmbedSlots((slots) => slots.map((slot) => (
      slot.id === slotId ? { ...slot, title: normalized.title, url: normalized.url, kind, collapsed: false } : slot
    )));
    setActiveEmbedSlot(slotId);
    setWorkspaceTrayOpen(true);
    notify('Embed slot updated', `Slot ${slotId}: ${normalized.title}`);
  };
  const updateEmbedSlot = (slotId: number, patch: Partial<EmbedSlot>) => {
    setEmbedSlots((slots) => slots.map((slot) => slot.id === slotId ? { ...slot, ...patch } : slot));
    setOverlayWidgets((widgets) => widgets.map((widget) => {
      if (widget.id !== dockOverlayWidgetId(slotId)) return widget;
      return {
        ...widget,
        ...(typeof patch.title === 'string' ? { title: patch.title } : {}),
        ...(typeof patch.url === 'string' ? { url: patch.url } : {}),
        ...(typeof patch.collapsed === 'boolean' ? { visible: !patch.collapsed } : {}),
      };
    }));
  };
  const updateOverlayWidget = useCallback((widgetId: string, patch: Partial<OverlayWidget>) => {
    setOverlayWidgets((widgets) => widgets.map((widget) => widget.id === widgetId ? { ...widget, ...patch } : widget));
    const slotId = dockSlotIdFromWidget(widgetId);
    if (slotId) {
      setEmbedSlots((slots) => slots.map((slot) => slot.id === slotId ? {
        ...slot,
        ...(typeof patch.title === 'string' ? { title: patch.title } : {}),
        ...(typeof patch.url === 'string' ? { url: patch.url } : {}),
        ...(typeof patch.visible === 'boolean' ? { collapsed: !patch.visible } : {}),
      } : slot));
    }
  }, []);
  const addOverlayWidget = (preset?: Partial<OverlayWidget>) => {
    const id = `custom-${Date.now()}`;
    setOverlayWidgets((widgets) => [...widgets, {
      id,
      title: preset?.title || 'Custom Overlay',
      kind: preset?.kind || 'custom',
      url: preset?.url || 'about:blank',
      visible: true,
      locked: false,
      interactive: false,
      x: 12 + (widgets.length % 4) * 8,
      y: 16 + (widgets.length % 4) * 8,
      width: 360,
      height: 220,
      opacity: 1,
      interactionMode: 'click-through',
      hoverReveal: false,
      rotation: 0,
      zIndex: widgets.length + 1,
      parallaxEnabled: false,
      parallaxDepth: 8,
      groupId: null,
      ...preset,
    }]);
  };
  const toggleBridgeSection = (section: string) => {
    setBridgeSections((current) => ({ ...current, [section]: !current[section] }));
  };
  const runBridgeCommand = (command: string) => {
    const clean = command.trim().toLowerCase();
    if (!clean) return;
    if (clean.includes('shipyard') || clean.includes('apps')) setActiveTab('apps');
    else if (clean.includes('inbox') || clean.includes('message') || clean.includes('commlink')) setActiveTab('inbox');
    else if (clean.includes('forum')) setActiveTab('forums');
    else if (clean.includes('room') || clean.includes('hearmeout')) setActiveTab('rooms');
    else if (clean.includes('arena')) setActiveTab('arena');
    else if (clean.includes('crew') || clean.includes('workspace')) setActiveTab('crew');
    else if (clean.includes('dsh') || clean.includes('discord')) openEmbeddedApp('DSH Dashboard', dshDashboardUrl, 'dashboard');
    else if (clean.includes('streamweaver')) openEmbeddedApp('StreamWeaver Commands', streamweaverCommandsUrl, 'app');
    else if (clean.includes('quackverse')) openEmbeddedApp('Quackverse Game', appSurfaces.chatTag.quackverse, 'game');
    else notify('Command received', command);
  };
  const startVoiceCommander = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus('unsupported');
      setVoiceTranscript('Voice input is not available in this browser. Type the command in Athena instead.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setVoiceListening(true);
    setVoiceStatus('listening');
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setVoiceTranscript(transcript);
      setVoiceStatus('ready');
      runBridgeCommand(transcript);
    };
    recognition.onerror = (event: any) => {
      setVoiceStatus('error');
      setVoiceTranscript(event?.error === 'not-allowed'
        ? 'Microphone permission was blocked. Allow microphone access or use Athena text input.'
        : 'Voice command failed. Try again or use Athena text input.');
    };
    recognition.onend = () => {
      setVoiceListening(false);
      setVoiceStatus((current) => current === 'listening' ? 'ready' : current);
    };
    recognition.start();
  };
  const managePlatformPlugin = async (plugin: any) => {
    const token = getStoredSpmtToken();
    if (!token) {
      notify('Sign in required', 'Sign in with SPMT to install platform plugins.');
      return;
    }

    try {
      const response = await fetch(`${spmtBaseUrl}/api/platform/plugins/${plugin.id}/install`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Plugin install failed');
      setPlatformPlugins((plugins) => plugins.map((item) => item.id === plugin.id ? { ...item, installed: true, enabled: true } : item));
      notify('Plugin installed', `${plugin.name} is enabled for your SPMT account.`);
    } catch {
      notify('Plugin install failed', `${plugin.name} could not be enabled right now.`);
    }
  };
  useEffect(() => {
    const token = getStoredSpmtToken();
    const query = bridgeSearch.trim();
    if (!token || query.length < 2) {
      setBridgeRemoteResults(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`${spmtBaseUrl}/api/search?${new URLSearchParams({ q: query, limit: '8' }).toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        signal: controller.signal,
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => setBridgeRemoteResults(data))
        .catch(() => {});
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [bridgeSearch]);
  const sendEmbeddedAuth = React.useCallback(async (frame: HTMLIFrameElement | null) => {
    if (!frame?.contentWindow) return;
    const profile: UserProfile | null = identity;
    if (!profile) return;

    const targetOrigin = (() => {
      try {
        return new URL(frame.getAttribute('src') || window.location.href, window.location.origin).origin;
      } catch {
        return '*';
      }
    })();

    let launchCode: string | null = null;
    if (targetOrigin === appOrigins.streamweaver) {
      try {
        const launchResponse = await fetch('/api/embed/launch', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: 'streamweaver',
            targetOrigin,
            scopes: ['identity:read', 'workspace:read', 'workspace:write', 'tts:control', 'overlay:control'],
          }),
        });
        const launch = await launchResponse.json().catch(() => null);
        if (launchResponse.ok && launch?.code) launchCode = String(launch.code);
      } catch (error) {
        console.warn('StreamWeaver embed launch bridge unavailable', error);
      }
    }

    frame.contentWindow.postMessage({
      type: 'SPACEMOUNTAIN_AUTH',
      source: 'spacemountain.live',
      launchCode,
      targetOrigin,
      profile: profile ? {
        ...profile,
        discordUserId: profile.discordId || (profile as any).discordUserId || null,
        discordUsername: profile.discordUsername || null,
        twitchUsername: profile.twitchUsername || null,
      } : null,
    }, targetOrigin);
  }, [identity]);

  useEffect(() => {
    if (!identity) return;
    document.querySelectorAll<HTMLIFrameElement>('[data-embed-slot-frame]')
      .forEach((frame) => void sendEmbeddedAuth(frame));
  }, [identity, sendEmbeddedAuth]);

  useEffect(() => {
    const token = getStoredSpmtToken();
    if (!token || !identity) return;
    const cacheKey = `spacemountain:overlay-workspace:${identity.id}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached) {
        if (typeof cached.enabled === 'boolean') setOverlayWorkspaceEnabled(cached.enabled);
        setOverlayWidgets(normalizeOverlayWidgets(cached.widgets, (identity as any).tenantId || identity.twitchId || 'spmt'));
        if (Array.isArray(cached.workflows)) setWorkflowSteps(cached.workflows);
      }
    } catch {}
    setOverlayWorkspaceLoaded(false);
    fetch(`${spmtBaseUrl}/api/overlay-workspace`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Overlay workspace load failed (${response.status})`);
        return response.json();
      })
      .then((data) => {
        const layout = data?.layout;
        if (typeof layout?.enabled === 'boolean') setOverlayWorkspaceEnabled(layout.enabled);
        if (Array.isArray(layout?.widgets)) {
          setOverlayWidgets(normalizeOverlayWidgets(layout.widgets, (identity as any).tenantId || identity.twitchId || 'spmt'));
        }
        if (Array.isArray(layout?.workflows)) setWorkflowSteps(layout.workflows);
      })
      .catch((error) => console.warn('Overlay workspace load failed; using local copy', error))
      .finally(() => setOverlayWorkspaceLoaded(true));
  }, [identity?.id, identity?.twitchId]);

  useEffect(() => {
    if (!overlayWorkspaceLoaded || !identity) return;
    const token = getStoredSpmtToken();
    if (!token) return;
    const layout = {
      enabled: overlayWorkspaceEnabled,
      widgets: normalizeOverlayWidgets(overlayWidgets, (identity as any).tenantId || identity.twitchId || 'spmt'),
      workflows: workflowSteps,
    };
    localStorage.setItem(`spacemountain:overlay-workspace:${identity.id}`, JSON.stringify(layout));
    const timer = window.setTimeout(() => {
      fetch(`${spmtBaseUrl}/api/overlay-workspace`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ layout }),
      })
        .then((response) => {
          if (!response.ok) throw new Error(`Overlay workspace save failed (${response.status})`);
        })
        .catch((error) => console.warn('Overlay workspace save failed; local copy retained', error));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [identity, overlayWidgets, overlayWorkspaceEnabled, overlayWorkspaceLoaded, workflowSteps]);

  const handleArenaCollision = useCallback(() => setActiveTab('arena'), []);

  useEffect(() => {
    function handleEmbeddedAuthRequest(event: MessageEvent) {
      if (event.data?.type !== 'SPACEMOUNTAIN_AUTH_REQUEST') return;
      const frame = Array.from(document.querySelectorAll<HTMLIFrameElement>('[data-embed-slot-frame]'))
        .find((item) => item.contentWindow === event.source);
      if (!frame) return;
      let expectedOrigin = '';
      try {
        expectedOrigin = new URL(frame.src, window.location.href).origin;
      } catch {
        return;
      }
      if (event.origin !== expectedOrigin) return;
      void sendEmbeddedAuth(frame);
    }

    window.addEventListener('message', handleEmbeddedAuthRequest);
    return () => window.removeEventListener('message', handleEmbeddedAuthRequest);
  }, [sendEmbeddedAuth]);
  const [shoutoutFeed, setShoutoutFeed] = useState<CommunityShoutoutFeed | null>(null);
  const [shoutoutsLoading, setShoutoutsLoading] = useState(false);
  const [quackverseState, setQuackverseState] = useState<QuackverseSummary | null>(null);
  const [quackverseLoading, setQuackverseLoading] = useState(false);

  // Interactive points animations list (floating points indicator!)
  const [pointPopups, setPointPopups] = useState<{ id: number; text: string; x: number; y: number }[]>([]);

  const refreshHearMeOutRooms = async () => {
    setHearmeoutLoading(true);
    try {
      const res = await fetch('/api/integrations/hearmeout/rooms');
      const data = await res.json();
      setHearmeoutRooms(Array.isArray(data?.rooms) ? data.rooms : []);
    } catch (err) {
      console.warn('HearMeOut rooms fetch failed', err);
      setHearmeoutRooms([]);
    } finally {
      setHearmeoutLoading(false);
    }
  };

  const refreshChatTagState = async () => {
    setChatTagLoading(true);
    try {
      const res = await fetch('/api/integrations/chat-tag/state');
      const data = await res.json();
      setChatTagState(data || null);
    } catch (err) {
      console.warn('ChatTag state fetch failed', err);
      setChatTagState(null);
    } finally {
      setChatTagLoading(false);
    }
  };

  const refreshCommunityShoutouts = async () => {
    setShoutoutsLoading(true);
    try {
      const res = await fetch('/api/community/shoutouts');
      const data = await res.json();
      setShoutoutFeed(data || null);
    } catch (err) {
      console.warn('Community shoutouts fetch failed', err);
      setShoutoutFeed(null);
    } finally {
      setShoutoutsLoading(false);
    }
  };

  const refreshQuackverseState = async () => {
    setQuackverseLoading(true);
    try {
      const res = await fetch('/api/integrations/chat-tag/quackverse');
      const data = await res.json();
      setQuackverseState(data || null);
    } catch (err) {
      console.warn('Quackverse state fetch failed', err);
      setQuackverseState(null);
    } finally {
      setQuackverseLoading(false);
    }
  };

  const refreshForwardedForumPosts = async () => {
    setForwardedForumLoading(true);
    try {
      const res = await fetch('/api/forum/forwarded');
      const data = await res.json();
      setForwardedForumPosts(Array.isArray(data?.posts) ? data.posts : []);
    } catch (err) {
      console.warn('Forwarded forum posts fetch failed', err);
      setForwardedForumPosts([]);
    } finally {
      setForwardedForumLoading(false);
    }
  };

  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    const refreshLiveData = async () => {
      if (stopped || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        await Promise.allSettled([
          refreshHearMeOutRooms(),
          refreshChatTagState(),
          refreshCommunityShoutouts(),
          refreshQuackverseState(),
          refreshForwardedForumPosts(),
          refreshSpmtApps(),
          refreshSpmtInbox(),
        ]);
      } finally {
        inFlight = false;
      }
    };
    const handleFocus = () => void refreshLiveData();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshLiveData();
    };
    const interval = window.setInterval(() => void refreshLiveData(), 15_000);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [identity?.id, commlinkFilter, commlinkSearch]);

  // Initialize: Check auth status and fetch data
  useEffect(() => {
    // 1. Fetch domain branding
    fetch('/api/branding')
      .then(res => res.json())
      .then((data: BrandingConfig) => {
        setBranding(data);
      })
      .catch(err => console.error('Branding fetch failed:', err));

    // 2. Fetch live app registry/tools
    fetch('/api/tools')
      .then(async res => res.ok ? res.json() : [])
      .then((data: unknown) => {
        const nextTools = Array.isArray(data) ? data : [];
        setTools(mergeSpmtAppsIntoTools(nextTools, spmtApps));
      })
      .catch(err => console.error('Tools fetch failed:', err));

    refreshSpmtApps().catch(() => {});
    fetch(`${spmtBaseUrl}/api/athena/os`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setAthenaOs(data))
      .catch(() => setAthenaOs(null));
    fetch(`${spmtBaseUrl}/api/platform`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setPlatformInfo(data))
      .catch(() => setPlatformInfo(null));
    fetch(`${spmtBaseUrl}/api/platform/docs`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setPlatformDocs(data))
      .catch(() => setPlatformDocs(null));
    fetch(`${spmtBaseUrl}/api/platform/plugins`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setPlatformPlugins(Array.isArray(data?.plugins) ? data.plugins : []))
      .catch(() => setPlatformPlugins([]));

    // 3. Fetch database aggregates
    fetch('/api/stats')
      .then(res => res.json())
      .then((data) => {
        setStats(data);
      })
      .catch(err => console.error('Stats fetch failed:', err));

    refreshHearMeOutRooms();
    refreshChatTagState();
    refreshForwardedForumPosts();
    refreshCommunityShoutouts();
    refreshQuackverseState();

    // 4. Fetch the local tenant-scoped SPMT inbox.
    refreshSpmtInbox().catch(() => {});

    const spmtToken = getStoredSpmtToken();
    if (spmtToken) {
      refreshSpmtIdentity(spmtToken).catch(() => {});
      // 5. Fetch forum threads from spmt.live
      fetch('/api/spmt/api/forum/threads')
        .then(r => r.ok ? r.json() : [])
        .then(threads => {
          setForumThreads(threads.map((t: any) => ({
            id: t.id,
            title: t.title,
            category: t.category,
            posts: t.post_count || 1,
            author: t.author,
            repliedBy: '',
            isOpen: true,
          })));
        })
        .catch(() => {});
    }

  }, []);

  // Update preferences local handler
  const handleUpdatePreferences = (updated: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updated }));
  };

  // Change preset configs matching Solar Flare, Nebula Purple etc.
  const handleApplyThemePreset = (preset: 'solar-flare' | 'nebula-purple' | 'oceanic-blue' | 'aurora-green') => {
    let presetGlow = 80;
    let presetStars = 70;
    let presetBlur = 22;
    let presetOpacity = 65;

    if (preset === 'solar-flare') {
      presetGlow = 85;
      presetStars = 75;
      presetBlur = 20;
    } else if (preset === 'nebula-purple') {
      presetGlow = 75;
      presetStars = 85;
      presetBlur = 24;
    } else if (preset === 'oceanic-blue') {
      presetGlow = 70;
      presetStars = 65;
      presetBlur = 22;
    } else if (preset === 'aurora-green') {
      presetGlow = 90;
      presetStars = 60;
      presetBlur = 18;
    }

    handleUpdatePreferences({
      theme: preset,
      accentColor: null,
      accentSaturation: 100,
      glowIntensity: presetGlow,
      starDensity: presetStars,
      blurStrength: presetBlur,
      glassOpacity: presetOpacity
    });
  };

  // Trigger Action / Generate points inside SQLite Database
  const handleTriggerAction = async (toolId: string) => {
    const pointsIncrement = 5;

    // Push points to Discord Stream Hub using the existing DSH contract.
    const user = identity;
    if (user) {
      try {
        const lookup = await fetch(`/api/spmt/api/user/lookup?username=${encodeURIComponent(user.username)}`);
        if (lookup.ok) {
          const spmtUser = await lookup.json();
          if (spmtUser?.discord_id) {
            await fetch('/api/integrations/dsh/points/add', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: spmtUser.discord_id,
                username: user.username,
                displayName: user.displayName,
                points: pointsIncrement,
              }),
            });
          }
        }
      } catch (err) {
        console.warn('Discord Stream Hub points sync failed', err);
      }
    }
    
    // Trigger floating popup indicator
    const randomX = Math.floor(Math.random() * 200) + 400;
    const randomY = Math.floor(Math.random() * 100) + 250;
    const newPopup = {
      id: Date.now(),
      text: `+${pointsIncrement} XP`,
      x: randomX,
      y: randomY
    };
    setPointPopups(prev => [...prev, newPopup]);
    setTimeout(() => {
      setPointPopups(prev => prev.filter(p => p.id !== newPopup.id));
    }, 1500);

    try {
      const response = await fetch(`/api/tools/${toolId}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: pointsIncrement })
      });
      const data = await response.json();
      
      if (data.success) {
        // Sync local state for this tool
        setTools(prev => prev.map(t => t.id === toolId ? { ...t, pointsFlow: data.pointsFlow } : t));
        
        // Sync total aggregate metrics
        setStats(prev => ({
          ...prev,
          pointsAwarded: prev.pointsAwarded + pointsIncrement
        }));
        void refreshCanonicalXp().catch(() => {});

        fetch('/api/stats')
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) setStats(data);
          })
          .catch(() => {});
      }
    } catch (err) {
      console.warn('Points sync failed', err);
    }
  };

  const handleSpendDshPoints = async (amount: number) => {
    const user = identity;
    if (!user || amount <= 0) return false;

    try {
      if (!user.username) return false;

      const lookup = await fetch(`/api/spmt/api/user/lookup?username=${encodeURIComponent(user.username)}`);
      if (!lookup.ok) return false;
      const spmtUser = await lookup.json();
      if (!spmtUser?.discord_id) return false;

      const balanceResponse = await fetch('/api/integrations/dsh/points/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: spmtUser.discord_id, username: user.username, displayName: user.displayName }),
      });
      if (!balanceResponse.ok) return false;
      const balanceData = await balanceResponse.json();
      const currentPoints = Number(balanceData?.points || 0);
      if (currentPoints < amount) return false;

      const nextPoints = currentPoints - amount;
      const setResponse = await fetch('/api/integrations/dsh/points/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: spmtUser.discord_id,
          username: user.username,
          displayName: user.displayName || user.username,
          points: nextPoints,
        }),
      });
      if (!setResponse.ok) return false;

      setIdentity(prev => prev ? { ...prev, points: nextPoints } : prev);
      return true;
    } catch (err) {
      console.warn('Discord Stream Hub points spend failed', err);
      return false;
    }
  };

  // Send a tenant-scoped SPMT internal message.
  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipients = Array.from(new Set([
      ...composeRecipients,
      ...composeTo.split(/[,\s]+/).map(normalizeRecipientHandle).filter(Boolean),
    ]));
    if (!recipients.length || !composeBody) return;

    try {
      const token = getStoredSpmtToken();
      if (token) {
        if (recipients.length > 1) {
          const conversationRes = await fetch(`${spmtBaseUrl}/api/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            credentials: 'include',
            body: JSON.stringify({
              title: composeGroupTitle || composeSubject || 'Group conversation',
              recipients,
            }),
          });
          const conversationData = await conversationRes.json();
          if (!conversationRes.ok) {
            alert(conversationData.error || 'Failed to create group conversation');
            return;
          }

          const messageRes = await fetch(`${spmtBaseUrl}/api/conversations/${conversationData.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            credentials: 'include',
            body: JSON.stringify({
              subject: composeSubject,
              body: composeBody,
              sourceApp: 'spacemountain-live',
              metadata: { source: 'spacemountain.group' },
            }),
          });
          const messageData = await messageRes.json();
          if (!messageRes.ok) {
            alert(messageData.error || 'Failed to send group message');
            return;
          }
          setActiveConversationId(conversationData.id);
        } else {
          const res = await fetch(`${spmtBaseUrl}/api/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          credentials: 'include',
          body: JSON.stringify({
            to: recipients[0],
            subject: composeSubject,
            body: composeBody,
            sourceApp: 'spacemountain-live',
            metadata: { source: 'spacemountain.inbox' },
          }),
          });
          const data = await res.json();
          if (!res.ok) {
            alert(data.error || 'Failed to send');
            return;
          }
          setActiveConversationId(data.conversationId || null);
        }
        setIsComposing(false);
        setComposeTo('');
        setComposeRecipients([]);
        setComposeGroupTitle('');
        setComposeSubject('');
        setComposeBody('');
        await refreshSpmtInbox();
        return;
      }

      const from = getSpmtHandle();
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-spmt-handle': from, 'x-spmt-tenant': 'spmt' },
        body: JSON.stringify({
          tenantId: 'spmt',
          from,
          to: recipients[0],
          subject: composeSubject,
          body: composeBody,
          metadata: { source: 'spacemountain.inbox' },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsComposing(false);
        setComposeTo('');
        setComposeRecipients([]);
        setComposeSubject('');
        setComposeBody('');
        await refreshSpmtInbox();
      } else {
        alert(data.error || 'Failed to send');
      }
    } catch {
      alert('Failed to send internal message');
    }
  };

  const openCommlinkThread = async (conversationId?: string | null) => {
    const token = getStoredSpmtToken();
    if (!token || !conversationId) return;

    const response = await fetch(`${spmtBaseUrl}/api/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    const data = response.ok ? await response.json() : { messages: [] };
    const messages = Array.isArray(data?.messages) ? data.messages : [];
    setActiveConversationId(conversationId);
    setActiveConversationMessages(messages.map((message: any) => ({
      ...message,
      attachments: message.attachments ? JSON.parse(message.attachments) : [],
      mentions: message.mentioned_users ? JSON.parse(message.mentioned_users) : [],
    })));

    await fetch(`${spmtBaseUrl}/api/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    }).catch(() => {});
    await Promise.all(
      commlinkNotifications
        .filter((item) => !item.read_at && item.link_url === `/messages/${conversationId}`)
        .map((item) => markCommlinkNotificationRead(item.id, false).catch(() => {})),
    );
    refreshSpmtInbox().catch(() => {});
  };

  const handleSendThreadReply = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = getStoredSpmtToken();
    if (!token || !activeConversationId || !threadReplyBody.trim()) return;

    const response = await fetch(`${spmtBaseUrl}/api/conversations/${activeConversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({
        body: threadReplyBody,
        sourceApp: 'spacemountain-live',
        metadata: { source: 'spacemountain.thread-reply' },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      alert(data.error || 'Failed to send reply');
      return;
    }

    setThreadReplyBody('');
    await openCommlinkThread(activeConversationId);
  };

  // Create a new Forums Thread via spmt.live
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle || !newThreadBody) return;

    const spmtToken = getStoredSpmtToken();
    if (!spmtToken) { alert('Please sign in first'); return; }

    try {
      const res = await fetch('/api/spmt/api/forum/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${spmtToken}` },
        body: JSON.stringify({ title: newThreadTitle, category: newThreadCategory, body: newThreadBody }),
      });
      const data = await res.json();
      if (res.ok) {
        setForumThreads(prev => [{ id: data.id, title: data.title, category: newThreadCategory, posts: 1, author: identity?.username || '', repliedBy: '', isOpen: true }, ...prev]);
        setIsCreatingThread(false);
        setNewThreadTitle('');
        setNewThreadBody('');
        alert('Thread created!');
      } else {
        alert(data.error || 'Failed to create thread');
      }
    } catch {
      alert('Failed to connect to spmt.live');
    }
  };

  const openForumThread = async (threadId: string) => {
    const response = await fetch(`${spmtBaseUrl}/api/forum/threads/${threadId}`);
    const data = response.ok ? await response.json() : null;
    if (!data?.thread) {
      alert('Could not load forum thread');
      return;
    }
    setActiveForumThread(data.thread);
    setActiveForumPosts(Array.isArray(data.posts) ? data.posts : []);
    setIsCreatingThread(false);
  };

  const handleForumReply = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = getStoredSpmtToken();
    if (!token || !activeForumThread?.id || !forumReplyBody.trim()) return;

    const response = await fetch(`${spmtBaseUrl}/api/forum/threads/${activeForumThread.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({ body: forumReplyBody }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      alert(data.error || 'Failed to post reply');
      return;
    }

    setForumReplyBody('');
    await openForumThread(activeForumThread.id);
    fetch('/api/spmt/api/forum/threads')
      .then(r => r.ok ? r.json() : [])
      .then(threads => {
        setForumThreads(threads.map((t: any) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          posts: t.post_count || 1,
          author: t.author,
          repliedBy: '',
          isOpen: true,
        })));
      })
      .catch(() => {});
  };

  const currentTheme = resolveThemePreset(preferences.theme, preferences.accentColor, preferences.accentSaturation);
  const sendEmbeddedTheme = useCallback((frame: HTMLIFrameElement | null) => {
    if (!frame?.contentWindow) return;
    let targetOrigin = '*';
    try {
      targetOrigin = new URL(frame.getAttribute('src') || window.location.href, window.location.origin).origin;
    } catch {}
    frame.contentWindow.postMessage(createThemeMessage(currentTheme, preferences), targetOrigin);
  }, [currentTheme, preferences]);
  const sendEmbeddedFrameContext = useCallback(async (frame: HTMLIFrameElement | null) => {
    await sendEmbeddedAuth(frame);
    sendEmbeddedTheme(frame);
  }, [sendEmbeddedAuth, sendEmbeddedTheme]);

  useEffect(() => {
    document.querySelectorAll<HTMLIFrameElement>('[data-embed-slot-frame]')
      .forEach((frame) => sendEmbeddedTheme(frame));
  }, [sendEmbeddedTheme]);

  const glowScale = Math.max(0.1, preferences.glowIntensity / 100);
  const glassAlpha = Math.max(0.08, Math.min(0.78, preferences.glassOpacity / 100));
  const borderAlpha = Math.max(0.02, Math.min(0.55, preferences.borderStrength / 100 * 0.36));
  const animationFactor = Math.max(0.2, (preferences.animationSpeed || 85) / 100);
  const radiusMap = {
    sm: '12px',
    md: '18px',
    lg: '26px',
    full: '999px',
  };
  const sidebarOffset = preferences.sidebarStyle === 'hidden' ? 24 : 172;
  const mainSpacing = preferences.uiDensity === 'compact'
    ? { gap: '1rem', paddingTop: '5.5rem' }
    : preferences.uiDensity === 'spacious'
      ? { gap: '2rem', paddingTop: '6.75rem' }
      : { gap: '1.5rem', paddingTop: '6rem' };
  const chatTagPlayers = Array.isArray(chatTagState?.players) ? chatTagState.players : [];
  const currentItPlayer = chatTagPlayers.find((player) => player.isIt || player.id === chatTagState?.currentIt);
  const sortedChatTagPlayers = [...chatTagPlayers].sort((a, b) => Number(b.score ?? b.points ?? b.tags ?? 0) - Number(a.score ?? a.points ?? a.tags ?? 0));
  const recentTags = [
    ...(Array.isArray(chatTagState?.history) ? chatTagState.history : []),
    ...(Array.isArray(chatTagState?.adminHistory) ? chatTagState.adminHistory : []),
  ]
    .sort((a: any, b: any) => new Date(b.timestamp || b.createdAt || 0).getTime() - new Date(a.timestamp || a.createdAt || 0).getTime())
    .slice(0, 5);
  const liveShoutouts = (shoutoutFeed?.shoutouts || []).filter((shoutout) => shoutout.isLive);
  const spotlightShoutout = shoutoutFeed?.spotlight?.[0] || liveShoutouts[0] || null;
  const quackversePlayers = Array.isArray(quackverseState?.players)
    ? quackverseState.players
    : Array.isArray(quackverseState?.state?.players)
      ? quackverseState.state.players
      : [];
  const quackverseUpdatedAt = quackverseState?.updatedAt || quackverseState?.state?.updatedAt || quackverseState?.state?.lastUpdatedAt || null;
  const chatTagCurrentName = currentItPlayer?.displayName || currentItPlayer?.twitchUsername || currentItPlayer?.username || currentItPlayer?.name || chatTagState?.currentIt || 'Free for all';
  const chatTagLastEventTime = recentTags[0]?.timestamp || recentTags[0]?.createdAt || chatTagState?.lastTagTime || null;
  const sdkStatusCards = useMemo(() => buildSdkStatusCards(platformEvents), [platformEvents]);
  const commandWidgets = [
    { label: 'Online Apps', value: `${stats.onlineApps}/${stats.checkedApps || tools.length || 0}`, tone: 'text-emerald-300' },
    { label: 'Unread', value: commlinkNotifications.filter((item) => !item.read_at).length.toLocaleString(), tone: 'text-sky-300' },
    { label: 'Live Shoutouts', value: liveShoutouts.length.toLocaleString(), tone: 'text-amber-300' },
    { label: 'Dock Slots', value: embedSlots.filter((slot) => !slot.collapsed).length.toLocaleString(), tone: 'text-fuchsia-300' },
  ];
  const liveStatusTools = tools
    .filter((tool) => tool.statusType === 'live' || tool.installed || tool.enabled !== undefined)
    .slice(0, 6);
  const bridgeActivity = [
    ...commlinkNotifications.slice(0, 2).map((item) => ({
      id: `note-${item.id}`,
      title: item.title || 'Commlink notification',
      body: item.body || item.source_app || 'SPMT notification',
      time: formatShoutoutTime(item.created_at),
    })),
    ...recentTags.slice(0, 2).map((event: any, index) => ({
      id: `tag-${event.id || index}`,
      title: 'ChatTag event',
      body: formatChatTagEvent(event),
      time: formatRelativeMinutes(event.timestamp || event.createdAt),
    })),
    ...forwardedForumPosts.slice(0, 2).map((post: any, index) => ({
      id: `forum-${post.id || index}`,
      title: post.sourceChannelName || 'Forum forward',
      body: post.title || post.content || 'New forwarded post',
      time: formatShoutoutTime(post.postedAt || post.createdAt),
    })),
  ].slice(0, 5);
  const commandDockTargets = [
    { title: 'DSH Dashboard', url: dshDashboardUrl, kind: 'dashboard' as const },
    { title: 'StreamWeaver Commands', url: streamweaverCommandsUrl, kind: 'app' as const },
    { title: 'Quackverse Game', url: appSurfaces.chatTag.quackverse, kind: 'game' as const },
    { title: 'HearMeOut Rooms', url: appSurfaces.hearmeout.embed, kind: 'app' as const },
  ];
  const bridgeSearchTerm = bridgeSearch.trim().toLowerCase();
  const bridgeSearchResults = [
    ...(bridgeRemoteResults?.messages || []).map((message: any) => ({
      id: `remote-message-${message.id}`,
      title: message.subject || 'SPMT message',
      type: 'SPMT',
      detail: `${message.from_user || 'unknown'}: ${message.body || ''}`,
      action: () => setActiveTab('inbox'),
    })),
    ...(bridgeRemoteResults?.notifications || []).map((item: any) => ({
      id: `remote-notification-${item.id}`,
      title: item.title || 'Notification',
      type: 'Notice',
      detail: item.body || item.source_app || 'SPMT notification',
      action: () => setActiveTab('inbox'),
    })),
    ...(bridgeRemoteResults?.forums || []).map((thread: any) => ({
      id: `remote-forum-${thread.id}`,
      title: thread.title || 'Forum thread',
      type: 'Forum',
      detail: thread.category || thread.author || 'SPMT forum',
      action: () => setActiveTab('forums'),
    })),
    ...tools.map((tool) => ({
      id: `tool-${tool.id}`,
      title: tool.name,
      type: 'App',
      detail: tool.description || tool.statusText,
      action: () => tool.appUrl || tool.authUrl ? window.open(tool.appUrl || tool.authUrl, '_blank') : setActiveTab(tool.route.replace('/', '') || 'dashboard'),
    })),
    ...mails.slice(0, 8).map((message) => ({
      id: `mail-${message.id}`,
      title: message.subject,
      type: 'Commlink',
      detail: `${message.from}: ${message.preview}`,
      action: () => setActiveTab('inbox'),
    })),
    ...forumThreads.slice(0, 8).map((thread) => ({
      id: `thread-${thread.id}`,
      title: thread.title,
      type: 'Forum',
      detail: thread.category || 'Forum thread',
      action: () => setActiveTab('forums'),
    })),
    ...forwardedForumPosts.slice(0, 8).map((post: any, index) => ({
      id: `forward-${post.id || index}`,
      title: post.title || post.sourceChannelName || 'Forwarded Discord post',
      type: 'Forwarded',
      detail: post.content || post.sourceChannelName || 'Discord forum forward',
      action: () => setActiveTab('forums'),
    })),
    ...hearmeoutRooms.slice(0, 6).map((room) => ({
      id: `room-${room.id}`,
      title: room.name,
      type: 'Room',
      detail: room.description || 'HearMeOut room',
      action: () => setActiveTab('rooms'),
    })),
    ...embedSlots.map((slot) => ({
      id: `slot-${slot.id}`,
      title: slot.title,
      type: 'Dock',
      detail: slot.url,
      action: () => updateEmbedSlot(slot.id, { collapsed: false }),
    })),
  ].filter((item) => {
    if (!bridgeSearchTerm) return true;
    return `${item.title} ${item.type} ${item.detail}`.toLowerCase().includes(bridgeSearchTerm);
  }).slice(0, 8);
  const creatorWorkspaceItems = [
    { label: 'Launch Apps', value: `${spmtApps.filter((app) => app.installed && app.enabled !== false).length}/${spmtApps.length || tools.length}`, action: () => setActiveTab('apps') },
    { label: 'Commlink', value: `${mails.length} messages`, action: () => setActiveTab('inbox') },
    { label: 'Forums', value: `${forumThreads.length + forwardedForumPosts.length} threads`, action: () => setActiveTab('forums') },
    { label: 'Dock Slots', value: `${embedSlots.filter((slot) => !slot.collapsed).length} active`, action: () => setActiveTab('crew') },
  ];
  const homePageLinks = [
    { label: 'Shipyard', detail: 'Apps, installs, ChatTag, StreamWeaver, and DSH tools', action: () => setActiveTab('apps') },
    { label: 'Community', detail: 'Spotlight, crew groups, forums, and forwarded Discord posts', action: () => setActiveTab('forums') },
    { label: 'Commlink', detail: 'Messages, notifications, and app conversations', action: () => setActiveTab('inbox') },
    { label: 'Command Bridge', detail: 'Advanced status, search, Athena, and platform panels', action: () => setBridgeSections((current) => ({ ...current, operations: true, search: true, workspace: true })) },
  ];
  const athenaCapabilities = athenaOs?.capabilities
    ? Object.entries(athenaOs.capabilities).map(([key, value]) => {
        const state = typeof value === 'string' ? value : value ? 'ready' : 'unavailable';
        return {
          key,
          label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
          state,
          enabled: state === 'ready',
        };
      })
    : [];
  const platformFeatures = Array.isArray(platformInfo?.features) ? platformInfo.features : [];
  const platformDocSections = Array.isArray(platformDocs?.sections) ? platformDocs.sections : [];
  const platformScopes = Array.isArray(platformDocs?.scopes) ? platformDocs.scopes : [];
  const featuredPlugins = platformPlugins.slice(0, 4);
  const surfaceParams = new URLSearchParams(window.location.search);
  const desktopOverlayMode = surfaceParams.get('desktopOverlay') === '1';
  const companionWorkspaceMode = surfaceParams.get('companionWorkspace') === 'streamweaver';
  const settingsEmbedMode = surfaceParams.get('embed') === '1' && activeTab === 'settings';

  if (settingsEmbedMode) {
    return (
      <div
        data-theme={currentTheme.id}
        data-contrast={preferences.highContrast ? 'high' : 'standard'}
        data-focus={preferences.focusHighlight ? 'strong' : 'standard'}
        data-color-vision={preferences.colorVisionMode}
        className={`min-h-screen bg-[#050505] p-3 text-white font-sans md:p-5 ${preferences.uiAnimations && !preferences.reduceMotion ? '' : 'reduce-ui-motion'}`}
        style={{
          ['--theme-glow-color' as any]: currentTheme.glowHex,
          ['--theme-secondary-color' as any]: currentTheme.secondaryHex,
          ['--theme-surface-bg' as any]: preferences.highContrast ? 'rgba(0, 0, 0, 0.96)' : `rgba(6, 8, 22, ${glassAlpha})`,
          ['--theme-surface-border' as any]: rgbaFromHex(currentTheme.glowHex, borderAlpha),
          ['--theme-surface-shadow' as any]: preferences.borderGlow ? `0 10px 40px -12px ${rgbaFromHex(currentTheme.glowHex, 0.35 * glowScale)}` : 'none',
          ['--theme-blur' as any]: `${preferences.blurStrength}px`,
          ['--theme-radius' as any]: radiusMap[preferences.cornerRadius],
          ['--theme-text-scale' as any]: preferences.textScale === 'sm' ? '0.92' : preferences.textScale === 'lg' ? '1.08' : '1',
          backgroundImage: `linear-gradient(180deg, rgba(2, 6, 18, 0.28), rgba(2, 6, 18, 0.72)), url("${currentTheme.backgroundImage}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <main className="mx-auto max-w-[1500px]">
          <React.Suspense fallback={<div className="rounded-3xl border border-white/10 p-8 text-sm text-zinc-400">Loading universal settings…</div>}>
            <SettingsRoute
              identityPresent={Boolean(identity)}
              preferences={preferences}
              accentColor={currentTheme.glowHex}
              portableWorkspace={portableWorkspace}
              onUpdatePreferences={handleUpdatePreferences}
              onApplyThemePreset={handleApplyThemePreset}
            />
          </React.Suspense>
        </main>
      </div>
    );
  }

  if (companionWorkspaceMode) {
    return (
      <CompanionWorkspaceSurface
        identityPresent={Boolean(identity)}
        streamWeaverUrl={`${appSurfaces.streamweaver.home}?companion=1`}
        onFrameLoad={sendEmbeddedFrameContext}
      />
    );
  }

  if (desktopOverlayMode) {
    return (
      <CompanionOverlaySurface
        identityPresent={Boolean(identity)}
        overlayEnabled={overlayWorkspaceEnabled}
        widgets={overlayWidgets}
        slots={embedSlots}
        tenantId={(identity as any)?.tenantId || identity?.twitchId || 'spmt'}
        accentColor={currentTheme.glowHex}
        onWidgetChange={updateOverlayWidget}
        onSlotChange={updateEmbedSlot}
        onOverlayEnabledChange={setOverlayWorkspaceEnabled}
        onFrameLoad={sendEmbeddedFrameContext}
      />
    );
  }

  return (
    <div 
      data-theme={currentTheme.id}
      data-contrast={preferences.highContrast ? 'high' : 'standard'}
      data-focus={preferences.focusHighlight ? 'strong' : 'standard'}
      data-hover-glow={preferences.hoverGlow ? 'on' : 'off'}
      data-color-vision={preferences.colorVisionMode}
      className={`min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden select-none font-sans ${preferences.uiAnimations && !preferences.reduceMotion ? '' : 'reduce-ui-motion'} ${preferences.smoothTransitions && !preferences.reduceMotion ? '' : 'no-smooth-transitions'}`}
      style={{
        ['--theme-glow-color' as any]: currentTheme.glowHex,
        ['--theme-secondary-color' as any]: currentTheme.secondaryHex,
        ['--theme-glow-color-alpha' as any]: rgbaFromHex(currentTheme.glowHex, 0.24 * glowScale),
        ['--theme-glow-color-half' as any]: rgbaFromHex(currentTheme.glowHex, 0.5 * glowScale),
        ['--theme-glow-color-quarter' as any]: rgbaFromHex(currentTheme.glowHex, 0.18 * glowScale),
        ['--theme-surface-bg' as any]: preferences.highContrast ? 'rgba(0, 0, 0, 0.96)' : `rgba(6, 8, 22, ${glassAlpha})`,
        ['--theme-surface-border' as any]: rgbaFromHex(currentTheme.glowHex, borderAlpha),
        ['--theme-surface-shadow' as any]: preferences.borderGlow ? `0 10px ${Math.round(20 + preferences.glowIntensity * 0.35)}px -10px ${rgbaFromHex(currentTheme.glowHex, 0.35 * glowScale)}` : '0 10px 28px -14px rgba(0, 0, 0, 0.65)',
        ['--theme-blur' as any]: `${preferences.blurStrength}px`,
        ['--theme-radius' as any]: radiusMap[preferences.cornerRadius],
        ['--theme-text-scale' as any]: preferences.textScale === 'sm' ? '0.92' : preferences.textScale === 'lg' ? '1.08' : '1',
        ['--chat-surface-bg' as any]: `rgba(6, 8, 22, ${Math.max(0.05, Math.min(0.9, preferences.chatTransparency / 100))})`,
      }}
    >
      
      {/* Dynamic Backgrounds & Space Gradients matching settings */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        
        {/* High-fidelity Cyber Space Deep Starfield Wallpaper */}
        <div 
          className="absolute inset-[-7vh_-5vw] bg-cover bg-left-bottom opacity-90 transition-transform duration-300"
          style={{ 
            backgroundImage: `linear-gradient(180deg, rgba(2, 6, 18, 0.16), rgba(2, 6, 18, 0.42)), url("${currentTheme.backgroundImage}")`,
            filter: 'saturate(1.06) contrast(1.04) brightness(0.82)',
            transform: `translate3d(${(mousePos.x / window.innerWidth - 0.5) * preferences.parallaxDepth * -0.10}px, ${(mousePos.y / window.innerHeight - 0.5) * preferences.parallaxDepth * -0.06}px, 0) scale(1.06)`,
          }}
        />
        <div
          className="absolute inset-0 transition-transform duration-300"
          style={{
            background: `
              radial-gradient(circle at 43% 23%, ${rgbaFromHex(currentTheme.glowHex, 0.13)}, transparent 24%),
              radial-gradient(circle at 79% 44%, rgba(255, 91, 42, 0.12), transparent 28%),
              linear-gradient(90deg, rgba(2, 6, 17, 0.42), transparent 45%, rgba(3, 5, 14, 0.16))
            `,
            mixBlendMode: 'screen',
            opacity: preferences.nebulaIntensity / 100,
            transform: `translate3d(${(mousePos.x / window.innerWidth - 0.5) * preferences.parallaxDepth * 0.12}px, ${(mousePos.y / window.innerHeight - 0.5) * preferences.parallaxDepth * 0.08}px, 0)`,
          }}
        />

        {/* Customizable Nebulae Gradient */}
        <div 
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ 
            backgroundImage: `radial-gradient(circle at 50% 30%, ${currentTheme.glowHex}25 0%, transparent 60%)`,
            opacity: preferences.nebulaIntensity / 100
          }}
        />

        {/* Ambient star particles field with variable density */}
        <div className="absolute inset-0">
          {preferences.particleEffects && starField.slice(0, Math.floor((preferences.starDensity / 100) * starField.length)).map((star) => {
            return (
              <div
                key={star.id}
                className="absolute rounded-full"
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  backgroundColor: rgbaFromHex(currentTheme.glowHex, star.size > 1 ? 0.95 : 0.65),
                  boxShadow: `0 0 ${Math.max(2, preferences.glowIntensity / 18)}px ${rgbaFromHex(currentTheme.glowHex, 0.55 * glowScale)}`,
                  animation: `Twinkle ${star.baseDuration / animationFactor}s ease-in-out ${star.delay / animationFactor}s infinite`,
                }}
              />
            );
          })}
        </div>

        {/* Dynamic scan line effect if particle effects active */}
        {preferences.particleEffects && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.015] to-transparent h-1/2 w-full animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
        )}

        {preferences.shootingStars && preferences.particleEffects && (
          <div className="absolute inset-0 overflow-hidden">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="shooting-star"
                style={{
                  top: `${18 + index * 23}%`,
                  left: `${68 - index * 18}%`,
                  animationDelay: `${index * 1.8}s`,
                  animationDuration: `${(5.8 + index) / animationFactor}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <OverlayWorkspace
        enabled={overlayWorkspaceEnabled}
        editing={overlayEditing}
        widgets={overlayWidgets.filter((widget) => overlayEditing || !dockSlotIdFromWidget(widget.id))}
        accentColor={currentTheme.glowHex}
        onChange={updateOverlayWidget}
        onFinishEditing={() => setOverlayEditing(false)}
        onSetEditing={(editing) => {
          if (editing) setOverlayWorkspaceEnabled(true);
          setOverlayEditing(editing);
        }}
        onSetEnabled={setOverlayWorkspaceEnabled}
        onFrameLoad={sendEmbeddedFrameContext}
      />

      {/* Floating Interactive Points Indicators (+XP) */}
      <AnimatePresence>
        {pointPopups.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 0, y: p.y, scale: 0.8 }}
            animate={{ opacity: 1, y: p.y - 120, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute z-50 font-mono font-black text-amber-400 drop-shadow-[0_0_10px_#f59e0b] pointer-events-none text-base"
            style={{ left: p.x }}
          >
            {p.text}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <CosmicHeader 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        accentColor={currentTheme.glowHex}
        identity={identity}
        pointsAwarded={stats.pointsAwarded}
        rocketFlying={rocketFlying}
        preferences={preferences}
        notificationCount={commlinkNotifications.filter((item) => !item.read_at).length}
      />

      {/* Main Container Layout */}
      <main
        className="flex-1 w-full max-w-7xl mx-auto px-6 pb-28 flex z-10 min-h-0 relative transition-all duration-500"
        style={{
          paddingTop: mainSpacing.paddingTop,
          gap: mainSpacing.gap,
          paddingLeft: preferences.sidebarPosition === 'left' ? sidebarOffset : 24,
          paddingRight: preferences.sidebarPosition === 'right' ? sidebarOffset : 24,
        }}
      >
        
        {/* Central Dashboard Frame */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 overflow-y-auto pr-1">
          
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <React.Suspense fallback={<div className="rounded-3xl border border-white/10 p-8 text-sm text-zinc-400">Loading your launchpad…</div>}>
                <HomeRoute
                  identity={identity}
                  tools={tools}
                  stats={stats}
                  unreadCount={commlinkNotifications.filter((item) => !item.read_at).length}
                  activeEmbedCount={embedSlots.filter((slot) => !slot.collapsed).length}
                  theme={currentTheme}
                  onNavigate={setActiveTab}
                  onLaunchTool={(tool) => {
                    if (tool.embedUrl) {
                      openEmbeddedApp(tool.name, tool.embedUrl, 'app');
                    } else if (tool.appUrl || tool.authUrl) {
                      window.open(tool.appUrl || tool.authUrl || '', '_blank', 'noopener,noreferrer');
                    } else {
                      setActiveTab(pathTabMap[tool.route] || 'apps');
                    }
                  }}
                />
              </React.Suspense>
            )}

            {activeTab === 'bridge' && (
              <motion.div
                key="bridge"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h1 className="text-2xl md:text-4xl font-display font-black tracking-tight text-white">
                      SpaceMountain Command Bridge
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                      The operating dashboard for live apps, docked workspaces, Commlink activity, and ecosystem status.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={refreshCommunityShoutouts}
                      disabled={shoutoutsLoading}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-white/10 disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={shoutoutsLoading ? 'animate-spin' : ''} />
                      Refresh Stage
                    </button>
                    <button
                      onClick={() => setActiveTab('apps')}
                      className="rounded-lg px-3 py-2 text-xs font-extrabold text-black"
                      style={{ backgroundColor: currentTheme.glowHex }}
                    >
                      Apps
                    </button>
                  </div>
                </div>

                <section className="relative overflow-hidden rounded-lg border border-white/10 bg-black/45 shadow-[0_0_48px_rgba(0,0,0,0.45)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.16),transparent_34%)]" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/35 to-black/80" />
                  <div className="relative grid min-h-[520px] grid-cols-1 gap-6 px-5 py-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:px-8">
                    <div className="flex flex-col justify-center">
                      <img
                        src="/assets/space-logo-main.png"
                        alt="SpaceMountain"
                        className="h-28 w-auto max-w-[82vw] object-contain drop-shadow-[0_0_28px_rgba(255,255,255,0.22)] md:h-40"
                      />
                      <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
                        <Rocket size={15} style={{ color: currentTheme.glowHex }} />
                        Live App Hub
                      </div>
                      <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300 md:text-base">
                        One front door for SPMT identity, docked app workspaces, Commlink, creator tools, and the developing Athena control plane.
                      </p>
                      <div className="mt-6 flex flex-wrap gap-2">
                        {homePageLinks.map((link) => (
                          <button
                            key={link.label}
                            type="button"
                            onClick={link.action}
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs font-bold text-zinc-200 hover:border-cyan-300/40 hover:bg-cyan-300/10"
                            title={link.detail}
                          >
                            {link.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase text-fuchsia-300">Docked Workspaces</p>
                          <h2 className="text-base font-black text-white">Your three active embeds</h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('crew')}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-zinc-200 hover:bg-white/10"
                        >
                          Edit Slots
                        </button>
                      </div>
                      {embedSlots.map((slot) => (
                        <div key={slot.id} className={`rounded-lg border bg-zinc-950/70 p-4 ${slot.collapsed ? 'border-white/10' : 'border-fuchsia-300/35'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase text-zinc-500">Slot {slot.id}</p>
                              <h3 className="mt-1 truncate text-sm font-black text-white">{slot.title}</h3>
                              <p className="mt-1 truncate text-xs text-zinc-500">{slot.url}</p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold uppercase text-zinc-300">
                              {slot.kind}
                            </span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => updateEmbedSlot(slot.id, { collapsed: false })}
                              className="rounded-lg bg-fuchsia-300 px-3 py-2 text-xs font-black text-zinc-950"
                            >
                              Dock
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveEmbedSlot(slot.id)}
                              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-white/10"
                            >
                              Use Slot
                            </button>
                            <a href={slot.url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-bold text-zinc-300 no-underline hover:text-white">
                              Pop Out
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-emerald-300/20 bg-zinc-950/60 p-4 shadow-[0_0_42px_rgba(16,185,129,0.08)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${platformEventsListening ? 'animate-pulse bg-emerald-300' : 'bg-amber-300'}`} />
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-300">SDK live status</p>
                      </div>
                      <h2 className="mt-1 text-lg font-black text-white">Connected app status cards</h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        Card names come from <span className="font-mono text-zinc-300">AppName</span> or <span className="font-mono text-zinc-300">Name</span> in each status payload. The newest call replaces the previous card data.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase text-zinc-400">
                        {platformEventsListening
                          ? `Listening · ${platformEventsCheckedAt ? formatShoutoutTime(platformEventsCheckedAt) : 'now'}`
                          : identity ? 'Connecting' : 'Sign in to listen'}
                      </span>
                      <button
                        type="button"
                        onClick={() => refreshPlatformEvents().catch((error) => console.warn('Manual status refresh failed', error))}
                        className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-2 text-emerald-200 hover:bg-emerald-300/15"
                        title="Refresh SDK status cards"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  {sdkStatusCards.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {sdkStatusCards.map((card) => (
                        <article key={`${card.sourceApp}-${card.name}`} className="rounded-lg border border-emerald-300/15 bg-black/35 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-base font-black text-white">{card.name}</h3>
                                <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-200">Receiving</span>
                              </div>
                              {card.summary && <p className="mt-1 text-xs leading-relaxed text-zinc-400">{card.summary}</p>}
                            </div>
                            <Activity size={18} className="shrink-0 text-emerald-300" />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {card.metrics.map((metric) => (
                              <div key={metric.label} className="rounded-md border border-white/5 bg-white/[0.04] p-2">
                                <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">{metric.label}</p>
                                <p className="mt-1 truncate text-xs font-black text-zinc-100" title={metric.value}>{metric.value}</p>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/5 pt-3 text-[10px] text-zinc-500">
                            <span className="font-mono text-emerald-200/70">{card.sourceApp}</span>
                            <span>{card.eventType}</span>
                            {card.author && <span>By {card.author}</span>}
                            <span className="ml-auto">Updated {formatShoutoutTime(card.updatedAt)}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg border border-dashed border-white/10 bg-black/25 px-4 py-6 text-center">
                      <Activity size={22} className="mx-auto text-zinc-600" />
                      <p className="mt-2 text-sm font-black text-zinc-300">Waiting for the first SDK status call</p>
                      <p className="mt-1 text-xs text-zinc-500">Publish an event whose type ends in <span className="font-mono text-zinc-300">.status</span>; the card will appear here automatically.</p>
                    </div>
                  )}
                </section>

                <div className="flex flex-wrap gap-2">
                  {[
                    ['operations', 'Operations'],
                    ['search', 'Search + AI'],
                    ['workspace', 'Workspace'],
                    ['platform', 'Platform'],
                    ['stage', 'Stage'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleBridgeSection(id)}
                      className={`rounded-lg border px-3 py-2 text-xs font-black ${bridgeSections[id] ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-black/25 text-zinc-500'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {bridgeSections.operations && (
                <section className="rounded-lg border border-white/10 bg-zinc-950/55 p-4 shadow-[0_0_42px_rgba(0,0,0,0.32)]">
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {commandWidgets.map((widget) => (
                          <div key={widget.label} className="rounded-lg border border-white/10 bg-black/30 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{widget.label}</p>
                            <p className={`mt-2 text-2xl font-black ${widget.tone}`}>{widget.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-bold uppercase text-cyan-300">Live Status</p>
                              <h2 className="text-base font-black text-white">Registered app health</h2>
                            </div>
                            <Activity size={18} className="text-cyan-300" />
                          </div>
                          <div className="mt-3 space-y-2">
                            {liveStatusTools.map((tool) => (
                              <div key={tool.id} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] px-3 py-2 text-xs">
                                <span className="min-w-0 truncate font-bold text-zinc-200">{tool.name}</span>
                                <span className={`shrink-0 font-black uppercase ${tool.enabled === false ? 'text-red-300' : tool.installed === false ? 'text-amber-300' : tool.statusType === 'live' ? 'text-emerald-300' : 'text-zinc-400'}`}>
                                  {tool.enabled === false ? 'Disabled' : tool.installed === false ? 'Available' : tool.statusType === 'live' ? 'Live' : tool.statusText}
                                </span>
                              </div>
                            ))}
                            {liveStatusTools.length === 0 && (
                              <p className="text-xs text-zinc-500">No registered app status has loaded yet.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-bold uppercase text-amber-300">Activity Feed</p>
                              <h2 className="text-base font-black text-white">Recent routing events</h2>
                            </div>
                            <MessageSquare size={18} className="text-amber-300" />
                          </div>
                          <div className="mt-3 space-y-2">
                            {bridgeActivity.map((item) => (
                              <div key={item.id} className="rounded-md bg-white/[0.04] px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="truncate text-xs font-black text-white">{item.title}</p>
                                  <span className="shrink-0 text-[10px] text-zinc-500">{item.time}</span>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{item.body}</p>
                              </div>
                            ))}
                            {bridgeActivity.length === 0 && (
                              <p className="text-xs text-zinc-500">Commlink, forum, and game activity will appear here as it arrives.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <aside className="rounded-lg border border-white/10 bg-black/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase text-fuchsia-300">Dockable Apps</p>
                          <h2 className="text-base font-black text-white">Workspace slots</h2>
                        </div>
                        <Layout size={18} className="text-fuchsia-300" />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {embedSlots.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => updateEmbedSlot(slot.id, { collapsed: !slot.collapsed })}
                            className={`rounded-md border px-2 py-2 text-left ${slot.collapsed ? 'border-white/10 bg-white/[0.03]' : 'border-fuchsia-300/40 bg-fuchsia-300/10'}`}
                            title={`${slot.collapsed ? 'Show' : 'Hide'} ${slot.title}`}
                          >
                            <span className="block text-[10px] font-black text-white">Slot {slot.id}</span>
                            <span className="mt-1 block truncate text-[9px] text-zinc-500">{slot.collapsed ? 'Hidden' : 'Docked'}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 space-y-2">
                        {commandDockTargets.map((target) => (
                          <button
                            key={target.title}
                            type="button"
                            onClick={() => openEmbeddedApp(target.title, target.url, target.kind)}
                            className="flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-left hover:border-fuchsia-300/40 hover:bg-fuchsia-300/10"
                          >
                            <span className="text-xs font-bold text-zinc-200">{target.title}</span>
                            <Play size={13} className="text-fuchsia-300" />
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('crew')}
                        className="mt-4 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-zinc-200 hover:bg-white/10"
                      >
                        Manage Dock
                      </button>
                    </aside>
                  </div>
                </section>
                )}

                {bridgeSections.search && (
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                  <div className="rounded-lg border border-white/10 bg-zinc-950/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase text-sky-300">Search Everywhere</p>
                        <h2 className="text-base font-black text-white">Apps, messages, forums, rooms, dock slots</h2>
                      </div>
                      <Search size={18} className="text-sky-300" />
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                      <Search size={15} className="shrink-0 text-zinc-500" />
                      <input
                        value={bridgeSearch}
                        onChange={(event) => setBridgeSearch(event.target.value)}
                        placeholder="Search the bridge"
                        className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-600"
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {bridgeSearchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.action}
                          className="min-h-[68px] rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-left hover:border-sky-300/40 hover:bg-sky-300/10"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-black text-white">{item.title}</span>
                            <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase text-sky-200">{item.type}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{item.detail}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-lg border border-white/10 bg-zinc-950/55 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase text-violet-300">Athena Panel</p>
                          <h2 className="text-base font-black text-white">Command routing foundation</h2>
                        </div>
                        <Bot size={18} className="text-violet-300" />
                      </div>
                      <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100/80">
                        Unavailable: Athena can store context and expose its capability catalog, but durable command jobs and app dispatch are not implemented. No command entered here would run an app yet.
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-zinc-950/55 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase text-emerald-300">Voice Commander</p>
                          <h2 className="text-base font-black text-white">Speak a bridge command</h2>
                        </div>
                        <Mic size={18} className={voiceListening ? 'animate-pulse text-emerald-200' : 'text-emerald-300'} />
                      </div>
                      <p className={`mt-2 text-[11px] font-bold uppercase ${voiceStatus === 'unsupported' || voiceStatus === 'error' ? 'text-amber-300' : voiceStatus === 'listening' ? 'text-emerald-200' : 'text-zinc-500'}`}>
                        {voiceStatus === 'unsupported' ? 'Browser unsupported' : voiceStatus === 'error' ? 'Needs attention' : voiceStatus === 'listening' ? 'Listening now' : 'Ready'}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={startVoiceCommander}
                          className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-200 hover:bg-emerald-300/15"
                        >
                          {voiceListening ? 'Listening' : 'Start Voice'}
                        </button>
                        <button
                          type="button"
                          onClick={() => runBridgeCommand(voiceTranscript)}
                          disabled={!voiceTranscript.trim()}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10 disabled:opacity-40"
                        >
                          Run Last
                        </button>
                      </div>
                      <p className="mt-3 min-h-[38px] rounded-md bg-black/25 p-3 text-xs text-zinc-400">
                        {voiceTranscript || 'Try: open inbox, launch StreamWeaver, show forums, open arena.'}
                      </p>
                    </div>
                  </div>
                </section>
                )}

                {bridgeSections.workspace && (
                <section className="rounded-lg border border-white/10 bg-zinc-950/55 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase text-amber-300">Creator Workspace</p>
                      <h2 className="text-base font-black text-white">Daily operating lanes</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('crew')}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-zinc-200 hover:bg-white/10"
                    >
                      Open Crew Desk
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                    {creatorWorkspaceItems.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={item.action}
                        className="rounded-md border border-white/10 bg-black/25 p-3 text-left hover:border-amber-300/40 hover:bg-amber-300/10"
                      >
                        <span className="block text-[10px] font-bold uppercase text-zinc-500">{item.label}</span>
                        <span className="mt-2 block text-sm font-black text-white">{item.value}</span>
                      </button>
                    ))}
                  </div>
                </section>
                )}

                {bridgeSections.platform && (
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-zinc-950/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase text-violet-300">Athena OS</p>
                        <h2 className="text-base font-black text-white">Control-plane foundation</h2>
                      </div>
                      <Bot size={18} className="text-violet-300" />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(athenaCapabilities.length ? athenaCapabilities : [
                        { key: 'sharedMemory', label: 'Shared Memory', state: 'unavailable', enabled: false },
                        { key: 'appAwareness', label: 'App Awareness', state: 'unavailable', enabled: false },
                        { key: 'automation', label: 'Automation', state: 'unavailable', enabled: false },
                        { key: 'creatorAssistant', label: 'Creator Assistant', state: 'unavailable', enabled: false },
                      ]).map((capability) => (
                        <div key={capability.key} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/25 px-3 py-2">
                          <span className="text-xs font-bold text-zinc-200">{capability.label}</span>
                          <span className={`text-[10px] font-black uppercase ${capability.state === 'ready' ? 'text-emerald-300' : capability.state === 'configured' ? 'text-sky-300' : capability.state === 'degraded' ? 'text-amber-300' : 'text-zinc-500'}`}>
                            {capability.state.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                      {(athenaOs?.crew || []).slice(0, 3).map((agent: any) => (
                        <div key={agent.id} className="rounded-md bg-white/[0.04] p-3">
                          <p className="text-xs font-black text-white">{agent.name}</p>
                          <p className="mt-1 text-[10px] uppercase text-zinc-500">{agent.role}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(athenaOs?.skills || []).slice(0, 4).map((skill: any) => (
                        <span key={skill.id} className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2 py-1 text-[10px] font-bold text-violet-200">
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-zinc-950/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase text-cyan-300">SpaceMountain Platform</p>
                        <h2 className="text-base font-black text-white">Developer ecosystem</h2>
                      </div>
                      <Compass size={18} className="text-cyan-300" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(platformFeatures.length ? platformFeatures : ['Public SDK', 'Public API', 'Developer Portal', 'Webhooks']).map((feature: string) => (
                        <div key={feature} className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
                          <p className="text-xs font-bold text-zinc-200">{feature}</p>
                          <p className="mt-1 text-[10px] font-black uppercase text-emerald-300">Open</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3">
                      <p className="text-xs font-black text-cyan-100">{platformInfo?.name || 'SpaceMountain Platform'}</p>
                      <p className="mt-1 text-xs text-cyan-100/70">
                        SDK, public API, OAuth apps, app submissions, plugin marketplace, webhooks, and docs are exposed through SPMT.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-zinc-950/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase text-sky-300">Developer Docs</p>
                        <h2 className="text-base font-black text-white">Public API guide</h2>
                      </div>
                      <HelpCircle size={18} className="text-sky-300" />
                    </div>
                    <div className="mt-3 space-y-2">
                      {(platformDocSections.length ? platformDocSections : [
                        { id: 'auth', title: 'OAuth Apps', summary: 'Shared SPMT identity for ecosystem apps.', endpoints: ['/api/oauth/authorize'] },
                        { id: 'apps', title: 'App Registry', summary: 'Read and launch registered apps.', endpoints: ['/api/apps'] },
                      ]).slice(0, 5).map((section: any) => (
                        <div key={section.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black text-white">{section.title}</p>
                            <span className="rounded-full border border-sky-300/20 px-2 py-0.5 text-[9px] font-bold uppercase text-sky-200">{section.path}</span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{section.summary}</p>
                          <p className="mt-2 truncate text-[10px] font-mono text-zinc-600">{(section.endpoints || []).join('  ')}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {platformScopes.slice(0, 7).map((scope: string) => (
                        <span key={scope} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold text-zinc-300">{scope}</span>
                      ))}
                    </div>
                    <a
                      href="/docs.html"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-black text-sky-100 transition-colors hover:border-sky-200/50 hover:bg-sky-300/15"
                    >
                      Open docs
                      <ArrowRight size={14} />
                    </a>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-zinc-950/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase text-emerald-300">Plugin Marketplace</p>
                        <h2 className="text-base font-black text-white">Installable platform skills</h2>
                      </div>
                      <Sliders size={18} className="text-emerald-300" />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      {(featuredPlugins.length ? featuredPlugins : [
                        { id: 'athena-briefs', name: 'Athena Briefs', category: 'AI', description: 'Creator briefs from app status and Commlink.', scopes: ['athena:write'] },
                      ]).map((plugin: any) => (
                        <div key={plugin.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-white">{plugin.name}</p>
                              <p className="mt-1 text-[10px] uppercase text-emerald-300">{plugin.category}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => managePlatformPlugin(plugin)}
                              className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-black ${plugin.installed ? 'border-white/10 bg-white/[0.04] text-zinc-300' : 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200'}`}
                            >
                              {plugin.installed ? 'Enabled' : 'Install'}
                            </button>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{plugin.description}</p>
                          <p className="mt-2 truncate text-[10px] font-mono text-zinc-600">{(plugin.scopes || []).join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
                )}

                {bridgeSections.stage && (
                <section
                  id="arenaRocketTrigger"
                  className="relative min-h-[260px] overflow-hidden rounded-lg border border-white/10 bg-black/45 text-left shadow-[0_0_48px_rgba(0,0,0,0.45)]"
                  style={{
                    boxShadow: `0 0 42px ${rgbaFromHex(currentTheme.glowHex, 0.16)}`,
                  }}
                  aria-label="SpaceMountain flight deck"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.16),transparent_42%)]" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/70" />
                  <div className="relative flex min-h-[260px] flex-col items-center justify-center px-5 py-6 text-center">
                    <img
                      src="/assets/space-logo-main.png"
                      alt="SpaceMountain"
                      className="h-32 w-auto max-w-[82vw] object-contain drop-shadow-[0_0_28px_rgba(255,255,255,0.22)] md:h-44"
                    />
                    <motion.img
                      src={sleekRocketIcon}
                      alt="SpaceMountain model rocket"
                      className="absolute right-[14%] top-10 h-20 w-20 object-contain drop-shadow-[0_0_24px_rgba(250,204,21,0.55)] md:h-28 md:w-28"
                      animate={{ y: [0, -10, 0], rotate: [10, 15, 10] }}
                      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
                      <Rocket size={15} style={{ color: currentTheme.glowHex }} />
                      SpaceMountain Flight Deck
                    </div>
                    <p className="mt-3 max-w-xl text-sm font-semibold text-zinc-300">
                      Mission control, community status, and a docked rocket ready for launch.
                    </p>
                  </div>
                </section>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
                  <section className="rounded-lg border border-white/10 bg-zinc-950/50 overflow-hidden">
                    <ShoutoutProfileCard
                      shoutout={spotlightShoutout}
                      label="Community Spotlight"
                      onForumClick={() => setActiveTab('forums')}
                      feature
                    />
                  </section>

                  <aside className="grid gap-3">
                    <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase text-cyan-300">Stage Analytics</p>
                          <h3 className="text-lg font-black text-white">Live routing</h3>
                        </div>
                        <Activity size={19} className="text-cyan-300" />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {[
                          ['Shoutouts', shoutoutFeed?.analytics?.liveCount ?? 0],
                          ['Viewers', shoutoutFeed?.analytics?.totalViewers ?? 0],
                          ['Forums', forwardedForumPosts.length],
                          ['Rooms', hearmeoutRooms.length],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-md bg-white/[0.04] p-3">
                            <p className="text-[10px] uppercase text-zinc-500">{label}</p>
                            <p className="mt-1 text-xl font-black text-white">{Number(value).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[11px] text-zinc-500">
                        Last DSH update: {formatShoutoutTime(shoutoutFeed?.analytics?.lastUpdatedAt)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase text-amber-300">ChatTag</p>
                        <button onClick={refreshChatTagState} className="text-zinc-400 hover:text-white" title="Refresh ChatTag">
                          <RefreshCw size={14} className={chatTagLoading ? 'animate-spin' : ''} />
                        </button>
                      </div>
                      <h3 className="mt-2 text-lg font-black text-white">
                        {chatTagCurrentName}
                      </h3>
                      <p className="text-xs text-zinc-400">Persistent embed snapshot: who is it, active players, and latest tag activity.</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-md bg-white/[0.04] p-2">
                          <p className="text-[10px] uppercase text-zinc-500">Now IT</p>
                          <p className="mt-1 truncate text-xs font-black text-white">{chatTagCurrentName}</p>
                        </div>
                        <div className="rounded-md bg-white/[0.04] p-2">
                          <p className="text-[10px] uppercase text-zinc-500">Players</p>
                          <p className="mt-1 text-xs font-black text-white">{chatTagPlayers.length}</p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {sortedChatTagPlayers.slice(0, 3).map((player, index) => (
                          <div key={player.id || player.username || index} className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate text-zinc-300">{player.displayName || player.twitchUsername || player.username || player.name || 'Player'}</span>
                            <span className="font-bold text-amber-300">{player.score || player.points || player.tags || 0}</span>
                          </div>
                        ))}
                        {sortedChatTagPlayers.length === 0 && <p className="text-xs text-zinc-500">No live ChatTag state returned yet.</p>}
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase text-emerald-300">Quackverse</p>
                        <button onClick={refreshQuackverseState} className="text-zinc-400 hover:text-white" title="Refresh Quackverse">
                          <RefreshCw size={14} className={quackverseLoading ? 'animate-spin' : ''} />
                        </button>
                      </div>
                      <h3 className="mt-2 text-lg font-black text-white">100-card ChatTag card game</h3>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                        Characters, trunks, subclasses, family trees, and backstories from the ChatTag Quackverse.
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div className="rounded-md bg-white/[0.04] p-2"><span className="block font-black text-white">100</span><span className="text-zinc-500">Cards</span></div>
                        <div className="rounded-md bg-white/[0.04] p-2"><span className="block font-black text-white">20</span><span className="text-zinc-500">Deck</span></div>
                        <div className="rounded-md bg-white/[0.04] p-2"><span className="block font-black text-white">{quackversePlayers.length}</span><span className="text-zinc-500">Players</span></div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => openEmbeddedApp('ChatTag Quackverse', appSurfaces.chatTag.quackverse, 'game')}
                          className="flex-1 rounded-lg bg-emerald-300 px-3 py-2 text-xs font-extrabold text-zinc-950"
                        >
                          Embed
                        </button>
                        <a
                          href="https://chat-tag-new.fly.dev/quackverse-guide"
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-white/10"
                        >
                          Guide
                        </a>
                      </div>
                      <p className="mt-2 text-[11px] text-zinc-500">State: {formatShoutoutTime(quackverseUpdatedAt)}</p>
                    </div>
                  </aside>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(shoutoutFeed?.partners?.length || 0) > 0 && (
                    <section className={`rounded-lg border border-white/10 bg-zinc-950/45 p-4 ${(!shoutoutFeed?.crew || shoutoutFeed.crew.length === 0) ? 'lg:col-span-2' : ''}`}>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h2 className="text-lg font-black text-white">Partners</h2>
                        <span className="text-xs text-zinc-500">{shoutoutFeed?.partners?.length || 0} live</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {(shoutoutFeed?.partners || []).slice(0, 4).map((shoutout) => (
                          <ShoutoutProfileCard
                            key={shoutout.id}
                            shoutout={shoutout}
                            label="Partner"
                            onForumClick={() => setActiveTab('forums')}
                            feature
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {(shoutoutFeed?.crew?.length || 0) > 0 && (
                    <section className={`rounded-lg border border-white/10 bg-zinc-950/45 p-4 ${(!shoutoutFeed?.partners || shoutoutFeed.partners.length === 0) ? 'lg:col-span-2' : ''}`}>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h2 className="text-lg font-black text-white">Crew</h2>
                        <span className="text-xs text-zinc-500">{shoutoutFeed?.crew?.length || 0} live</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {(shoutoutFeed?.crew || []).slice(0, 4).map((shoutout) => (
                          <ShoutoutProfileCard
                            key={shoutout.id}
                            shoutout={shoutout}
                            label="Crew"
                            onForumClick={() => setActiveTab('forums')}
                            feature
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {(!shoutoutFeed?.partners || shoutoutFeed.partners.length === 0) && (!shoutoutFeed?.crew || shoutoutFeed.crew.length === 0) && (
                    <p className="text-sm text-zinc-500 lg:col-span-2">No partner or crew shoutouts received yet.</p>
                  )}
                </div>

                <section className="rounded-lg border border-white/10 bg-zinc-950/45 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-lg font-black text-white">Mountaineers</h2>
                      <p className="text-xs text-zinc-500">General public shoutouts from DSH, including honored guests and raid-pile routing.</p>
                    </div>
                    <button onClick={() => setActiveTab('forums')} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-white/10">
                      Forum posts
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {(shoutoutFeed?.mountaineers || []).slice(0, 8).map((shoutout) => <ShoutoutCard key={shoutout.id} shoutout={shoutout} compact />)}
                    {(!shoutoutFeed?.mountaineers || shoutoutFeed.mountaineers.length === 0) && (
                      <p className="text-sm text-zinc-500">No public shoutouts are stored on the site yet. DSH can post them to /api/integrations/dsh/shoutout.</p>
                    )}
                  </div>
                </section>

              </motion.div>
            )}

            {/* TAB: APPS GRID */}
            {activeTab === 'apps' && (
              <motion.div
                key="apps"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-5"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-xl font-display font-bold text-white tracking-tight flex items-center gap-2">
                      <LayoutGrid className="text-amber-500" size={20} />
                      App Suite Directory
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Live app links and service checks from the SpaceMountain registry.
                    </p>
                  </div>
                </div>

                <MainAppSuite 
                  tools={tools} 
                  onTriggerAction={handleTriggerAction} 
                  accentColor={currentTheme.glowHex} 
                  preferences={preferences}
                  stats={stats}
                  onDock={(target) => openEmbeddedApp(target.title, target.url, target.kind)}
                />

                <div className="dynamic-cosmic-card rounded-3xl p-5 backdrop-blur-xl transition-all duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-lg font-sans font-bold text-white flex items-center gap-2">
                        <Compass className="text-cyan-300" size={18} />
                        Shipyard
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Install, disable, inspect permissions, and launch apps through SPMT.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => refreshSpmtApps().catch(() => {})}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white"
                    >
                      Refresh Registry
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {spmtApps.map((app) => (
                      <div key={app.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-black text-white">{app.name}</h4>
                              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${app.installed ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}>
                                {app.installed ? (app.enabled === false ? 'Disabled' : 'Installed') : 'Available'}
                              </span>
                              {app.version && (
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold uppercase text-zinc-300">
                                  v{app.version}
                                </span>
                              )}
                              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${app.updateAvailable ? 'border-sky-300/30 bg-sky-300/10 text-sky-200' : 'border-white/10 bg-white/[0.04] text-zinc-400'}`}>
                                {app.updateAvailable ? `Update ${app.latestVersion || ''}`.trim() : 'Current'}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{app.description}</p>
                            {(app.updatedAt || app.releaseNotes?.length) && (
                              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                                {app.updatedAt ? `Updated ${app.updatedAt}` : 'Latest release'}
                                {app.releaseNotes?.[0] ? ` - ${app.releaseNotes[0]}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-[10px] font-mono font-bold uppercase text-zinc-500">Permissions</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(app.permissions || []).map((permission: string) => (
                              <span key={permission} className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {app.distribution === 'windows-desktop' ? (
                            <a
                              href={app.downloadUrl || app.url}
                              className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-zinc-950 no-underline"
                            >
                              {app.signed === false ? 'Download unsigned ZIP' : 'Download for Windows'}
                            </a>
                          ) : !app.installed || app.enabled === false ? (
                            <button
                              type="button"
                              onClick={() => updateSpmtAppInstall(app.id, 'install')}
                              className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-zinc-950"
                            >
                              Enable App
                            </button>
                          ) : app.id !== 'spacemountain-live' && (
                            <button
                              type="button"
                              onClick={() => updateSpmtAppInstall(app.id, 'disable')}
                              className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-200"
                            >
                              Disable
                            </button>
                          )}
                          {app.distribution !== 'windows-desktop' && (
                            <a href={app.url || app.authUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-300 no-underline hover:text-white">
                              Launch
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {spmtApps.length === 0 && (
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-zinc-400">
                        SPMT app registry is not loaded yet. Sign in or refresh the registry.
                      </div>
                    )}
                  </div>
                </div>

                <div className="dynamic-cosmic-card rounded-3xl p-5 backdrop-blur-xl transition-all duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-lg font-sans font-bold text-white flex items-center gap-2">
                        <Gamepad2 className="text-amber-400" size={18} />
                        ChatTag Live Tracker
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Tracks the live ChatTag game and its DSH points handoff.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={refreshChatTagState}
                        disabled={chatTagLoading}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs font-bold text-amber-300 disabled:opacity-50"
                      >
                        {chatTagLoading ? 'Refreshing...' : 'Refresh'}
                      </button>
                      <a href="https://chat-tag-new.fly.dev" target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white no-underline">
                        Open ChatTag
                      </a>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-cyan-400/30 bg-[#2f3037] p-4 shadow-lg">
                    <div className="border-l-4 border-cyan-300 pl-4">
                      <h4 className="text-lg font-black text-white">SPMT Chat Tag</h4>
                      <div className="mt-3 space-y-1 text-sm text-zinc-100">
                        <p><span className="font-black text-white">{chatTagCurrentName}</span> is IT</p>
                        <p>Last tag {formatRelativeMinutes(chatTagLastEventTime)}</p>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm font-black text-white">Recent</p>
                        <div className="mt-1 space-y-1 text-sm text-zinc-100">
                          {recentTags.map((event: any, index: number) => (
                            <p key={event.id || index}>{formatChatTagEvent(event)}</p>
                          ))}
                          {recentTags.length === 0 && <p className="text-zinc-400">No recent tag events returned.</p>}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                        <div>
                          <p className="text-sm font-black text-white">Top 3</p>
                          <div className="mt-1 space-y-1 text-sm text-zinc-100">
                            {sortedChatTagPlayers.slice(0, 3).map((player, index) => (
                              <p key={player.id || player.username || index}>
                                #{index + 1} {getPlayerName(player)} - {Number(player.score || player.points || 0).toLocaleString()} pts ({Number(player.tags || 0).toLocaleString()} tags)
                              </p>
                            ))}
                            {sortedChatTagPlayers.length === 0 && <p className="text-zinc-400">No leaderboard returned yet.</p>}
                          </div>
                        </div>
                        <div className="text-sm">
                          <p className="font-black text-white">Overlay</p>
                          <button
                            type="button"
                            onClick={() => openEmbeddedApp('ChatTag OBS Overlay', 'https://chat-tag-new.fly.dev/overlay', 'overlay')}
                            className="mt-1 text-left font-bold text-cyan-300 hover:text-cyan-200"
                          >
                            Add to OBS
                          </button>
                        </div>
                      </div>

                      <p className="mt-4 text-xs font-bold text-zinc-200">type spmt controls to interact with chat tag</p>
                    </div>
                  </div>
                </div>

                <div className="dynamic-cosmic-card rounded-3xl p-5 backdrop-blur-xl transition-all duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-lg font-sans font-bold text-white flex items-center gap-2">
                        <Sparkles className="text-cyan-400" size={18} />
                        StreamWeaver Bots + Flow Library
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Learn bot commands, browse installable community flows, and open builders inside the hub first.</p>
                    </div>
                    <a href={streamweaverCommandsUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white no-underline">
                      Pop Out StreamWeaver
                    </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                    {[
                      ['Community Flows', 'Install shared flow packs', streamweaverCommunityUrl],
                      ['Commands', 'Learn and make commands', streamweaverCommandsUrl],
                      ['Bot Integrations', 'Connect broadcaster, bot, and community bot', streamweaverIntegrationsUrl],
                      ['Workflows', 'Build and edit action flows', streamweaverWorkflowsUrl],
                    ].map(([title, body, url]) => (
                      <div key={title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <span className="text-xs font-bold text-white">{title}</span>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{body}</p>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <button type="button" onClick={() => openEmbeddedApp(`StreamWeaver ${title}`, url, 'app')} className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-300">
                            Embed
                          </button>
                          <a href={url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-xs font-bold text-zinc-300 text-center no-underline">
                            Pop Out
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-black/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-white">Persistent footer slots</span>
                        <p className="text-xs text-zinc-400 mt-1">Embeds stay mounted while you move between SpaceMountain pages.</p>
                      </div>
                      <div className="flex gap-2">
                        {embedSlots.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setActiveEmbedSlot(slot.id)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${activeEmbedSlot === slot.id ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200' : 'bg-black/30 border-white/10 text-zinc-300'}`}
                          >
                            Slot {slot.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dynamic-cosmic-card rounded-3xl p-5 backdrop-blur-xl transition-all duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-lg font-sans font-bold text-white flex items-center gap-2">
                        <Layout className="text-purple-400" size={18} />
                        Discord Stream Hub
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Admin calendar, leaderboard, and community tools from DSH.</p>
                    </div>
                    <a href={dshDashboardUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white no-underline">
                      Open / Sign In
                    </a>
                  </div>
                  <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
                    OAuth sign-in flows run best in a top-level window. Open DSH once to authorize, then the embedded dashboard, calendar, and leaderboard can reuse the restored DSH session.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 md:col-span-2">
                      <span className="text-xs font-bold text-white">Dashboard</span>
                      <p className="text-xs text-zinc-400 mt-1">Session-aware DSH home with shoutouts, calendar, forum messages, and leaderboard links.</p>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button type="button" onClick={() => openEmbeddedApp('Discord Stream Hub Dashboard', dshDashboardUrl, 'dashboard')} className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-300">
                          Embed
                        </button>
                        <a href={dshDashboardUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-xs font-bold text-zinc-300 text-center no-underline">
                          Open / Sign In
                        </a>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                      <span className="text-xs font-bold text-white">Admin Calendar</span>
                      <p className="text-xs text-zinc-400 mt-1">Stream schedule and event calendar from DSH.</p>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button type="button" onClick={() => openEmbeddedApp('Discord Stream Hub Calendar', dshCalendarUrl, 'dashboard')} className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-300">
                          Embed
                        </button>
                        <a href={dshCalendarUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-xs font-bold text-zinc-300 text-center no-underline">
                          Open / Sign In
                        </a>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                      <span className="text-xs font-bold text-white">Leaderboard</span>
                      <p className="text-xs text-zinc-400 mt-1">Points leaderboard and community rankings.</p>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button type="button" onClick={() => openEmbeddedApp('Discord Stream Hub Leaderboard', dshLeaderboardUrl, 'dashboard')} className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-300">
                          Embed
                        </button>
                        <a href={dshLeaderboardUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-xs font-bold text-zinc-300 text-center no-underline">
                          Open / Sign In
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: SECURE MAIL BOX */}
            {activeTab === 'inbox' && (
              <motion.div
                key="inbox"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-4 dynamic-cosmic-card rounded-3xl p-6 backdrop-blur-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-xl font-sans font-bold text-white flex items-center gap-2">
                      <Mail className="text-rose-500" size={20} />
                      spmt / @spmtmessaging
                    </h2>
                    <p className="text-xs text-zinc-400 font-sans mt-0.5">Tenant-scoped internal messages between users, apps, and AI bots</p>
                  </div>
                  {commlinkLane === 'mail' && (
                    <button
                      onClick={() => setIsComposing(!isComposing)}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 font-mono text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Plus size={14} /> {isComposing ? 'VIEW INBOX' : 'COMPOSE MESSAGE'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {([
                    ['mail', 'Mail'],
                    ['live', 'Live Chat'],
                    ['notifications', `Notifications (${commlinkNotifications.filter((item) => !item.read_at).length})`],
                    ['apps', 'App Events'],
                  ] as const).map(([lane, label]) => (
                    <button
                      key={lane}
                      type="button"
                      onClick={() => {
                        setCommlinkLane(lane);
                        if (lane !== 'mail') setIsComposing(false);
                      }}
                      className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide ${commlinkLane === lane ? 'border-cyan-300/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 bg-black/20 text-zinc-400 hover:text-white'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {commlinkLane === 'live' ? (
                  <div className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-black/50">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">Multi-platform live chat</h3>
                        <p className="text-[10px] text-zinc-500">StreamWeaver owns high-volume chat; Commlink opens it through the signed tenant session.</p>
                      </div>
                      <a href={appSurfaces.streamweaver.liveChat} target="_blank" rel="noreferrer" className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-bold text-cyan-200 no-underline">
                        Pop out
                      </a>
                    </div>
                    <iframe
                      src={appSurfaces.streamweaver.liveChat}
                      title="Commlink Live Chat"
                      data-embed-slot-frame="commlink-live-chat"
                      onLoad={(event) => void sendEmbeddedFrameContext(event.currentTarget)}
                      className="h-[720px] w-full bg-black"
                      allow="autoplay; clipboard-write"
                    />
                  </div>
                ) : commlinkLane === 'notifications' ? (
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">Notifications</h3>
                        <p className="mt-1 text-[10px] text-zinc-500">Account, conversation, and connected-app notices.</p>
                      </div>
                      {commlinkNotifications.some((item) => !item.read_at) && (
                        <button type="button" onClick={() => markAllCommlinkNotificationsRead().catch(() => {})} className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-200">
                          Clear unread
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {commlinkNotifications.length === 0 && <p className="text-xs text-zinc-400">No notifications yet.</p>}
                      {commlinkNotifications.map((item) => (
                        <button key={item.id} type="button" onClick={() => openCommlinkNotification(item).catch(() => {})} className={`rounded-xl border bg-black/25 p-3 text-left ${item.read_at ? 'border-white/5 opacity-60' : 'border-cyan-400/20'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-bold text-white">{item.title}</span>
                            <span className="text-[9px] uppercase text-zinc-500">{item.type}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{item.body}</p>
                          <p className="mt-2 text-[10px] text-zinc-500">{new Date(item.created_at).toLocaleString()}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : commlinkLane === 'apps' ? (
                  <div className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/[0.035] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">App events</h3>
                        <p className="mt-1 text-[10px] text-zinc-500">Operational events from connected SPMT apps. This lane is separate from viewer chat.</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold text-fuchsia-200">{platformEvents.length} events</span>
                    </div>
                    <div className="flex max-h-[620px] flex-col gap-2 overflow-y-auto pr-1">
                      {platformEvents.length === 0 && <p className="text-xs text-zinc-400">No app events yet.</p>}
                      {platformEvents.map((event) => (
                        <div key={event.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-fuchsia-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-fuchsia-200">{event.sourceApp || 'spmt'}</span>
                            <span className="text-xs font-bold text-white">{event.type}</span>
                            <span className="ml-auto text-[9px] text-zinc-500">{new Date(event.timestamp || event.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="mt-2 text-xs text-zinc-400">{event.payload?.summary || event.payload?.title || event.payload?.message || 'App event received'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : isComposing ? (
                  <form onSubmit={handleSendMail} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">RECIPIENT HANDLE(S)</label>
                        <div className="min-h-[46px] rounded-xl border border-white/10 bg-white/5 px-2 py-2 focus-within:border-orange-500/50">
                          <div className="flex flex-wrap items-center gap-2">
                            {composeRecipients.map((recipient) => (
                              <span key={recipient} className="inline-flex items-center gap-1 rounded-full border border-orange-400/25 bg-orange-400/10 px-2.5 py-1 text-[11px] font-bold text-orange-100">
                                @{recipient}
                                <button
                                  type="button"
                                  onClick={() => removeComposeRecipient(recipient)}
                                  className="rounded-full px-1 text-orange-200 hover:bg-orange-300/20 hover:text-white"
                                  title={`Remove ${recipient}`}
                                >
                                  x
                                </button>
                              </span>
                            ))}
                            <input
                              type="text"
                              value={composeTo}
                              onChange={(e) => setComposeTo(e.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
                                  if (composeTo.trim()) {
                                    event.preventDefault();
                                    addComposeRecipient();
                                  }
                                } else if (event.key === 'Backspace' && !composeTo && composeRecipients.length > 0) {
                                  removeComposeRecipient(composeRecipients[composeRecipients.length - 1]);
                                }
                              }}
                              onBlur={() => composeTo.trim() && addComposeRecipient()}
                              placeholder={composeRecipients.length ? 'Add another handle...' : 'Type a handle and press Enter'}
                              className="min-w-[180px] flex-1 bg-transparent p-1 text-xs text-white placeholder-zinc-500 outline-none"
                            />
                          </div>
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-500">Press Enter to add each @spmt.live recipient. Add more than one recipient to start a group chat.</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">SUBJECT</label>
                        <input
                          type="text"
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                          placeholder="e.g. Server sync success"
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500/50"
                        />
                      </div>
                    </div>
                    {composeRecipients.length > 1 && (
                      <div>
                        <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">GROUP TITLE</label>
                        <input
                          type="text"
                          value={composeGroupTitle}
                          onChange={(e) => setComposeGroupTitle(e.target.value)}
                          placeholder="e.g. Launch crew"
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500/50"
                        />
                      </div>
                    )}
                    <div>
                        <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">MESSAGE BODY</label>
                      <textarea
                        required
                        rows={5}
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                        placeholder="Type an internal message..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-orange-500 text-xs font-bold font-mono self-start flex items-center gap-1.5"
                    >
                      <Send size={14} /> SEND MESSAGE
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                      <input
                        type="search"
                        value={commlinkSearch}
                        onChange={(event) => setCommlinkSearch(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') refreshSpmtInbox().catch(() => {});
                        }}
                        placeholder="Search Commlink messages..."
                        className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/50"
                      />
                      <div className="flex flex-wrap gap-2">
                        {(['all', 'unread', 'direct', 'app'] as const).map((filter) => (
                          <button
                            key={filter}
                            type="button"
                            onClick={() => setCommlinkFilter(filter)}
                            className={`rounded-xl border px-3 py-2 text-[10px] font-bold uppercase ${commlinkFilter === filter ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-white/10 bg-black/25 text-zinc-400'}`}
                          >
                            {filter}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => refreshSpmtInbox().catch(() => {})}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-bold uppercase text-zinc-300"
                        >
                          Search
                        </button>
                      </div>
                    </div>
                    {commlinkNotifications.length > 0 && (
                      <div className="mb-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-bold text-white">Notifications</h3>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold text-cyan-200">
                              {commlinkNotifications.filter((item) => !item.read_at).length} unread
                            </span>
                            {commlinkNotifications.some((item) => !item.read_at) && (
                              <button
                                type="button"
                                onClick={() => markAllCommlinkNotificationsRead().catch(() => {})}
                                className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-200 hover:bg-cyan-400/20"
                              >
                                Clear unread
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {commlinkNotifications.slice(0, 4).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => openCommlinkNotification(item).catch(() => {})}
                              className={`rounded-xl border bg-black/25 p-3 text-left transition-colors hover:border-cyan-300/40 ${item.read_at ? 'border-white/5 opacity-60' : 'border-cyan-400/20'}`}
                              title={item.read_at ? 'Open notification' : 'Mark read and open'}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-bold text-white">{item.title}</span>
                                <span className="shrink-0 text-[9px] uppercase tracking-wider text-zinc-500">{item.type}</span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{item.body}</p>
                              <p className="mt-2 text-[10px] text-zinc-500">{new Date(item.created_at).toLocaleString()}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {platformEvents.length > 0 && (
                      <div className="mb-3 rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/[0.035] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-white">Combined app activity</h3>
                            <p className="mt-1 text-[10px] text-zinc-500">SPMT events from connected apps, shown beside messages and notifications.</p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold text-fuchsia-200">{platformEvents.length} events</span>
                        </div>
                        <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
                          {platformEvents.slice(0, 20).map((event) => (
                            <div key={event.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded bg-fuchsia-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-fuchsia-200">{event.sourceApp || 'spmt'}</span>
                                <span className="text-xs font-bold text-white">{event.type}</span>
                                <span className="ml-auto text-[9px] text-zinc-500">{new Date(event.timestamp || event.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="mt-2 text-xs text-zinc-400">{event.payload?.summary || event.payload?.title || event.payload?.message || 'App event received'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {mails.length === 0 && (
                      <div className="p-4 rounded-2xl border border-white/5 text-xs text-zinc-400" style={{ background: 'var(--chat-surface-bg)' }}>
                        No Commlink messages yet. Send one to another @spmt.live handle or an app handle.
                      </div>
                    )}
                    {activeConversationId && (
                      <div className="mb-3 rounded-2xl border border-orange-400/20 bg-orange-400/[0.04] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-bold text-white">Thread</h3>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveConversationId(null);
                              setActiveConversationMessages([]);
                              setThreadReplyBody('');
                            }}
                            className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold text-zinc-300"
                          >
                            Close
                          </button>
                        </div>
                        <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
                          {activeConversationMessages.length === 0 ? (
                            <p className="text-xs text-zinc-400">No messages in this thread yet.</p>
                          ) : activeConversationMessages.map((message) => (
                            <div key={message.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-white">@{message.from_user}</span>
                                <span className="text-[10px] text-zinc-500">{new Date(message.created_at).toLocaleString()}</span>
                                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase text-zinc-500">{message.message_type || 'message'}</span>
                              </div>
                              {message.subject && <p className="mt-1 text-xs font-bold text-orange-300">{message.subject}</p>}
                              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{message.body}</p>
                              {Array.isArray(message.mentions) && message.mentions.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {message.mentions.map((mention: any) => (
                                    <span key={mention.id || mention.username} className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                                      @{mention.username}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {message.attachments.map((attachment: any) => (
                                    <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-zinc-300 no-underline hover:text-white">
                                      {attachment.name || attachment.type || 'Attachment'}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <form onSubmit={handleSendThreadReply} className="mt-3 flex flex-col gap-2 md:flex-row">
                          <input
                            value={threadReplyBody}
                            onChange={(event) => setThreadReplyBody(event.target.value)}
                            placeholder="Reply to this Commlink thread..."
                            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none focus:border-orange-400/50"
                          />
                          <button type="submit" className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-zinc-950">
                            Reply
                          </button>
                        </form>
                      </div>
                    )}
                    {mails.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => openCommlinkThread(m.conversationId)}
                        className="p-4 rounded-2xl border border-white/5 flex items-start justify-between gap-4 cursor-pointer hover:border-orange-400/25"
                        style={{ background: 'var(--chat-surface-bg)' }}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{m.from}</span>
                            <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-zinc-400 font-mono">{m.tag}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{m.time}</span>
                          </div>
                          <span className="text-xs font-bold text-orange-400 mt-1">{m.subject}</span>
                          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{m.body}</p>
                          {Array.isArray(m.mentions) && m.mentions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {m.mentions.map((mention: any) => (
                                <span key={mention.id || mention.username} className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                                  @{mention.username}
                                </span>
                              ))}
                            </div>
                          )}
                          {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {m.attachments.map((attachment: any) => (
                                <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-zinc-300 no-underline hover:text-white">
                                  {attachment.name || attachment.type || 'Attachment'}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setMails(prev => prev.filter(x => x.id !== m.id));
                          }}
                          className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB: SECURE FORUMS */}
            {activeTab === 'forums' && (
              <motion.div
                key="forums"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-4 dynamic-cosmic-card rounded-3xl p-6 backdrop-blur-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-xl font-sans font-bold text-white flex items-center gap-2">
                      <MessageSquare className="text-purple-400" size={20} />
                      Website Forum
                    </h2>
                    <p className="text-xs text-zinc-400 font-sans mt-0.5">Forum posts created here plus forwarded Discord Stream Hub posts that land on the website</p>
                  </div>
                  <button
                    onClick={() => setIsCreatingThread(!isCreatingThread)}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 font-mono text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Plus size={14} /> {isCreatingThread ? 'VIEW THREADS' : 'NEW DISCUSSION THREAD'}
                  </button>
                </div>

                <div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.04] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-white">Discord Stream Hub forwards into this forum</span>
                      <span className="text-xs text-zinc-400">
                        DSH should post forum-forwarded messages to <span className="font-mono text-purple-200">/api/forum/forward</span>. Those posts are stored on this website and shown below.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={refreshForwardedForumPosts}
                      disabled={forwardedForumLoading}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-200 hover:bg-white/10 disabled:opacity-50"
                    >
                      {forwardedForumLoading ? 'Refreshing...' : 'Refresh Forwarded Posts'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                      <span className="text-[10px] font-mono font-bold text-purple-300 uppercase">Destination</span>
                      <span className="block text-xs text-white mt-1">Website forum</span>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                      <span className="text-[10px] font-mono font-bold text-purple-300 uppercase">Intake route</span>
                      <span className="block text-xs text-white mt-1 font-mono">POST /api/forum/forward</span>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                      <span className="text-[10px] font-mono font-bold text-purple-300 uppercase">Forwarded channels</span>
                      <span className="block text-xs text-white mt-1">{forwardedForumChannels.length}</span>
                    </div>
                  </div>
                </div>

                {forwardedForumChannels.length > 0 && (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-white">Forwarded Discord Channels</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Click to expand</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {forwardedForumChannels.map((channel) => {
                        const isExpanded = expandedChannels.has(channel.id);
                        const lastSeen = lastSeenTimestamps[channel.id];
                        const hasNew = channel.lastPostAt && (!lastSeen || new Date(channel.lastPostAt).getTime() > new Date(lastSeen).getTime());

                        return (
                          <div key={channel.id} className="relative overflow-hidden rounded-2xl border border-white/5" style={{ background: 'var(--chat-surface-bg)' }}>
                            {hasNew && (
                              <span className="absolute right-3 top-3 z-10 rounded bg-red-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                                New
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedChannels((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(channel.id)) {
                                    next.delete(channel.id);
                                  } else {
                                    next.add(channel.id);
                                    // Mark as seen
                                    const now = new Date().toISOString();
                                    setLastSeenTimestamps((ts) => {
                                      const updated = { ...ts, [channel.id]: now };
                                      localStorage.setItem('forumLastSeen', JSON.stringify(updated));
                                      return updated;
                                    });
                                  }
                                  return next;
                                });
                              }}
                              className="w-full flex flex-wrap items-center justify-between gap-2 border-b border-white/5 bg-white/[0.03] px-4 py-3 pr-16 text-left hover:bg-white/[0.06] transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white">#{channel.name}</span>
                              </div>
                              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-bold text-zinc-300">
                                {channel.posts.length} {channel.posts.length === 1 ? 'post' : 'posts'}
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="flex flex-col gap-0">
                                {channel.posts.map((post) => {
                                  // Render content with @user mentions, custom emotes, and animated emotes
                                  let rendered = post.content || '';
                                  const mentions: Record<string, string> = post.mentionedUsers || {};
                                  rendered = rendered.replace(/<@(\d+)>/g, (_: string, id: string) => `@${mentions[id] || id}`);
                                  rendered = rendered.replace(/<a:(\w+):(\d+)>/g, (_: string, name: string, id: string) => `![${name}](https://cdn.discordapp.com/emojis/${id}.gif)`);
                                  rendered = rendered.replace(/<:(\w+):(\d+)>/g, (_: string, name: string, id: string) => `![${name}](https://cdn.discordapp.com/emojis/${id}.webp)`);

                                  const embeds: any[] = Array.isArray(post.embeds) ? post.embeds : [];
                                  const attachments: any[] = Array.isArray(post.attachments) ? post.attachments : [];

                                  return (
                                    <div key={post.id} className="border-b border-white/5 p-4 last:border-b-0">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-white">{post.authorName || 'Discord'}</span>
                                        <span className="text-[10px] text-zinc-500 font-mono">
                                          {post.postedAt ? new Date(post.postedAt).toLocaleString() : ''}
                                        </span>
                                      </div>
                                      <p className="text-xs text-zinc-400 leading-relaxed mt-2 whitespace-pre-wrap">
                                        {rendered.split(/(!\[[^\]]*\]\([^)]+\))/g).map((segment, i) => {
                                          const emoteMatch = segment.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
                                          if (emoteMatch) return <img key={i} src={emoteMatch[2]} alt={emoteMatch[1]} className="inline h-5 w-5 align-middle" />;
                                          return <span key={i}>{segment}</span>;
                                        })}
                                      </p>
                                      {attachments.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {attachments.map((att: any, i: number) => {
                                            const url = typeof att === 'string' ? att : att?.url;
                                            if (!url) return null;
                                            const contentType = att?.contentType || att?.content_type;
                                            const isImage = /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(url) || contentType?.startsWith('image');
                                            return isImage
                                              ? <img key={i} src={url} alt={att?.filename || ''} className="max-h-48 rounded-lg border border-white/10" />
                                              : <a key={i} href={url} target="_blank" rel="noreferrer" className="text-[10px] text-purple-300 hover:text-purple-200">{att?.filename || 'Attachment'}</a>;
                                          })}
                                        </div>
                                      )}
                                      {embeds.length > 0 && (
                                        <div className="mt-2 flex flex-col gap-2">
                                          {embeds.map((embed: any, i: number) => (
                                            <div key={i} className="rounded-lg border-l-4 bg-zinc-900/60 p-3" style={{ borderColor: embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : 'rgba(255,255,255,0.1)' }}>
                                              {embed.title && <p className="text-xs font-bold text-white">{embed.title}</p>}
                                              {embed.description && <p className="text-xs text-zinc-400 mt-1 whitespace-pre-wrap">{embed.description}</p>}
                                              {Array.isArray(embed.fields) && embed.fields.length > 0 && (
                                                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                                                  {embed.fields.slice(0, 6).map((field: any, fieldIndex: number) => (
                                                    <div key={fieldIndex} className="rounded-md bg-black/25 p-2">
                                                      {field.name && <p className="text-[10px] font-bold uppercase text-zinc-300">{field.name}</p>}
                                                      {field.value && <p className="mt-1 whitespace-pre-wrap text-[11px] text-zinc-400">{field.value}</p>}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                              {embed.thumbnail?.url && <img src={embed.thumbnail.url} alt="" className="mt-2 max-h-24 rounded border border-white/10" />}
                                              {embed.image?.url && <img src={embed.image.url} alt="" className="mt-2 max-h-48 rounded border border-white/10" />}
                                              {embed.url && <a href={embed.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[10px] text-purple-300 hover:text-purple-200">Open embed</a>}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {post.sourceMessageUrl && (
                                        <a href={post.sourceMessageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[10px] text-purple-300 hover:text-purple-200 no-underline">
                                          Source message
                                        </a>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isCreatingThread ? (
                  <form onSubmit={handleCreateThread} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">THREAD TITLE</label>
                        <input
                          type="text"
                          required
                          value={newThreadTitle}
                          onChange={(e) => setNewThreadTitle(e.target.value)}
                          placeholder="e.g. Tips for pairing MtnView glasses"
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">CATEGORY</label>
                        <select
                          value={newThreadCategory}
                          onChange={(e) => setNewThreadCategory(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
                        >
                          <option>Technical Support</option>
                          <option>General</option>
                          <option>Community Events</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">DISCUSSION DETAILS</label>
                      <textarea
                        required
                        rows={4}
                        value={newThreadBody}
                        onChange={(e) => setNewThreadBody(e.target.value)}
                        placeholder="Write your discussion details here..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-purple-600 text-xs font-bold font-mono self-start"
                    >
                      PUBLISH THREAD
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-2">
                    {activeForumThread && (
                      <div className="mb-3 rounded-2xl border border-purple-400/20 bg-purple-400/[0.04] p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-300">{activeForumThread.category}</span>
                            <h3 className="mt-1 text-base font-bold text-white">{activeForumThread.title}</h3>
                            <p className="mt-1 text-[10px] text-zinc-500">Started by @{activeForumThread.author}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveForumThread(null);
                              setActiveForumPosts([]);
                              setForumReplyBody('');
                            }}
                            className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold text-zinc-300"
                          >
                            Close
                          </button>
                        </div>
                        <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                          {activeForumPosts.map((post) => (
                            <div key={post.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-white">@{post.author}</span>
                                <span className="text-[10px] text-zinc-500">{new Date(post.created_at).toLocaleString()}</span>
                              </div>
                              <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{post.body}</p>
                            </div>
                          ))}
                        </div>
                        <form onSubmit={handleForumReply} className="mt-3 flex flex-col gap-2">
                          <textarea
                            rows={3}
                            value={forumReplyBody}
                            onChange={(event) => setForumReplyBody(event.target.value)}
                            placeholder="Reply to this forum thread..."
                            className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none focus:border-purple-400/50"
                          />
                          <button type="submit" className="self-start rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white">
                            Post Reply
                          </button>
                        </form>
                      </div>
                    )}
                    {forumThreads.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => openForumThread(t.id)}
                        className="p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4 cursor-pointer hover:border-purple-400/25"
                        style={{ background: 'var(--chat-surface-bg)' }}
                      >
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono tracking-wider text-purple-400 font-semibold">{t.category}</span>
                          <span className="text-xs font-bold text-white mt-0.5 hover:text-purple-300 cursor-pointer">{t.title}</span>
                          <span className="text-[10px] text-zinc-500 mt-1">Author: @{t.author} • Replied by: @{t.repliedBy}</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-zinc-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                          {t.posts} posts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB: SECURE HEARMEOUT VOICE ROOMS */}
            {activeTab === 'rooms' && (
              <motion.div
                key="rooms"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-4 dynamic-cosmic-card rounded-3xl p-6 backdrop-blur-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-xl font-sans font-bold text-white flex items-center gap-2">
                      <Headphones className="text-emerald-400" size={20} />
                      HearMeOut Voice Rooms
                    </h2>
                      <p className="text-xs text-zinc-400 mt-0.5">HearMeOut room and watch-party entry points</p>
                  </div>
                  <button
                    onClick={refreshHearMeOutRooms}
                    disabled={hearmeoutLoading}
                    className="px-4 py-1.5 rounded-xl font-mono text-xs font-bold transition-all border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 disabled:opacity-50"
                  >
                    {hearmeoutLoading ? 'CHECKING...' : `${hearmeoutRooms.length} ROOMS`}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={refreshHearMeOutRooms}
                    disabled={hearmeoutLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-bold text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                  >
                    {hearmeoutLoading ? 'Refreshing...' : 'Refresh Rooms'}
                  </button>
                  <a
                    href="https://hearmeout-main.fly.dev"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white no-underline"
                  >
                    Open HearMeOut
                  </a>
                </div>

                {hearmeoutRooms.length === 0 ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                    <span className="text-xs font-bold text-white">No open rooms returned right now.</span>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      The hub is calling HearMeOut's live room API. Create a room in HearMeOut, then refresh here to join it from the hub.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {hearmeoutRooms.map((room) => (
                        <div key={room.id} className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="text-xs font-bold text-white">{room.name || room.id}</span>
                              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{room.description || 'HearMeOut live room'}</p>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-1">
                              {room.activeCount || 0} active
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                            {room.roomUrl && (
                              <button type="button" onClick={() => setEmbeddedRoomUrl(room.roomUrl || null)} className="px-3 py-2 rounded-xl bg-emerald-500 text-xs font-bold text-black text-center">
                                Embed Room
                              </button>
                            )}
                            {room.roomUrl && (
                              <a href={room.roomUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs font-bold text-zinc-200 text-center no-underline">
                                Pop Out
                              </a>
                            )}
                            {room.overlayUrl && (
                              <button type="button" onClick={() => setEmbeddedRoomUrl(room.overlayUrl || null)} className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs font-bold text-zinc-200 text-center">
                                Embed Overlay
                              </button>
                            )}
                          </div>
                          {(room.watchMovieSessionId || room.watchMusicSessionId) && (
                            <div className="mt-3 text-[10px] text-zinc-500 font-mono">
                              {room.watchMovieSessionId ? `movie: ${room.watchMovieSessionId}` : ''}
                              {room.watchMovieSessionId && room.watchMusicSessionId ? ' | ' : ''}
                              {room.watchMusicSessionId ? `music: ${room.watchMusicSessionId}` : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {embeddedRoomUrl && (
                      <div className="rounded-2xl border border-emerald-500/20 bg-black/50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                          <span className="text-xs font-bold text-white">Embedded HearMeOut view</span>
                          <div className="flex items-center gap-2">
                            <a href={embeddedRoomUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-emerald-300 no-underline">Pop out</a>
                            <button type="button" onClick={() => setEmbeddedRoomUrl(null)} className="text-[10px] font-bold text-zinc-400 hover:text-white">Close</button>
                          </div>
                        </div>
                        <iframe
                          src={embeddedRoomUrl}
                          title="Embedded HearMeOut room"
                          className="w-full h-[520px] bg-black"
                          allow="autoplay; microphone; camera; fullscreen; clipboard-write"
                        />
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* TAB: SECURE WORKFLOW BUILDER */}
            {activeTab === 'builder' && (
              <React.Suspense fallback={<div className="rounded-3xl border border-white/10 p-8 text-sm text-zinc-400">Loading workflow builder…</div>}>
                <BuilderRoute
                  draft={workflowDraft}
                  setDraft={setWorkflowDraft}
                  steps={workflowSteps}
                  setSteps={setWorkflowSteps}
                  notify={notify}
                />
              </React.Suspense>
            )}

            {/* TAB: SHOP */}
            {activeTab === 'shop' && (
              <motion.div
                key="shop"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <Shop 
                  accentColor={currentTheme.glowHex}
                  paypalClientId={undefined /* Set your PayPal Client ID here */}
                />
              </motion.div>
            )}

            {/* TAB: ARENA */}
            {activeTab === 'arena' && (
              <motion.div
                key="arena"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <Arena
                  accentColor={currentTheme.glowHex}
                  points={identity?.points || 0}
                  xp={identity?.xp || 0}
                  level={identity?.level || 1}
                  username={identity?.username}
                  displayName={identity?.displayName}
                  onSpendPoints={identity ? handleSpendDshPoints : undefined}
                  onXpAwarded={() => { void refreshCanonicalXp().catch(() => {}); }}
                />
              </motion.div>
            )}

            {/* TAB: SETTINGS PANEL */}
            {activeTab === 'settings' && (
              <React.Suspense fallback={<div className="rounded-3xl border border-white/10 p-8 text-sm text-zinc-400">Loading workspace settings…</div>}>
                <SettingsRoute
                  identityPresent={Boolean(identity)}
                  preferences={preferences}
                  accentColor={currentTheme.glowHex}
                  portableWorkspace={portableWorkspace}
                  onUpdatePreferences={handleUpdatePreferences}
                  onApplyThemePreset={handleApplyThemePreset}
                />
              </React.Suspense>
            )}

            {/* TAB: SECURE HELP CENTER */}
            {activeTab === 'help' && (
              <React.Suspense fallback={<div className="rounded-3xl border border-white/10 p-8 text-sm text-zinc-400">Loading help…</div>}>
                <HelpRoute
                  onlineApps={stats.onlineApps}
                  checkedApps={stats.checkedApps}
                  joinableRooms={hearmeoutRooms.length}
                />
              </React.Suspense>
            )}

            {/* TAB: CREW DESK */}
            {activeTab === 'crew' && (
              <motion.div
                key="crew"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-4 dynamic-cosmic-card rounded-3xl p-6 backdrop-blur-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-xl font-sans font-bold text-white flex items-center gap-2">
                      <Users className="text-blue-400" size={20} />
                      App Crew Desk
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Operational entry points for the apps that support the hub</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-2">
                  <div className="xl:col-span-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.035] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">Universal Personal overlay</h3>
                        <p className="mt-1 text-xs text-zinc-500">SpaceMountain uses the same canonical SPMT Personal scene, alert relay, and output URL as every connected app.</p>
                        <p className="mt-1 text-[9px] font-mono text-zinc-600">Edit once in Overlay Bay · changes follow your SPMT account everywhere</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setOverlayWorkspaceEnabled((value) => !value)}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold ${overlayWorkspaceEnabled ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-black/30 text-zinc-400'}`}
                        >
                          Personal overlay {overlayWorkspaceEnabled ? 'On' : 'Off'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOverlayWorkspaceEnabled(true);
                            setOverlayEditing(true);
                          }}
                          className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-200"
                        >
                          Open canonical Overlay Bay
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-zinc-400">
                      The old SpaceMountain-only widget settings have been retired. Use the canonical Overlay Bay so follow tests, sources, visibility, geometry, opacity, layers, and output URLs stay identical across the ecosystem.
                    </div>
                    {false && <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {overlayWidgets.map((widget) => (
                        <div key={widget.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <input
                              value={widget.title}
                              onChange={(event) => updateOverlayWidget(widget.id, { title: event.target.value })}
                              className="min-w-0 flex-1 bg-transparent text-xs font-black text-white outline-none"
                              aria-label="Overlay widget title"
                            />
                            <div className="flex gap-2">
                              <button type="button" onClick={() => updateOverlayWidget(widget.id, { visible: !widget.visible })} className={`text-[10px] font-bold ${widget.visible ? 'text-emerald-300' : 'text-zinc-500'}`}>
                                {widget.visible ? 'Visible' : 'Hidden'}
                              </button>
                              <button type="button" onClick={() => updateOverlayWidget(widget.id, { locked: !widget.locked })} className={`text-[10px] font-bold ${widget.locked ? 'text-amber-300' : 'text-zinc-500'}`}>
                                {widget.locked ? 'Locked' : 'Unlocked'}
                              </button>
                              {widget.kind === 'custom' && (
                                <button type="button" aria-label={`Delete ${widget.title}`} title="Delete widget" onClick={() => setOverlayWidgets((items) => items.filter((item) => item.id !== widget.id))} className="rounded-lg border border-red-400/20 p-1 text-red-300"><Trash2 size={13} /></button>
                              )}
                            </div>
                          </div>
                          <input
                            value={widget.url}
                            onChange={(event) => updateOverlayWidget(widget.id, { url: event.target.value })}
                            className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[10px] text-zinc-300 outline-none focus:border-cyan-400/50"
                            aria-label={`${widget.title} URL`}
                          />
                          {!buildAppSurfaceUrl(widget.url, widget.title).valid && (
                            <p className="mt-1 text-[9px] font-bold text-red-300">{buildAppSurfaceUrl(widget.url, widget.title).error}</p>
                          )}
                          <div className="mt-3 grid grid-cols-2 gap-3 text-[10px] text-zinc-500 sm:grid-cols-4">
                            <label>X %<input type="number" min="0" max="100" step="0.1" value={Number(widget.x.toFixed(1))} onChange={(event) => updateOverlayWidget(widget.id, { x: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} className="mt-1 w-full rounded bg-black/40 px-2 py-1 text-zinc-200" /></label>
                            <label>Y %<input type="number" min="0" max="100" step="0.1" value={Number(widget.y.toFixed(1))} onChange={(event) => updateOverlayWidget(widget.id, { y: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} className="mt-1 w-full rounded bg-black/40 px-2 py-1 text-zinc-200" /></label>
                            <label>Width<input type="number" min="120" value={Math.round(widget.width)} onChange={(event) => updateOverlayWidget(widget.id, { width: Number(event.target.value) || 120 })} className="mt-1 w-full rounded bg-black/40 px-2 py-1 text-zinc-200" /></label>
                            <label>Height<input type="number" min="72" value={Math.round(widget.height)} onChange={(event) => updateOverlayWidget(widget.id, { height: Number(event.target.value) || 72 })} className="mt-1 w-full rounded bg-black/40 px-2 py-1 text-zinc-200" /></label>
                            <label>Rotation<input type="number" min="-180" max="180" value={Math.round(widget.rotation ?? 0)} onChange={(event) => updateOverlayWidget(widget.id, { rotation: Math.max(-180, Math.min(180, Number(event.target.value) || 0)) })} className="mt-1 w-full rounded bg-black/40 px-2 py-1 text-zinc-200" /></label>
                            <label>Layer<input type="number" min="1" value={Math.round(widget.zIndex ?? 1)} onChange={(event) => updateOverlayWidget(widget.id, { zIndex: Math.max(1, Number(event.target.value) || 1) })} className="mt-1 w-full rounded bg-black/40 px-2 py-1 text-zinc-200" /></label>
                            <label>Opacity {Math.round(widget.opacity * 100)}%<input type="range" min="0" max="100" value={Math.round(widget.opacity * 100)} onChange={(event) => updateOverlayWidget(widget.id, { opacity: Number(event.target.value) / 100 })} className="mt-2 w-full" /></label>
                            <label>Interaction
                              <select value={widget.interactionMode || (widget.interactive ? 'interactive' : 'click-through')} onChange={(event) => {
                                const mode = event.target.value as NonNullable<OverlayWidget['interactionMode']>;
                                updateOverlayWidget(widget.id, { interactionMode: mode, interactive: mode !== 'click-through' });
                              }} className="mt-1 w-full rounded bg-black/40 px-2 py-1 text-zinc-200">
                                <option value="click-through">Click-through</option>
                                <option value="interactive">Interactive</option>
                                <option value="hybrid">Hybrid</option>
                              </select>
                            </label>
                            <label className="flex items-center gap-2 pt-4"><input type="checkbox" checked={Boolean(widget.hoverReveal)} onChange={(event) => updateOverlayWidget(widget.id, { hoverReveal: event.target.checked })} /> Reveal on hover</label>
                            <label className="flex items-center gap-2 pt-4"><input type="checkbox" checked={Boolean(widget.parallaxEnabled)} onChange={(event) => updateOverlayWidget(widget.id, { parallaxEnabled: event.target.checked })} /> Widget parallax</label>
                            <label>Parallax depth<input type="range" min="0" max="40" value={widget.parallaxDepth ?? 8} disabled={!widget.parallaxEnabled} onChange={(event) => updateOverlayWidget(widget.id, { parallaxDepth: Number(event.target.value) })} className="mt-2 w-full disabled:opacity-30" /></label>
                          </div>
                        </div>
                      ))}
                    </div>}
                  </div>

                  <div className="xl:col-span-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">Embed control dashboard</h3>
                        <p className="text-xs text-zinc-500 mt-1">These are SpaceMountain workspace dock slots. Stream overlay sources and positioning now live in the canonical Overlay Bay.</p>
                      </div>
                      <div className="flex gap-2">
                        {embedSlots.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setActiveEmbedSlot(slot.id)}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${activeEmbedSlot === slot.id ? 'border-blue-400/50 bg-blue-500/15 text-blue-200' : 'border-white/10 bg-black/30 text-zinc-300'}`}
                          >
                            Slot {slot.id}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                      {embedSlots.map((slot) => (
                        <div key={slot.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-black text-white">Slot {slot.id}</span>
                            <button
                              type="button"
                              onClick={() => updateEmbedSlot(slot.id, { collapsed: !slot.collapsed })}
                              className="text-[10px] font-bold text-blue-300"
                            >
                              {slot.collapsed ? 'Show' : 'Hide'}
                            </button>
                          </div>
                          <label className="text-[9px] font-mono text-zinc-500">Title</label>
                          <input
                            value={slot.title}
                            onChange={(event) => updateEmbedSlot(slot.id, { title: event.target.value })}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-400/60"
                          />
                          <label className="mt-3 block text-[9px] font-mono text-zinc-500">URL</label>
                          <input
                            value={slot.url}
                            onChange={(event) => updateEmbedSlot(slot.id, { url: event.target.value })}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-400/60"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
                      {embedPresets.map((preset) => (
                        <button
                          key={`${preset.title}:${preset.url}`}
                          type="button"
                          onClick={() => openEmbeddedApp(preset.title, preset.url, preset.kind)}
                          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-blue-400/40 hover:bg-blue-500/10"
                        >
                          <span className="block text-[11px] font-bold text-white">{preset.title}</span>
                          <span className="block text-[9px] uppercase tracking-wider text-zinc-500">{preset.kind}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <h3 className="text-sm font-bold text-white">Notifications</h3>
                    <div className="mt-3 flex flex-col gap-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-zinc-500">No embed events yet.</p>
                      ) : notifications.map((item) => (
                        <div key={item.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                          <span className="block text-xs font-bold text-white">{item.title}</span>
                          <span className="mt-1 block text-xs text-zinc-400">{item.body}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </main>

      {!overlayEditing && (
        <WorkspaceTray
          open={workspaceTrayOpen}
          activeSlotId={activeEmbedSlot}
          slots={embedSlots}
          accentColor={currentTheme.glowHex}
          resolveUrl={(slot) => embeddedSurfaceUrl(slot.title, slot.url, (identity as any)?.tenantId || identity?.twitchId)}
          onOpenChange={setWorkspaceTrayOpen}
          onSelectSlot={setActiveEmbedSlot}
          onSlotChange={updateEmbedSlot}
          onFrameLoad={sendEmbeddedFrameContext}
        />
      )}

      {/* Easter Egg Flying Rocket Particles Trail */}
      <AnimatePresence>
        {rocketFlying && rocketTrail.map(p => (
          <div
            key={p.id}
            className="fixed rounded-full pointer-events-none z-[119] blur-[0.5px] transition-opacity duration-150"
            style={{
              left: p.x,
              top: p.y,
              width: '5px',
              height: '5px',
              backgroundColor: currentTheme.glowHex,
              opacity: p.opacity * 0.75,
              boxShadow: `0 0 8px ${currentTheme.glowHex}`
            }}
          />
        ))}
      </AnimatePresence>

      {/* 1a. Static sidebar dock. During flight it stays parked as a profile pod until redocked. */}
      <RocketDock 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        identity={identity} 
        preferences={preferences}
        accentColor={currentTheme.glowHex}
        rocketFlying={rocketFlying}
        activeThemeName={currentTheme.name}
        isFloating={false}
        instanceId="staticDockPanel"
        onApplyThemePreset={handleApplyThemePreset}
      />

      {/* 1b. Floating sidebar dock. This is the only dock the flying rocket opens and drags. */}
      {rocketFlying && (
        <RocketDock 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          identity={identity} 
          preferences={preferences}
          accentColor={currentTheme.glowHex}
          rocketFlying={rocketFlying}
          activeThemeName={currentTheme.name}
          isFloating={true}
          instanceId="floatingDockPanel"
          onApplyThemePreset={handleApplyThemePreset}
        />
      )}

      {/* 2. Actual Rocket Launcher from testing.html */}
      <button 
        className="rocket-launcher docked" 
        id="rocketLauncher" 
        type="button" 
        aria-label="Toggle movable station dock"
      >
        <ProcessedRocketImage 
          className="w-[52px] h-[52px] object-contain pointer-events-none transition-transform duration-160"
          glowHex={currentTheme.glowHex}
        />
      </button>

      {/* 3. Rocket movement, drag-and-dock physics and coordination from testing.html */}
      <AppRocketLogic 
        rocketFlying={rocketFlying}
        setRocketFlying={setRocketFlying}
        rocketStateRef={rocketStateRef}
        onArenaCollision={handleArenaCollision}
      />

    </div>
  );
}

interface AppRocketLogicProps {
  rocketFlying: boolean;
  setRocketFlying: (flying: boolean) => void;
  rocketStateRef: React.MutableRefObject<any>;
  onArenaCollision: () => void;
}

function AppRocketLogic({ rocketFlying, setRocketFlying, rocketStateRef, onArenaCollision }: AppRocketLogicProps) {
  useEffect(() => {
    const rocket = document.getElementById('rocketLauncher');
    if (!rocket) return;

    // Helper functions
    const getStaticDock = () => document.getElementById('staticDockPanel');
    const getFloatingDock = () => document.getElementById('floatingDockPanel');
    const getDock = () => rocketStateRef.current.mode === 'free' ? getFloatingDock() : getStaticDock();

    function placeRocketInBay(retryCount = 0) {
      const db = document.getElementById('dockBay');
      const rkt = document.getElementById('rocketLauncher');
      if (!rkt) return;
      if (!db) {
        if (retryCount < 10) {
          setTimeout(() => placeRocketInBay(retryCount + 1), 50);
        }
        return;
      }
      const r = db.getBoundingClientRect();
      const state = rocketStateRef.current;
      state.rocketX = r.left + r.width / 2 - 36;
      state.rocketY = r.top + r.height / 2 - 36;
      rkt.style.left = state.rocketX + 'px';
      rkt.style.top = state.rocketY + 'px';
      rkt.style.right = 'auto';
      rkt.style.bottom = 'auto';
      state.angleDeg = 0;
      rkt.style.setProperty('--angle', '0deg');
    }

    function setDocked() {
      const state = rocketStateRef.current;
      state.mode = 'docked';
      setRocketFlying(false);
      const rkt = document.getElementById('rocketLauncher');
      const dk = getDock();
      const floatingDock = getFloatingDock();
      const staticDock = getStaticDock();
      if (rkt) {
        rkt.classList.add('docked');
        rkt.classList.remove('free', 'open');
      }
      if (staticDock) staticDock.classList.remove('open');
      if (floatingDock) floatingDock.classList.remove('open', 'floating');
      if (dk) {
        dk.classList.remove('floating');
        dk.style.left = '';
        dk.style.top = '';
        dk.style.width = '';
        dk.style.height = '';
        dk.style.bottom = '';
      }
      setTimeout(() => placeRocketInBay(), 40);
    }

    function openDock() {
      const state = rocketStateRef.current;
      const rkt = document.getElementById('rocketLauncher');
      const dk = getDock();
      if (dk) dk.classList.add('open');
      if (rkt) rkt.classList.add('open');
      if (state.mode === 'docked') {
        if (dk) {
          dk.classList.remove('floating');
          dk.style.left = '';
          dk.style.top = '';
          dk.style.width = '';
          dk.style.height = '';
          dk.style.bottom = '';
        }
      } else {
        if (dk) {
          dk.classList.add('floating');
          const r = rkt ? rkt.getBoundingClientRect() : { left: 0, top: 0 };
          dk.style.left = Math.min(window.innerWidth - 150, Math.max(18, r.left + 84)) + 'px';
          dk.style.top = Math.min(window.innerHeight - 420, Math.max(80, r.top - 10)) + 'px';
          dk.style.width = '124px';
          dk.style.height = '400px';
        }
        attachRocketToFloatingDock();
      }
    }

    function closeDock() {
      const state = rocketStateRef.current;
      const rkt = document.getElementById('rocketLauncher');
      const dk = getDock();
      if (dk) dk.classList.remove('open');
      if (rkt) rkt.classList.remove('open');
      if (state.mode === 'docked') placeRocketInBay();
    }

    function toggleDock() {
      const dk = getDock();
      if (dk) {
        if (dk.classList.contains('open')) {
          closeDock();
        } else {
          openDock();
        }
      }
    }

    function releaseRocket() {
      const state = rocketStateRef.current;
      const staticDock = getStaticDock();
      if (staticDock) staticDock.classList.remove('open');
      state.mode = 'free';
      setRocketFlying(true);
      const rkt = document.getElementById('rocketLauncher');
      if (rkt) {
        rkt.classList.remove('docked');
        rkt.classList.add('free');
        state.rocketX = Math.min(window.innerWidth - 92, state.rocketX + 96);
        state.rocketY = Math.max(90, state.rocketY + 26);
        rkt.style.left = state.rocketX + 'px';
        rkt.style.top = state.rocketY + 'px';
      }
    }

    function attachRocketToFloatingDock() {
      const state = rocketStateRef.current;
      const rkt = document.getElementById('rocketLauncher');
      const dk = getDock();
      if (state.mode !== 'free' || !dk || !dk.classList.contains('open') || !rkt) return;
      const p = dk.getBoundingClientRect();
      state.rocketX = Math.min(window.innerWidth - 92, Math.max(12, p.left - 82));
      state.rocketY = Math.min(window.innerHeight - 92, Math.max(72, p.top + 8));
      rkt.style.left = state.rocketX + 'px';
      rkt.style.top = state.rocketY + 'px';
    }

    function nearDockBay() {
      const rkt = document.getElementById('rocketLauncher');
      const db = document.getElementById('dockBay');
      if (!rkt || !db) return false;
      const a = rkt.getBoundingClientRect();
      const b = db.getBoundingClientRect();
      const ax = a.left + a.width / 2;
      const ay = a.top + a.height / 2;
      const bx = b.left + b.width / 2;
      const by = b.top + b.height / 2;
      return Math.hypot(ax - bx, ay - by) < 62;
    }

    function orient(dx: number, dy: number) {
      if (Math.hypot(dx, dy) < 0.2) return;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      const state = rocketStateRef.current;
      state.angleDeg = angle;
      const rkt = document.getElementById('rocketLauncher');
      if (rkt) {
        rkt.style.setProperty('--angle', angle + 'deg');
      }
    }

    // Rocket Event Listeners
    const handlePointerDown = (e: PointerEvent) => {
      const state = rocketStateRef.current;
      if (state.mode === 'docked') return;
      state.dragRocket = true;
      state.moved = false;
      state.downX = e.clientX;
      state.downY = e.clientY;
      const rr = rocket.getBoundingClientRect();
      const dk = getDock();
      const pr = dk ? dk.getBoundingClientRect() : { left: 0, top: 0 };
      state.startRX = rr.left;
      state.startRY = rr.top;
      state.startPX = pr.left || 0;
      state.startPY = pr.top || 68;
      rocket.setPointerCapture(e.pointerId);
      rocket.style.cursor = 'grabbing';
    };

    let clickTimeout: any = null;

    const handleRocketClickOrTap = () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
        return;
      }
      clickTimeout = setTimeout(() => {
        clickTimeout = null;
        toggleDock();
      }, 200);
    };

    const handleClick = () => {
      const state = rocketStateRef.current;
      if (state.mode === 'docked') handleRocketClickOrTap();
    };

    const handlePointerMove = (e: PointerEvent) => {
      const state = rocketStateRef.current;
      if (!state.dragRocket) return;
      const dx = e.clientX - state.downX;
      const dy = e.clientY - state.downY;
      if (Math.hypot(dx, dy) > 5) state.moved = true;
      state.rocketX = Math.min(window.innerWidth - 92, Math.max(12, state.startRX + dx));
      state.rocketY = Math.min(window.innerHeight - 92, Math.max(72, state.startRY + dy));
      rocket.style.left = state.rocketX + 'px';
      rocket.style.top = state.rocketY + 'px';
      orient(dx, dy);
      const dk = getDock();
      if (state.mode === 'free' && dk && dk.classList.contains('open')) {
        dk.style.left = Math.min(window.innerWidth - 90, Math.max(10, state.startPX + dx)) + 'px';
        dk.style.top = Math.min(window.innerHeight - 90, Math.max(10, state.startPY + dy)) + 'px';
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const state = rocketStateRef.current;
      if (state.mode === 'docked') return;
      state.dragRocket = false;
      rocket.style.cursor = 'grab';
      rocket.releasePointerCapture(e.pointerId);
      if (!state.moved) {
        handleRocketClickOrTap();
        return;
      }
      if (state.mode === 'free' && nearDockBay()) {
        closeDock();
        setDocked();
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      e.preventDefault();
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }
      const state = rocketStateRef.current;
      if (state.mode === 'docked') {
        releaseRocket();
      } else {
        setDocked();
      }
    };

    rocket.addEventListener('pointerdown', handlePointerDown);
    rocket.addEventListener('click', handleClick);
    rocket.addEventListener('pointermove', handlePointerMove);
    rocket.addEventListener('pointerup', handlePointerUp);
    rocket.addEventListener('dblclick', handleDblClick);

    // Sidebar Close Click
    const handleCloseClick = () => {
      closeDock();
    };
    const cBtn = document.getElementById('dockClose');
    if (cBtn) cBtn.addEventListener('click', handleCloseClick);

    // Sidebar Drag Handle Listeners
    const handlePanelPointerDown = (e: PointerEvent) => {
      const state = rocketStateRef.current;
      if ((e.target as HTMLElement).closest('button')) return;
      if (state.mode === 'docked') return;
      state.dragPanel = true;
      state.dsx = e.clientX;
      state.dsy = e.clientY;
      const dk = getDock();
      if (!dk) return;
      const r = dk.getBoundingClientRect();
      state.psx = r.left;
      state.psy = r.top;
      const hnd = document.getElementById('dockHandle');
      if (hnd) hnd.setPointerCapture(e.pointerId);
    };

    const handlePanelPointerMove = (e: PointerEvent) => {
      const state = rocketStateRef.current;
      if (!state.dragPanel || state.mode !== 'free') return;
      const dk = getDock();
      if (!dk) return;
      const x = Math.min(window.innerWidth - 90, Math.max(10, state.psx + e.clientX - state.dsx));
      const y = Math.min(window.innerHeight - 90, Math.max(10, state.psy + e.clientY - state.dsy));
      dk.style.left = x + 'px';
      dk.style.top = y + 'px';
      attachRocketToFloatingDock();
      orient(e.clientX - state.dsx, e.clientY - state.dsy);
    };

    const handlePanelPointerUp = (e: PointerEvent) => {
      const state = rocketStateRef.current;
      if (!state.dragPanel) return;
      state.dragPanel = false;
      const hnd = document.getElementById('dockHandle');
      if (hnd) hnd.releasePointerCapture(e.pointerId);
    };

    const hnd = document.getElementById('dockHandle');
    if (hnd) {
      hnd.addEventListener('pointerdown', handlePanelPointerDown);
      hnd.addEventListener('pointermove', handlePanelPointerMove);
      hnd.addEventListener('pointerup', handlePanelPointerUp);
    }

    // Dock Bay click listener
    const handleDockBayClick = () => {
      const state = rocketStateRef.current;
      if (state.mode === 'free' && nearDockBay()) {
        setDocked();
      }
    };
    const db = document.getElementById('dockBay');
    if (db) db.addEventListener('click', handleDockBayClick);

    // Window Resize and Load
    const handleResize = () => {
      const state = rocketStateRef.current;
      const dk = getDock();
      if (state.mode === 'docked') {
        placeRocketInBay();
      } else if (dk && dk.classList.contains('open')) {
        attachRocketToFloatingDock();
      }
    };
    window.addEventListener('resize', handleResize);

    // Initial positioning
    if (!rocketFlying) {
      setDocked();
      const timer = setTimeout(placeRocketInBay, 100);
    } else {
      const state = rocketStateRef.current;
      state.mode = 'free';
      const rkt = document.getElementById('rocketLauncher');
      const dk = getDock();
      if (rkt) {
        rkt.classList.remove('docked');
        rkt.classList.add('free');
        rkt.style.left = state.rocketX + 'px';
        rkt.style.top = state.rocketY + 'px';
      }
      if (dk && dk.classList.contains('open')) {
        dk.classList.add('floating');
        dk.style.left = state.startPX + 'px';
        dk.style.top = state.startPY + 'px';
        dk.style.width = '124px';
        dk.style.height = '400px';
      }
    }

    const timer = setTimeout(() => {}, 0);

    return () => {
      rocket.removeEventListener('pointerdown', handlePointerDown);
      rocket.removeEventListener('click', handleClick);
      rocket.removeEventListener('pointermove', handlePointerMove);
      rocket.removeEventListener('pointerup', handlePointerUp);
      rocket.removeEventListener('dblclick', handleDblClick);
      const activeCBtn = document.getElementById('dockClose');
      if (activeCBtn) activeCBtn.removeEventListener('click', handleCloseClick);
      const activeHnd = document.getElementById('dockHandle');
      if (activeHnd) {
        activeHnd.removeEventListener('pointerdown', handlePanelPointerDown);
        activeHnd.removeEventListener('pointermove', handlePanelPointerMove);
        activeHnd.removeEventListener('pointerup', handlePanelPointerUp);
      }
      const activeDb = document.getElementById('dockBay');
      if (activeDb) activeDb.removeEventListener('click', handleDockBayClick);
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
      if (clickTimeout) clearTimeout(clickTimeout);
    };
  }, [setRocketFlying, rocketStateRef, rocketFlying]);

  // Follow loop
  useEffect(() => {
    let animationFrameId: number;
    
    function orient(dx: number, dy: number) {
      if (Math.hypot(dx, dy) < 0.2) return;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      const state = rocketStateRef.current;
      state.angleDeg = angle;
      const rkt = document.getElementById('rocketLauncher');
      if (rkt) {
        rkt.style.setProperty('--angle', angle + 'deg');
      }
    }

    function followRocket() {
      const state = rocketStateRef.current;
      const rocket = document.getElementById('rocketLauncher');
      const dock = document.getElementById('floatingDockPanel');
      const arenaTrigger = document.getElementById('arenaRocketTrigger');

      // Check collision with arena trigger
      if (rocket && arenaTrigger && state.mode === 'free') {
        const r = rocket.getBoundingClientRect();
        const t = arenaTrigger.getBoundingClientRect();
        const collisionPadding = 10;
        const collided = r.right - collisionPadding >= t.left
          && r.left + collisionPadding <= t.right
          && r.bottom - collisionPadding >= t.top
          && r.top + collisionPadding <= t.bottom;
        if (collided) {
          onArenaCollision();
          return;
        }
      }

      if (rocket && state.mode === 'free' && !state.dragRocket && (!dock || !dock.classList.contains('open')) && window.innerWidth > 760) {
        const cx = state.rocketX + 36;
        const cy = state.rocketY + 36;
        const toX = cx - state.mouseX;
        const toY = cy - state.mouseY;
        const mx = state.mouseX - state.prevMouseX;
        const my = state.mouseY - state.prevMouseY;
        const dist = Math.hypot(toX, toY);
        const toward = (mx * toX + my * toY) > 0;
        let f = toward ? 0.006 : 0.048;
        if (dist < 110) f *= 0.22;
        if (dist < 54) f = 0.002;
        const nextX = state.rocketX + (state.mouseX - 36 - state.rocketX) * f;
        const nextY = state.rocketY + (state.mouseY - 36 - state.rocketY) * f;
        orient(nextX - state.rocketX, nextY - state.rocketY);
        state.rocketX = nextX;
        state.rocketY = nextY;
        rocket.style.left = Math.min(window.innerWidth - 92, Math.max(12, state.rocketX)) + 'px';
        rocket.style.top = Math.min(window.innerHeight - 92, Math.max(72, state.rocketY)) + 'px';
      }
      animationFrameId = requestAnimationFrame(followRocket);
    }
    
    followRocket();
    return () => cancelAnimationFrame(animationFrameId);
  }, [onArenaCollision, rocketStateRef]);

  return null;
}
