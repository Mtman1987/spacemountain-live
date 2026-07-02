import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { createServer as createViteServer } from 'vite';
import { db, sqlite } from './src/db/connection.js';
import { users, communityTools, userPreferences } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const PORT = Number(process.env.PORT || 3000);

type AppStatusType = 'live' | 'warn' | 'pink' | 'default';

type AppRegistryEntry = {
  id: string;
  name: string;
  description: string;
  badge: string;
  miniLabel: string;
  route: string;
  appUrl: string | null;
  healthUrl: string | null;
  statusText: string;
  statusType: AppStatusType;
};

const APP_REGISTRY: AppRegistryEntry[] = [
  {
    id: 'streamweaver',
    name: 'StreamWeaver',
    description: 'AI bots, TTS, overlays, commands, battle systems, points, and OBS browser sources.',
    badge: 'SW',
    miniLabel: 'Automation + Overlays',
    route: '/streamweaver',
    appUrl: 'https://streamweaver-new.fly.dev/login?next=%2Fcommands',
    healthUrl: 'https://streamweaver-new.fly.dev/api/health',
    statusText: 'Checking',
    statusType: 'default',
  },
  {
    id: 'hearmeout',
    name: 'HearMeOut',
    description: 'Voice rooms, music queues, watch parties, now playing, chat widgets, and room overlays.',
    badge: 'HO',
    miniLabel: 'Music + Movies',
    route: '/hearmeout',
    appUrl: 'https://hearmeout-main.fly.dev',
    healthUrl: 'https://hearmeout-main.fly.dev/api/health',
    statusText: 'Checking',
    statusType: 'default',
  },
  {
    id: 'discord-hub',
    name: 'Discord Stream Hub',
    description: 'Live shoutouts, spotlight rotation, Discord bridge, community routing, and crew channels.',
    badge: 'DSH',
    miniLabel: 'Auth + Shoutout Bot',
    route: '/discord-hub',
    appUrl: 'https://discord-stream-hub-new.fly.dev/dashboard',
    healthUrl: 'https://discord-stream-hub-new.fly.dev/api/health',
    statusText: 'Checking',
    statusType: 'default',
  },
  {
    id: 'chat-tag',
    name: 'Chat Tag',
    description: 'Cross-stream tag, Chat Bingo, active tag tracking, points, leaderboard, and chat announcements.',
    badge: 'CT',
    miniLabel: 'Game System',
    route: '/chat-tag',
    appUrl: 'https://chat-tag-new.fly.dev',
    healthUrl: 'https://chat-tag-new.fly.dev',
    statusText: 'Checking',
    statusType: 'default',
  },
  {
    id: 'mountainview',
    name: 'MountainView Glasses',
    description: 'QR scanning, voice commands, camera capture, app control, and StreamWeaver visual routing.',
    badge: 'MV',
    miniLabel: 'AI Glasses Hub',
    route: '/mtnview',
    appUrl: null,
    healthUrl: null,
    statusText: 'Local module',
    statusType: 'default',
  },
  {
    id: 'mail',
    name: 'spmt.live Mail',
    description: 'Person-to-person, app-to-person, forum, bot, and station notification inbox messaging.',
    badge: 'MAIL',
    miniLabel: 'Internal Identity',
    route: '/inbox',
    appUrl: 'https://spmt.live',
    healthUrl: 'https://spmt.live/api/health',
    statusText: 'Checking',
    statusType: 'default',
  },
  {
    id: 'forums',
    name: 'Community Forums',
    description: 'Threads, guides, crew announcements, applications, and general help channels.',
    badge: 'FORUM',
    miniLabel: 'Discussions',
    route: '/forums',
    appUrl: 'https://spmt.live',
    healthUrl: 'https://spmt.live/api/health',
    statusText: 'Checking',
    statusType: 'default',
  },
  {
    id: 'builder',
    name: 'Workflow Studio',
    description: 'Connect QR scans, voice prompts, bots, overlays, rooms, messages, Discord, Twitch, and AI actions.',
    badge: 'BUILD',
    miniLabel: 'Builder',
    route: '/builder',
    appUrl: null,
    healthUrl: null,
    statusText: 'Local module',
    statusType: 'default',
  },
];

async function probeUrl(url: string | null) {
  if (!url) {
    return { ok: true, status: 200, responseMs: null, checkedAt: new Date().toISOString() };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json,text/html;q=0.8,*/*;q=0.5' },
    });
    return {
      ok: response.ok,
      status: response.status,
      responseMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      ok: false,
      status: 0,
      responseMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonFromApp(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    return { ok: response.ok, status: response.status, payload };
  } finally {
    clearTimeout(timer);
  }
}

async function getHydratedTools() {
  const storedTools = db.select().from(communityTools).all();
  const storedById = new Map(storedTools.map((tool) => [tool.id, tool]));

  return Promise.all(APP_REGISTRY.map(async (app) => {
    const stored = storedById.get(app.id);
    const health = await probeUrl(app.healthUrl);
    const hasHealthCheck = Boolean(app.healthUrl);
    const statusType: AppStatusType = hasHealthCheck ? (health.ok ? 'live' : 'warn') : app.statusType;
    const statusText = hasHealthCheck && health.ok
      ? health.responseMs === null
        ? app.statusText
        : `Online ${health.responseMs}ms`
      : hasHealthCheck
        ? 'Unavailable'
        : app.statusText;

    return {
      ...app,
      pointsFlow: stored?.pointsFlow ?? 0,
      statusText,
      statusType,
      lastCheckedAt: health.checkedAt,
      responseMs: health.responseMs,
    };
  }));
}

function normalizeForwardedForumPost(body: any) {
  const sourceApp = String(body?.sourceApp || body?.source_app || 'discord-stream-hub');
  const sourceServerId = body?.sourceServerId || body?.source_server_id || body?.guildId || body?.serverId || null;
  const sourceChannelId = body?.sourceChannelId || body?.source_channel_id || body?.channelId || null;
  const sourceChannelName = body?.sourceChannelName || body?.source_channel_name || body?.channelName || null;
  const sourceMessageId = body?.sourceMessageId || body?.source_message_id || body?.messageId || null;
  const sourceMessageUrl = body?.sourceMessageUrl || body?.source_message_url || body?.messageUrl || body?.url || null;
  const authorId = body?.authorId || body?.author_id || body?.userId || null;
  const authorName = String(body?.authorName || body?.author_name || body?.userName || body?.username || body?.displayName || 'Discord');
  const normalizedMentionMap = (() => {
    if (body?.mentionedUsers && typeof body.mentionedUsers === 'object' && !Array.isArray(body.mentionedUsers)) {
      return body.mentionedUsers;
    }
    if (Array.isArray(body?.mentions)) {
      return body.mentions.reduce((acc: Record<string, string>, mention: any) => {
        const id = String(mention?.id || mention?.userId || '').trim();
        const name = String(mention?.displayName || mention?.global_name || mention?.username || mention?.name || id).trim();
        if (id) acc[id] = name;
        return acc;
      }, {});
    }
    return null;
  })();
  let rawContent = String(body?.content || body?.body || body?.message || '').trim();
  if (normalizedMentionMap) {
    for (const [id, name] of Object.entries(normalizedMentionMap)) {
      rawContent = rawContent.replace(new RegExp(`<@!?${id}>`, 'g'), `@${name}`);
    }
  }
  const title = String(
    body?.title ||
    (body?.guildName && sourceChannelName ? `${body.guildName} / #${sourceChannelName}` : '') ||
    `${sourceChannelName || 'Discord'} from ${authorName}`
  ).trim().slice(0, 180);
  const category = String(body?.category || 'Discord Forward').trim().slice(0, 80);
  const postedAt = String(body?.postedAt || body?.posted_at || body?.timestamp || new Date().toISOString());

  // Rich payload fields
  const embeds = Array.isArray(body?.embeds) ? JSON.stringify(body.embeds) : null;
  const richAttachments = [
    ...(Array.isArray(body?.attachments) ? body.attachments : []),
    ...(Array.isArray(body?.emotes)
      ? body.emotes.map((emote: any) => ({
        url: emote?.url,
        filename: emote?.name ? `${emote.name}.${emote.animated ? 'gif' : 'webp'}` : 'discord-emote',
        contentType: emote?.animated ? 'image/gif' : 'image/webp',
      }))
      : []),
  ].filter((attachment: any) => attachment?.url);
  const attachments = richAttachments.length > 0 ? JSON.stringify(richAttachments) : null;
  const mentionedUsers = normalizedMentionMap ? JSON.stringify(normalizedMentionMap) : null;

  return {
    id: String(body?.id || body?.forwardId || `ff_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    sourceApp,
    sourceServerId: sourceServerId ? String(sourceServerId) : null,
    sourceChannelId: sourceChannelId ? String(sourceChannelId) : null,
    sourceChannelName: sourceChannelName ? String(sourceChannelName) : null,
    sourceMessageId: sourceMessageId ? String(sourceMessageId) : null,
    sourceMessageUrl: sourceMessageUrl ? String(sourceMessageUrl) : null,
    authorId: authorId ? String(authorId) : null,
    authorName,
    title: title || 'Discord forwarded post',
    content: rawContent || (attachments || embeds ? 'Shared Discord media' : ''),
    category,
    postedAt,
    createdAt: new Date().toISOString(),
    embeds,
    attachments,
    mentionedUsers,
  };
}

function normalizeShoutoutCategory(body: any, groupName: string, isSpotlight: boolean) {
  const raw = String(body?.category || body?.bucket || groupName || '').trim().toLowerCase();
  if (isSpotlight || raw.includes('spotlight')) return 'spotlight';
  if (raw.includes('partner')) return 'partners';
  if (raw.includes('crew')) return 'crew';
  return 'mountaineers';
}

function normalizeTwitchImageUrl(value: any, width = 640, height = 360) {
  if (!value) return null;
  return String(value).replace(/\{width\}/g, String(width)).replace(/\{height\}/g, String(height));
}

function getTwitchAvatarFallback(twitchLogin: any) {
  if (!twitchLogin) return null;
  return `https://unavatar.io/twitch/${encodeURIComponent(String(twitchLogin))}`;
}

function normalizeVideoUrl(value: any) {
  if (!value) return null;
  const url = String(value).trim();
  if (!url) return null;
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url) ? url : null;
}

function normalizeCommunityShoutout(body: any) {
  const stream = body?.stream || body?.twitchStream || {};
  const user = body?.user || body?.twitchUser || {};
  const groupName = String(body?.groupName || body?.group || body?.role || body?.cohort || '').trim();
  const isSpotlight = Boolean(
    body?.isSpotlight ||
    body?.spotlight ||
    String(body?.footer || body?.label || '').toLowerCase().includes('spotlight') ||
    groupName.toLowerCase().includes('spotlight')
  );
  const twitchLogin = body?.twitchLogin || body?.twitch_login || body?.login || stream?.user_login || user?.login || null;
  const displayName = String(
    body?.displayName ||
    body?.display_name ||
    body?.username ||
    body?.name ||
    stream?.user_name ||
    user?.display_name ||
    twitchLogin ||
    'Live creator'
  ).trim();
  const now = new Date().toISOString();
  const updatedAt = String(body?.updatedAt || body?.updated_at || body?.lastUpdated || body?.timestamp || now);
  const streamUrl = body?.streamUrl || body?.stream_url || body?.url || (twitchLogin ? `https://twitch.tv/${twitchLogin}` : null);
  const thumbnail = body?.thumbnailUrl || body?.thumbnail_url || stream?.thumbnail_url || null;

  return {
    id: String(body?.id || body?.shoutoutId || body?.sourceMessageId || body?.messageId || `${twitchLogin || 'shoutout'}_${Date.parse(updatedAt) || Date.now()}`),
    category: normalizeShoutoutCategory(body, groupName, isSpotlight),
    groupName: groupName || null,
    twitchLogin: twitchLogin ? String(twitchLogin) : null,
    displayName: displayName || 'Live creator',
    title: body?.title || stream?.title || null,
    description: body?.description || body?.body || body?.message || null,
    gameName: body?.gameName || body?.game_name || stream?.game_name || null,
    viewerCount: Number(body?.viewerCount ?? body?.viewer_count ?? stream?.viewer_count ?? 0) || 0,
    streamUrl: streamUrl ? String(streamUrl) : null,
    avatarUrl: body?.avatarUrl || body?.avatar_url || body?.profileImageUrl || body?.profile_image_url || user?.profile_image_url || getTwitchAvatarFallback(twitchLogin),
    imageUrl: normalizeTwitchImageUrl(body?.imageUrl || body?.image_url || body?.thumbnailUrl || body?.thumbnail_url || thumbnail),
    videoUrl: normalizeVideoUrl(body?.videoUrl || body?.video_url || body?.mp4Url || body?.mp4_url || body?.clipVideoUrl || body?.clip_video_url || body?.clipUrl || body?.clip_url),
    bannerUrl: body?.bannerUrl || body?.banner_url || body?.gifUrl || body?.gif_url || null,
    sourceMessageUrl: body?.sourceMessageUrl || body?.source_message_url || body?.messageUrl || null,
    discordUserId: body?.discordUserId || body?.discord_user_id || body?.userId || null,
    serverId: body?.serverId || body?.server_id || body?.guildId || null,
    isLive: body?.isLive === undefined ? true : Boolean(body.isLive),
    isSpotlight,
    startedAt: body?.startedAt || body?.started_at || stream?.started_at || null,
    updatedAt,
    createdAt: now,
  };
}

function mapCommunityShoutoutRow(row: any) {
  return {
    id: row.id,
    category: row.category,
    groupName: row.groupName,
    twitchLogin: row.twitchLogin,
    displayName: row.displayName,
    title: row.title,
    description: row.description,
    gameName: row.gameName,
    viewerCount: row.viewerCount,
    streamUrl: row.streamUrl,
    avatarUrl: row.avatarUrl || getTwitchAvatarFallback(row.twitchLogin),
    imageUrl: normalizeTwitchImageUrl(row.imageUrl),
    videoUrl: normalizeVideoUrl(row.videoUrl),
    bannerUrl: row.bannerUrl,
    sourceMessageUrl: row.sourceMessageUrl,
    discordUserId: row.discordUserId,
    serverId: row.serverId,
    isLive: Boolean(row.isLive),
    isSpotlight: Boolean(row.isSpotlight),
    startedAt: row.startedAt,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

function normalizeMessageHandle(value: unknown, fallback = 'spmtmessaging') {
  const cleaned = String(value || fallback)
    .trim()
    .replace(/^@/, '')
    .replace(/@spmt\.(live|messaging)$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');

  return cleaned || fallback;
}

function normalizeMessageTenant(value: unknown) {
  return String(value || 'spmt')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '') || 'spmt';
}

function mapInternalMessageRow(row: any) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fromHandle: row.from_handle,
    fromUser: row.from_handle,
    fromType: row.from_type,
    toHandle: row.to_handle,
    toUser: row.to_handle,
    toType: row.to_type,
    subject: row.subject,
    body: row.body,
    status: row.status,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    readAt: row.read_at,
    createdAt: row.created_at,
    created_at: row.created_at,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Keep the local tool rows aligned with the real app registry.
  try {
    for (const registryTool of APP_REGISTRY) {
      const existing = db.select().from(communityTools).where(eq(communityTools.id, registryTool.id)).get();

      const row = {
        id: registryTool.id,
        name: registryTool.name,
        description: registryTool.description,
        badge: registryTool.badge,
        miniLabel: registryTool.miniLabel,
        statusText: registryTool.statusText,
        statusType: registryTool.statusType,
        route: registryTool.route,
        pointsFlow: existing?.pointsFlow ?? 0,
      };

      if (existing) {
        db.update(communityTools).set(row).where(eq(communityTools.id, registryTool.id)).run();
      } else {
        db.insert(communityTools).values(row).run();
      }
    }
    console.log('Community tool registry synchronized.');
  } catch (err) {
    console.error('Error synchronizing community tools:', err);
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'spacemountain-live', uptime: process.uptime() });
  });

  // OAuth2 callback - handles redirect from spmt.live after user authorizes
  app.get('/auth/callback', (req, res) => {
    const { code, token, state } = req.query;
    const sessionToken = token || code;
    res.redirect(`/?auth_code=${encodeURIComponent(String(sessionToken || ''))}${state ? `&state=${encodeURIComponent(String(state))}` : ''}`);
  });

  // OAuth2 login redirect - sends user to spmt.live to authenticate
  app.get('/auth/login', (req, res) => {
    const returnUrl = `/api/oauth/authorize?client_id=spacemountain-live&redirect_uri=${encodeURIComponent('https://spacemountain.live/auth/callback')}&state=${Math.random().toString(36).slice(2)}`;
    res.redirect(`https://spmt.live/?return=${encodeURIComponent(returnUrl)}`);
  });

  // API Route: Domain-specific branding
  app.get('/api/branding', (req, res) => {
    const host = req.get('host') || 'spacemountain.live';
    const isCyberNoir = host.includes('cyber') || host.includes('noir') || host.includes('localhost') || host.includes('ais-dev');
    
    // We can showcase two gorgeous branding schemes:
    // 1. SpaceMountain.live (Cosmic Space Theme)
    // 2. CyberNoir Hub (High-Tech Cyber Noir Neon Theme)
    if (isCyberNoir) {
      res.json({
        domain: host,
        title: 'CyberNoir Hub',
        tagline: 'digital shadows. neon pathways.',
        brandColor: '#06B6D4', // Cyan
        accentColor: '#A855F7', // Electric Purple
        themeMode: 'cyber-noir',
        heroTitle: 'Everything routes through CyberNoir Hub.',
        logoMark: '✦',
        backgroundGradient: 'radial-gradient(circle at 50% 40%, rgba(6, 182, 212, 0.08) 0%, transparent 60%)',
        accentPing: 'Cyan (#06B6D4)',
        glowColor: 'rgba(6, 182, 212, 0.35)',
      });
    } else {
      res.json({
        domain: host,
        title: 'spacemountain.live',
        tagline: 'one universe. endless connections.',
        brandColor: '#A855F7', // Electric Purple
        accentColor: '#06B6D4', // Cyan
        themeMode: 'cosmic-space',
        heroTitle: 'Everything routes through spacemountain.live.',
        logoMark: '🚀',
        backgroundGradient: 'radial-gradient(circle at 46% 34%, rgba(168, 85, 247, 0.08) 0%, transparent 60%)',
        accentPing: 'Electric Purple (#A855F7)',
        glowColor: 'rgba(168, 85, 247, 0.35)',
      });
    }
  });

  // API Route: Get all community tools
  app.get('/api/tools', async (req, res) => {
    try {
      const tools = await getHydratedTools();
      res.json(tools);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve community tools' });
    }
  });

  // API Route: Increment a tool's points flow (interactive actions)
  app.post('/api/tools/:id/points', async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    const increment = typeof amount === 'number' ? amount : 5;
    try {
      const tool = db.select().from(communityTools).where(eq(communityTools.id, id)).get();
      if (!tool) {
        return res.status(404).json({ error: 'Tool not found' });
      }
      const updatedPoints = (tool.pointsFlow || 0) + increment;
      db.update(communityTools)
        .set({ pointsFlow: updatedPoints })
        .where(eq(communityTools.id, id))
        .run();
      res.json({ success: true, id, pointsFlow: updatedPoints });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update points flow' });
    }
  });

  app.get('/api/messages/inbox', (req, res) => {
    const handle = normalizeMessageHandle(req.query.handle || req.headers['x-spmt-handle']);
    const tenantId = normalizeMessageTenant(req.query.tenantId || req.headers['x-spmt-tenant']);
    const limit = Math.min(Number(req.query.limit || 50) || 50, 100);

    const rows = sqlite.prepare(`
      SELECT * FROM internal_messages
      WHERE tenant_id = ?
        AND (to_handle = ? OR to_handle = 'spmtmessaging' OR to_type = 'app')
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `).all(tenantId, handle, limit);

    res.json(rows.map(mapInternalMessageRow));
  });

  app.get('/api/messages/outbox', (req, res) => {
    const handle = normalizeMessageHandle(req.query.handle || req.headers['x-spmt-handle']);
    const tenantId = normalizeMessageTenant(req.query.tenantId || req.headers['x-spmt-tenant']);
    const limit = Math.min(Number(req.query.limit || 50) || 50, 100);

    const rows = sqlite.prepare(`
      SELECT * FROM internal_messages
      WHERE tenant_id = ? AND from_handle = ?
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `).all(tenantId, handle, limit);

    res.json(rows.map(mapInternalMessageRow));
  });

  app.post('/api/messages', (req, res) => {
    const toHandle = normalizeMessageHandle(req.body?.to || req.body?.toHandle);
    const fromHandle = normalizeMessageHandle(req.body?.from || req.body?.fromHandle, 'spmtmessaging');
    const tenantId = normalizeMessageTenant(req.body?.tenantId);
    const subject = String(req.body?.subject || 'No subject').trim().slice(0, 160) || 'No subject';
    const body = String(req.body?.body || '').trim();

    if (!body) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      tenant_id: tenantId,
      from_handle: fromHandle,
      from_type: String(req.body?.fromType || 'user').slice(0, 24),
      to_handle: toHandle,
      to_type: String(req.body?.toType || (toHandle === 'spmtmessaging' ? 'app' : 'user')).slice(0, 24),
      subject,
      body,
      status: 'sent',
      metadata: req.body?.metadata ? JSON.stringify(req.body.metadata) : null,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    sqlite.prepare(`
      INSERT INTO internal_messages (
        id, tenant_id, from_handle, from_type, to_handle, to_type,
        subject, body, status, metadata, read_at, created_at
      )
      VALUES (
        @id, @tenant_id, @from_handle, @from_type, @to_handle, @to_type,
        @subject, @body, @status, @metadata, @read_at, @created_at
      )
    `).run(message);

    res.status(201).json({ message: mapInternalMessageRow(message) });
  });

  app.post('/api/messages/:id/read', (req, res) => {
    const id = String(req.params.id || '');
    const readAt = new Date().toISOString();
    const result = sqlite.prepare('UPDATE internal_messages SET status = ?, read_at = ? WHERE id = ?').run('read', readAt, id);

    if (!result.changes) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, id, readAt });
  });

  // API Route: Get or create user profile
  app.post('/api/user', async (req, res) => {
    const { username, displayName, recoveryEmail } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const cleanDisplayName = displayName ? displayName.trim() : 'Captain';

    try {
      // Check if user already exists
      let existingUser = db.select().from(users).where(eq(users.username, cleanUsername)).get();
      
      if (existingUser) {
        // Fetch preferences
        const pref = db.select().from(userPreferences).where(eq(userPreferences.userId, existingUser.id)).get();
        return res.json({ user: existingUser, preferences: pref });
      }

      // Create new user
      const userId = 'u_' + Math.random().toString(36).substr(2, 9);
      const newUser = {
        id: userId,
        displayName: cleanDisplayName,
        username: cleanUsername,
        recoveryEmail: recoveryEmail || null,
        role: 'Captain',
        status: 'Online',
        points: 100,
        avatarSpeaking: false,
        createdAt: new Date().toISOString(),
      };

      db.insert(users).values(newUser).run();

      const defaultPreferences = {
        userId,
        theme: 'Nebula Purple',
        glowIntensity: 75,
        starDensity: 70,
        shootingStars: true,
        sidebarCollapsed: false,
      };

      db.insert(userPreferences).values(defaultPreferences).run();

      res.status(201).json({ user: newUser, preferences: defaultPreferences });
    } catch (err) {
      console.error('Error creating user profile:', err);
      res.status(500).json({ error: 'Failed to create user profile' });
    }
  });

  // API Route: Update user preferences
  app.post('/api/user/:id/preference', async (req, res) => {
    const { id } = req.params;
    const { theme, glowIntensity, starDensity, shootingStars, sidebarCollapsed } = req.body;
    try {
      const existingUser = db.select().from(users).where(eq(users.id, id)).get();
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Ensure preference row exists
      const currentPref = db.select().from(userPreferences).where(eq(userPreferences.userId, id)).get();
      if (!currentPref) {
        db.insert(userPreferences).values({
          userId: id,
          theme: theme ?? 'Nebula Purple',
          glowIntensity: glowIntensity ?? 75,
          starDensity: starDensity ?? 70,
          shootingStars: shootingStars ?? true,
          sidebarCollapsed: sidebarCollapsed ?? false,
        }).run();
      } else {
        db.update(userPreferences)
          .set({
            theme: theme !== undefined ? theme : currentPref.theme,
            glowIntensity: glowIntensity !== undefined ? glowIntensity : currentPref.glowIntensity,
            starDensity: starDensity !== undefined ? starDensity : currentPref.starDensity,
            shootingStars: shootingStars !== undefined ? shootingStars : currentPref.shootingStars,
            sidebarCollapsed: sidebarCollapsed !== undefined ? sidebarCollapsed : currentPref.sidebarCollapsed,
          })
          .where(eq(userPreferences.userId, id))
          .run();
      }

      const updatedPref = db.select().from(userPreferences).where(eq(userPreferences.userId, id)).get();
      res.json({ success: true, preferences: updatedPref });
    } catch (err) {
      console.error('Error updating preferences:', err);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  // API Route: Get current stats / totals for counters
  app.get('/api/stats', async (req, res) => {
    try {
      const userCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const toolCount = sqlite.prepare('SELECT COUNT(*) as count FROM community_tools').get() as { count: number };
      const totalPoints = sqlite.prepare('SELECT SUM(points_flow) as sum FROM community_tools').get() as { sum: number };
      const tools = await getHydratedTools();
      const checkedApps = tools.filter((tool) => tool.healthUrl || tool.appUrl).length;
      const onlineApps = tools.filter((tool) => tool.healthUrl && tool.statusType === 'live').length;
      
      res.json({
        totalUsers: userCount.count,
        totalTools: toolCount.count,
        pointsAwarded: totalPoints.sum || 0,
        onlineApps,
        checkedApps,
        scansCount: 0,
        mediaJobsCount: 0,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve stats' });
    }
  });

  // ─── Integration Hub Routes ───
  app.get('/api/integrations/hearmeout/rooms', async (req, res) => {
    try {
      const result = await fetchJsonFromApp('https://hearmeout-main.fly.dev/api/voice/hearmeout');
      res.status(result.status).json(result.payload);
    } catch (err) {
      res.status(502).json({ error: 'Could not reach HearMeOut room list' });
    }
  });

  app.post('/api/integrations/hearmeout/voice', async (req, res) => {
    try {
      const result = await fetchJsonFromApp('https://hearmeout-main.fly.dev/api/voice/hearmeout', {
        method: 'POST',
        body: JSON.stringify(req.body || {}),
      });
      res.status(result.status).json(result.payload);
    } catch (err) {
      res.status(502).json({ error: 'Could not reach HearMeOut voice command route' });
    }
  });

  app.get('/api/integrations/chat-tag/state', async (req, res) => {
    try {
      const result = await fetchJsonFromApp('https://chat-tag-new.fly.dev/api/tag');
      res.status(result.status).json(result.payload);
    } catch (err) {
      res.status(502).json({ error: 'Could not reach ChatTag state' });
    }
  });

  app.get('/api/integrations/chat-tag/quackverse', async (req, res) => {
    try {
      const result = await fetchJsonFromApp('https://chat-tag-new.fly.dev/api/quackverse/state');
      res.status(result.status).json(result.payload);
    } catch (err) {
      res.status(502).json({ error: 'Could not reach Quackverse state' });
    }
  });

  app.get('/api/community/shoutouts', (req, res) => {
    try {
      const rows = sqlite.prepare(`
        SELECT
          id,
          category,
          group_name as groupName,
          twitch_login as twitchLogin,
          display_name as displayName,
          title,
          description,
          game_name as gameName,
          viewer_count as viewerCount,
          stream_url as streamUrl,
          avatar_url as avatarUrl,
          image_url as imageUrl,
          video_url as videoUrl,
          banner_url as bannerUrl,
          source_message_url as sourceMessageUrl,
          discord_user_id as discordUserId,
          server_id as serverId,
          is_live as isLive,
          is_spotlight as isSpotlight,
          started_at as startedAt,
          updated_at as updatedAt,
          created_at as createdAt
        FROM community_shoutouts
        ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC
        LIMIT 80
      `).all().map(mapCommunityShoutoutRow);

      const categoryCounts = rows.reduce((counts: Record<string, number>, row: any) => {
        counts[row.category] = (counts[row.category] || 0) + 1;
        return counts;
      }, {});
      const liveRows = rows.filter((row: any) => row.isLive);
      const spotlight = liveRows.filter((row: any) => row.isSpotlight || row.category === 'spotlight');
      const partners = liveRows.filter((row: any) => row.category === 'partners');
      const crew = liveRows.filter((row: any) => row.category === 'crew');
      const mountaineers = liveRows.filter((row: any) => !['spotlight', 'partners', 'crew'].includes(row.category));

      res.json({
        shoutouts: rows,
        spotlight: spotlight.slice(0, 3),
        partners: partners.slice(0, 8),
        crew: crew.slice(0, 8),
        mountaineers: mountaineers.slice(0, 16),
        analytics: {
          liveCount: rows.filter((row: any) => row.isLive).length,
          totalViewers: rows.reduce((sum: number, row: any) => sum + (Number(row.viewerCount) || 0), 0),
          lastUpdatedAt: rows[0]?.updatedAt || null,
          categoryCounts,
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Could not load community shoutouts' });
    }
  });

  app.post(['/api/community/shoutouts', '/api/integrations/dsh/shoutout'], (req, res) => {
    const expectedToken = process.env.COMMUNITY_SHOUTOUT_TOKEN;
    const bearerToken = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (expectedToken && bearerToken !== expectedToken) {
      return res.status(401).json({ error: 'Invalid community shoutout token' });
    }

    const shoutout = normalizeCommunityShoutout(req.body);
    if (!shoutout.displayName) {
      return res.status(400).json({ error: 'displayName or twitchLogin is required' });
    }

    try {
      sqlite.prepare(`
        INSERT OR REPLACE INTO community_shoutouts (
          id,
          category,
          group_name,
          twitch_login,
          display_name,
          title,
          description,
          game_name,
          viewer_count,
          stream_url,
          avatar_url,
          image_url,
          video_url,
          banner_url,
          source_message_url,
          discord_user_id,
          server_id,
          is_live,
          is_spotlight,
          started_at,
          updated_at,
          created_at
        ) VALUES (
          @id,
          @category,
          @groupName,
          @twitchLogin,
          @displayName,
          @title,
          @description,
          @gameName,
          @viewerCount,
          @streamUrl,
          @avatarUrl,
          @imageUrl,
          @videoUrl,
          @bannerUrl,
          @sourceMessageUrl,
          @discordUserId,
          @serverId,
          @isLive,
          @isSpotlight,
          @startedAt,
          @updatedAt,
          @createdAt
        )
      `).run({
        ...shoutout,
        isLive: shoutout.isLive ? 1 : 0,
        isSpotlight: shoutout.isSpotlight ? 1 : 0,
      });

      res.status(201).json({ success: true, shoutout });
    } catch (err) {
      res.status(500).json({ error: 'Could not store community shoutout' });
    }
  });

  app.get('/api/forum/forwarded', (req, res) => {
    try {
      const rows = sqlite.prepare(`
        SELECT
          id,
          source_app as sourceApp,
          source_server_id as sourceServerId,
          source_channel_id as sourceChannelId,
          source_channel_name as sourceChannelName,
          source_message_id as sourceMessageId,
          source_message_url as sourceMessageUrl,
          author_id as authorId,
          author_name as authorName,
          title,
          content,
          category,
          posted_at as postedAt,
          created_at as createdAt,
          embeds,
          attachments,
          mentioned_users as mentionedUsers
        FROM forwarded_forum_posts
        ORDER BY datetime(created_at) DESC
        LIMIT 100
      `).all().map((row: any) => ({
        ...row,
        embeds: row.embeds ? JSON.parse(row.embeds) : null,
        attachments: row.attachments ? JSON.parse(row.attachments) : null,
        mentionedUsers: row.mentionedUsers ? JSON.parse(row.mentionedUsers) : null,
      }));
      res.json({ posts: rows });
    } catch (err) {
      res.status(500).json({ error: 'Could not load forwarded forum posts' });
    }
  });

  app.post(['/api/forum/forward', '/api/integrations/dsh/forum-forward'], async (req, res) => {
    const expectedToken = process.env.FORUM_FORWARD_TOKEN;
    const bearerToken = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (expectedToken && bearerToken !== expectedToken) {
      return res.status(401).json({ error: 'Invalid forum forward token' });
    }

    const post = normalizeForwardedForumPost(req.body);
    if (!post.content) {
      return res.status(400).json({ error: 'content is required' });
    }

    try {
      sqlite.prepare(`
        INSERT OR REPLACE INTO forwarded_forum_posts (
          id,
          source_app,
          source_server_id,
          source_channel_id,
          source_channel_name,
          source_message_id,
          source_message_url,
          author_id,
          author_name,
          title,
          content,
          category,
          posted_at,
          created_at,
          embeds,
          attachments,
          mentioned_users
        ) VALUES (
          @id,
          @sourceApp,
          @sourceServerId,
          @sourceChannelId,
          @sourceChannelName,
          @sourceMessageId,
          @sourceMessageUrl,
          @authorId,
          @authorName,
          @title,
          @content,
          @category,
          @postedAt,
          @createdAt,
          @embeds,
          @attachments,
          @mentionedUsers
        )
      `).run(post);

      let mirroredToSpmt = false;
      const spmtForumToken = process.env.SPMT_FORUM_FORWARD_TOKEN;
      if (spmtForumToken) {
        try {
          const mirror = await fetchJsonFromApp('https://spmt.live/api/forum/threads', {
            method: 'POST',
            headers: { Authorization: `Bearer ${spmtForumToken}` },
            body: JSON.stringify({
              title: post.title,
              category: post.category,
              body: `${post.content}${post.sourceMessageUrl ? `\n\nSource: ${post.sourceMessageUrl}` : ''}`,
            }),
          });
          mirroredToSpmt = mirror.ok;
        } catch {
          mirroredToSpmt = false;
        }
      }

      res.status(201).json({ success: true, post, mirroredToSpmt });
    } catch (err) {
      res.status(500).json({ error: 'Could not store forwarded forum post' });
    }
  });

  // ─── App Proxy Routes ───
  // Proxy dashboard app routes to their Fly apps.
  const appProxyMap: Record<string, string> = {
    '/streamweaver': 'https://streamweaver-new.fly.dev',
    '/hearmeout': 'https://hearmeout-main.fly.dev',
    '/chat-tag': 'https://chat-tag-new.fly.dev',
    '/chattag': 'https://chat-tag-new.fly.dev',
    '/discord-hub': 'https://discord-stream-hub-new.fly.dev',
    '/discordstreamhub': 'https://discord-stream-hub-new.fly.dev',
  };

  Object.entries(appProxyMap).forEach(([route, target]) => {
    app.use(route, (req, res) => {
      const url = new URL(req.url || '/', target);
      const mod = url.protocol === 'https:' ? https : http;
      const proxyReq = mod.request(url.toString(), {
        method: req.method,
        headers: { ...req.headers, host: new URL(target).host },
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', () => res.status(502).json({ error: `Could not reach ${route}` }));
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        req.pipe(proxyReq);
      } else {
        proxyReq.end();
      }
    });
  });

  // ─── Shop: Get products ───
  app.get('/api/shop/products', (req, res) => {
    res.json([]);
  });

  // ─── Shop: Create PayPal order ───
  app.post('/api/shop/create-order', async (req, res) => {
    const { items } = req.body; // [{id, quantity}]
    if (!items || !items.length) return res.status(400).json({ error: 'No items' });

    const catalog: Record<string, number> = {
      'tee-cosmic': 29.99, 'hoodie-nebula': 54.99, 'sticker-pack': 12.99,
      'mug-station': 18.99, 'overlay-pack': 9.99, 'badge-set': 14.99,
    };

    const total = items.reduce((sum: number, item: any) => {
      return sum + (catalog[item.id] || 0) * (item.quantity || 1);
    }, 0);

    // Return order info for PayPal client-side buttons to use
    res.json({ orderId: `ORD-${Date.now()}`, total: total.toFixed(2), currency: 'USD' });
  });

  // ─── Shop: Capture PayPal order (webhook/confirmation) ───
  app.post('/api/shop/capture-order', (req, res) => {
    const { orderId, paypalOrderId, payerEmail } = req.body;
    // In production: verify with PayPal API that payment was captured
    console.log(`Order ${orderId} captured via PayPal (${paypalOrderId}) from ${payerEmail}`);
    res.json({ success: true, message: 'Order confirmed! Check your email for details.' });
  });

  // Vite Integration Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server middleware integrated into Express successfully.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static client files serving configuration loaded.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express custom server running on http://localhost:${PORT}`);
  });
}

startServer();
