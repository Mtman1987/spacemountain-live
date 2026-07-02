import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, LayoutGrid, Mail, MessageSquare, Headphones, Glasses, Users, 
  Settings, HelpCircle, Rocket, Play, Activity, CheckCircle2, Sliders, 
  Send, Plus, Trash2, ArrowRight, Heart, RefreshCw, Star, Compass, Volume2, Gamepad2, Eye, Layout 
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
} from './types';

// Importing high-fidelity sub components
import RocketDock from './components/RocketDock';
import CosmicHeader from './components/CosmicHeader';
import MainAppSuite from './components/MainAppSuite';
import SettingsPanel from './components/SettingsPanel';
import RightSidebar from './components/RightSidebar';
import Shop from './components/Shop';
import Arena from './components/Arena';

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

const dshDashboardUrl = 'https://discord-stream-hub-new.fly.dev/dashboard';
const dshCalendarUrl = 'https://discord-stream-hub-new.fly.dev/calendar';
const dshLeaderboardUrl = 'https://discord-stream-hub-new.fly.dev/leaderboard';
const streamweaverCommandsUrl = 'https://streamweaver-new.fly.dev/login?next=%2Fcommands';
const streamweaverCommunityUrl = 'https://streamweaver-new.fly.dev/login?next=%2Fcommunity';
const streamweaverIntegrationsUrl = 'https://streamweaver-new.fly.dev/login?next=%2Fintegrations';
const streamweaverWorkflowsUrl = 'https://streamweaver-new.fly.dev/login?next=%2Factive-commands';
const spmtBaseUrl = 'https://spmt.live';

function getStoredSpmtToken() {
  return localStorage.getItem('spmtToken') || localStorage.getItem('spmt_token') || '';
}

function storeSpmtSession(token: string, profile: UserProfile) {
  localStorage.setItem('spmtToken', token);
  localStorage.setItem('spmt_token', token);
  localStorage.setItem('spmtIdentity', JSON.stringify(profile));
}

function clearSpmtSession() {
  localStorage.removeItem('spmtToken');
  localStorage.removeItem('spmt_token');
  localStorage.removeItem('spmtIdentity');
}

function mapSpmtUserToProfile(user: any, previous?: UserProfile | null): UserProfile {
  return {
    id: user.id,
    displayName: user.displayName || user.display_name || user.username,
    username: user.username,
    handle: user.handle || `${user.username}@spmt.live`,
    recoveryEmail: user.email || null,
    role: 'Captain',
    status: 'Online',
    points: previous?.points || 0,
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

type EmbeddedAppTarget = {
  title: string;
  url: string;
  kind: 'app' | 'game' | 'overlay' | 'dashboard';
};

type EmbedSlot = EmbeddedAppTarget & {
  id: number;
  collapsed: boolean;
};

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

const defaultEmbedSlots: EmbedSlot[] = [
  { id: 1, title: 'ChatTag Overlay', url: 'https://chat-tag-new.fly.dev/overlay', kind: 'overlay', collapsed: true },
  { id: 2, title: 'Quackverse Game', url: '/chat-tag/quackverse', kind: 'game', collapsed: false },
  { id: 3, title: 'DSH Dashboard', url: dshDashboardUrl, kind: 'dashboard', collapsed: true },
];

const embedPresets: EmbeddedAppTarget[] = [
  { title: 'Quackverse Game', url: '/chat-tag/quackverse', kind: 'game' },
  { title: 'ChatTag Overlay', url: 'https://chat-tag-new.fly.dev/overlay', kind: 'overlay' },
  { title: 'ChatTag Home', url: 'https://chat-tag-new.fly.dev', kind: 'app' },
  { title: 'StreamWeaver Commands', url: streamweaverCommandsUrl, kind: 'app' },
  { title: 'StreamWeaver Flows', url: streamweaverCommunityUrl, kind: 'app' },
  { title: 'StreamWeaver Integrations', url: streamweaverIntegrationsUrl, kind: 'app' },
  { title: 'DSH Dashboard', url: dshDashboardUrl, kind: 'dashboard' },
  { title: 'DSH Calendar', url: dshCalendarUrl, kind: 'dashboard' },
  { title: 'DSH Leaderboard', url: dshLeaderboardUrl, kind: 'dashboard' },
  { title: 'HearMeOut Rooms', url: 'https://hearmeout-main.fly.dev', kind: 'app' },
];

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
  // Navigation & Interactive Tabs
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/settings') return 'settings';
      if (path === '/shop') return 'shop';
      if (path === '/arena') return 'arena';
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
    const pathMap: Record<string, string> = {
      'dashboard': '/', 'settings': '/settings', 'shop': '/shop', 'arena': '/arena',
      'apps': '/apps', 'inbox': '/inbox', 'forums': '/forums',
      'rooms': '/rooms', 'mtnview': '/mtnview', 'builder': '/builder',
      'crew': '/crew', 'help': '/help',
    };
    const nextPath = pathMap[activeTab] || '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ activeTab }, '', nextPath);
    }
  }, [activeTab]);

  // Fetch points from DSH on every tab change
  useEffect(() => {
    const cachedUser = localStorage.getItem('spmtIdentity');
    if (!cachedUser) return;
    try {
      const user = JSON.parse(cachedUser);
      if (!user.username) return;
      fetch(`https://spmt.live/api/user/lookup?username=${encodeURIComponent(user.username)}`)
        .then(r => r.ok ? r.json() : null)
        .then(spmtUser => {
          if (!spmtUser?.discord_id) return;
          return fetch('https://discord-stream-hub-new.fly.dev/api/points/balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 1234' },
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
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const routeMap: Record<string, string> = {
        '/': 'dashboard', '/settings': 'settings', '/shop': 'shop', '/arena': 'arena',
        '/apps': 'apps', '/inbox': 'inbox', '/forums': 'forums',
        '/rooms': 'rooms', '/mtnview': 'mtnview', '/builder': 'builder',
        '/crew': 'crew', '/help': 'help',
      };
      setActiveTab(routeMap[path] || 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Identity States - null until signed in via spmt.live
  const [identity, setIdentity] = useState<UserProfile | null>(null);

  // User Preferences / Appearance states matching the customizable customizer exactly
  const [preferences, setPreferences] = useState<UserPreferences>({
    userId: 'u_novastar',
    theme: 'solar-flare',
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
    pushToTalk: true
  });

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
    if (!apps.length) return localTools;
    const appMap = new Map(apps.map((app) => [normalizeSpmtAppId(String(app.id)), app]));
    const merged = localTools.map((tool) => {
      const app = appMap.get(tool.id);
      if (!app) return tool;
      return {
        ...tool,
        appUrl: app.url || tool.appUrl,
        authUrl: app.authUrl || tool.authUrl || app.url || tool.appUrl,
        installed: app.installed,
        enabled: app.enabled,
        permissions: app.permissions,
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
        appUrl: app.url,
        authUrl: app.authUrl || app.url,
        healthUrl: null,
        installed: app.installed,
        enabled: app.enabled,
        permissions: app.permissions,
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

    const refreshResponse = await fetch(`${spmtBaseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    const response = refreshResponse.ok
      ? refreshResponse
      : await fetch(`${spmtBaseUrl}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });

    if (!response.ok) {
      clearSpmtSession();
      setIdentity(null);
      return null;
    }

    const data = await response.json();
    const profile = mapSpmtUserToProfile(data.user, identity);
    const nextToken = data.token || token;
    storeSpmtSession(nextToken, profile);
    setIdentity(profile);
    const apps = Array.isArray(data?.apps) ? data.apps : await refreshSpmtApps(nextToken);
    setSpmtApps(apps);
    setTools((current) => mergeSpmtAppsIntoTools(current, apps));
    return profile;
  }, [identity, mergeSpmtAppsIntoTools, refreshSpmtApps]);

  // SPMT internal messages are tenant-scoped and stored by this SpaceMountain app.
  const [mails, setMails] = useState<any[]>([]);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [commlinkNotifications, setCommlinkNotifications] = useState<CommlinkNotification[]>([]);

  const getSpmtHandle = () => {
    if (identity?.username) return identity.username;

    try {
      const cached = JSON.parse(localStorage.getItem('spmtIdentity') || 'null');
      if (cached?.username) return cached.username;
    } catch {
      // Fall through to the shared app inbox.
    }

    return 'spmtmessaging';
  };

  const refreshSpmtInbox = async () => {
    const token = getStoredSpmtToken();
    if (token) {
      const [conversationResponse, notificationResponse] = await Promise.all([
        fetch(`${spmtBaseUrl}/api/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
        fetch(`${spmtBaseUrl}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
      ]);
      const conversationData = conversationResponse.ok ? await conversationResponse.json() : { conversations: [] };
      const notificationData = notificationResponse.ok ? await notificationResponse.json() : { notifications: [] };
      const conversations = Array.isArray(conversationData?.conversations) ? conversationData.conversations : [];
      const nextNotifications = Array.isArray(notificationData?.notifications) ? notificationData.notifications : [];

      setCommlinkNotifications(nextNotifications);
      setMails(conversations.map((conversation: any) => ({
        id: conversation.id,
        folder: 'commlink',
        from: conversation.type === 'group' ? 'Group conversation' : 'Direct conversation',
        to: identity?.handle || identity?.username || '@spmt.live',
        subject: conversation.title || 'Commlink thread',
        preview: `${conversation.last_message || ''}`.slice(0, 70),
        body: conversation.last_message || 'No messages yet.',
        time: new Date(conversation.updated_at || conversation.created_at || Date.now()).toLocaleString(),
        tag: Number(conversation.unread_count || 0) > 0 ? `${conversation.unread_count} unread` : conversation.type || 'SPMT',
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
      from: `@${m.fromHandle || m.fromUser || 'spmtmessaging'}`,
      to: `@${m.toHandle || m.toUser || handle}`,
      subject: m.subject || 'No subject',
      preview: `${m.body || ''}`.slice(0, 70),
      body: m.body,
      time: new Date(m.createdAt || m.created_at || Date.now()).toLocaleString(),
      tag: m.fromType === 'bot' ? 'AI Bot' : m.toType === 'app' ? 'App' : 'SPMT',
    })));
  };

  // Forums Threads state - fetched from spmt.live
  const [forumThreads, setForumThreads] = useState<any[]>([]);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadCategory, setNewThreadCategory] = useState('Technical Support');
  const [newThreadBody, setNewThreadBody] = useState('');
  const [isCreatingThread, setIsCreatingThread] = useState(false);
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
  const [embedSlots, setEmbedSlots] = useState<EmbedSlot[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('spmtEmbedSlots') || 'null');
      if (Array.isArray(saved) && saved.length === 3) {
        return saved.map((slot, index) => ({
          ...defaultEmbedSlots[index],
          ...slot,
          id: index + 1,
        }));
      }
    } catch {}
    return defaultEmbedSlots;
  });
  const [activeEmbedSlot, setActiveEmbedSlot] = useState(2);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notify = (title: string, body: string) => {
    setNotifications((items) => [{ id: Date.now(), title, body, createdAt: new Date().toISOString() }, ...items].slice(0, 8));
  };
  const openEmbeddedApp = (
    title: string,
    url: string,
    kind: EmbeddedAppTarget['kind'] = 'app',
    slotId = activeEmbedSlot
  ) => {
    setEmbedSlots((slots) => slots.map((slot) => (
      slot.id === slotId ? { ...slot, title, url, kind, collapsed: false } : slot
    )));
    setActiveEmbedSlot(slotId);
    notify('Embed slot updated', `Slot ${slotId}: ${title}`);
  };
  const updateEmbedSlot = (slotId: number, patch: Partial<EmbedSlot>) => {
    setEmbedSlots((slots) => slots.map((slot) => slot.id === slotId ? { ...slot, ...patch } : slot));
  };
  const sendEmbeddedAuth = React.useCallback((frame: HTMLIFrameElement | null) => {
    if (!frame?.contentWindow) return;
    const token = getStoredSpmtToken();
    const storedIdentity = window.localStorage.getItem('spmtIdentity');
    let profile: UserProfile | null = identity;

    if (!profile && storedIdentity) {
      try {
        profile = JSON.parse(storedIdentity) as UserProfile;
      } catch {
        profile = null;
      }
    }

    if (!token && !profile) return;

    const targetOrigin = (() => {
      try {
        return new URL(frame.getAttribute('src') || window.location.href, window.location.origin).origin;
      } catch {
        return '*';
      }
    })();

    frame.contentWindow.postMessage({
      type: 'SPACEMOUNTAIN_AUTH',
      source: 'spacemountain.live',
      token,
      profile,
    }, targetOrigin);
  }, [identity]);

  useEffect(() => {
    localStorage.setItem('spmtEmbedSlots', JSON.stringify(embedSlots));
  }, [embedSlots]);

  useEffect(() => {
    function handleEmbeddedAuthRequest(event: MessageEvent) {
      if (event.data?.type !== 'SPACEMOUNTAIN_AUTH_REQUEST') return;
      const frame = Array.from(document.querySelectorAll<HTMLIFrameElement>('[data-embed-slot-frame]'))
        .find((item) => item.contentWindow === event.source);
      sendEmbeddedAuth(frame || null);
    }

    window.addEventListener('message', handleEmbeddedAuthRequest);
    return () => window.removeEventListener('message', handleEmbeddedAuthRequest);
  }, [sendEmbeddedAuth]);
  const [shoutoutFeed, setShoutoutFeed] = useState<CommunityShoutoutFeed | null>(null);
  const [shoutoutsLoading, setShoutoutsLoading] = useState(false);
  const [quackverseState, setQuackverseState] = useState<QuackverseSummary | null>(null);
  const [quackverseLoading, setQuackverseLoading] = useState(false);

  // MountainView QR HUD Seed state
  const [qrHUDSeed, setQrHUDSeed] = useState('https://spacemountain.live/invite/novastar');

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

  // Initialize: Check auth status and fetch data
  useEffect(() => {
    // Check for OAuth callback code in URL
    const params = new URLSearchParams(window.location.search);
    const authCode = params.get('auth_code');
    if (authCode) {
      localStorage.setItem('spmtToken', authCode);
      localStorage.setItem('spmt_token', authCode);
      refreshSpmtIdentity(authCode)
        .finally(() => window.history.replaceState({}, '', '/'));
    }

    // 1. Fetch domain branding
    fetch('/api/branding')
      .then(res => res.json())
      .then((data: BrandingConfig) => {
        setBranding(data);
      })
      .catch(err => console.error('Branding fetch failed:', err));

    // 2. Fetch live app registry/tools
    fetch('/api/tools')
      .then(res => res.json())
      .then((data: CommunityTool[]) => {
        setTools(mergeSpmtAppsIntoTools(data, spmtApps));
      })
      .catch(err => console.error('Tools fetch failed:', err));

    refreshSpmtApps().catch(() => {});

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
      fetch('https://spmt.live/api/forum/threads')
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

    // Restore local user session if available
    const cachedUser = localStorage.getItem('spmtIdentity');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setIdentity(parsed);
      } catch (e) {
        // No session
      }
    }
  }, []);

  // Update preferences local handler
  const handleUpdatePreferences = (updated: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const next = { ...prev, ...updated };
      
      // If user is registered in database, we can dispatch updates to `/api/user/:id/preference`
      if (identity && identity.id !== 'u_novastar') {
        fetch(`/api/user/${identity.id}/preference`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next)
        }).catch(err => console.warn('Preference sync to SQLite bypassed:', err));
      }
      return next;
    });
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
    const cachedUser = localStorage.getItem('spmtIdentity');
    if (cachedUser) {
      try {
        const user = JSON.parse(cachedUser);
        const lookup = await fetch(`https://spmt.live/api/user/lookup?username=${encodeURIComponent(user.username)}`);
        if (lookup.ok) {
          const spmtUser = await lookup.json();
          if (spmtUser?.discord_id) {
            await fetch('https://discord-stream-hub-new.fly.dev/api/points/add', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer 1234' },
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
    const cachedUser = localStorage.getItem('spmtIdentity');
    if (!cachedUser || amount <= 0) return false;

    try {
      const user = JSON.parse(cachedUser);
      if (!user.username) return false;

      const lookup = await fetch(`https://spmt.live/api/user/lookup?username=${encodeURIComponent(user.username)}`);
      if (!lookup.ok) return false;
      const spmtUser = await lookup.json();
      if (!spmtUser?.discord_id) return false;

      const balanceResponse = await fetch('https://discord-stream-hub-new.fly.dev/api/points/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer 1234' },
        body: JSON.stringify({ userId: spmtUser.discord_id, username: user.username, displayName: user.displayName }),
      });
      if (!balanceResponse.ok) return false;
      const balanceData = await balanceResponse.json();
      const currentPoints = Number(balanceData?.points || 0);
      if (currentPoints < amount) return false;

      const nextPoints = currentPoints - amount;
      const setResponse = await fetch('https://discord-stream-hub-new.fly.dev/api/points/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer 1234' },
        body: JSON.stringify({
          userId: spmtUser.discord_id,
          username: user.username,
          displayName: user.displayName || user.username,
          points: nextPoints,
        }),
      });
      if (!setResponse.ok) return false;

      setIdentity(prev => prev ? { ...prev, points: nextPoints } : prev);
      localStorage.setItem('spmtIdentity', JSON.stringify({ ...user, points: nextPoints }));
      return true;
    } catch (err) {
      console.warn('Discord Stream Hub points spend failed', err);
      return false;
    }
  };

  // Send a tenant-scoped SPMT internal message.
  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeBody) return;

    try {
      const token = getStoredSpmtToken();
      if (token) {
        const res = await fetch(`${spmtBaseUrl}/api/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          credentials: 'include',
          body: JSON.stringify({
            to: composeTo.replace(/^@/, '').replace(/@spmt\.live$/i, ''),
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
        setIsComposing(false);
        setComposeTo('');
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
          to: composeTo.replace(/^@/, '').replace(/@spmt\.(live|messaging)$/i, ''),
          subject: composeSubject,
          body: composeBody,
          metadata: { source: 'spacemountain.inbox' },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsComposing(false);
        setComposeTo('');
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

  // Create a new Forums Thread via spmt.live
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle || !newThreadBody) return;

    const spmtToken = getStoredSpmtToken();
    if (!spmtToken) { alert('Please sign in first'); return; }

    try {
      const res = await fetch('https://spmt.live/api/forum/threads', {
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

  // Define visual styling maps according to active theme preset
  const themeStyles = {
    'solar-flare': {
      name: 'Solar Flare',
      glow: 'from-orange-500/10 via-red-500/5 to-transparent',
      glowHex: '#F97316',
      ambientBg: 'bg-radial-gradient(circle_at_center,_rgba(249,115,22,0.15)_0%,_rgba(0,0,0,0)_70%)',
      cardBorder: 'border-orange-500/20 hover:border-orange-500/40',
      activeBorder: 'border-orange-500',
      textAccent: 'text-amber-400',
      titleGrad: 'from-orange-400 via-amber-300 to-red-400',
      glowingBorder: 'rgba(249, 115, 22, 0.45)',
      orbAccent: '🌅'
    },
    'nebula-purple': {
      name: 'Nebula Purple',
      glow: 'from-fuchsia-500/10 via-purple-500/5 to-transparent',
      glowHex: '#A855F7',
      ambientBg: 'bg-radial-gradient(circle_at_center,_rgba(168,85,247,0.15)_0%,_rgba(0,0,0,0)_70%)',
      cardBorder: 'border-purple-500/20 hover:border-purple-500/40',
      activeBorder: 'border-purple-500',
      textAccent: 'text-fuchsia-400',
      titleGrad: 'from-fuchsia-400 via-purple-300 to-indigo-400',
      glowingBorder: 'rgba(168, 85, 247, 0.45)',
      orbAccent: '🌌'
    },
    'oceanic-blue': {
      name: 'Oceanic Blue',
      glow: 'from-blue-500/10 via-cyan-500/5 to-transparent',
      glowHex: '#3B82F6',
      ambientBg: 'bg-radial-gradient(circle_at_center,_rgba(59,130,246,0.15)_0%,_rgba(0,0,0,0)_70%)',
      cardBorder: 'border-blue-500/20 hover:border-blue-500/40',
      activeBorder: 'border-blue-500',
      textAccent: 'text-cyan-400',
      titleGrad: 'from-blue-400 via-cyan-300 to-teal-400',
      glowingBorder: 'rgba(59, 130, 246, 0.45)',
      orbAccent: '🌊'
    },
    'aurora-green': {
      name: 'Aurora Green',
      glow: 'from-emerald-400/10 via-teal-500/5 to-transparent',
      glowHex: '#10B981',
      ambientBg: 'bg-radial-gradient(circle_at_center,_rgba(16,185,129,0.15)_0%,_rgba(0,0,0,0)_70%)',
      cardBorder: 'border-emerald-500/20 hover:border-emerald-500/40',
      activeBorder: 'border-emerald-500',
      textAccent: 'text-emerald-400',
      titleGrad: 'from-emerald-400 via-teal-300 to-green-400',
      glowingBorder: 'rgba(16, 185, 129, 0.45)',
      orbAccent: '🟢'
    }
  };

  const currentTheme = themeStyles[preferences.theme as keyof typeof themeStyles] || themeStyles['solar-flare'];
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

  return (
    <div 
      className={`min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden select-none font-sans ${preferences.uiAnimations ? '' : 'reduce-ui-motion'} ${preferences.smoothTransitions ? '' : 'no-smooth-transitions'}`}
      style={{
        ['--theme-glow-color' as any]: currentTheme.glowHex,
        ['--theme-glow-color-alpha' as any]: rgbaFromHex(currentTheme.glowHex, 0.24 * glowScale),
        ['--theme-glow-color-half' as any]: rgbaFromHex(currentTheme.glowHex, 0.5 * glowScale),
        ['--theme-glow-color-quarter' as any]: rgbaFromHex(currentTheme.glowHex, 0.18 * glowScale),
        ['--theme-surface-bg' as any]: `rgba(6, 8, 22, ${glassAlpha})`,
        ['--theme-surface-border' as any]: rgbaFromHex(currentTheme.glowHex, borderAlpha),
        ['--theme-surface-shadow' as any]: `0 10px ${Math.round(20 + preferences.glowIntensity * 0.35)}px -10px ${rgbaFromHex(currentTheme.glowHex, 0.35 * glowScale)}`,
        ['--theme-blur' as any]: `${preferences.blurStrength}px`,
        ['--theme-radius' as any]: radiusMap[preferences.cornerRadius],
        ['--chat-surface-bg' as any]: `rgba(6, 8, 22, ${Math.max(0.05, Math.min(0.9, preferences.chatTransparency / 100))})`,
      }}
    >
      
      {/* Dynamic Backgrounds & Space Gradients matching settings */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        
        {/* High-fidelity Cyber Space Deep Starfield Wallpaper */}
        <div 
          className="absolute inset-[-7vh_-5vw] bg-cover bg-left-bottom opacity-90 transition-transform duration-300"
          style={{ 
            backgroundImage: `linear-gradient(180deg, rgba(2, 6, 18, 0.08), rgba(2, 6, 18, 0.23)), url("/assets/space-background.png")`,
            filter: 'saturate(1.12) contrast(1.04) brightness(0.9)',
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
        className="flex-1 w-full max-w-7xl mx-auto px-6 pb-6 flex z-10 min-h-0 relative transition-all duration-500"
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
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h1 className="text-2xl md:text-4xl font-display font-black tracking-tight text-white">
                      SpaceMountain Live Stage
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                      Discord Stream Hub shoutouts land here first, then branch into ChatTag, Quackverse, rooms, forums, and the rest of the ecosystem.
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

                <button
                  id="arenaRocketTrigger"
                  type="button"
                  onClick={() => setActiveTab('arena')}
                  onDoubleClick={() => setActiveTab('arena')}
                  className="group relative min-h-[260px] overflow-hidden rounded-lg border border-white/10 bg-black/45 text-left shadow-[0_0_48px_rgba(0,0,0,0.45)]"
                  style={{
                    boxShadow: `0 0 42px ${rgbaFromHex(currentTheme.glowHex, 0.16)}`,
                  }}
                  title="Enter Rocket Arena"
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
                      alt="Rocket Arena launcher"
                      className="absolute right-[14%] top-10 h-20 w-20 object-contain drop-shadow-[0_0_24px_rgba(250,204,21,0.55)] md:h-28 md:w-28"
                      animate={{ y: [0, -10, 0], rotate: [10, 15, 10] }}
                      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
                      <Rocket size={15} style={{ color: currentTheme.glowHex }} />
                      Rocket Arena
                    </div>
                    <p className="mt-3 max-w-xl text-sm font-semibold text-zinc-300">
                      Battle arena entry point for inventory, XP, and rocket combat testing.
                    </p>
                  </div>
                </button>

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
                          onClick={() => openEmbeddedApp('ChatTag Quackverse', '/chat-tag/quackverse', 'game')}
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
                />

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
                  <button
                    onClick={() => setIsComposing(!isComposing)}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 font-mono text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Plus size={14} /> {isComposing ? 'VIEW INBOX' : 'COMPOSE MESSAGE'}
                  </button>
                </div>

                {isComposing ? (
                  <form onSubmit={handleSendMail} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">RECIPIENT HANDLE</label>
                        <input
                          type="text"
                          required
                          value={composeTo}
                          onChange={(e) => setComposeTo(e.target.value)}
                          placeholder="e.g. @spmtmessaging, streamweaver, athena"
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500/50"
                        />
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
                    {commlinkNotifications.length > 0 && (
                      <div className="mb-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-bold text-white">Notifications</h3>
                          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold text-cyan-200">
                            {commlinkNotifications.filter((item) => !item.read_at).length} unread
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {commlinkNotifications.slice(0, 4).map((item) => (
                            <div key={item.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-bold text-white">{item.title}</span>
                                <span className="shrink-0 text-[9px] uppercase tracking-wider text-zinc-500">{item.type}</span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{item.body}</p>
                              <p className="mt-2 text-[10px] text-zinc-500">{new Date(item.created_at).toLocaleString()}</p>
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
                    {mails.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-2xl border border-white/5 flex items-start justify-between gap-4"
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
                        </div>
                        <button
                          onClick={() => setMails(prev => prev.filter(x => x.id !== m.id))}
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
                    {forumThreads.map((t) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4"
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

            {/* TAB: MOUNTAINVIEW PAIRING HUD */}
            {activeTab === 'mtnview' && (
              <motion.div
                key="mtnview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-4 dynamic-cosmic-card rounded-3xl p-6 backdrop-blur-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-xl font-sans font-bold text-white flex items-center gap-2">
                      <Glasses className="text-cyan-400" size={20} />
                      MountainView AI Smart Glasses
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Pairing utilities for MountainView mobile and glasses flows</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                  
                  {/* Dynamic simulated camera frame overlay */}
                  <div className="rounded-2xl border border-cyan-500/20 bg-black/80 p-5 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[220px] shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                    {/* Simulated camera corners */}
                    <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                    <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                    <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

                    <span className="text-[9px] font-mono font-bold text-cyan-400 tracking-[0.2em] block mb-4">PAIRING TARGET</span>
                    
                    {/* Holographic glowing display representation */}
                    <div className="w-20 h-20 rounded-full border border-dashed border-cyan-500/30 flex items-center justify-center mb-4">
                      <span className="text-3xl text-cyan-400 animate-bounce">👓</span>
                    </div>

                    <span className="text-xs font-bold text-white">Target Anchor: SpaceMountain account</span>
                    <span className="text-[10px] text-zinc-500 mt-1 font-mono">Use the seed below for pairing links</span>
                  </div>

                  {/* Pairing utilities */}
                  <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-zinc-500 block mb-3">CUSTOM QR MACRO SEED</span>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                        Generate a pairing seed you can point your glasses camera at. This value is kept local until a device endpoint is connected.
                      </p>

                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="text-[9px] font-mono font-bold text-zinc-500 block mb-1">PAIRING SEED VALUE</label>
                          <input 
                            type="text" 
                            value={qrHUDSeed} 
                            onChange={(e) => setQrHUDSeed(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs font-mono text-cyan-400 font-bold">PAIRING SEED READY</span>
                      <button 
                        onClick={() => navigator.clipboard?.writeText(qrHUDSeed)}
                        className="px-4 py-1.5 rounded-xl bg-cyan-500 text-xs font-bold text-black font-sans hover:bg-cyan-400 transition-all"
                      >
                        COPY SEED
                      </button>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* TAB: SECURE WORKFLOW BUILDER */}
            {activeTab === 'builder' && (
              <motion.div
                key="builder"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-4 dynamic-cosmic-card rounded-3xl p-6 backdrop-blur-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-xl font-sans font-bold text-white flex items-center gap-2">
                      <Rocket className="text-orange-400" size={20} />
                      Integration Map
                    </h2>
                     <p className="text-xs text-zinc-400 mt-0.5">How the SpaceMountain apps hand work to each other</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['ChatTag -> DSH', 'ChatTag forwards Twitch/chat game events into Discord Stream Hub so points and leaderboards stay connected.', 'Open tracker', 'apps'],
                    ['DSH -> Website Forum', 'Discord Stream Hub sends forwarded channel activity into the website forum through the forum intake endpoint.', 'View forum', 'forums'],
                    ['HearMeOut -> Rooms', 'Open HearMeOut rooms can be joined from the hub, with overlay links for watch, music, and now-playing views.', 'Join rooms', 'rooms'],
                    ['MountainView -> StreamWeaver', 'Glasses voice/image commands route through StreamWeaver for bot commands, visual context, overlays, and automation.', 'Pair glasses', 'mtnview'],
                  ].map(([title, body, label, tab]) => (
                    <div key={title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                      <span className="text-xs font-bold text-white">{title}</span>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-2">{body}</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className="mt-4 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs font-bold text-orange-300 hover:bg-orange-500/15"
                      >
                        {label}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
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
                  username={identity?.username}
                  displayName={identity?.displayName}
                  onSpendPoints={identity ? handleSpendDshPoints : undefined}
                />
              </motion.div>
            )}

            {/* TAB: SETTINGS PANEL */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <SettingsPanel 
                  preferences={preferences} 
                  onUpdatePreferences={handleUpdatePreferences} 
                  onApplyThemePreset={handleApplyThemePreset}
                  accentColor={currentTheme.glowHex}
                />
              </motion.div>
            )}

            {/* TAB: SECURE HELP CENTER */}
            {activeTab === 'help' && (
              <motion.div
                key="help"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-4 dynamic-cosmic-card rounded-3xl p-6 backdrop-blur-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-xl font-sans font-bold text-white flex items-center gap-2">
                      <HelpCircle className="text-zinc-300" size={20} />
                      SpaceMountain Help & System Status
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Detailed ecosystem documentation</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-2">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-xs font-bold text-white block mb-1">What is SPACEMOUNTAIN.LIVE?</span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      It is a shared account and launch surface for the SpaceMountain app suite, including StreamWeaver, HearMeOut, Discord Stream Hub, ChatTag, MountainView, mail, and forums.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-xs font-bold text-white block mb-1">Where should I start?</span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Use Apps for launch links and ChatTag status, Rooms to join HearMeOut, Forums to read website posts forwarded from DSH, and Integration Map to see how the apps pass events between each other.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-xs font-bold text-white block mb-1">Live Hub Status</span>
                    <div className="grid grid-cols-2 gap-4 mt-2.5">
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] flex items-center justify-between">
                        <span>ONLINE APPS:</span>
                        <span className="font-extrabold">{stats.onlineApps}/{stats.checkedApps}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] flex items-center justify-between">
                        <span>JOINABLE ROOMS:</span>
                        <span className="font-extrabold">{hearmeoutRooms.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
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
                  <div className="xl:col-span-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">Embed control dashboard</h3>
                        <p className="text-xs text-zinc-500 mt-1">Choose what lives in each persistent footer slot.</p>
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

      {/* Persistent app embed slots */}
      <footer 
        className="w-full border-t text-[10px] font-mono relative z-20 bg-black/35 transition-all duration-1000 px-6 py-4"
        style={{ 
          borderColor: `${currentTheme.glowHex}1a`,
          color: `${currentTheme.glowHex}88`
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center justify-center gap-2">
              <img
                src="/assets/astronaut-avatar.jpg"
                alt="SpaceMountain account"
                className="w-5 h-5 rounded-full object-cover border border-white/10"
                referrerPolicy="no-referrer"
              />
              <span>One login for the SpaceMountain app hub • persistent app slots</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {notifications.slice(0, 3).map((item) => (
                <span key={item.id} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] text-zinc-300">
                  {item.title}: {item.body}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {embedSlots.map((slot) => (
              <div key={slot.id} className={`overflow-hidden rounded-2xl border bg-black/45 ${activeEmbedSlot === slot.id ? 'border-cyan-400/45' : 'border-white/10'}`}>
                <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setActiveEmbedSlot(slot.id)}
                    className="min-w-0 text-left"
                    title={`Use slot ${slot.id} for new embeds`}
                  >
                    <span className="block truncate text-[10px] font-black text-white">Slot {slot.id}: {slot.title}</span>
                    <span className="block truncate text-[8px] uppercase tracking-wider text-zinc-500">{slot.kind}</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <a href={slot.url} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-cyan-300 no-underline">Pop out</a>
                    <button
                      type="button"
                      onClick={() => updateEmbedSlot(slot.id, { collapsed: !slot.collapsed })}
                      className="text-[9px] font-bold text-zinc-400 hover:text-white"
                    >
                      {slot.collapsed ? 'Show' : 'Hide'}
                    </button>
                  </div>
                </div>
                {!slot.collapsed && (
                  <iframe
                    key={`${slot.id}:${slot.url}`}
                    src={slot.url}
                    title={slot.title}
                    data-embed-slot-frame={slot.id}
                    onLoad={(event) => sendEmbeddedAuth(event.currentTarget)}
                    className="h-[360px] w-full bg-black"
                    allow="autoplay; microphone; camera; fullscreen; clipboard-write"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </footer>

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
      />

    </div>
  );
}

interface AppRocketLogicProps {
  rocketFlying: boolean;
  setRocketFlying: (flying: boolean) => void;
  rocketStateRef: React.MutableRefObject<any>;
}

function AppRocketLogic({ rocketFlying, setRocketFlying, rocketStateRef }: AppRocketLogicProps) {
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
        const rx = r.left + r.width / 2;
        const ry = r.top + r.height / 2;
        const tx = t.left + t.width / 2;
        const ty = t.top + t.height / 2;
        if (Math.hypot(rx - tx, ry - ty) < 40) {
          window.location.href = '/arena';
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
  }, [rocketStateRef]);

  return null;
}
