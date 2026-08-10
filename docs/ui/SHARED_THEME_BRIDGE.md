# Shared Theme Bridge

SpaceMountain sends the active workspace appearance to every managed iframe with a versioned `postMessage` event. Connected apps can adopt this contract without copying the parent site's layout code.

## Message

```ts
type SpmtThemeMessage = {
  type: 'SPACEMOUNTAIN_THEME';
  source: 'spacemountain.live';
  version: 2;
  theme: {
    id: 'solar-flare' | 'nebula-purple' | 'oceanic-blue' | 'aurora-green';
    name: string;
    accent: string;
    secondary: string;
    surface: string;
    border: string;
    text: string;
    density: 'compact' | 'comfortable' | 'spacious';
    cornerRadius: 'sm' | 'md' | 'lg' | 'full';
    motion: boolean;
  };
  appearance: {
    // Full account-backed WorkspaceAppearance V2 preference set.
    theme: string;
    accentColor: string | null;
    accentSaturation: number;
    glowIntensity: number;
    glassOpacity: number;
    blurStrength: number;
    starDensity: number;
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
    shootingStars: boolean;
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
  };
};
```

## App listener

```ts
window.addEventListener('message', (event) => {
  if (event.data?.type !== 'SPACEMOUNTAIN_THEME' || event.data?.version !== 2) return;

  const theme = event.data.theme;
  const root = document.documentElement;
  root.dataset.spmtTheme = theme.id;
  root.style.setProperty('--spmt-accent', theme.accent);
  root.style.setProperty('--spmt-secondary', theme.secondary);
  root.style.setProperty('--spmt-surface', theme.surface);
  root.style.setProperty('--spmt-border', theme.border);
  root.style.setProperty('--spmt-text', theme.text);
  root.dataset.spmtDensity = event.data.appearance.uiDensity;
  root.dataset.spmtContrast = event.data.appearance.highContrast ? 'high' : 'standard';
});
```

## Universal settings surface

Every app can open the canonical account-backed settings UI instead of maintaining a copy:

```text
https://spacemountain.live/settings?embed=1&app=<app-id>
```

The `app` value identifies the host for capability labels and future per-app overrides. The embedded page intentionally omits the SpaceMountain navigation shell while preserving the same theme, accessibility, save, reset, import, and export behavior.

## Rollout rules

- Keep app workflows and information architecture app-specific.
- Use the shared tokens for shell surfaces, buttons, focus states, status chips, and embed chrome.
- Keep labels as live text; theme artwork should not contain interface copy.
- Support top-level use even when no parent theme message is received.
- Ignore unknown message versions instead of guessing their shape.
- Apply global fields everywhere; apply chat and voice fields only when that capability exists.
