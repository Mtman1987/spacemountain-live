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
  return shoutout?.bannerUrl || shoutout?.imageUrl || shoutout?.avatarUrl || '/assets/space-logo-main.png';
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
      <div
        className={`${compact ? 'h-24' : 'h-32'} bg-zinc-900 bg-cover bg-center`}
        style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.72)), url("${getShoutoutImage(shoutout)}")` }}
      />
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-white truncate">{shoutout.displayName}</p>
            <p className="text-[11px] text-zinc-400 truncate">{shoutout.gameName || shoutout.groupName || 'Live shoutout'}</p>
          </div>
          <span className="shrink-0 rounded-md bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300">
            {shoutout.isLive ? 'Live' : 'Seen'}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-xs text-zinc-300">{shoutout.title || shoutout.description || 'Discord Stream Hub generated this shoutout.'}</p>
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
          <span>{Number(shoutout.viewerCount || 0).toLocaleString()} viewers</span>
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
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTools: 0,
    pointsAwarded: 0,
    onlineApps: 0,
    checkedApps: 0,
    scansCount: 0,
    mediaJobsCount: 0,
  });

  // Secure Inbox messages state - fetched from spmt.live
  const [mails, setMails] = useState<any[]>([]);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  // Forums Threads state - fetched from spmt.live
  const [forumThreads, setForumThreads] = useState<any[]>([]);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadCategory, setNewThreadCategory] = useState('Technical Support');
  const [newThreadBody, setNewThreadBody] = useState('');
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [forwardedForumPosts, setForwardedForumPosts] = useState<any[]>([]);
  const [forwardedForumLoading, setForwardedForumLoading] = useState(false);

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
  const [embeddedAppUrl, setEmbeddedAppUrl] = useState<string | null>(null);
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
      // Exchange code for user info
      fetch('https://spmt.live/api/oauth/userinfo', {
        headers: { 'Authorization': `Bearer ${authCode}` },
        credentials: 'include',
      })
        .then(r => r.ok ? r.json() : null)
        .then(user => {
          if (user) {
            const profile: UserProfile = {
              id: user.id,
              displayName: user.display_name || user.username,
              username: user.username,
              recoveryEmail: user.email,
              role: 'Captain',
              status: 'Online',
              points: 0,
              avatarSpeaking: false,
              createdAt: user.created_at,
            };
            setIdentity(profile);
            localStorage.setItem('spmtIdentity', JSON.stringify(profile));
            localStorage.setItem('spmtToken', authCode);
            // Clean URL
            window.history.replaceState({}, '', '/');
          }
        })
        .catch(() => {});
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
        setTools(data);
      })
      .catch(err => console.error('Tools fetch failed:', err));

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

    // 4. Fetch inbox from spmt.live if logged in
    const spmtToken = localStorage.getItem('spmtToken');
    if (spmtToken) {
      // Points are fetched on every tab change (see below)

      fetch('https://spmt.live/api/messages/inbox', {
        headers: { 'Authorization': `Bearer ${spmtToken}` },
        credentials: 'include',
      })
        .then(r => r.ok ? r.json() : [])
        .then(messages => {
          setMails(messages.map((m: any) => ({
            id: m.id,
            folder: 'inbox',
            from: `${m.from_user}@spmt.live`,
            to: identity?.username ? `${identity.username}@spmt.live` : '',
            subject: m.subject || 'No subject',
            preview: m.body?.substring(0, 50) + '...',
            body: m.body,
            time: new Date(m.created_at).toLocaleString(),
            tag: 'Message',
          })));
        })
        .catch(() => {});

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

  // Send a Mail secure message via spmt.live
  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeBody) return;

    const spmtToken = localStorage.getItem('spmtToken');
    if (!spmtToken) { alert('Please sign in first'); return; }

    try {
      const res = await fetch('https://spmt.live/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${spmtToken}` },
        body: JSON.stringify({ to: composeTo.replace(/@spmt\.live$/, ''), subject: composeSubject, body: composeBody }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsComposing(false);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        alert('Message sent!');
      } else {
        alert(data.error || 'Failed to send');
      }
    } catch {
      alert('Failed to connect to spmt.live');
    }
  };

  // Create a new Forums Thread via spmt.live
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle || !newThreadBody) return;

    const spmtToken = localStorage.getItem('spmtToken');
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
  const sortedChatTagPlayers = [...chatTagPlayers].sort((a, b) => (b.score || b.points || b.tags || 0) - (a.score || a.points || a.tags || 0));
  const recentTags = Array.isArray(chatTagState?.history) ? chatTagState.history.slice(0, 4) : [];
  const spotlightShoutout = shoutoutFeed?.spotlight?.[0] || shoutoutFeed?.shoutouts?.[0] || null;
  const quackversePlayers = Array.isArray(quackverseState?.players)
    ? quackverseState.players
    : Array.isArray(quackverseState?.state?.players)
      ? quackverseState.state.players
      : [];
  const quackverseUpdatedAt = quackverseState?.updatedAt || quackverseState?.state?.updatedAt || quackverseState?.state?.lastUpdatedAt || null;

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

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
                  <section className="rounded-lg border border-white/10 bg-zinc-950/50 overflow-hidden">
                    <div
                      className="min-h-[360px] bg-cover bg-center p-5 md:p-7 flex flex-col justify-end"
                      style={{
                        backgroundImage: `linear-gradient(90deg, rgba(5,5,5,0.92), rgba(5,5,5,0.68), rgba(5,5,5,0.24)), url("${getShoutoutImage(spotlightShoutout)}")`,
                      }}
                    >
                      <div className="max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
                          <span className="rounded-md bg-amber-300 px-2 py-1 text-black">Community Spotlight</span>
                          <span className="rounded-md bg-white/10 px-2 py-1 text-zinc-200">
                            {spotlightShoutout ? formatShoutoutTime(spotlightShoutout.updatedAt) : 'Awaiting DSH'}
                          </span>
                        </div>
                        <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight text-white">
                          {spotlightShoutout?.displayName || 'Waiting for the next live creator'}
                        </h2>
                        <p className="mt-3 max-w-xl text-sm md:text-base leading-relaxed text-zinc-300">
                          {spotlightShoutout?.title || spotlightShoutout?.description || 'When Discord Stream Hub generates live Twitch shoutouts, the spotlight replaces the old app launcher here.'}
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          {spotlightShoutout?.streamUrl && (
                            <a
                              href={spotlightShoutout.streamUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-xs font-extrabold text-zinc-950"
                            >
                              <Play size={14} />
                              Watch Twitch
                            </a>
                          )}
                          <button
                            onClick={() => setActiveTab('forums')}
                            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                          >
                            Website Forum
                          </button>
                          <span className="text-xs text-zinc-400">
                            {spotlightShoutout ? `${Number(spotlightShoutout.viewerCount || 0).toLocaleString()} viewers` : 'POST /api/integrations/dsh/shoutout'}
                          </span>
                        </div>
                      </div>
                    </div>
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
                        {currentItPlayer?.displayName || currentItPlayer?.twitchUsername || currentItPlayer?.username || currentItPlayer?.name || chatTagState?.currentIt || 'No active tagger'}
                      </h3>
                      <p className="text-xs text-zinc-400">Who is it right now, plus top tracked players from ChatTag.</p>
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
                          onClick={() => setEmbeddedAppUrl('https://chat-tag-new.fly.dev/quackverse')}
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
                  <section className="rounded-lg border border-white/10 bg-zinc-950/45 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h2 className="text-lg font-black text-white">Partners</h2>
                      <span className="text-xs text-zinc-500">{shoutoutFeed?.partners?.length || 0} live</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(shoutoutFeed?.partners || []).slice(0, 4).map((shoutout) => <ShoutoutCard key={shoutout.id} shoutout={shoutout} compact />)}
                      {(!shoutoutFeed?.partners || shoutoutFeed.partners.length === 0) && <p className="text-sm text-zinc-500">No partner shoutouts received yet.</p>}
                    </div>
                  </section>

                  <section className="rounded-lg border border-white/10 bg-zinc-950/45 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h2 className="text-lg font-black text-white">Crew</h2>
                      <span className="text-xs text-zinc-500">{shoutoutFeed?.crew?.length || 0} live</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(shoutoutFeed?.crew || []).slice(0, 4).map((shoutout) => <ShoutoutCard key={shoutout.id} shoutout={shoutout} compact />)}
                      {(!shoutoutFeed?.crew || shoutoutFeed.crew.length === 0) && <p className="text-sm text-zinc-500">No crew shoutouts received yet.</p>}
                    </div>
                  </section>
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

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                      <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Current It</span>
                      <span className="block text-sm font-bold text-white mt-2">
                        {currentItPlayer?.displayName || currentItPlayer?.twitchUsername || currentItPlayer?.username || currentItPlayer?.name || chatTagState?.currentIt || 'No active tagger'}
                      </span>
                      <span className="block text-[10px] text-zinc-500 mt-1">{chatTagPlayers.length} tracked players</span>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                      <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Top Players</span>
                      <div className="flex flex-col gap-2 mt-2">
                        {sortedChatTagPlayers.slice(0, 3).map((player, index) => (
                          <div key={player.id || player.username || index} className="flex items-center justify-between text-xs">
                            <span className="text-zinc-300">{index + 1}. {player.displayName || player.twitchUsername || player.username || player.name || player.id}</span>
                            <span className="font-mono font-bold text-amber-300">{player.score || player.points || player.tags || 0}</span>
                          </div>
                        ))}
                        {sortedChatTagPlayers.length === 0 && <span className="text-xs text-zinc-500">No player list returned yet.</span>}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                      <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Chat Commands</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {['spmt join', 'spmt tag @user', 'spmt score', 'spmt rank', 'spmt discord name'].map((command) => (
                          <span key={command} className="px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-[10px] font-mono text-zinc-300">
                            {command}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-4">
                    <span className="text-xs font-bold text-white">Integration path</span>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      ChatTag sends game events to Discord Stream Hub for leaderboard points, while the hub keeps the live state visible here for players learning the commands.
                    </p>
                    {recentTags.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                        {recentTags.map((tag, index) => (
                          <div key={tag.id || index} className="text-[10px] font-mono text-zinc-400 bg-black/20 rounded-xl px-3 py-2">
                            {(tag.tagger || 'Someone')} tagged {(tag.target || tag.tagged || 'someone')}
                          </div>
                        ))}
                      </div>
                    )}
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
                    <a href="https://streamweaver-new.fly.dev" target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white no-underline">
                      Pop Out StreamWeaver
                    </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                    {[
                      ['Community Flows', 'Install shared flow packs', 'https://streamweaver-new.fly.dev/community'],
                      ['Commands', 'Learn and make commands', 'https://streamweaver-new.fly.dev/commands'],
                      ['Bot Integrations', 'Connect broadcaster, bot, and community bot', 'https://streamweaver-new.fly.dev/integrations'],
                      ['Workflows', 'Build and edit action flows', 'https://streamweaver-new.fly.dev/active-commands'],
                    ].map(([title, body, url]) => (
                      <div key={title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <span className="text-xs font-bold text-white">{title}</span>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{body}</p>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <button type="button" onClick={() => setEmbeddedAppUrl(url)} className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-300">
                            Embed
                          </button>
                          <a href={url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-xs font-bold text-zinc-300 text-center no-underline">
                            Pop Out
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  {embeddedAppUrl && (
                    <div className="rounded-2xl border border-cyan-500/20 bg-black/50 overflow-hidden mt-4">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <span className="text-xs font-bold text-white">Embedded app view</span>
                        <div className="flex items-center gap-2">
                          <a href={embeddedAppUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-cyan-300 no-underline">Pop out</a>
                          <button type="button" onClick={() => setEmbeddedAppUrl(null)} className="text-[10px] font-bold text-zinc-400 hover:text-white">Close</button>
                        </div>
                      </div>
                      <iframe
                        src={embeddedAppUrl}
                        title="Embedded SpaceMountain app"
                        className="w-full h-[620px] bg-black"
                        allow="autoplay; microphone; camera; fullscreen; clipboard-write"
                      />
                    </div>
                  )}
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
                      spmt.live Secure Inbox
                    </h2>
                    <p className="text-xs text-zinc-400 font-sans mt-0.5">Encrypted communications stream</p>
                  </div>
                  <button
                    onClick={() => setIsComposing(!isComposing)}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 font-mono text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Plus size={14} /> {isComposing ? 'VIEW INBOX' : 'COMPOSE TRANSMISSION'}
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
                          placeholder="e.g. athena@spmt.live"
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">SUBJECT MATTER</label>
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
                      <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">TRANSMISSION BODY</label>
                      <textarea
                        required
                        rows={5}
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                        placeholder="Type message here..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-orange-500 text-xs font-bold font-mono self-start flex items-center gap-1.5"
                    >
                      <Send size={14} /> SEND SECURE TRANSMISSION
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-2">
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
                      <span className="text-[10px] font-mono font-bold text-purple-300 uppercase">Forwarded posts</span>
                      <span className="block text-xs text-white mt-1">{forwardedForumPosts.length}</span>
                    </div>
                  </div>
                </div>

                {forwardedForumPosts.length > 0 && (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-white">Forwarded From DSH</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Newest first</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {forwardedForumPosts.map((post) => (
                        <div key={post.id} className="p-4 rounded-2xl border border-white/5" style={{ background: 'var(--chat-surface-bg)' }}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] font-mono tracking-wider text-purple-400 font-semibold">{post.category || 'Discord Forward'}</span>
                              <span className="text-xs font-bold text-white mt-0.5">{post.title}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {post.sourceChannelName || post.sourceChannelId || 'Discord channel'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed mt-2 whitespace-pre-wrap">{post.content}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] text-zinc-500 font-mono">
                            <span>By {post.authorName || 'Discord'}</span>
                            <span>{post.postedAt ? new Date(post.postedAt).toLocaleString() : ''}</span>
                            {post.sourceMessageUrl && (
                              <a href={post.sourceMessageUrl} target="_blank" rel="noreferrer" className="text-purple-300 hover:text-purple-200 no-underline">
                                Source message
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  {tools.filter((tool) => ['streamweaver', 'hearmeout', 'discord-hub', 'chat-tag', 'mountainview', 'forums'].includes(tool.id)).map((tool) => (
                    <div key={tool.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                      <div className="flex items-center gap-3 mb-4">
                        {preferences.showAvatars && (
                          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-lg">
                            {tool.badge.slice(0, 2)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">{tool.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{tool.appUrl || tool.route}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono pt-3 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            if (tool.id === 'hearmeout') setActiveTab('rooms');
                            else if (tool.id === 'discord-hub' || tool.id === 'forums') setActiveTab('forums');
                            else if (tool.id === 'chat-tag') setActiveTab('apps');
                            else if (tool.id === 'mountainview') setActiveTab('mtnview');
                            else window.open(tool.appUrl || tool.route, '_blank');
                          }}
                          className="text-zinc-300 hover:text-white"
                        >
                          Open
                        </button>
                        <span className={`font-bold ${tool.statusType === 'live' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          ● {tool.statusText}
                        </span>
                      </div>
                    </div>
                  ))}
                  {tools.length === 0 && (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-zinc-400">
                      Loading app registry...
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </main>

      {/* Embedded footer message */}
      <footer 
        className="w-full text-center py-5 border-t text-[10px] font-mono relative z-20 bg-black/10 transition-all duration-1000"
        style={{ 
          borderColor: `${currentTheme.glowHex}1a`,
          color: `${currentTheme.glowHex}88`
        }}
      >
        <span className="inline-flex items-center justify-center gap-2">
          <img
            src="/assets/astronaut-avatar.jpg"
            alt="SpaceMountain account"
            className="w-5 h-5 rounded-full object-cover border border-white/10"
            referrerPolicy="no-referrer"
          />
          <span>One login for the SpaceMountain app hub • Spmt.live</span>
        </span>
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
