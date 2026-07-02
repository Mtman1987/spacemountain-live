import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Bell, Settings, LogOut, ExternalLink
} from 'lucide-react';
import { UserPreferences, UserProfile } from '../types';

interface CosmicHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  accentColor: string;
  identity: UserProfile | null;
  pointsAwarded: number;
  rocketFlying: boolean;
  preferences: UserPreferences;
}

const realAvatar = '/assets/astronaut-avatar.jpg';

export default function CosmicHeader({ activeTab, setActiveTab, accentColor, identity, pointsAwarded, rocketFlying, preferences }: CosmicHeaderProps) {
  const [searchValue, setSearchValue] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const currentPoints = identity?.points || 0;
  const currentLevel = Math.floor(currentPoints / 300) || 1;

  const logoutFromSpmt = async () => {
    try {
      const token = localStorage.getItem('spmtToken');
      await fetch('https://spmt.live/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {}

    localStorage.removeItem('spmtToken');
    localStorage.removeItem('spmtIdentity');
    window.location.href = '/';
  };

  return (
    <header
      className="fixed top-4 z-50 h-[68px] border px-6 flex items-center justify-between rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all duration-500"
      style={{
        left: preferences.sidebarPosition === 'left' && preferences.sidebarStyle !== 'hidden' ? 172 : 24,
        right: preferences.sidebarPosition === 'right' && preferences.sidebarStyle !== 'hidden' ? 172 : 24,
        backgroundColor: preferences.topbarStyle === 'glass' ? 'rgba(6, 8, 22, 0.68)' : 'rgba(0, 0, 0, 0.30)',
        borderColor: preferences.topbarStyle === 'glass' ? `${accentColor}38` : 'rgba(255,255,255,0.10)',
        backdropFilter: `blur(${preferences.topbarStyle === 'glass' ? preferences.blurStrength : Math.max(8, preferences.blurStrength * 0.7)}px)`,
        WebkitBackdropFilter: `blur(${preferences.topbarStyle === 'glass' ? preferences.blurStrength : Math.max(8, preferences.blurStrength * 0.7)}px)`,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      
      <div 
        onClick={() => setActiveTab('dashboard')}
        className="flex items-center gap-2.5 cursor-pointer group shrink-0"
      >
        <div 
          className="relative w-[68px] h-[48px] bg-no-repeat bg-contain bg-top"
          style={{
            backgroundImage: 'url("/assets/space-logo-header.png")',
            filter: `drop-shadow(0 0 12px ${accentColor}bf)`,
          }}
          aria-label="SpaceMountain.live"
        />
        
        <span className="text-sm font-sans font-black tracking-[0.16em] text-white uppercase group-hover:text-amber-400 transition-colors hidden sm:inline-block">
          SPACEMOUNTAIN<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500 font-black">.LIVE</span>
        </span>
      </div>

      <div className="flex items-center gap-3 ml-auto mr-3">
        <div className="relative flex items-center">
          <AnimatePresence>
            {isSearchExpanded ? (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 180, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="relative"
              >
                <input
                  type="text"
                  placeholder="Search station..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onBlur={() => searchValue === '' && setIsSearchExpanded(false)}
                  className="w-full bg-zinc-950/80 border border-white/15 focus:border-orange-500/60 rounded-full py-1.5 pl-3.5 pr-8 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20 backdrop-blur-md"
                  autoFocus
                />
                <button 
                  onClick={() => setIsSearchExpanded(false)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                >
                  <Search size={12} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSearchExpanded(true)}
                className="p-2 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:border-white/15 transition-all flex items-center justify-center"
                title="Search spmt.live"
              >
                <Search size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={() => alert('Notification stream will route through the SPMT Commlink.')}
          className="relative p-2 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:border-white/15 transition-all flex items-center justify-center"
          title="Notifications"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_5px_#fbbf24]" />
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className="p-2 rounded-xl border transition-all flex items-center justify-center text-zinc-400 hover:text-white"
          style={activeTab === 'settings' ? {
            backgroundColor: `${accentColor}1a`,
            borderColor: `${accentColor}4d`,
            color: accentColor,
          } : {
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(255,255,255,0.05)',
          }}
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {identity ? (
        <div className="relative shrink-0">
          <button 
            onClick={() => setAccountOpen((open) => !open)}
            className="flex items-center gap-3 p-1 px-3 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/10 transition-all shadow-lg group shrink-0"
            title="SPMT Account"
          >
            <div 
              className="w-8.5 h-8.5 rounded-full p-0.5 transition-all duration-300 relative shrink-0"
              style={{ background: `linear-gradient(135deg, ${accentColor}, transparent)` }}
            >
              <div className="w-full h-full rounded-full overflow-hidden border border-black relative">
                <img 
                  src={realAvatar} 
                  alt={identity?.displayName || 'Captain'} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#090b14]" />
            </div>

            <div className="flex flex-col items-start leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-sans font-extrabold tracking-wide text-white group-hover:text-amber-400 transition-colors">
                  {identity.displayName}
                </span>
                <span 
                  className="text-[9px] px-1.5 py-0.5 rounded font-mono font-black border uppercase tracking-wider"
                  style={{
                    borderColor: `${accentColor}40`,
                    color: accentColor,
                    backgroundColor: `${accentColor}10`
                  }}
                >
                  LVL {currentLevel}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono font-bold text-zinc-400">
                <span className="text-emerald-400">● SPMT</span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-400">{currentPoints.toLocaleString()} XP</span>
              </div>
            </div>
          </button>

          {accountOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl">
              <div className="px-2 pb-2 border-b border-white/10">
                <p className="text-xs font-black text-white">{identity.displayName}</p>
                <p className="text-[10px] text-zinc-500">{identity.username}@spmt.live</p>
              </div>
              <a
                href="https://spmt.live"
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-white/10 no-underline"
              >
                <ExternalLink size={13} />
                Open SPMT Account
              </a>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-white/10 text-left"
              >
                <Settings size={13} />
                SpaceMountain Settings
              </button>
              <button
                type="button"
                onClick={logoutFromSpmt}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10 text-left"
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          )}
        </div>
      ) : (
        <a
          href="/auth/login"
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-sans font-extrabold text-xs text-black transition-all transform hover:-translate-y-0.5 no-underline shadow-lg shrink-0"
          style={{ backgroundColor: accentColor, boxShadow: `0 4px 16px ${accentColor}44` }}
        >
          Sign In with SPMT
        </a>
      )}
    </header>
  );
}
