# SpaceMountain.live

SpaceMountain.live is the Command Bridge for the SpaceMountain ecosystem.

It is the user-facing workspace where creators launch apps, read Commlink messages, manage notifications, view docs, work with Athena, and control connected creator tools.

## Relationship To SPMT

SPMT is the Creator Cloud.

SpaceMountain.live is the Command Bridge.

Apps are specialized modules connected through SPMT.

## Core Areas

- Dashboard
- Shipyard
- Commlink
- Athena
- Docs
- Notifications
- Docked apps
- Creator workspace

## Companion overlay surface

`/?desktopOverlay=1` is the transparent renderer used by SpaceMountain
Companion. It deliberately paints no page background. Only enabled personal
widgets and the three saved dock-slot shells are rendered.

- Personal-widget visibility and opacity come from the saved SpaceMountain
  overlay layout.
- Dock Show/Hide state comes from the portable workspace profile.
- Dock glass opacity and blur follow the shared SpaceMountain appearance.
- Commlink Live Chat is available as a dock preset and as a personal-overlay
  widget, using the authenticated StreamWeaver embed bridge.
- Companion interaction mode adds a visible focus frame, dock Show/Hide
  controls, and a **Done** button; outside that mode the native window returns
  to click-through.

## Documentation

Start with `docs/DOCS_HOME.md`.

The docs are organized for creators, developers, contributors, and product/marketing work.
