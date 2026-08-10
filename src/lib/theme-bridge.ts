import type { ThemePreset } from './theme-presets';
import type { UserPreferences } from '../types';

export const SPMT_THEME_MESSAGE = 'SPACEMOUNTAIN_THEME' as const;

export type SpmtThemeMessage = {
  type: typeof SPMT_THEME_MESSAGE;
  source: 'spacemountain.live';
  version: 2;
  theme: {
    id: string;
    name: string;
    accent: string;
    secondary: string;
    surface: string;
    border: string;
    text: string;
    density: UserPreferences['uiDensity'];
    cornerRadius: UserPreferences['cornerRadius'];
    motion: boolean;
  };
  appearance: Omit<UserPreferences, 'userId'>;
};

export function createThemeMessage(theme: ThemePreset, preferences: UserPreferences): SpmtThemeMessage {
  const { userId: _userId, ...appearance } = preferences;
  return {
    type: SPMT_THEME_MESSAGE,
    source: 'spacemountain.live',
    version: 2,
    theme: {
      id: theme.id,
      name: theme.name,
      accent: theme.glowHex,
      secondary: theme.secondaryHex,
      surface: preferences.highContrast ? 'rgba(0, 0, 0, 0.96)' : 'rgba(6, 8, 22, 0.88)',
      border: preferences.borderGlow ? `${theme.glowHex}55` : `${theme.glowHex}2b`,
      text: '#F8FAFC',
      density: preferences.uiDensity,
      cornerRadius: preferences.cornerRadius,
      motion: preferences.uiAnimations && !preferences.reduceMotion,
    },
    appearance,
  };
}
