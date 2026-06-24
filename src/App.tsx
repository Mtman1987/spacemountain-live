import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, LayoutGrid, Mail, MessageSquare, Headphones, Glasses, Users, 
  Settings, HelpCircle, Rocket, Play, Activity, CheckCircle2, Sliders, 
  Send, Plus, Trash2, ArrowRight, Heart, RefreshCw, Star, Compass, Volume2, Gamepad2, Eye, Layout 
} from 'lucide-react';
import { CommunityTool, BrandingConfig, UserProfile, UserPreferences } from './types';

// Importing high-fidelity sub components
import RocketDock from './components/RocketDock';
import CosmicHeader from './components/CosmicHeader';
import MainAppSuite from './components/MainAppSuite';
import SettingsPanel from './components/SettingsPanel';
import RightSidebar from './components/RightSidebar';

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

export default function App() {
  // Navigation & Interactive Tabs
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/settings') return 'settings';
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
    const nextPath = activeTab === 'settings' ? '/settings' : '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ activeTab }, '', nextPath);
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(window.location.pathname === '/settings' ? 'settings' : 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Identity States (Pre-initialized to NovaStar to match the user's uploaded image instantly!)
  const [identity, setIdentity] = useState<UserProfile | null>({
    id: 'u_novastar',
    displayName: 'NovaStar',
    username: 'novastar',
    recoveryEmail: 'novastar@spmt.live',
    role: 'Creator',
    status: 'Online',
    points: 12500,
    avatarSpeaking: false,
    createdAt: new Date().toISOString()
  });

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
  const [stats, setStats] = useState({
    totalUsers: 50420,
    totalTools: 8,
    pointsAwarded: 184999,
    scansCount: 1284,
    mediaJobsCount: 72,
  });

  // Secure Inbox messages state
  const [mails, setMails] = useState([
    { id: 'm1', folder: 'inbox', from: 'athena@spmt.live', to: 'novastar@spmt.live', subject: 'Welcome to your SpaceMountain Station', preview: 'Greetings Captain, your station mail is active and ready.', body: 'Welcome NovaStar! This visual layout mimics secure messaging. Feel free to draft, send, or remove mock messages.', time: 'Just now', tag: 'System' },
    { id: 'm2', folder: 'inbox', from: 'mountainview@spmt.live', to: 'novastar@spmt.live', subject: 'MountainView AI Glasses pairing complete', preview: 'QR engine synced. Voice commands mapped successfully.', body: 'Your VR HUD interface is fully calibrated. Custom scanning pipelines are now queryable inside the database.', time: '5m ago', tag: 'Hardware' },
    { id: 'm3', folder: 'inbox', from: 'streamweaver@spmt.live', to: 'novastar@spmt.live', subject: 'Sub alert trigger verified (+5,000 XP)', preview: 'Twitch integration points flow logged in SQLite.', body: 'Detected subscription activity. Awarding community points and routing notifications into the overlay hub.', time: '1h ago', tag: 'Overlays' }
  ]);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  // Forums Threads state
  const [forumThreads, setForumThreads] = useState([
    { id: 't1', title: 'How do I connect my StreamWeaver OBS overlay?', category: 'Technical Support', posts: 14, author: 'LunaVibes', repliedBy: 'Athena AI', isOpen: true },
    { id: 't2', title: 'MountainView Smart Glasses voice macro cheat-sheet', category: 'General', posts: 8, author: 'EchoPulse', repliedBy: 'NovaStar', isOpen: true },
    { id: 't3', title: 'Deep space ambient synth party tonight - vote on tracklist!', category: 'Community Events', posts: 32, author: 'NovaStar', repliedBy: 'LunaVibes', isOpen: true },
  ]);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadCategory, setNewThreadCategory] = useState('Technical Support');
  const [newThreadBody, setNewThreadBody] = useState('');
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  // Voice rooms sound state
  const [voiceRoomActive, setVoiceRoomActive] = useState(true);
  const [micState, setMicState] = useState<'muted' | 'listening'>('listening');
  const [speakingUsers, setSpeakingUsers] = useState<string[]>(['NovaStar', 'LunaVibes']);

  // MountainView QR HUD Seed state
  const [qrHUDSeed, setQrHUDSeed] = useState('https://spacemountain.live/invite/novastar');

  // Interactive points animations list (floating points indicator!)
  const [pointPopups, setPointPopups] = useState<{ id: number; text: string; x: number; y: number }[]>([]);

  // Initialize: Fetch data from the SQLite DB & API endpoints
  useEffect(() => {
    // 1. Fetch domain branding
    fetch('/api/branding')
      .then(res => res.json())
      .then((data: BrandingConfig) => {
        setBranding(data);
      })
      .catch(err => console.error('Branding fetch failed:', err));

    // 2. Fetch seeded SQLite tools
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
        setStats({
          ...data,
          totalUsers: data.totalUsers > 1 ? data.totalUsers : 50420 // Keep realistic user count matching image
        });
      })
      .catch(err => console.error('Stats fetch failed:', err));

    // Restore local user session if available
    const cachedUser = localStorage.getItem('spmtIdentity');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setIdentity(parsed);
      } catch (e) {
        // Fallback to NovaStar
      }
    }
  }, []);

  // Periodic visual simulation: simulate speaking indicator changes
  useEffect(() => {
    const timer = setInterval(() => {
      const speakers = ['NovaStar', 'LunaVibes', 'EchoPulse', 'athena'];
      const randomSpeakers = speakers.filter(() => Math.random() > 0.4);
      setSpeakingUsers(randomSpeakers);
      
      // Slightly increment total points flow as an active dynamic dashboard
      setStats(prev => ({
        ...prev,
        pointsAwarded: prev.pointsAwarded + Math.floor(Math.random() * 8) + 2
      }));
    }, 5000);

    return () => clearInterval(timer);
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
    const pointsIncrement = Math.floor(Math.random() * 40) + 20;
    
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

        // Send a dynamic system inbox alert
        const matchedToolName = tools.find(t => t.id === toolId)?.name || 'System Module';
        const newSystemMail = {
          id: `sys-${Date.now()}`,
          folder: 'inbox',
          from: 'athena@spmt.live',
          to: identity ? `${identity.username}@spmt.live` : 'novastar@spmt.live',
          subject: `${matchedToolName} execution logged`,
          preview: `Points stream refreshed (+${pointsIncrement} XP).`,
          body: `Secure trigger handshake verified. The SQLite row community_tools has been updated. Flow points saved successfully in database schema.`,
          time: 'Just now',
          tag: 'SQL Log'
        };
        setMails(prev => [newSystemMail, ...prev]);
      }
    } catch (err) {
      console.warn('SQLite points sync failed, falling back locally', err);
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, pointsFlow: t.pointsFlow + pointsIncrement } : t));
    }
  };

  // Send a Mail secure message locally
  const handleSendMail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeBody) return;

    const newMail = {
      id: `m-${Date.now()}`,
      folder: 'sent',
      from: identity ? `${identity.username}@spmt.live` : 'novastar@spmt.live',
      to: composeTo,
      subject: composeSubject || 'Station dispatch',
      preview: composeBody.substring(0, 45) + '...',
      body: composeBody,
      time: 'Just now',
      tag: 'Draft'
    };

    setMails(prev => [newMail, ...prev]);
    setIsComposing(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    alert('Message routed into secure station database!');
  };

  // Create a new Forums Thread
  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle || !newThreadBody) return;

    const newThread = {
      id: `t-${Date.now()}`,
      title: newThreadTitle,
      category: newThreadCategory,
      posts: 1,
      author: identity?.displayName || 'NovaStar',
      repliedBy: 'None yet',
      isOpen: true
    };

    setForumThreads(prev => [newThread, ...prev]);
    setIsCreatingThread(false);
    setNewThreadTitle('');
    setNewThreadBody('');
    alert('Forum discussion thread created successfully!');
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
                {/* Central Floating Orb Logo Block (Hero) */}
                <div className="flex flex-col items-center text-center py-4 relative overflow-visible">
                  {/* SpaceMountain Cyber-Realistic Emblem Centerpiece (corresponds to mountain-emblem from testing.html) */}
                  <div className="relative w-full max-w-[650px] h-[clamp(210px,28vw,310px)] mb-2 flex items-center justify-center select-none group">
                    <div
                      aria-label="SpaceMountain.live logo"
                      className="w-[min(650px,70vw)] h-full bg-no-repeat bg-center bg-contain"
                      style={{
                        backgroundImage: 'url("/assets/space-logo-main.png")',
                        filter: `drop-shadow(0 0 ${Math.round(16 + preferences.glowIntensity * 0.18)}px ${rgbaFromHex(currentTheme.glowHex, 0.62)})`,
                      }}
                    />

                    {/* Small flying rocket inside or orbiting the centerpiece as an interactive element */}
                    <motion.div
                      animate={{ 
                        y: [-4, 4, -4],
                        x: [-3, 3, -3]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute z-20 top-6 right-20 text-xl filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                    >
                      🚀
                    </motion.div>
                  </div>

                  {/* Gigantic Title & Typography pairing */}
                  <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 mb-2">
                    SPACEMOUNTAIN<span className="font-black" style={{ color: currentTheme.glowHex }}>.LIVE</span>
                  </h1>

                  <p className="text-[10px] md:text-xs font-mono font-extrabold tracking-[0.25em] uppercase mb-3" style={{ color: currentTheme.glowHex }}>
                    ONE ACCOUNT. ONE UNIVERSE. ENDLESS POSSIBILITIES.
                  </p>

                  <p className="text-xs text-zinc-400 font-sans max-w-md mx-auto leading-relaxed mb-6">
                    spmt.live is your universal account for all SpaceMountain apps and services. All system integrations saved cleanly in our local SQLite schema.
                  </p>

                  {/* Core CTAs */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setActiveTab('settings')}
                      className="px-6 py-2.5 rounded-xl font-sans font-extrabold text-xs text-black transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-lg"
                      style={{
                        backgroundColor: currentTheme.glowHex,
                        boxShadow: `0 4px 20px ${currentTheme.glowHex}55`,
                      }}
                    >
                      Create Your Account
                    </button>
                    <button 
                      onClick={() => setActiveTab('apps')}
                      className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-sans font-bold text-xs text-zinc-300 hover:text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      Explore Apps ‣
                    </button>
                  </div>
                </div>

                {/* The dynamic 8 Glossy app cards rows */}
                <MainAppSuite 
                  tools={tools} 
                  onTriggerAction={handleTriggerAction} 
                  accentColor={currentTheme.glowHex} 
                  preferences={preferences}
                />

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
                      Direct connection points flow, synced to local SQLite.
                    </p>
                  </div>
                </div>

                <MainAppSuite 
                  tools={tools} 
                  onTriggerAction={handleTriggerAction} 
                  accentColor={currentTheme.glowHex} 
                  preferences={preferences}
                />
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
                      Community Forums
                    </h2>
                    <p className="text-xs text-zinc-400 font-sans mt-0.5">Explore guides, alerts, and community posts</p>
                  </div>
                  <button
                    onClick={() => setIsCreatingThread(!isCreatingThread)}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 font-mono text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Plus size={14} /> {isCreatingThread ? 'VIEW THREADS' : 'NEW DISCUSSION THREAD'}
                  </button>
                </div>

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
                    <p className="text-xs text-zinc-400 mt-0.5">Real-time dynamic watch party audio nodes</p>
                  </div>
                  <button
                    onClick={() => {
                      setVoiceRoomActive(!voiceRoomActive);
                      alert(voiceRoomActive ? 'Muted station speakers.' : 'Station audio receiver connected.');
                    }}
                    className={`px-4 py-1.5 rounded-xl font-mono text-xs font-bold transition-all border ${
                      voiceRoomActive 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    {voiceRoomActive ? 'CONNECTED ●' : 'DISCONNECTED'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                  
                  {/* EQ Equalizer Waveform animations */}
                  <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[220px]">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 block mb-6">LIVE FREQUENCY ANALYSIS</span>
                    
                    {/* Pulsing visual synth bars */}
                    <div className="flex items-end gap-1.5 h-20 mb-6">
                      {Array.from({ length: 16 }).map((_, index) => {
                        const heights = ['h-4', 'h-10', 'h-16', 'h-20', 'h-8', 'h-14', 'h-18', 'h-12'];
                        const h = heights[index % heights.length];
                        const animDuration = `${1 + (index % 4) * 0.3}s`;
                        
                        return (
                          <div 
                            key={index}
                            className={`w-1.5 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-full transition-all duration-300`}
                            style={{ 
                              height: voiceRoomActive ? undefined : '4px',
                              animation: voiceRoomActive ? `Floating ${animDuration} ease-in-out infinite` : 'none'
                            }}
                          />
                        );
                      })}
                    </div>

                    <span className="text-xs font-bold text-white">Deep Space Synthwaves — Episode 42</span>
                    <span className="text-[9px] font-mono text-emerald-400 mt-1 font-bold">Bitrate: 320kbps synced</span>
                  </div>

                  {/* Speakers list in room */}
                  <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-zinc-500 block mb-4">CAPTAINS SPEAKING IN HARMONY</span>
                      <div className="flex flex-col gap-3">
                        {['NovaStar', 'LunaVibes', 'EchoPulse'].map((user) => {
                          const isSpeaking = speakingUsers.includes(user);
                          return (
                            <div key={user} className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold bg-zinc-900 ${
                                  isSpeaking ? 'border-emerald-500 shadow-[0_0_8px_#10b981]' : 'border-white/10'
                                }`}>
                                  👤
                                </div>
                                <span className="text-xs font-sans font-bold text-white">{user}</span>
                              </div>
                              {isSpeaking ? (
                                <span className="text-[9px] font-mono font-semibold text-emerald-400 uppercase animate-pulse">SPEAKING</span>
                              ) : (
                                <span className="text-[9px] font-mono text-zinc-600 uppercase">MUTED</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Microphone control toggle */}
                    <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-zinc-400 font-sans">Push to Talk micro-controls</span>
                      <button
                        onClick={() => {
                          setMicState(prev => prev === 'muted' ? 'listening' : 'muted');
                          alert(micState === 'listening' ? 'Microphone muted.' : 'Microphone unmuted.');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all ${
                          micState === 'listening' 
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
                            : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                        }`}
                      >
                        {micState === 'listening' ? '🎙️ MIC ON' : '🔇 MUTED'}
                      </button>
                    </div>
                  </div>

                </div>
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
                    <p className="text-xs text-zinc-400 mt-0.5">Augmented HUD scan, pairing macro matrix</p>
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

                    <span className="text-[9px] font-mono font-bold text-cyan-400 tracking-[0.2em] block mb-4 animate-pulse">HUD VIEWPAIRED</span>
                    
                    {/* Holographic glowing display representation */}
                    <div className="w-20 h-20 rounded-full border border-dashed border-cyan-500/30 flex items-center justify-center mb-4">
                      <span className="text-3xl text-cyan-400 animate-bounce">👓</span>
                    </div>

                    <span className="text-xs font-bold text-white">Target Anchor: Spatials Calibrated</span>
                    <span className="text-[10px] text-zinc-500 mt-1 font-mono">Distance: 1.45m • Yaw: 14.2° • Pitch: -2.8°</span>
                  </div>

                  {/* Pairing utilities */}
                  <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-zinc-500 block mb-3">CUSTOM QR MACRO SEED</span>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                        Generate instant spatial coordinates mapped inside SQLite table. Point your glasses camera at the display.
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
                      <span className="text-xs font-mono text-cyan-400 font-bold">CALIBRATION ENGINE OK</span>
                      <button 
                        onClick={() => alert(`Macro compiled successfully! Seed linked to route.`)}
                        className="px-4 py-1.5 rounded-xl bg-cyan-500 text-xs font-bold text-black font-sans hover:bg-cyan-400 transition-all"
                      >
                        COMPILE SEED
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
                      <Rocket className="text-orange-400 animate-pulse" size={20} />
                      Workflow Builder Studio
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Drag-and-drop simulated pipeline connections</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/40 min-h-[250px] p-6 relative overflow-hidden flex flex-col md:flex-row gap-4 items-center justify-center">
                  {/* Embedded nodes mock connectors */}
                  <div className="flex flex-col md:flex-row items-center gap-4 relative z-10">
                    
                    {/* Node 1 */}
                    <div className="bg-zinc-950 border border-orange-500/30 p-4 rounded-xl min-w-[140px] text-center shadow-lg">
                      <span className="text-[10px] font-mono font-bold text-orange-400">TRIGGER</span>
                      <span className="text-xs font-bold text-white block mt-1.5">Glasses scan QR</span>
                      <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">ID: mtnview_scan</span>
                    </div>

                    {/* Arrow 1 */}
                    <div className="text-zinc-600 font-bold animate-pulse">➔</div>

                    {/* Node 2 */}
                    <div className="bg-zinc-950 border border-purple-500/30 p-4 rounded-xl min-w-[140px] text-center shadow-lg">
                      <span className="text-[10px] font-mono font-bold text-purple-400">ROUTER</span>
                      <span className="text-xs font-bold text-white block mt-1.5">Station Gateway</span>
                      <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">ID: gateway_dns</span>
                    </div>

                    {/* Arrow 2 */}
                    <div className="text-zinc-600 font-bold animate-pulse">➔</div>

                    {/* Node 3 */}
                    <div className="bg-zinc-950 border border-emerald-500/30 p-4 rounded-xl min-w-[140px] text-center shadow-lg">
                      <span className="text-[10px] font-mono font-bold text-emerald-400">ACTION</span>
                      <span className="text-xs font-bold text-white block mt-1.5">Stream Overlay</span>
                      <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">ID: streamweaver_api</span>
                    </div>

                  </div>

                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.015)_1px,_transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center justify-between text-xs font-sans text-zinc-400 mt-2">
                  <span>Interactive node creation completely compiled inside schema structure.</span>
                  <button 
                    onClick={() => alert('New workflow anchor linked successfully!')}
                    className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-white border border-orange-500/20 text-xs font-bold transition-all"
                  >
                    + ADD STEP
                  </button>
                </div>
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
                      It is a cohesive suite of stream overlay widgets, watch party voice networks, AI smart glasses pipelines, and secure messaging protocols. We utilize the lightning-fast, persistent SQLite database engine inside Cloud Run.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-xs font-bold text-white block mb-1">How do I bind custom themes?</span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Simply toggle our customized visual customizer presets (Solar Flare, Nebula Purple, Oceanic Blue, or Aurora Green) or adjust the slider parameters like star densities and blur intensities dynamically.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-xs font-bold text-white block mb-1">System Architecture Status</span>
                    <div className="grid grid-cols-2 gap-4 mt-2.5">
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] flex items-center justify-between">
                        <span>PERSISTENCE DATABASE:</span>
                        <span className="font-extrabold">SQLITE ONLINE</span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] flex items-center justify-between">
                        <span>BACKEND HOST SERVER:</span>
                        <span className="font-extrabold">EXPRESS PORT:3000</span>
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
                      Crew Desk
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Explore station captains and active users on network</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  {[
                    { name: 'NovaStar', email: 'novastar@spmt.live', role: 'Station Creator', status: 'Online', emoji: '👽' },
                    { name: 'LunaVibes', email: 'luna@spmt.live', role: 'System Admin', status: 'In voice room', emoji: '👩‍🚀' },
                    { name: 'EchoPulse', email: 'echo@spmt.live', role: 'Hardware Tech', status: 'Offline', emoji: '🤖' }
                  ].map((crew, index) => (
                    <div key={index} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                      <div className="flex items-center gap-3 mb-4">
                        {preferences.showAvatars && (
                          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-lg">
                            {crew.emoji}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">{crew.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{crew.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono pt-3 border-t border-white/5">
                        <span className="text-zinc-400">{crew.role}</span>
                        <span className={`font-bold ${crew.status === 'Offline' ? 'text-zinc-500' : 'text-emerald-400'}`}>
                          ● {crew.status}
                        </span>
                      </div>
                    </div>
                  ))}
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
            alt="NovaStar"
            className="w-5 h-5 rounded-full object-cover border border-white/10"
            referrerPolicy="no-referrer"
          />
          <span>One Login. Infinite Universe. SpaceMountain Ecosystem Sync • Spmt.live</span>
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
