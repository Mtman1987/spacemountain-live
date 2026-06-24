import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { db, sqlite } from './src/db/connection.js';
import { users, communityTools, userPreferences } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Seed default community tools if table is empty
  try {
    const existingToolsCount = sqlite.prepare('SELECT COUNT(*) as count FROM community_tools').get() as { count: number };
    if (existingToolsCount.count === 0) {
      console.log('Seeding initial community tools into SQLite database...');
      const defaultTools = [
        {
          id: 'chat-tag',
          name: 'Chat Tag',
          description: 'Cross-stream tag, Chat Bingo, active "It" tracking, points, leaderboard, and chat announcements.',
          badge: '🏷',
          miniLabel: 'Game System',
          statusText: 'IT: LunaVibes',
          statusType: 'live',
          route: '/chat-tag',
          pointsFlow: 184999,
        },
        {
          id: 'discord-hub',
          name: 'Discord Stream Hub',
          description: 'Live shoutouts, spotlight rotation, Discord bridge, community routing, and crew channels.',
          badge: '◇',
          miniLabel: 'Auth + Shoutout Bot',
          statusText: 'Bridge Online',
          statusType: 'default',
          route: '/discord-hub',
          pointsFlow: 45020,
        },
        {
          id: 'streamweaver',
          name: 'StreamWeaver',
          description: 'AI bots, TTS, overlays, commands, Pokémon battle systems, points, and OBS browser sources.',
          badge: '✦',
          miniLabel: 'Automation + Overlays',
          statusText: '8 overlays active',
          statusType: 'live',
          route: '/streamweaver',
          pointsFlow: 92842,
        },
        {
          id: 'hearmeout',
          name: 'HearMeOut',
          description: 'Voice rooms, music queues, watch parties, now playing, chat widgets, and room overlays.',
          badge: '🎧',
          miniLabel: 'Music + Movies',
          statusText: '4 rooms open',
          statusType: 'warn',
          route: '/hearmeout',
          pointsFlow: 12054,
        },
        {
          id: 'mountainview',
          name: 'MountainView Glasses',
          description: 'QR scanning, builder commands, camera capture, app control, image/video generation alerts.',
          badge: '⌐',
          miniLabel: 'AI Glasses Hub',
          statusText: 'New system online',
          statusType: 'pink',
          route: '/mountainview',
          pointsFlow: 7520,
        },
        {
          id: 'mail',
          name: 'spmt.live Mail',
          description: 'Person-to-person, app-to-person, forum, bot, and station notification internal inbox messaging.',
          badge: '✉',
          miniLabel: 'Internal Identity',
          statusText: 'Prototype Active',
          statusType: 'live',
          route: '/mail',
          pointsFlow: 890,
        },
        {
          id: 'forums',
          name: 'Community Forums',
          description: 'Threads, guides, crew announcements, dispute desks, applications, and general help channels.',
          badge: '☷',
          miniLabel: 'Discussions',
          statusText: '24 threads open',
          statusType: 'default',
          route: '/forums',
          pointsFlow: 14500,
        },
        {
          id: 'builder',
          name: 'Workflow Studio',
          description: 'Connect QR scans, voice prompts, bots, overlays, rooms, messages, Discord, Twitch, and AI actions.',
          badge: '▦',
          miniLabel: 'Builder',
          statusText: 'Mock UI Active',
          statusType: 'warn',
          route: '/builder',
          pointsFlow: 3200,
        }
      ];

      for (const tool of defaultTools) {
        db.insert(communityTools).values(tool).run();
      }
      console.log('Successfully seeded 8 community tools!');
    }
  } catch (err) {
    console.error('Error seeding community tools:', err);
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
    const spmtUrl = 'https://spmt.live/api/oauth/authorize';
    const params = new URLSearchParams({
      client_id: 'spacemountain-live',
      redirect_uri: `${req.protocol}://${req.get('host')}/auth/callback`,
      state: Math.random().toString(36).slice(2),
    });
    res.redirect(`${spmtUrl}?${params}`);
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
      const tools = db.select().from(communityTools).all();
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
  app.get('/api/stats', (req, res) => {
    try {
      const userCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const toolCount = sqlite.prepare('SELECT COUNT(*) as count FROM community_tools').get() as { count: number };
      const totalPoints = sqlite.prepare('SELECT SUM(points_flow) as sum FROM community_tools').get() as { sum: number };
      
      res.json({
        totalUsers: userCount.count,
        totalTools: toolCount.count,
        pointsAwarded: totalPoints.sum || 184999,
        scansCount: 1284,
        mediaJobsCount: 72,
      });
    } catch (err) {
      res.json({
        totalUsers: 0,
        totalTools: 8,
        pointsAwarded: 184999,
        scansCount: 1284,
        mediaJobsCount: 72,
      });
    }
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
