import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Accessibility,
  Check,
  Download,
  Flame,
  Layout,
  MessageSquare,
  Mic2,
  MonitorCog,
  Palette,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SavedWorkspaceTheme, UserPreferences, WorkspaceProfileV1 } from '../types';
import { THEME_PRESET_LIST, type ThemeId } from '../lib/theme-presets';
import { preferencesToWorkspaceAppearance, workspaceAppearanceToPreferences } from '../lib/workspace-profile';

export interface SettingsPanelProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onApplyThemePreset: (preset: ThemeId) => void;
  accentColor: string;
  workspaceProfile?: WorkspaceProfileV1 | null;
  onUpdateWorkspaceProfile?: (patch: Partial<Pick<WorkspaceProfileV1, 'ttsSubscriptions' | 'appThemeMappings' | 'savedThemes'>>) => void;
}

type SectionId = 'appearance' | 'cosmos' | 'layout' | 'chat' | 'motion' | 'voice' | 'accessibility' | 'themes';

const SECTIONS: Array<{ id: SectionId; label: string; icon: LucideIcon }> = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'cosmos', label: 'Background & Cosmos', icon: Sparkles },
  { id: 'layout', label: 'Layout & Density', icon: Layout },
  { id: 'chat', label: 'Chat & Tabs', icon: MessageSquare },
  { id: 'motion', label: 'Motion & Effects', icon: WandSparkles },
  { id: 'voice', label: 'Voice UI', icon: Mic2 },
  { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
  { id: 'themes', label: 'Save / Load Theme', icon: Save },
];

const ACCENT_COLORS = ['#F97316', '#EF4444', '#A855F7', '#3B82F6', '#22D3EE', '#10B981', '#A3E635', '#FBBF24', '#F8FAFC'];

function RangeSetting({ label, value, min, max, suffix = '%', accentColor, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  accentColor: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-xs text-zinc-300">
        <span>{label}</span>
        <span className="font-mono text-[11px] text-white">{value}{suffix}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number.parseInt(event.target.value, 10))}
        className="h-1 w-full cursor-pointer rounded-full bg-zinc-800"
        style={{ accentColor }}
      />
    </label>
  );
}

function ToggleSetting({ label, description, checked, accentColor, onChange }: {
  label: string;
  description?: string;
  checked: boolean;
  accentColor: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 border-t border-white/5 py-3 text-left first:border-t-0 first:pt-0 last:pb-0">
      <span>
        <span className="block text-xs font-bold text-zinc-200">{label}</span>
        {description && <span className="mt-0.5 block text-[10px] leading-4 text-zinc-500">{description}</span>}
      </span>
      <span className="relative h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors" style={{ backgroundColor: checked ? accentColor : '#27272a' }}>
        <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

function Segmented<T extends string>({ label, value, options, accentColor, onChange }: {
  label: string;
  value: T;
  options: readonly T[];
  accentColor: string;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-xs text-zinc-300">{label}</span>
      <div className="grid gap-1 rounded-xl border border-white/5 bg-black/35 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className="truncate rounded-lg px-2 py-2 text-[10px] font-bold capitalize text-zinc-400 transition"
              style={active ? { color: '#fff', border: `1px solid ${accentColor}55`, backgroundColor: `${accentColor}20` } : undefined}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SettingCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
      <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{title}</h3>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPanel({
  preferences,
  onUpdatePreferences,
  onApplyThemePreset,
  accentColor,
  workspaceProfile,
  onUpdateWorkspaceProfile,
}: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('appearance');
  const [themeName, setThemeName] = useState('My SpaceMountain Theme');
  const [libraryMessage, setLibraryMessage] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  const savedThemes = workspaceProfile?.savedThemes || [];
  const ttsSubscriptions = workspaceProfile?.ttsSubscriptions || [];
  const appThemeMappings = workspaceProfile?.appThemeMappings || {};

  const resetDefaults = () => onUpdatePreferences({
    accentColor: null,
    accentSaturation: 100,
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
    borderGlow: true,
    hoverGlow: true,
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
    pushToTalkKey: 'V',
    micButtonStyle: 'filled',
    voiceWaveStyle: 'wave',
    highContrast: false,
    colorVisionMode: 'default',
    textScale: 'md',
    reduceMotion: false,
    focusHighlight: true,
  });

  const saveTheme = () => {
    if (!onUpdateWorkspaceProfile) {
      setLibraryMessage('Sign in to save themes to your SPMT account.');
      return;
    }
    const now = new Date().toISOString();
    const saved: SavedWorkspaceTheme = {
      id: `theme-${Date.now()}`,
      name: themeName.trim() || 'Custom Theme',
      appearance: preferencesToWorkspaceAppearance(preferences),
      createdAt: now,
      updatedAt: now,
    };
    onUpdateWorkspaceProfile({ savedThemes: [...savedThemes, saved] });
    setLibraryMessage(`${saved.name} saved to your workspace.`);
  };

  const applySavedTheme = (saved: SavedWorkspaceTheme) => {
    const next = workspaceAppearanceToPreferences(saved.appearance, preferences.userId, preferences);
    const { userId: _userId, ...patch } = next;
    onUpdatePreferences(patch);
    setLibraryMessage(`${saved.name} applied.`);
  };

  const deleteSavedTheme = (themeId: string) => {
    onUpdateWorkspaceProfile?.({ savedThemes: savedThemes.filter((saved) => saved.id !== themeId) });
  };

  const importTheme = async (file: File | null) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<SavedWorkspaceTheme> & { appearance?: SavedWorkspaceTheme['appearance'] };
      if (!parsed.appearance?.themeId) throw new Error('Missing appearance');
      const now = new Date().toISOString();
      const imported: SavedWorkspaceTheme = {
        id: `theme-${Date.now()}`,
        name: parsed.name || file.name.replace(/\.json$/i, '') || 'Imported Theme',
        appearance: parsed.appearance,
        createdAt: now,
        updatedAt: now,
      };
      applySavedTheme(imported);
      if (onUpdateWorkspaceProfile) onUpdateWorkspaceProfile({ savedThemes: [...savedThemes, imported] });
      setLibraryMessage(`${imported.name} imported and applied.`);
    } catch {
      setLibraryMessage('That file is not a valid SpaceMountain theme.');
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const updateTtsSubscription = (subscription: string, enabled: boolean) => {
    if (!onUpdateWorkspaceProfile) return;
    const next = enabled
      ? Array.from(new Set([...ttsSubscriptions, subscription]))
      : ttsSubscriptions.filter((item) => item !== subscription);
    onUpdateWorkspaceProfile({ ttsSubscriptions: next });
  };

  const updateAppThemeMapping = (appId: string, mapping: string) => {
    onUpdateWorkspaceProfile?.({ appThemeMappings: { ...appThemeMappings, [appId]: mapping } });
  };

  const renderSection = () => {
    if (activeSection === 'appearance') return (
      <div className="grid gap-4 xl:grid-cols-2">
        <SettingCard title="Accent color">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onUpdatePreferences({ accentColor: null })} className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 text-[10px] font-bold text-zinc-300">
              <Flame size={13} /> Preset
            </button>
            {ACCENT_COLORS.map((color) => (
              <button key={color} type="button" onClick={() => onUpdatePreferences({ accentColor: color })} aria-label={`Use ${color} accent`} className="grid h-9 w-9 place-items-center rounded-full border border-white/15" style={{ backgroundColor: color, boxShadow: preferences.accentColor === color ? `0 0 0 2px #050505, 0 0 0 4px ${color}` : undefined }}>
                {preferences.accentColor === color && <Check size={14} className="text-black" />}
              </button>
            ))}
          </div>
          <RangeSetting label="Accent saturation" value={preferences.accentSaturation} min={20} max={150} accentColor={accentColor} onChange={(value) => onUpdatePreferences({ accentSaturation: value })} />
          <RangeSetting label="Glow intensity" value={preferences.glowIntensity} min={0} max={100} accentColor={accentColor} onChange={(value) => onUpdatePreferences({ glowIntensity: value })} />
        </SettingCard>
        <SettingCard title="Glass surfaces">
          <RangeSetting label="Glass opacity" value={preferences.glassOpacity} min={20} max={95} accentColor={accentColor} onChange={(value) => onUpdatePreferences({ glassOpacity: value })} />
          <RangeSetting label="Blur strength" value={preferences.blurStrength} min={0} max={40} suffix="px" accentColor={accentColor} onChange={(value) => onUpdatePreferences({ blurStrength: value })} />
          <ToggleSetting label="Border glow" checked={preferences.borderGlow} accentColor={accentColor} onChange={(borderGlow) => onUpdatePreferences({ borderGlow })} />
          <ToggleSetting label="Hover glow" checked={preferences.hoverGlow} accentColor={accentColor} onChange={(hoverGlow) => onUpdatePreferences({ hoverGlow })} />
        </SettingCard>
      </div>
    );

    if (activeSection === 'cosmos') return (
      <div className="grid gap-4 xl:grid-cols-2">
        <SettingCard title="Background & cosmos">
          <RangeSetting label="Star density" value={preferences.starDensity} min={0} max={100} accentColor={accentColor} onChange={(value) => onUpdatePreferences({ starDensity: value })} />
          <RangeSetting label="Nebula intensity" value={preferences.nebulaIntensity} min={0} max={100} accentColor={accentColor} onChange={(value) => onUpdatePreferences({ nebulaIntensity: value })} />
          <RangeSetting label="Parallax depth" value={preferences.parallaxDepth} min={0} max={100} accentColor={accentColor} onChange={(value) => onUpdatePreferences({ parallaxDepth: value })} />
          <ToggleSetting label="Shooting stars" checked={preferences.shootingStars} accentColor={accentColor} onChange={(shootingStars) => onUpdatePreferences({ shootingStars })} />
        </SettingCard>
        <SettingCard title="Theme presets">
          <div className="grid gap-2 sm:grid-cols-2">
            {THEME_PRESET_LIST.map((preset) => (
              <button key={preset.id} type="button" onClick={() => onApplyThemePreset(preset.id)} className="overflow-hidden rounded-xl border p-3 text-left" style={{ borderColor: preferences.theme === preset.id ? accentColor : 'rgba(255,255,255,.08)', backgroundImage: `linear-gradient(110deg, ${preset.glowHex}22, rgba(0,0,0,.42)), url(${preset.backgroundImage})`, backgroundSize: 'cover' }}>
                <span className="block text-xs font-black text-white">{preset.name}</span>
                <span className="mt-1 block text-[10px] text-zinc-300">{preset.shortName} workspace</span>
              </button>
            ))}
          </div>
        </SettingCard>
      </div>
    );

    if (activeSection === 'layout') return (
      <div className="grid gap-4 xl:grid-cols-2">
        <SettingCard title="Surface & density">
          <Segmented label="UI density" value={preferences.uiDensity} options={['compact', 'comfortable', 'spacious'] as const} accentColor={accentColor} onChange={(uiDensity) => onUpdatePreferences({ uiDensity })} />
          <RangeSetting label="Border strength" value={preferences.borderStrength} min={0} max={100} accentColor={accentColor} onChange={(value) => onUpdatePreferences({ borderStrength: value })} />
          <Segmented label="Corner radius" value={preferences.cornerRadius} options={['sm', 'md', 'lg', 'full'] as const} accentColor={accentColor} onChange={(cornerRadius) => onUpdatePreferences({ cornerRadius })} />
        </SettingCard>
        <SettingCard title="Application shell">
          <Segmented label="Sidebar style" value={preferences.sidebarStyle} options={['docked', 'floating', 'hidden'] as const} accentColor={accentColor} onChange={(sidebarStyle) => onUpdatePreferences({ sidebarStyle })} />
          <Segmented label="Sidebar position" value={preferences.sidebarPosition} options={['left', 'right'] as const} accentColor={accentColor} onChange={(sidebarPosition) => onUpdatePreferences({ sidebarPosition })} />
          <ToggleSetting label="Icon-only sidebar" description="Keeps the shell narrow while preserving navigation." checked={preferences.sidebarCollapsed} accentColor={accentColor} onChange={(sidebarCollapsed) => onUpdatePreferences({ sidebarCollapsed })} />
          <Segmented label="Topbar style" value={preferences.topbarStyle} options={['transparent', 'glass'] as const} accentColor={accentColor} onChange={(topbarStyle) => onUpdatePreferences({ topbarStyle })} />
        </SettingCard>
      </div>
    );

    if (activeSection === 'chat') return (
      <div className="grid gap-4 xl:grid-cols-2">
        <SettingCard title="Chat surfaces">
          <RangeSetting label="Chat transparency" value={preferences.chatTransparency} min={10} max={95} accentColor={accentColor} onChange={(value) => onUpdatePreferences({ chatTransparency: value })} />
          <ToggleSetting label="Show avatars in chat" checked={preferences.showAvatars} accentColor={accentColor} onChange={(showAvatars) => onUpdatePreferences({ showAvatars })} />
        </SettingCard>
        <SettingCard title="Tabs">
          <Segmented label="Tab style" value={preferences.tabStyle} options={['pills', 'underline', 'cards'] as const} accentColor={accentColor} onChange={(tabStyle) => onUpdatePreferences({ tabStyle })} />
          <Segmented label="Tab position" value={preferences.tabPosition} options={['top', 'bottom', 'left', 'right'] as const} accentColor={accentColor} onChange={(tabPosition) => onUpdatePreferences({ tabPosition })} />
          <p className="rounded-xl border border-cyan-300/10 bg-cyan-300/[0.04] p-3 text-[10px] leading-4 text-zinc-400">These controls are stored everywhere and take effect in apps that provide chat or tab surfaces.</p>
        </SettingCard>
      </div>
    );

    if (activeSection === 'motion') return (
      <div className="grid gap-4 xl:grid-cols-2">
        <SettingCard title="Motion">
          <ToggleSetting label="UI animations" checked={preferences.uiAnimations} accentColor={accentColor} onChange={(uiAnimations) => onUpdatePreferences({ uiAnimations })} />
          <ToggleSetting label="Smooth transitions" checked={preferences.smoothTransitions} accentColor={accentColor} onChange={(smoothTransitions) => onUpdatePreferences({ smoothTransitions })} />
          <RangeSetting label="Animation speed" value={preferences.animationSpeed} min={20} max={200} suffix="%" accentColor={accentColor} onChange={(value) => onUpdatePreferences({ animationSpeed: value })} />
        </SettingCard>
        <SettingCard title="Effects">
          <ToggleSetting label="Particle effects" checked={preferences.particleEffects} accentColor={accentColor} onChange={(particleEffects) => onUpdatePreferences({ particleEffects })} />
          <ToggleSetting label="Shooting stars" checked={preferences.shootingStars} accentColor={accentColor} onChange={(shootingStars) => onUpdatePreferences({ shootingStars })} />
          <ToggleSetting label="Hover glow" checked={preferences.hoverGlow} accentColor={accentColor} onChange={(hoverGlow) => onUpdatePreferences({ hoverGlow })} />
        </SettingCard>
      </div>
    );

    if (activeSection === 'voice') return (
      <div className="grid gap-4 xl:grid-cols-2">
        <SettingCard title="Voice controls">
          <ToggleSetting label="Push to talk" description="Used by HearMeOut and other voice-enabled apps." checked={preferences.pushToTalk} accentColor={accentColor} onChange={(pushToTalk) => onUpdatePreferences({ pushToTalk })} />
          <label className="block text-xs text-zinc-300">Push-to-talk key
            <input value={preferences.pushToTalkKey} maxLength={12} onChange={(event) => onUpdatePreferences({ pushToTalkKey: event.target.value.toUpperCase() })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-black text-white outline-none" />
          </label>
        </SettingCard>
        <SettingCard title="Voice presentation">
          <Segmented label="Microphone button" value={preferences.micButtonStyle} options={['filled', 'outline', 'minimal'] as const} accentColor={accentColor} onChange={(micButtonStyle) => onUpdatePreferences({ micButtonStyle })} />
          <Segmented label="Waveform style" value={preferences.voiceWaveStyle} options={['bars', 'wave', 'pulse'] as const} accentColor={accentColor} onChange={(voiceWaveStyle) => onUpdatePreferences({ voiceWaveStyle })} />
          <div className="flex h-20 items-center justify-center gap-1 rounded-xl border border-white/5 bg-black/35" style={{ color: accentColor }}>
            {[18, 34, 48, 28, 42, 20, 36].map((height, index) => <span key={index} className={`w-1 ${preferences.voiceWaveStyle === 'pulse' ? 'rounded-full' : 'rounded-sm'}`} style={{ height: preferences.voiceWaveStyle === 'wave' ? `${Math.max(8, height - Math.abs(index - 3) * 5)}px` : `${height}px`, backgroundColor: 'currentColor' }} />)}
          </div>
        </SettingCard>
      </div>
    );

    if (activeSection === 'accessibility') return (
      <div className="grid gap-4 xl:grid-cols-2">
        <SettingCard title="Readability">
          <ToggleSetting label="High contrast" checked={preferences.highContrast} accentColor={accentColor} onChange={(highContrast) => onUpdatePreferences({ highContrast })} />
          <Segmented label="Text scale" value={preferences.textScale} options={['sm', 'md', 'lg'] as const} accentColor={accentColor} onChange={(textScale) => onUpdatePreferences({ textScale })} />
          <ToggleSetting label="Strong focus highlight" description="Makes keyboard focus rings easier to see." checked={preferences.focusHighlight} accentColor={accentColor} onChange={(focusHighlight) => onUpdatePreferences({ focusHighlight })} />
        </SettingCard>
        <SettingCard title="Motion & color">
          <Segmented label="Color vision mode" value={preferences.colorVisionMode} options={['default', 'deuteranopia', 'protanopia', 'tritanopia'] as const} accentColor={accentColor} onChange={(colorVisionMode) => onUpdatePreferences({ colorVisionMode })} />
          <ToggleSetting label="Reduce motion" description="Overrides animations and smooth transitions in every connected app." checked={preferences.reduceMotion} accentColor={accentColor} onChange={(reduceMotion) => onUpdatePreferences({ reduceMotion })} />
        </SettingCard>
      </div>
    );

    return (
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <SettingCard title="Save current theme">
            <label className="block text-xs text-zinc-300">Theme name
              <input value={themeName} onChange={(event) => setThemeName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none" />
            </label>
            <button type="button" onClick={saveTheme} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-zinc-950" style={{ backgroundColor: accentColor }}><Save size={14} /> Save theme</button>
            {libraryMessage && <p className="text-[10px] leading-4 text-zinc-400">{libraryMessage}</p>}
          </SettingCard>
          <SettingCard title="Import / export">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => downloadJson(`${themeName.trim().replace(/\s+/g, '-').toLowerCase() || 'spmt-theme'}.json`, { name: themeName, appearance: preferencesToWorkspaceAppearance(preferences) })} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200"><Download size={14} /> Export current</button>
              <button type="button" onClick={() => importInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200"><Upload size={14} /> Import theme</button>
              <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importTheme(event.target.files?.[0] || null)} />
            </div>
            <p className="text-[10px] leading-4 text-zinc-500">Theme files contain appearance settings only—never identity, messages, or account credentials.</p>
          </SettingCard>
        </div>

        <SettingCard title="Saved themes">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {savedThemes.map((saved) => (
              <div key={saved.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <span className="block truncate text-xs font-black text-white">{saved.name}</span>
                <span className="mt-1 block text-[9px] uppercase tracking-wide text-zinc-500">{saved.appearance.themeId}</span>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => applySavedTheme(saved)} className="flex-1 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] font-bold text-zinc-200">Apply</button>
                  <button type="button" onClick={() => downloadJson(`${saved.name.replace(/\s+/g, '-').toLowerCase()}.json`, saved)} aria-label={`Export ${saved.name}`} className="rounded-lg border border-white/10 p-1.5 text-zinc-400"><Download size={13} /></button>
                  <button type="button" onClick={() => deleteSavedTheme(saved.id)} aria-label={`Delete ${saved.name}`} className="rounded-lg border border-red-400/15 p-1.5 text-red-300"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
            {savedThemes.length === 0 && <p className="col-span-full rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-500">Save your first custom theme to make it available across connected apps.</p>}
          </div>
        </SettingCard>

        {workspaceProfile && onUpdateWorkspaceProfile && (
          <div className="grid gap-4 xl:grid-cols-2">
            <SettingCard title="Feature consumers">
              {['streamweaver', 'hearmeout', 'discord-stream-hub', 'chat-tag'].map((subscription) => (
                <label key={subscription} className="flex items-center justify-between gap-3 border-t border-white/5 py-2 text-xs text-zinc-200 first:border-0 first:pt-0">
                  <span>{subscription}</span>
                  <input type="checkbox" checked={ttsSubscriptions.includes(subscription)} onChange={(event) => updateTtsSubscription(subscription, event.target.checked)} style={{ accentColor }} />
                </label>
              ))}
            </SettingCard>
            <SettingCard title="Per-app theme mapping">
              {['discord-stream-hub', 'streamweaver', 'hearmeout', 'chat-tag'].map((appId) => (
                <label key={appId} className="grid grid-cols-[1fr_150px] items-center gap-2 border-t border-white/5 py-2 text-xs text-zinc-200 first:border-0 first:pt-0">
                  <span>{appId}</span>
                  <select value={appThemeMappings[appId] || 'follow-workspace'} onChange={(event) => updateAppThemeMapping(appId, event.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none">
                    {['follow-workspace', ...THEME_PRESET_LIST.map((preset) => preset.id)].map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
              ))}
            </SettingCard>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full rounded-3xl border bg-black/45 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl md:p-6" style={{ borderColor: `${accentColor}30` }}>
      <div className="mb-5 flex flex-col justify-between gap-4 border-b border-white/5 pb-5 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-white"><Sliders size={21} style={{ color: accentColor }} /> Universal UI Settings</h2>
          <p className="mt-1 text-xs text-zinc-400">One appearance profile for SpaceMountain and every connected app.</p>
        </div>
        <button type="button" onClick={resetDefaults} className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-zinc-300"><RotateCcw size={13} /> Reset appearance</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_250px]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Settings sections">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button key={id} type="button" onClick={() => setActiveSection(id)} className="flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[11px] font-bold transition lg:w-full" style={active ? { borderColor: `${accentColor}55`, backgroundColor: `${accentColor}18`, color: '#fff' } : { borderColor: 'transparent', color: '#a1a1aa' }}>
                <Icon size={14} style={active ? { color: accentColor } : undefined} /> {label}
              </button>
            );
          })}
        </nav>

        <motion.div key={activeSection} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
          {renderSection()}
        </motion.div>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-black/55 p-4">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-zinc-500"><span>Live preview</span><span style={{ color: accentColor }}>● Synced</span></div>
            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/50" style={{ borderRadius: preferences.cornerRadius === 'full' ? 28 : preferences.cornerRadius === 'lg' ? 20 : preferences.cornerRadius === 'sm' ? 8 : 14 }}>
              <div className="flex items-center gap-1.5 border-b border-white/10 p-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
                <span className="h-1.5 w-14 rounded-full bg-white/10" />
              </div>
              <div className="grid grid-cols-[45px_1fr] gap-2 p-2">
                <div className="space-y-2 rounded-lg border border-white/5 bg-white/[0.03] p-1.5">{[1, 2, 3, 4].map((item) => <span key={item} className="block h-2 rounded bg-white/10" />)}</div>
                <div className="space-y-2">
                  <div className="h-16 rounded-lg border p-2" style={{ borderColor: `${accentColor}45`, backgroundColor: `${accentColor}12`, boxShadow: preferences.borderGlow ? `0 0 ${preferences.glowIntensity / 5}px ${accentColor}28` : 'none' }}><span className="block h-2 w-2/3 rounded bg-white/20" /><span className="mt-2 block h-2 w-1/2 rounded bg-white/10" /></div>
                  <div className="grid grid-cols-2 gap-2"><span className="h-10 rounded-lg bg-white/[0.04]" /><span className="h-10 rounded-lg bg-white/[0.04]" /></div>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] text-zinc-500"><span>Density <b className="text-zinc-300">{preferences.uiDensity}</b></span><span>Text <b className="text-zinc-300">{preferences.textScale}</b></span><span>Motion <b className="text-zinc-300">{preferences.reduceMotion ? 'reduced' : 'active'}</b></span><span>Apps <b className="text-zinc-300">follow UI</b></span></div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-xs font-black text-white"><MonitorCog size={15} style={{ color: accentColor }} /> Universal scope</div>
            <p className="mt-2 text-[10px] leading-4 text-zinc-500">Global controls affect every app. Chat and voice controls remain stored everywhere and activate only where supported.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
