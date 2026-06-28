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
  healthUrl?: string | null;
  lastCheckedAt?: string | null;
  responseMs?: number | null;
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
