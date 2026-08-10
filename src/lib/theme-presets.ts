export const THEME_IDS = [
  'solar-flare',
  'nebula-purple',
  'oceanic-blue',
  'aurora-green',
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemePreset = {
  id: ThemeId;
  name: string;
  shortName: string;
  description: string;
  glowHex: string;
  secondaryHex: string;
  backgroundImage: string;
  gradientClass: string;
};

export const THEME_PRESETS: Record<ThemeId, ThemePreset> = {
  'solar-flare': {
    id: 'solar-flare',
    name: 'Solar Flare',
    shortName: 'Solar',
    description: 'Warm, energetic, and forged in orange-gold light.',
    glowHex: '#F97316',
    secondaryHex: '#FBBF24',
    backgroundImage: '/assets/theme-solar-flare-background.webp',
    gradientClass: 'from-orange-500 to-amber-400',
  },
  'nebula-purple': {
    id: 'nebula-purple',
    name: 'Nebula Purple',
    shortName: 'Nebula',
    description: 'Dreamy violet energy with a deep cosmic edge.',
    glowHex: '#A855F7',
    secondaryHex: '#E879F9',
    backgroundImage: '/assets/theme-nebula-purple-background.webp',
    gradientClass: 'from-fuchsia-500 to-violet-500',
  },
  'oceanic-blue': {
    id: 'oceanic-blue',
    name: 'Oceanic Blue',
    shortName: 'Oceanic',
    description: 'Calm blue depth with clean cyan highlights.',
    glowHex: '#3B82F6',
    secondaryHex: '#22D3EE',
    backgroundImage: '/assets/theme-oceanic-blue-background.webp',
    gradientClass: 'from-blue-500 to-cyan-400',
  },
  'aurora-green': {
    id: 'aurora-green',
    name: 'Aurora Green',
    shortName: 'Aurora',
    description: 'Vibrant emerald light inspired by an alpine aurora.',
    glowHex: '#10B981',
    secondaryHex: '#A3E635',
    backgroundImage: '/assets/theme-aurora-green-background.webp',
    gradientClass: 'from-emerald-500 to-lime-400',
  },
};

export const THEME_PRESET_LIST = THEME_IDS.map((id) => THEME_PRESETS[id]);

export function getThemePreset(value?: string | null): ThemePreset {
  return THEME_PRESETS[value as ThemeId] || THEME_PRESETS['solar-flare'];
}

function saturateHex(hex: string, saturationPercent = 100): string {
  const value = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return hex;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(...channels);
  const min = Math.min(...channels);
  const lightness = (max + min) / 2;
  if (max === min) return hex.toUpperCase();
  const delta = max - min;
  let saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === channels[0]) hue = (channels[1] - channels[2]) / delta + (channels[1] < channels[2] ? 6 : 0);
  else if (max === channels[1]) hue = (channels[2] - channels[0]) / delta + 2;
  else hue = (channels[0] - channels[1]) / delta + 4;
  hue /= 6;
  saturation *= Math.max(0, Math.min(1.5, saturationPercent / 100));
  saturation = Math.min(1, saturation);

  const hueToRgb = (p: number, q: number, tValue: number) => {
    let t = tValue;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  return `#${[hueToRgb(p, q, hue + 1 / 3), hueToRgb(p, q, hue), hueToRgb(p, q, hue - 1 / 3)]
    .map((channel) => Math.round(channel * 255).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

export function resolveThemePreset(value?: string | null, accentColor?: string | null, saturationPercent = 100): ThemePreset {
  const preset = getThemePreset(value);
  return {
    ...preset,
    glowHex: saturateHex(accentColor || preset.glowHex, saturationPercent),
    secondaryHex: saturateHex(preset.secondaryHex, saturationPercent),
  };
}
