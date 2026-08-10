# Shared Workspace and Theme Bridge

SPMT is the source of truth for account-backed workspace appearance and the canonical shared account surfaces. SpaceMountain is a host and consumer: it reads `WorkspaceProfileV1`, renders host-specific chrome and saved overlay output, and embeds SPMT-owned Settings, Worktray, and Overlay Bay instead of maintaining separate active editors.

## Ownership

SPMT owns:

- `WorkspaceProfileV1`, including the four presets and the full appearance/accessibility/voice/layout contract;
- Universal Settings at `/embed/settings`;
- Worktray and the three account dock slots at `/embed/worktray`;
- Overlay Bay and overlay-workspace editing at `/embed/overlays`;
- Commlink, notifications, and profile shared surfaces.

SpaceMountain owns its suite-specific dashboard, launcher, crew desk context, arena, and other host workflows. It may render SPMT-backed dock slots and overlay widgets, but persisted shared state remains authoritative in SPMT.

## Canonical surfaces

Apps should embed the SPMT surfaces rather than copy their editors:

```text
https://spmt.live/embed/settings?mode=full&app=<app-id>
https://spmt.live/embed/worktray?mode=dock&app=<app-id>
https://spmt.live/embed/overlays?mode=full&app=<app-id>
https://spmt.live/embed/commlink?mode=panel&app=<app-id>
```

The `app` value is a public host identifier. Tokens, API keys, passwords, authorization codes, and other credentials must never be placed in these URLs.

## Update invalidation

An SPMT shared surface notifies its host after canonical state changes:

```ts
type SpmtSurfaceUpdatedMessage = {
  type: 'spmt.surface.updated';
  surface: 'settings' | 'worktray' | 'overlays' | 'commlink' | 'notifications' | 'profile';
  revision?: number;
  changed?: string[];
};
```

The message is only an invalidation signal. A host must re-read the authoritative SPMT API instead of trusting profile or workspace data delivered through `postMessage`.

Example host listener:

```ts
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://spmt.live') return;
  if (event.data?.type !== 'spmt.surface.updated') return;

  if (event.data.surface === 'settings' || event.data.surface === 'worktray') {
    reloadWorkspaceProfileFromSpmt();
  }

  if (event.data.surface === 'overlays') {
    reloadOverlayWorkspaceFromSpmt();
  }
});
```

## Theme relay to app-owned embeds

SpaceMountain can still relay its currently loaded SPMT appearance to app-owned iframes so those apps can style host-integrated surfaces immediately. That relay is a presentation bridge, **not** the source of truth. Connected apps should treat it as derived state and re-read SPMT when durable account state is required.

Current relay messages use the versioned `SPACEMOUNTAIN_THEME` envelope for compatibility with existing consumers. New integrations should not infer ownership from the message name.

## Rollout rules

- Keep app workflows and information architecture app-specific.
- Put account-wide settings, dock-slot editing, and overlay editing in SPMT once.
- Use the shared tokens for shell surfaces, buttons, focus states, status chips, and embed chrome.
- A host may cache SPMT state for startup/offline visibility, but the cache is never authoritative.
- Listen for `spmt.surface.updated`, then re-read SPMT.
- Support top-level use when no host is present.
- Apply global appearance fields everywhere; apply chat and voice fields only where those capabilities exist.
