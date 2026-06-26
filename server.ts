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
    appUrl: 'https://streamweaver-new.fly.dev',
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
    appUrl: 'https://discord-stream-hub-new.fly.dev',
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
    const { code, state } = req.query;
    // In production, exchange code for token server-side
    // For now, redirect to frontend with the code
    res.redirect(`/?auth_code=${code}${state ? `&state=${state}` : ''}`);
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

  app.get('/api/integrations/dsh/forum-forwarding', async (req, res) => {
    const sourceServerId = String(req.query.sourceServerId || '').trim();
    if (!sourceServerId) {
      return res.status(400).json({ error: 'sourceServerId is required' });
    }
    try {
      const url = `https://discord-stream-hub-new.fly.dev/api/settings/forwarding-forums?sourceServerId=${encodeURIComponent(sourceServerId)}`;
      const result = await fetchJsonFromApp(url);
      res.status(result.status).json(result.payload);
    } catch (err) {
      res.status(502).json({ error: 'Could not reach Discord Stream Hub forum forwarding settings' });
    }
  });

  app.post('/api/integrations/dsh/forum-forwarding', async (req, res) => {
    try {
      const result = await fetchJsonFromApp('https://discord-stream-hub-new.fly.dev/api/settings/forwarding-forums', {
        method: 'POST',
        body: JSON.stringify(req.body || {}),
      });
      res.status(result.status).json(result.payload);
    } catch (err) {
      res.status(502).json({ error: 'Could not save Discord Stream Hub forum forwarding settings' });
    }
  });

  app.delete('/api/integrations/dsh/forum-forwarding', async (req, res) => {
    try {
      const result = await fetchJsonFromApp('https://discord-stream-hub-new.fly.dev/api/settings/forwarding-forums', {
        method: 'DELETE',
        body: JSON.stringify(req.body || {}),
      });
      res.status(result.status).json(result.payload);
    } catch (err) {
      res.status(502).json({ error: 'Could not delete Discord Stream Hub forum forwarding settings' });
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
