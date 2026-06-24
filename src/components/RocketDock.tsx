import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Mail, MessageSquare, Headphones, Settings, HelpCircle, ChevronDown, ChevronUp, Users, Workflow, Glasses, Compass, Award, ChevronRight, Check
} from 'lucide-react';
import { UserProfile, UserPreferences } from '../types';

interface RocketDockProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  identity: UserProfile | null;
  preferences: UserPreferences | null;
  accentColor: string;
  rocketFlying: boolean;
  activeThemeName?: string;
  isFloating?: boolean;
  instanceId?: string;
  onApplyThemePreset?: (preset: 'solar-flare' | 'nebula-purple' | 'oceanic-blue' | 'aurora-green') => void;
}

export default function RocketDock({ 
  activeTab, 
  setActiveTab, 
  identity, 
  preferences, 
  accentColor,
  rocketFlying,
  activeThemeName,
  isFloating = false,
  instanceId,
  onApplyThemePreset
}: RocketDockProps) {
  // Profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const currentPoints = identity?.points || 12500;
  const currentLevel = Math.floor(currentPoints / 300) || 41;
  const showTopProfilePod = rocketFlying && !isFloating;
  const dockSide = preferences?.sidebarPosition || 'left';
  const sidebarStyle = preferences?.sidebarStyle || 'docked';
  const hideStaticDock = !isFloating && sidebarStyle === 'hidden';

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: <Home size={15} /> },
    { id: 'apps', label: 'Apps', icon: <Compass size={15} /> },
    { id: 'inbox', label: 'Inbox', icon: <Mail size={15} /> },
    { id: 'forums', label: 'Forums', icon: <MessageSquare size={15} /> },
    { id: 'rooms', label: 'Rooms', icon: <Headphones size={15} /> },
    { id: 'builder', label: 'Builder', icon: <Workflow size={15} /> },
    { id: 'mtnview', label: 'MtnView', icon: <Glasses size={15} /> },
    { id: 'crew', label: 'Crew Desk', icon: <Users size={15} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={15} /> },
    { id: 'help', label: 'Help', icon: <HelpCircle size={15} /> },
  ];

const realAvatar = '/assets/astronaut-avatar.jpg';

  // 2. Full Active Sidebar (Docked Static Left Sidebar OR Flying Floating Sidebar)
  return (
    <aside 
      className={`dock-panel glass-card flex flex-col gap-2 ${
        isFloating ? 'floating' : 'static-dock'
      } ${
        rocketFlying && !isFloating ? 'parked-pod' : ''
      } ${
        !isFloating && dockSide === 'right' ? 'dock-right' : ''
      } ${
        !isFloating && sidebarStyle === 'floating' ? 'dock-style-floating' : ''
      } ${
        hideStaticDock ? 'dock-hidden' : ''
      }`}
      style={{
        left: !isFloating && dockSide === 'right' ? 'auto' : undefined,
        right: !isFloating && dockSide === 'right' ? 16 : undefined,
      }}
      id={instanceId || (isFloating ? 'floatingDockPanel' : 'staticDockPanel')}
      aria-label="Movable station dock"
    >
      {/* A. Top Area: Drag Handle (Floating Mode) */}
      {isFloating && (
        <div className="flex items-center justify-between px-1.5 pb-1.5 border-b border-white/10 cursor-move shrink-0" id="dockHandle">
          <span className="text-[8px] font-mono font-black tracking-widest text-zinc-400 uppercase">DRAG</span>
          <button 
            id="dockClose"
            className="text-[8px] font-mono font-black text-zinc-500 hover:text-white px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
            title="Collapse dock"
          >
            POD
          </button>
        </div>
      )}

      {/* B. Top Circle: landing pad while docked, profile pod while rocket is flying */}
      {!isFloating && (
        <div 
          className={`dock-top-circle relative w-full h-[88px] flex flex-col items-center justify-center overflow-visible mb-1 shrink-0 ${showTopProfilePod ? 'profile-mode' : 'landing-mode'}`}
          id="dockBay"
          style={{
            borderColor: `${accentColor}55`,
            boxShadow: `0 0 18px ${accentColor}22, inset 0 0 28px rgba(0,0,0,0.45)`
          }}
        >
          {showTopProfilePod ? (
            <>
              <img
                src={realAvatar}
                alt={identity?.displayName || 'NovaStar'}
                className="w-[72px] h-[72px] rounded-full object-cover border border-black/60"
              />
              <span className="absolute bottom-2 right-5 w-3 h-3 bg-emerald-500 rounded-full border border-[#090b14]" />
            </>
          ) : null}
        </div>
      )}

      {/* C. Navigation Links (Fills the remaining height) */}
      <div className="flex-1 flex flex-col gap-1 overflow-hidden pr-0.5 scrollbar-none">
        <nav className="flex flex-col gap-0.5 w-full">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                }}
                className={`w-full transition-all duration-150 flex items-center flex-row justify-start py-1.5 px-2 rounded-full gap-1.5 text-left cursor-pointer border ${
                  isActive 
                    ? 'text-white font-bold text-[10.5px]' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] border-transparent font-medium text-[10.5px]'
                }`}
                style={isActive ? {
                  background: `linear-gradient(90deg, ${accentColor}38, ${accentColor}14)`,
                  borderColor: `${accentColor}33`,
                  boxShadow: `0 0 10px ${accentColor}26`,
                } : undefined}
                title={tab.label}
              >
                <div 
                  className="shrink-0 transition-transform duration-200"
                  style={{ color: isActive ? accentColor : 'inherit' }}
                >
                  {tab.icon}
                </div>
                <span className="tracking-tight truncate">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* D. Compact Profile & Internal Pop-up Cockpit (Placed at the bottom) */}
      <div className="relative mt-auto shrink-0 flex flex-col items-center justify-center pb-2 pt-1 z-50">
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex flex-col items-center gap-1.5 p-1.5 w-full justify-center rounded-2xl hover:bg-white/5 transition-all group shrink-0 text-center focus:outline-none cursor-pointer"
          title="Profile & Quick Actions"
        >
          {/* Circular avatar with glowing border */}
          <div 
            className="w-[76px] h-[76px] rounded-full p-0.5 transition-all duration-300 relative shrink-0"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, transparent)`
            }}
          >
            <div className="w-full h-full rounded-full overflow-hidden border border-black relative">
              <img 
                src={realAvatar} 
                alt={identity?.displayName || 'NovaStar'} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 rounded-full border border-[#090b14]" />
          </div>

          {/* Pilot details vertically stacked below avatar */}
          <div className="flex flex-col items-center leading-none min-w-0 select-none w-full">
            <span className="text-[10px] font-sans font-black text-white group-hover:text-amber-400 transition-colors truncate max-w-[100px] text-center">
              {identity?.displayName || 'NovaStar'}
            </span>
            <span className="text-[7.5px] font-mono font-black text-emerald-400 mt-1 tracking-widest">
              ● ONLINE
            </span>
            <div className="mt-0.5 flex flex-col items-center gap-0.5 font-mono font-black leading-none">
              <span
                className="text-[7.5px] px-1.5 py-0.5 rounded border tracking-wider"
                style={{
                  borderColor: `${accentColor}40`,
                  color: accentColor,
                  backgroundColor: `${accentColor}10`
                }}
              >
                LVL {currentLevel}
              </span>
              <span className="text-[7.5px] text-zinc-400 tracking-wide">
                {currentPoints.toLocaleString()} XP
              </span>
            </div>
          </div>
          <div className="text-zinc-500 group-hover:text-white transition-colors shrink-0 mt-0">
            {isProfileOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isProfileOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute bottom-[130px] left-0.5 right-0.5 z-50 overflow-hidden flex flex-col p-2 gap-2.5 bg-[#0a0c16]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-[114px]"
            >
              {/* Telemetry Analytics */}
              <div className="flex flex-col gap-0.5 w-full select-none text-[8px] font-mono leading-none">
                <span className="text-[7px] font-mono tracking-widest text-zinc-500 font-bold block uppercase leading-none mb-1">
                  TELEMETRY
                </span>
                <div className="flex justify-between text-zinc-400 py-0.5 border-b border-white/5">
                  <span>ALT:</span>
                  <span className="text-amber-400 font-bold">410KM</span>
                </div>
                <div className="flex justify-between text-zinc-400 py-0.5 border-b border-white/5">
                  <span>WARP:</span>
                  <span className="font-bold" style={{ color: accentColor }}>9.8x</span>
                </div>
                <div className="flex justify-between text-zinc-400 py-0.5">
                  <span>FUEL:</span>
                  <span className="text-emerald-400 font-bold">84%</span>
                </div>
              </div>

              {/* Quick Pick Theme/Travel Locations */}
              <div className="flex flex-col gap-1 border-t border-white/5 pt-1.5 w-full">
                <span className="text-[7px] font-mono tracking-widest text-zinc-500 font-bold block uppercase leading-none mb-1">
                  LAUNCH TO
                </span>
                {[
                  { name: 'SOLAR', preset: 'solar-flare', color: '#f59e0b' },
                  { name: 'NEBULA', preset: 'nebula-purple', color: '#a855f7' },
                  { name: 'DEEP', preset: 'oceanic-blue', color: '#0ea5e9' },
                  { name: 'AURORA', preset: 'aurora-green', color: '#10b981' }
                ].map((loc) => (
                  <button
                    key={loc.preset}
                    onClick={() => {
                      if (onApplyThemePreset) onApplyThemePreset(loc.preset as any);
                    }}
                    className="w-full py-1 px-1.5 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 flex items-center gap-1 text-zinc-300 hover:text-white transition-all text-left cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: loc.color }} />
                    <span className="text-[7.5px] font-mono font-black tracking-tight leading-none">{loc.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
