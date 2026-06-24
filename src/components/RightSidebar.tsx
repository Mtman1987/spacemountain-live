import React from 'react';
import { motion } from 'motion/react';
import { 
  User, ChevronRight, Sparkles, Sliders, Bell, Check, HelpCircle, HardDrive, MessageSquare, Link, Github, Twitter, Youtube, Twitch, Disc 
} from 'lucide-react';
import { UserProfile, UserPreferences } from '../types';

interface RightSidebarProps {
  identity: UserProfile | null;
  preferences: UserPreferences | null;
  activeThemeName: string;
  activeThemeGlow: string;
  onNavigateSettings: () => void;
}

export default function RightSidebar({ 
  identity, 
  preferences, 
  activeThemeName, 
  activeThemeGlow, 
  onNavigateSettings 
}: RightSidebarProps) {
  
  // Custom mock alerts for interactive actions
  const handleActionAlert = (actionName: string) => {
    alert(`Station action dispatched: "${actionName}" is fully configured in current workspace.`);
  };

  return (
    <div className="w-[280px] shrink-0 flex flex-col gap-4">
      
      {/* 1. ACCOUNT OVERVIEW Card */}
      <div className="rounded-3xl dynamic-cosmic-card p-4 backdrop-blur-2xl transition-all duration-300">
        <span className="text-[9px] font-mono tracking-widest text-zinc-500 font-bold block mb-3 uppercase">
          ACCOUNT OVERVIEW
        </span>

        <div className="flex items-center gap-3">
          <div className="relative">
            <div 
              className="w-12 h-12 rounded-full border p-0.5 bg-black/40 relative overflow-hidden transition-all duration-300"
              style={{
                borderColor: `${activeThemeGlow}66`,
                boxShadow: `0 0 15px ${activeThemeGlow}40`
              }}
            >
              <img 
                src="/assets/astronaut-avatar.jpg" 
                alt="NovaStar"
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Small glowing star verify badge */}
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 border border-black flex items-center justify-center text-[8px] text-white font-bold shadow-[0_0_5px_#2563eb]">
              ★
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-sans font-extrabold text-white truncate">
                {identity?.displayName || 'NovaStar'}
              </span>
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex items-center justify-center text-[7px] text-white font-bold font-mono">✓</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono truncate">
              {identity ? `${identity.username}@spmt.live` : 'novastar@spmt.live'}
            </span>
          </div>
        </div>

        {/* View Profile Action button */}
        <button 
          onClick={() => handleActionAlert('View Profile')}
          className="w-full mt-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-mono font-bold text-zinc-300 hover:text-white transition-all uppercase"
        >
          View Profile
        </button>
      </div>

      {/* 2. QUICK ACTIONS List */}
      <div className="rounded-3xl dynamic-cosmic-card p-4 backdrop-blur-2xl transition-all duration-300">
        <span className="text-[9px] font-mono tracking-widest text-zinc-500 font-bold block mb-3 uppercase">
          QUICK ACTIONS
        </span>

        <div className="flex flex-col gap-1.5">
          {[
            { label: 'Open Dashboard', icon: '㗊', action: 'dashboard' },
            { label: 'Manage Apps', icon: '㗊', action: 'apps' },
            { label: 'Account Settings', icon: '👤', action: 'account' },
            { label: 'Theme & Customization', icon: '🎨', action: 'theme', targetSettings: true }
          ].map((item, index) => (
            <button
              key={index}
              onClick={() => {
                if (item.targetSettings) {
                  onNavigateSettings();
                } else {
                  handleActionAlert(item.label);
                }
              }}
              className="w-full py-2 px-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/5 flex items-center justify-between text-zinc-400 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                  {item.icon}
                </span>
                <span className="text-[11px] font-sans font-bold tracking-wide">
                  {item.label}
                </span>
              </div>
              <ChevronRight size={12} className="text-zinc-600 group-hover:text-zinc-300 transition-colors transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      </div>

      {/* 3. YOUR THEME Display Block */}
      <div className="rounded-3xl dynamic-cosmic-card p-4 backdrop-blur-2xl transition-all duration-300">
        <span className="text-[9px] font-mono tracking-widest text-zinc-500 font-bold block mb-3 uppercase">
          YOUR THEME
        </span>

        {/* Glossy theme indicator card */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 h-24 mb-3 group cursor-pointer" onClick={onNavigateSettings}>
          {/* Backdrop dynamic color preset */}
          <div className={`absolute inset-0 bg-gradient-to-br ${activeThemeGlow} opacity-60`} />
          {/* Space sparklines vector background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-900/40 via-transparent to-transparent pointer-events-none" />
          
          <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black via-black/40 to-transparent">
            <span className="text-xs font-sans font-extrabold text-white tracking-wide block">
              {activeThemeName}
            </span>
            <span className="text-[9px] text-zinc-400 font-mono block mt-0.5">
              Active Theme
            </span>
          </div>
        </div>

        {/* Customize button */}
        <button 
          onClick={onNavigateSettings}
          className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 hover:border-amber-500/20 transition-all uppercase flex items-center justify-center gap-1.5"
        >
          🎨 Customize
        </button>
      </div>

      {/* 4. ACROSS YOUR APPS Sync List */}
      <div className="rounded-3xl dynamic-cosmic-card p-4 backdrop-blur-2xl transition-all duration-300">
        <span className="text-[9px] font-mono tracking-widest text-zinc-500 font-bold block mb-3.5 uppercase">
          ACROSS YOUR APPS
        </span>

        <div className="flex flex-col gap-3">
          {/* Theme Sync */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px]">🎨</span>
              <div className="flex flex-col">
                <span className="text-[11px] font-sans font-bold text-white">Theme Sync</span>
                <span className="text-[8px] text-zinc-500 font-sans mt-0.5">Across all apps</span>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              On <Check size={10} />
            </span>
          </div>

          {/* Messages */}
          <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px]">✉️</span>
              <div className="flex flex-col">
                <span className="text-[11px] font-sans font-bold text-white">Messages</span>
                <span className="text-[8px] text-zinc-500 font-sans mt-0.5">Unified inbox</span>
              </div>
            </div>
            <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-zinc-300 flex items-center justify-center">
              3
            </span>
          </div>

          {/* Connections */}
          <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px]">🔗</span>
              <div className="flex flex-col">
                <span className="text-[11px] font-sans font-bold text-white">Connections</span>
                <span className="text-[8px] text-zinc-500 font-sans mt-0.5">Linked accounts</span>
              </div>
            </div>
            <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-zinc-300 flex items-center justify-center">
              8
            </span>
          </div>

          {/* Assets */}
          <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px]">💾</span>
              <div className="flex flex-col">
                <span className="text-[11px] font-sans font-bold text-white">Assets</span>
                <span className="text-[8px] text-zinc-500 font-sans mt-0.5">All apps</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-zinc-300">
              1.2 TB
            </span>
          </div>
        </div>
      </div>

      {/* 5. Social community row at bottom */}
      <div className="flex flex-col items-center gap-2 mt-2">
        <span className="text-[9px] font-mono font-bold text-zinc-600 tracking-wider">
          JOIN OUR COMMUNITY
        </span>
        <div className="flex items-center gap-3 text-zinc-500">
          <button onClick={() => handleActionAlert('Discord Link')} className="hover:text-indigo-400 transition-colors"><Disc size={16} /></button>
          <button onClick={() => handleActionAlert('Twitch Link')} className="hover:text-purple-400 transition-colors"><Twitch size={16} /></button>
          <button onClick={() => handleActionAlert('Twitter Link')} className="hover:text-blue-400 transition-colors"><Twitter size={16} /></button>
          <button onClick={() => handleActionAlert('YouTube Link')} className="hover:text-red-500 transition-colors"><Youtube size={16} /></button>
          <button onClick={() => handleActionAlert('GitHub Link')} className="hover:text-white transition-colors"><Github size={16} /></button>
        </div>
      </div>

    </div>
  );
}
