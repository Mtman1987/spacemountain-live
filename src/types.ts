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
  appUrl?: string | null;
  embedUrl?: string | null;
  popoutUrl?: string | null;
  authUrl?: string | null;
  healthUrl?: string | null;
  manifestVersion?: 'spmt.app-manifest/v1';
  registrySource?: 'first-party' | 'approved-partner';
  capabilities?: string[];
  surfaces?: string[];
  integration?: Record<string, 'native' | 'connected' | 'declared' | 'unavailable' | 'not-applicable'>;
  lastCheckedAt?: string | null;
  responseMs?: number | null;
  installed?: boolean;
  enabled?: boolean;
  permissions?: string[];
  version?: string;
  latestVersion?: string;
  updateAvailable?: boolean;
  distribution?: 'web' | 'windows-desktop';
  downloadUrl?: string | null;
  signed?: boolean;
}

export interface DashboardStats {
  totalUsers: number;
  totalTools: number;
  pointsAwarded: number;
  onlineApps: number;
  checkedApps: number;
  scansCount: number;
  mediaJobsCount: number;
}

export interface HearMeOutRoom {
  index?: number;
  id: string;
  name: string;
  description?: string;
  activeCount?: number;
  roomUrl?: string;
  overlayUrl?: string;
  watchMovieSessionId?: string;
  watchMusicSessionId?: string;
}

export interface ChatTagPlayer {
  id?: string;
  username?: string;
  twitchUsername?: string;
  displayName?: string;
  name?: string;
  score?: number;
  points?: number;
  tags?: number;
  isIt?: boolean;
}

export interface ChatTagHistoryItem {
  id?: string;
  tagger?: string;
  target?: string;
  tagged?: string;
  timestamp?: string | number;
  createdAt?: string;
}

export interface ChatTagState {
  players?: ChatTagPlayer[];
  currentIt?: string | null;
  lastTagTime?: number | string | null;
  history?: ChatTagHistoryItem[];
  adminHistory?: ChatTagHistoryItem[];
  monthlyWinners?: ChatTagPlayer[];
}

export interface CommunityShoutout {
  id: string;
  category: 'spotlight' | 'partners' | 'crew' | 'mountaineers' | string;
  groupName?: string | null;
  twitchLogin?: string | null;
  displayName: string;
  title?: string | null;
  description?: string | null;
  gameName?: string | null;
  viewerCount?: number;
  streamUrl?: string | null;
  avatarUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  bannerUrl?: string | null;
  sourceMessageUrl?: string | null;
  discordUserId?: string | null;
  serverId?: string | null;
  isLive?: boolean;
  isSpotlight?: boolean;
  startedAt?: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface CommunityShoutoutFeed {
  shoutouts: CommunityShoutout[];
  spotlight: CommunityShoutout[];
  partners: CommunityShoutout[];
  crew: CommunityShoutout[];
  mountaineers: CommunityShoutout[];
  analytics: {
    liveCount: number;
    totalViewers: number;
    lastUpdatedAt?: string | null;
    categoryCounts: Record<string, number>;
  };
}

export interface QuackverseSummary {
  state?: any;
  viewer?: any;
  players?: any[];
  turn?: any;
  updatedAt?: string | null;
  error?: string;
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
  handle?: string;
  recoveryEmail: string | null;
  role: string;
  status: string;
  points: number;
  xp?: number;
  level?: number;
  avatarSpeaking: boolean;
  createdAt: string;
  discordUsername?: string | null;
  discordId?: string | null;
  twitchUsername?: string | null;
  twitchId?: string | null;
}

export interface UserPreferences {
  userId: string;
  theme: string;
  accentColor: string | null;
  accentSaturation: number;
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
  borderGlow: boolean;
  hoverGlow: boolean;
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
  pushToTalkKey: string;
  micButtonStyle: 'filled' | 'outline' | 'minimal';
  voiceWaveStyle: 'bars' | 'wave' | 'pulse';
  highContrast: boolean;
  colorVisionMode: 'default' | 'deuteranopia' | 'protanopia' | 'tritanopia';
  textScale: 'sm' | 'md' | 'lg';
  reduceMotion: boolean;
  focusHighlight: boolean;
}

export type EmbeddedAppTarget = {
  title: string;
  url: string;
  kind: 'app' | 'game' | 'overlay' | 'dashboard';
};

export type EmbedSlot = EmbeddedAppTarget & {
  id: number;
  collapsed: boolean;
  volume: number;
  muted: boolean;
};

export type WorkspaceAppearanceV2 = {
  themeId: string;
  accentColor?: string | null;
  accentSaturation?: number;
  glowIntensity: number;
  starDensity: number;
  glassOpacity: number;
  blurStrength: number;
  nebulaIntensity: number;
  parallaxDepth: number;
  borderStrength: number;
  borderGlow?: boolean;
  hoverGlow?: boolean;
  cornerRadius: UserPreferences['cornerRadius'];
  density: UserPreferences['uiDensity'];
  sidebarCollapsed: boolean;
  sidebarStyle: UserPreferences['sidebarStyle'];
  sidebarPosition: UserPreferences['sidebarPosition'];
  topbarStyle: UserPreferences['topbarStyle'];
  tabStyle: UserPreferences['tabStyle'];
  tabPosition: UserPreferences['tabPosition'];
  chatTransparency: number;
  showAvatars: boolean;
  smoothTransitions: boolean;
  pushToTalk: boolean;
  pushToTalkKey?: string;
  micButtonStyle?: UserPreferences['micButtonStyle'];
  voiceWaveStyle?: UserPreferences['voiceWaveStyle'];
  accessibility?: {
    highContrast: boolean;
    colorVisionMode: UserPreferences['colorVisionMode'];
    textScale: UserPreferences['textScale'];
    reduceMotion: boolean;
    focusHighlight: boolean;
  };
  animation: {
    enabled: boolean;
    speed: number;
    particles: boolean;
    shootingStars: boolean;
  };
};

// V1 profiles remain readable; missing V2 fields are hydrated from defaults.
export type WorkspaceAppearanceV1 = WorkspaceAppearanceV2;

export type SavedWorkspaceTheme = {
  id: string;
  name: string;
  appearance: WorkspaceAppearanceV1;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceDockSlotV1 = {
  id: 1 | 2 | 3;
  title: string;
  url: string;
  collapsed: boolean;
  volume: number;
  muted: boolean;
};

export type WorkspaceProfileV1 = {
  schemaVersion: 1;
  revision: number;
  appearance: WorkspaceAppearanceV2;
  dockSlots: WorkspaceDockSlotV1[];
  activeOverlaySceneId: string | null;
  ttsSubscriptions: string[];
  appThemeMappings: Record<string, string>;
  savedThemes?: SavedWorkspaceTheme[];
  updatedAt: string;
};
