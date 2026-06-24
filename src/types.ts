export interface CommunityTool {
  id: string;
  name: string;
  description: string;
  badge: string;
  miniLabel: string;
  statusText: string;
  statusType: string;
  route: string;
  pointsFlow: number;
}

export interface BrandingConfig {
  domain: string;
  title: string;
  tagline: string;
  brandColor: string;
  accentColor: string;
  themeMode: 'cyber-noir' | 'cosmic-space';
  heroTitle: string;
  logoMark: string;
  backgroundGradient: string;
  accentPing: string;
  glowColor: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  username: string;
  recoveryEmail: string | null;
  role: string;
  status: string;
  points: number;
  avatarSpeaking: boolean;
  createdAt: string;
}

export interface UserPreferences {
  userId: string;
  theme: string;
  glowIntensity: number;
  starDensity: number;
  shootingStars: boolean;
  sidebarCollapsed: boolean;
  glassOpacity: number;
  blurStrength: number;
  nebulaIntensity: number;
  parallaxDepth: number;
  uiDensity: 'compact' | 'comfortable' | 'spacious';
  borderStrength: number;
  cornerRadius: 'sm' | 'md' | 'lg' | 'full';
  sidebarStyle: 'docked' | 'floating' | 'hidden';
  sidebarPosition: 'left' | 'right';
  topbarStyle: 'transparent' | 'glass';
  tabStyle: 'pills' | 'underline' | 'cards';
  tabPosition: 'top' | 'bottom' | 'left' | 'right';
  chatTransparency: number;
  showAvatars: boolean;
  uiAnimations: boolean;
  particleEffects: boolean;
  smoothTransitions: boolean;
  animationSpeed: number;
  pushToTalk: boolean;
}
