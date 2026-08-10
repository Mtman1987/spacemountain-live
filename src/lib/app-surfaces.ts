import type { EmbeddedAppTarget } from '../types';

export const appOrigins = {
  streamweaver: 'https://streamweaver-new.fly.dev',
  hearmeout: 'https://hearmeout-main.fly.dev',
  discordHub: 'https://discord-stream-hub-new.fly.dev',
  chatTag: 'https://chat-tag-new.fly.dev',
} as const;

export const appSurfaces = {
  streamweaver: {
    home: `${appOrigins.streamweaver}/dashboard`,
    embed: `${appOrigins.streamweaver}/tts-mixer`,
    signIn: `${appOrigins.streamweaver}/auth/spmt/start?next=%2Fdashboard`,
    commands: `${appOrigins.streamweaver}/commands`,
    community: `${appOrigins.streamweaver}/community`,
    integrations: `${appOrigins.streamweaver}/integrations`,
    workflows: `${appOrigins.streamweaver}/active-commands`,
    ttsMixer: `${appOrigins.streamweaver}/tts-mixer`,
    liveChat: `${appOrigins.streamweaver}/shared-chat`,
  },
  hearmeout: {
    home: `${appOrigins.hearmeout}/`,
    embed: `${appOrigins.hearmeout}/`,
    nowPlaying: `${appOrigins.hearmeout}/overlay/spacemountain?media=music`,
  },
  discordHub: {
    home: `${appOrigins.discordHub}/dashboard`,
    embed: `${appOrigins.discordHub}/dashboard`,
    calendar: `${appOrigins.discordHub}/calendar`,
    leaderboard: `${appOrigins.discordHub}/leaderboard`,
  },
  chatTag: {
    home: `${appOrigins.chatTag}/`,
    embed: `${appOrigins.chatTag}/quackverse`,
    quackverse: `${appOrigins.chatTag}/quackverse`,
    overlay: `${appOrigins.chatTag}/overlay`,
  },
} as const;

export const canonicalEmbedPresets: EmbeddedAppTarget[] = [
  { title: 'All-Tenant TTS Studio', url: appSurfaces.streamweaver.ttsMixer, kind: 'overlay' },
  { title: 'Commlink Live Chat', url: appSurfaces.streamweaver.liveChat, kind: 'app' },
  { title: 'Quackverse Game', url: appSurfaces.chatTag.quackverse, kind: 'game' },
  { title: 'ChatTag Overlay', url: appSurfaces.chatTag.overlay, kind: 'overlay' },
  { title: 'DSH Dashboard', url: appSurfaces.discordHub.embed, kind: 'dashboard' },
  { title: 'DSH Calendar', url: appSurfaces.discordHub.calendar, kind: 'dashboard' },
  { title: 'DSH Leaderboard', url: appSurfaces.discordHub.leaderboard, kind: 'dashboard' },
  { title: 'HearMeOut Rooms', url: appSurfaces.hearmeout.embed, kind: 'app' },
];

export type AppSurfaceContext = {
  tenantId?: string | null;
  scopes?: string[];
  embed?: boolean;
};

export type NormalizedAppSurface = {
  title: string;
  url: string;
  valid: boolean;
  error: string | null;
};

const localHosts = new Set(['0.0.0.0', '127.0.0.1', 'localhost', '[::1]']);

function deployedOriginFor(title: string, pathname: string) {
  const hint = `${title} ${pathname}`.toLowerCase();
  if (hint.includes('streamweaver') || hint.includes('tts') || hint.includes('shared-chat') || hint.includes('commlink')) return appOrigins.streamweaver;
  if (hint.includes('chat-tag') || hint.includes('chattag') || hint.includes('quackverse')) return appOrigins.chatTag;
  if (hint.includes('discord') || hint.includes('dsh')) return appOrigins.discordHub;
  if (hint.includes('hearmeout') || hint.includes('now-playing') || hint.includes('music')) return appOrigins.hearmeout;
  return null;
}

export function buildAppSurfaceUrl(value: string, title = '', context: AppSurfaceContext = {}): NormalizedAppSurface {
  const input = String(value || '').trim();
  if (!input || input === 'about:blank') return { title, url: input || 'about:blank', valid: true, error: null };
  try {
    let parsed = new URL(input, 'https://spacemountain.live');
    if (localHosts.has(parsed.hostname)) {
      const deployedOrigin = deployedOriginFor(title, parsed.pathname);
      if (!deployedOrigin) {
        return { title, url: input, valid: false, error: 'Localhost and 0.0.0.0 URLs cannot be used by deployed overlays.' };
      }
      parsed = new URL(`${deployedOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`);
    }

    const knownOrigin = Object.values(appOrigins).includes(parsed.origin as (typeof appOrigins)[keyof typeof appOrigins]);
    if (knownOrigin && context.embed) parsed.searchParams.set('embed', '1');
    if (knownOrigin && context.tenantId) parsed.searchParams.set('tenant', context.tenantId);
    if (knownOrigin && context.scopes?.length) parsed.searchParams.set('scopes', [...new Set(context.scopes)].sort().join(','));
    return { title, url: parsed.toString(), valid: true, error: null };
  } catch {
    return { title, url: input, valid: false, error: 'Enter a complete https:// URL.' };
  }
}

export function normalizeAppSurface(title: string, value: string): NormalizedAppSurface {
  let url = String(value || '').trim();
  let nextTitle = String(title || '').trim();

  try {
    const parsed = new URL(url, 'https://spacemountain.live');
    if (parsed.hostname === 'spacemountain.live' && parsed.pathname.startsWith('/chat-tag/')) {
      url = `${appOrigins.chatTag}${parsed.pathname.slice('/chat-tag'.length)}${parsed.search}${parsed.hash}`;
    } else if (parsed.origin === appOrigins.streamweaver && parsed.pathname === '/login') {
      const next = parsed.searchParams.get('next');
      url = next && next.startsWith('/') && !next.startsWith('//')
        ? `${appOrigins.streamweaver}${next}`
        : appSurfaces.streamweaver.home;
    } else if (parsed.origin === appOrigins.streamweaver && parsed.pathname === '/tts-player') {
      const streams = parsed.searchParams.get('tenant') || parsed.searchParams.get('tenantId');
      url = appSurfaces.streamweaver.ttsMixer;
      if (streams) url += `?streams=${encodeURIComponent(streams)}`;
      nextTitle = 'All-Tenant TTS Studio';
    }
  } catch {}

  if (url === '/chat-tag/quackverse') url = appSurfaces.chatTag.quackverse;
  if (url === appSurfaces.streamweaver.ttsMixer) nextTitle = 'All-Tenant TTS Studio';
  return buildAppSurfaceUrl(url, nextTitle);
}

export function toolEmbedTarget(toolId: string): EmbeddedAppTarget | null {
  if (toolId === 'streamweaver') return canonicalEmbedPresets[0];
  if (toolId === 'chat-tag') return canonicalEmbedPresets[2];
  if (toolId === 'discord-hub') return canonicalEmbedPresets[4];
  if (toolId === 'hearmeout') return canonicalEmbedPresets[7];
  return null;
}
