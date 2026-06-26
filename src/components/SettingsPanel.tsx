import React from 'react';
import { motion } from 'motion/react';
import {
  Flame,
  Layout,
  MessageSquare,
  RotateCcw,
  Sliders,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { UserPreferences } from '../types';

export interface SettingsPanelProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onApplyThemePreset: (preset: 'solar-flare' | 'nebula-purple' | 'oceanic-blue' | 'aurora-green') => void;
  accentColor: string;
}

type ThemeId = 'solar-flare' | 'nebula-purple' | 'oceanic-blue' | 'aurora-green';

type ThemePreset = {
  id: ThemeId;
  name: string;
  desc: string;
  color: string;
  accent: string;
};

const PRESETS: ThemePreset[] = [
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    desc: 'Warm • Energetic',
    color: 'from-orange-500 to-amber-500',
    accent: '#f97316',
  },
  {
    id: 'nebula-purple',
    name: 'Nebula Purple',
    desc: 'Cosmic • Dreamy',
    color: 'from-fuchsia-500 to-indigo-600',
    accent: '#a855f7',
  },
  {
    id: 'oceanic-blue',
    name: 'Oceanic Blue',
    desc: 'Calm • Deep',
    color: 'from-blue-500 to-cyan-500',
    accent: '#3b82f6',
  },
  {
    id: 'aurora-green',
    name: 'Aurora Green',
    desc: 'Vibrant • Natural',
    color: 'from-emerald-400 to-teal-500',
    accent: '#10b981',
  },
];

function parseIntSafe(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

export default function SettingsPanel({
  preferences,
  onUpdatePreferences,
  onApplyThemePreset,
  accentColor,
}: SettingsPanelProps) {
  const currentThemeId = (preferences.theme || 'solar-flare') as ThemeId;
  const animationFactor = Math.max(0.2, (preferences.animationSpeed || 85) / 100);

  const activePreset = PRESETS.find((p) => p.id === currentThemeId) ?? PRESETS[0];

  return (
    <div
      className="w-full bg-black/40 border rounded-3xl p-6 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500"
      style={{ borderColor: `${accentColor}20` }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/5">
        <div>
          <h2 className="text-xl font-sans font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders style={{ color: accentColor }} size={22} />
            Settings
          </h2>
          <p className="text-xs text-zinc-400 font-sans mt-1">
            Customize your experience. Changes sync across all your SpaceMountain apps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onUpdatePreferences({
                glowIntensity: 80,
                starDensity: 70,
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
                pushToTalk: true,
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono font-bold text-zinc-300 hover:text-white transition-all"
          >
            <RotateCcw size={12} />
            RESET DEFAULTS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left menu */}
        <div className="lg:col-span-3 flex flex-col gap-1 border-r border-white/5 pr-4">
          <button
            className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-white text-xs font-semibold text-left transition-all"
            style={{
              border: `1px solid ${accentColor}30`,
              background: `linear-gradient(90deg, ${accentColor}1a, ${accentColor}05, transparent)`,
            }}
          >
            <Sparkles size={14} style={{ color: accentColor }} />
            Appearance
          </button>
          <button className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] text-xs font-semibold text-left transition-all">
            <Flame size={14} />
            Theme Presets
          </button>
          <button className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] text-xs font-semibold text-left transition-all">
            <Layout size={14} />
            Layout & Density
          </button>
          <button className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] text-xs font-semibold text-left transition-all">
            <MessageSquare size={14} />
            Chat & Tabs
          </button>
          <button className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] text-xs font-semibold text-left transition-all">
            <SlidersHorizontal size={14} />
            Voice UI & Audio
          </button>
        </div>

        {/* Center settings */}
        <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Accent Color & Glass */}
          <div className="flex flex-col gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <span
              className="text-[10px] font-mono tracking-wider font-bold uppercase"
              style={{ color: accentColor }}
            >
              ✦ Accent Color & Glass
            </span>

            <div className="flex items-center gap-2.5 mt-1">
              {PRESETS.map((p) => {
                const active = currentThemeId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onApplyThemePreset(p.id)}
                    className={`w-6 h-6 rounded-full bg-gradient-to-br ${p.color} border transition-all duration-200 relative`}
                    style={{
                      borderColor: active ? '#ffffff' : 'rgba(255,255,255,0.1)',
                      boxShadow: active ? `0 0 12px ${p.accent}` : 'none',
                    }}
                    title={p.name}
                  >
                    {active && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-extrabold">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5">
              <div className="flex justify-between text-[11px] font-sans text-zinc-400 mb-1">
                <span>Glass Opacity</span>
                <span className="text-white font-mono">{preferences.glassOpacity}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={95}
                value={preferences.glassOpacity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdatePreferences({ glassOpacity: parseIntSafe(e.target.value) })
                }
                className="w-full bg-zinc-800 rounded-lg h-1"
                style={{ accentColor }}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-sans text-zinc-400 mb-1">
                <span>Blur Strength</span>
                <span className="text-white font-mono">{preferences.blurStrength}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={preferences.blurStrength}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdatePreferences({ blurStrength: parseIntSafe(e.target.value) })
                }
                className="w-full bg-zinc-800 rounded-lg h-1"
                style={{ accentColor }}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-sans text-zinc-400 mb-1">
                <span>Glow Intensity</span>
                <span className="text-white font-mono">{preferences.glowIntensity}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={preferences.glowIntensity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdatePreferences({ glowIntensity: parseIntSafe(e.target.value) })
                }
                className="w-full bg-zinc-800 rounded-lg h-1"
                style={{ accentColor }}
              />
            </div>
          </div>

          {/* Cosmic Background */}
          <div className="flex flex-col gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <span
              className="text-[10px] font-mono tracking-wider font-bold uppercase"
              style={{ color: accentColor }}
            >
              ✦ Cosmic Background
            </span>

            <div className="mt-1">
              <div className="flex justify-between text-[11px] font-sans text-zinc-400 mb-1">
                <span>Star Density</span>
                <span className="text-white font-mono">{preferences.starDensity}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={preferences.starDensity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdatePreferences({ starDensity: parseIntSafe(e.target.value) })
                }
                className="w-full bg-zinc-800 rounded-lg h-1"
                style={{ accentColor }}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-sans text-zinc-400 mb-1">
                <span>Nebula Intensity</span>
                <span className="text-white font-mono">{preferences.nebulaIntensity}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={preferences.nebulaIntensity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdatePreferences({ nebulaIntensity: parseIntSafe(e.target.value) })
                }
                className="w-full bg-zinc-800 rounded-lg h-1"
                style={{ accentColor }}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-sans text-zinc-400 mb-1">
                <span>Parallax Depth</span>
                <span className="text-white font-mono">{preferences.parallaxDepth}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={preferences.parallaxDepth}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdatePreferences({ parallaxDepth: parseIntSafe(e.target.value) })
                }
                className="w-full bg-zinc-800 rounded-lg h-1"
                style={{ accentColor }}
              />
            </div>
          </div>

          {/* Surface & UI */}
          <div className="flex flex-col gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <span
              className="text-[10px] font-mono tracking-wider font-bold uppercase"
              style={{ color: accentColor }}
            >
              ✦ Surface & UI
            </span>

            <div>
              <span className="text-[10px] text-zinc-400 block mb-1.5">UI Density</span>
              <div className="grid grid-cols-3 gap-0.5 bg-black/40 p-1 rounded-xl border border-white/5">
                {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => onUpdatePreferences({ uiDensity: d })}
                    className="py-1 px-0.5 text-[8.5px] font-semibold rounded-lg capitalize transition-all truncate"
                    style={
                      preferences.uiDensity === d
                        ? {
                            backgroundColor: `${accentColor}25`,
                            color: '#ffffff',
                            border: `1px solid ${accentColor}40`,
                          }
                        : { color: '#a1a1aa' }
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-sans text-zinc-400 mb-1">
                <span>Border Strength</span>
                <span className="text-white font-mono">{preferences.borderStrength}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={preferences.borderStrength}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdatePreferences({ borderStrength: parseIntSafe(e.target.value) })
                }
                className="w-full bg-zinc-800 rounded-lg h-1"
                style={{ accentColor }}
              />
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 block mb-1.5">Corner Radius</span>
              <div className="grid grid-cols-4 gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                {(['sm', 'md', 'lg', 'full'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => onUpdatePreferences({ cornerRadius: r })}
                    className="py-1 text-[10px] font-mono font-bold rounded-lg uppercase transition-all"
                    style={
                      preferences.cornerRadius === r
                        ? {
                            backgroundColor: `${accentColor}25`,
                            color: '#ffffff',
                            border: `1px solid ${accentColor}40`,
                          }
                        : { color: '#a1a1aa' }
                    }
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat & Tabs */}
          <div className="flex flex-col gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <span
              className="text-[10px] font-mono tracking-wider font-bold uppercase"
              style={{ color: accentColor }}
            >
              ✦ Chat & Tabs
            </span>

            <div>
              <span className="text-[10px] text-zinc-400 block mb-1.5">Tab Style</span>
              <div className="grid grid-cols-3 gap-0.5 bg-black/40 p-1 rounded-xl border border-white/5">
                {(['pills', 'underline', 'cards'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdatePreferences({ tabStyle: s })}
                    className="py-1 px-0.5 text-[8.5px] font-semibold rounded-lg capitalize transition-all truncate"
                    style={
                      preferences.tabStyle === s
                        ? {
                            backgroundColor: `${accentColor}25`,
                            color: '#ffffff',
                            border: `1px solid ${accentColor}40`,
                          }
                        : { color: '#a1a1aa' }
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-sans text-zinc-400 mb-1">
                <span>Chat Transparency</span>
                <span className="text-white font-mono">{preferences.chatTransparency}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={95}
                value={preferences.chatTransparency}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdatePreferences({ chatTransparency: parseIntSafe(e.target.value) })
                }
                className="w-full bg-zinc-800 rounded-lg h-1"
                style={{ accentColor }}
              />
            </div>

            <div className="flex items-center justify-between py-1 border-t border-white/5 mt-1">
              <span className="text-[11px] text-zinc-300 font-sans">Show Avatars in Chat</span>
              <button
                onClick={() => onUpdatePreferences({ showAvatars: !preferences.showAvatars })}
                className="w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none"
                style={{ backgroundColor: preferences.showAvatars ? accentColor : '#27272a' }}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${
                    preferences.showAvatars ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Motion & Effects */}
          <div className="flex flex-col gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <span
              className="text-[10px] font-mono tracking-wider font-bold uppercase"
              style={{ color: accentColor }}
            >
              ✦ Motion & Effects
            </span>

            {(
              [
                ['uiAnimations', 'UI Animations'],
                ['particleEffects', 'Particle Stars'],
                ['shootingStars', 'Shooting Stars'],
                ['smoothTransitions', 'Smooth Transitions'],
                ['pushToTalk', 'Push To Talk'],
              ] as const
            ).map(([key, label]) => {
              const value = preferences[key];
              return (
                <div key={key} className="flex items-center justify-between text-xs py-1 border-t border-white/5">
                  <span className="text-zinc-300">{label}</span>
                  <button
                    onClick={() => onUpdatePreferences({ [key]: !value } as Partial<UserPreferences>)}
                    className="w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none"
                    style={{ backgroundColor: value ? accentColor : '#27272a' }}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${
                        value ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}

            <div className="border-t border-white/5 pt-2">
              <div className="flex justify-between text-[11px] font-sans text-zinc-400 mb-1">
                <span>Animation Speed</span>
                <span className="text-white font-mono">{(preferences.animationSpeed || 85) / 100}x</span>
              </div>
              <input
                type="range"
                min={20}
                max={200}
                value={preferences.animationSpeed || 85}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdatePreferences({ animationSpeed: parseIntSafe(e.target.value) })
                }
                className="w-full bg-zinc-800 rounded-lg h-1"
                style={{ accentColor }}
              />
            </div>
          </div>
        </div>

        {/* Right preview */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <span
            className="text-[10px] font-mono tracking-wider font-bold uppercase"
            style={{ color: accentColor }}
          >
            ✦ Live Preview
          </span>

          <div className="w-full rounded-2xl bg-black/60 border border-white/10 p-4 relative overflow-hidden flex flex-col justify-between h-[230px] shadow-inner">
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <div className="absolute top-4 left-6 w-1 h-1 bg-white rounded-full animate-pulse" />
              <div className="absolute top-16 right-10 w-1 h-1 bg-white rounded-full" />
              <div className="absolute bottom-8 left-12 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" />
            </div>

            <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[8px] font-mono">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                <span className="text-zinc-400 text-[7px] font-bold">SpaceMountain.live</span>
              </div>
              <span className="font-bold animate-pulse" style={{ color: accentColor }}>
                ● ACTIVE
              </span>
            </div>

            <div className="flex flex-col items-center justify-center my-auto relative">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 relative border border-white/20"
                style={{
                  backgroundColor: `${activePreset.accent}${Math.round(
                    Math.max(20, Math.min(160, preferences.glassOpacity * 1.6))
                  )
                    .toString(16)
                    .padStart(2, '0')}`,
                  backdropFilter: `blur(${preferences.blurStrength / 2}px)`,
                  boxShadow: `0 0 ${preferences.glowIntensity / 3}px ${accentColor}80`,
                }}
              >
                <span className="text-xl">🚀</span>
                <div
                  className="absolute inset-0 rounded-full border animate-spin"
                  style={{
                    borderColor: `${accentColor}40`,
                    animationDuration: `${6 / animationFactor}s`,
                  }}
                />
              </div>
              <span className="text-[9px] font-bold text-white mt-2 font-mono">Mini HUD View</span>
              <span className="text-[7px] text-zinc-500 font-mono mt-0.5">Previewing your layout options</span>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[7px] font-mono text-zinc-500">
              <span>OPACITY: {preferences.glassOpacity}%</span>
              <span>BLUR: {preferences.blurStrength}px</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-3.5">
            <span className="text-[9px] font-mono font-bold text-zinc-400 block mb-2 uppercase">
              ✦ Current Active Theme
            </span>
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-br ${activePreset.color} flex items-center justify-center text-xs font-bold text-white`}
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{activePreset.name}</span>
                <span className="text-[9px] text-zinc-500 font-mono">Accent color synced across apps</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom preset cards */}
      <div className="mt-6 pt-5 border-t border-white/5">
        <span
          className="text-[10px] font-mono tracking-wider font-bold uppercase block mb-3.5"
          style={{ color: accentColor }}
        >
          ✦ Choose Theme Preset
        </span>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESETS.map((p) => {
            const isActive = currentThemeId === p.id;
            return (
              <motion.div
                key={p.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onApplyThemePreset(p.id)}
                className={`cursor-pointer rounded-2xl border p-3 flex items-center justify-between transition-all bg-black/40 ${
                  isActive ? 'shadow-lg bg-white/[0.02]' : 'border-white/5 hover:border-white/10'
                }`}
                style={
                  isActive
                    ? {
                        borderColor: accentColor,
                        boxShadow: `0 0 15px ${accentColor}25`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${p.color} flex-shrink-0 shadow-sm`}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white leading-none truncate">{p.name}</span>
                    <span className="text-[9px] text-zinc-500 font-sans mt-1 leading-none truncate">
                      {p.desc}
                    </span>
                  </div>
                </div>
                {isActive && (
                  <span className="text-xs font-bold flex-shrink-0 ml-2" style={{ color: accentColor }}>
                    ● ACTIVE
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
