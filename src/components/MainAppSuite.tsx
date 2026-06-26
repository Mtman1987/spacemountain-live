import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Volume2, Gamepad2, Compass, Headphones, Eye, Mail, MessageSquare, LayoutGrid, Play, Activity 
} from 'lucide-react';
import { CommunityTool } from '../types';
import { UserPreferences } from '../types';

interface MainAppSuiteProps {
  tools: CommunityTool[];
  onTriggerAction: (toolId: string) => void;
  accentColor: string; // The selected theme's glow/accent hex color!
  preferences: UserPreferences;
}

export default function MainAppSuite({ tools, onTriggerAction, accentColor, preferences }: MainAppSuiteProps) {
  const [clickCount, setClickCount] = useState(0);
  const [cooldownEnd, setCooldownEnd] = useState<number>(0);
  const [cooldownText, setCooldownText] = useState('');

  // Cooldown timer display
  useEffect(() => {
    if (cooldownEnd <= Date.now()) { setCooldownText(''); return; }
    const interval = setInterval(() => {
      const remaining = Math.max(0, cooldownEnd - Date.now());
      if (remaining <= 0) { setCooldownText(''); setClickCount(0); clearInterval(interval); return; }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCooldownText(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const handleTileClick = (toolId: string, isInternal: boolean, isComingSoon: boolean) => {
    if (!isInternal && !isComingSoon) return; // external apps don't award XP
    if (cooldownEnd > Date.now()) return; // on cooldown

    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 5) {
      setCooldownEnd(Date.now() + 5 * 60 * 1000);
    }
    onTriggerAction(toolId);
  };
  // Mapping tools to their unique unicode icons from testing.html
  const appIcons: Record<string, string> = {
    'streamweaver': '◌',
    'chat-tag': '🎮',
    'discord-hub': '☯',
    'hearmeout': '♫',
    'mountainview': '◒',
    'mail': '✉',
    'forums': '☷',
    'builder': '⌗',
  };

  const appSublabels: Record<string, string> = {
    'streamweaver': 'Streaming & Tools',
    'chat-tag': 'Game System',
    'discord-hub': 'Auth & Shoutouts',
    'hearmeout': 'Voice & Rooms',
    'mountainview': 'Smart Glasses Hub',
    'mail': 'Secure Messaging',
    'forums': 'Community Hub',
    'builder': 'Pages & QR Codes',
  };

  const appLinks: Record<string, string> = {
    'streamweaver': 'https://streamweaver-new.fly.dev',
    'chat-tag': 'https://chat-tag-new.fly.dev',
    'discord-hub': 'https://discord-stream-hub-new.fly.dev',
    'hearmeout': 'https://hearmeout-main.fly.dev',
    'mountainview': '/mtnview',
    'mail': '/inbox',
    'forums': '/forums',
    'builder': '/builder',
  };

  const appStatus: Record<string, 'live' | 'coming-soon'> = {
    'streamweaver': 'live',
    'chat-tag': 'live',
    'discord-hub': 'live',
    'hearmeout': 'live',
    'mountainview': 'coming-soon',
    'mail': 'live',
    'forums': 'live',
    'builder': 'coming-soon',
  };

  const realLogos: Record<string, string> = {
    'chat-tag': '/assets/app-chat-tag.png',
    'discord-hub': '/assets/app-discord-hub.png',
    'streamweaver': '/assets/app-streamweaver.png',
    'hearmeout': '/assets/app-hearmeout.png',
  };

  const densityClass = preferences.uiDensity === 'compact'
    ? 'gap-2.5'
    : preferences.uiDensity === 'spacious'
      ? 'gap-5'
      : 'gap-3.5';
  const tileMinHeight = preferences.uiDensity === 'compact'
    ? 'min-h-[146px]'
    : preferences.uiDensity === 'spacious'
      ? 'min-h-[184px]'
      : 'min-h-[168px]';
  const logoBoxClass = preferences.uiDensity === 'compact'
    ? 'w-[82px] h-[82px]'
    : preferences.uiDensity === 'spacious'
      ? 'w-[104px] h-[104px]'
      : 'w-[92px] h-[92px]';
  const tabFrameClass = preferences.tabStyle === 'cards'
    ? 'bg-black/20'
    : preferences.tabStyle === 'underline'
      ? 'rounded-none border-x-0 border-t-0 bg-transparent'
      : 'rounded-2xl';

  return (
    <div className="w-full select-none">
      {/* Title Divider matching '✦ YOUR APP SUITE ✦' exactly */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-zinc-850 to-zinc-700" />
        <span className="text-[11px] font-mono tracking-[0.22em] text-zinc-400 font-bold uppercase flex items-center gap-1.5 select-none">
          <span style={{ color: accentColor }}>✦</span> YOUR APP SUITE <span style={{ color: accentColor }}>✦</span>
        </span>
        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-zinc-850 to-zinc-700" />
      </div>

      {/* Grid of app launchers. The click/XP behavior stays on the whole tile. */}
      <div className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 ${densityClass}`}>
        {tools.map((tool) => {
          const icon = appIcons[tool.id] || '✦';
          const label = appSublabels[tool.id] || tool.miniLabel || 'Sub Module';

          return (
            <motion.div
              key={tool.id}
              whileHover={{ 
                scale: 1.04,
                y: -4,
              }}
              whileTap={{ scale: 0.96 }}
              className={`group cursor-pointer relative overflow-visible rounded-2xl px-1.5 py-2 flex flex-col items-center text-center justify-between transition-all duration-300 ${tileMinHeight}`}
              style={{
                borderColor: `${accentColor}25`,
              }}
              onClick={() => {
                const isExternal = appLinks[tool.id]?.startsWith('http');
                const isComingSoon = appStatus[tool.id] === 'coming-soon';
                const isInternal = !isExternal && appStatus[tool.id] === 'live';

                if (isExternal) {
                  window.open(appLinks[tool.id], '_blank');
                } else if (isInternal) {
                  handleTileClick(tool.id, true, false);
                  window.location.href = appLinks[tool.id];
                } else {
                  handleTileClick(tool.id, false, true);
                }
              }}
            >
              {/* Dynamic Theme Glow effect on hover */}
              <div 
                className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none border"
                style={{
                  borderColor: `${accentColor}30`,
                  boxShadow: `0 0 18px ${accentColor}24`
                }}
              />

              {/* Glowing Icon Container with color matching selected theme */}
              <div 
                className={`${logoBoxClass} flex items-center justify-center text-4xl border mb-2 transition-all duration-300 group-hover:scale-105 font-mono font-bold leading-none select-none overflow-hidden relative ${tabFrameClass}`}
                style={{
                  color: accentColor,
                  borderColor: `${accentColor}55`,
                  backgroundColor: preferences.tabStyle === 'cards' ? `${accentColor}08` : 'transparent',
                  boxShadow: `0 0 18px ${accentColor}1f`
                }}
              >
                {realLogos[tool.id] ? (
                  <img 
                    src={realLogos[tool.id]} 
                    alt={tool.name} 
                    className="w-full h-full object-contain p-2"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  icon
                )}
              </div>

              {/* Title & Static/Database Labels matching the image layout */}
              <div className="flex flex-col items-center w-full min-w-0">
                <span className="font-sans font-bold text-xs text-white tracking-wide block truncate w-full">
                  {tool.name}
                </span>
                <span className="text-[9px] font-sans font-semibold text-zinc-400 mt-1 block leading-normal truncate w-full">
                  {label}
                </span>
              </div>

              {/* Status badge + flow indicator */}
              <div className="mt-2 w-full flex items-center justify-between text-[8px] font-mono border-t border-white/5 pt-2 text-zinc-500">
                {appStatus[tool.id] === 'coming-soon' ? (
                  <span className="text-amber-500/80 font-bold tracking-wide">SOON</span>
                ) : appLinks[tool.id]?.startsWith('http') ? (
                  <span className="text-emerald-400 font-bold">LIVE</span>
                ) : (
                  <span className="text-emerald-400 font-bold">LIVE</span>
                )}
                <span className="text-zinc-300 font-bold flex items-center gap-1">
                  <span 
                    className="w-1.5 h-1.5 rounded-full animate-ping inline-block" 
                    style={{ backgroundColor: accentColor }}
                  />
                  {(tool.pointsFlow || 0).toLocaleString()}
                </span>
              </div>
              {/* Cooldown indicator */}
              {cooldownText && (appStatus[tool.id] === 'coming-soon' || !appLinks[tool.id]?.startsWith('http')) && (
                <div className="w-full text-center text-[7px] font-mono text-amber-500/70 mt-1">
                  ⏳ {cooldownText}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Sub statistics section matching bottom labels: '12+ Powerful Apps', '50K+ Active Users', '1M+ Connections Made', 'Infinite Possibilities' */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 rounded-2xl bg-white/[0.01] border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3 justify-center md:justify-start">
          <div 
            className="w-8 h-8 rounded-lg border flex items-center justify-center text-xs shadow-sm"
            style={{ 
              borderColor: `${accentColor}30`,
              boxShadow: `0 0 10px ${accentColor}15`,
              backgroundColor: `${accentColor}08`
            }}
          >
            🚀
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white leading-none">12+</span>
            <span className="text-[10px] text-zinc-400 mt-1 font-sans">Powerful Apps</span>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-center">
          <div 
            className="w-8 h-8 rounded-lg border flex items-center justify-center text-xs shadow-sm"
            style={{ 
              borderColor: `${accentColor}30`,
              boxShadow: `0 0 10px ${accentColor}15`,
              backgroundColor: `${accentColor}08`
            }}
          >
            👥
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white leading-none">50K+</span>
            <span className="text-[10px] text-zinc-400 mt-1 font-sans">Active Users</span>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-center">
          <div 
            className="w-8 h-8 rounded-lg border flex items-center justify-center text-xs shadow-sm"
            style={{ 
              borderColor: `${accentColor}30`,
              boxShadow: `0 0 10px ${accentColor}15`,
              backgroundColor: `${accentColor}08`
            }}
          >
            ⚡
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white leading-none">1M+</span>
            <span className="text-[10px] text-zinc-400 mt-1 font-sans">Connections Made</span>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-center md:justify-end">
          <div 
            className="w-8 h-8 rounded-lg border flex items-center justify-center text-xs shadow-sm"
            style={{ 
              borderColor: `${accentColor}30`,
              boxShadow: `0 0 10px ${accentColor}15`,
              backgroundColor: `${accentColor}08`
            }}
          >
            ∞
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white leading-none">Infinite</span>
            <span className="text-[10px] text-zinc-400 mt-1 font-sans">Possibilities</span>
          </div>
        </div>
      </div>
    </div>
  );
}
