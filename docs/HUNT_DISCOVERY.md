# Rocket hunt discovery

The docked rocket and the RocketDock navigation buttons now have an occasional chance to release the rocket and reveal the existing Arena portal. The navigation click still completes. A real click is evaluated after 450 ms so double-click behavior remains separate; the flight controller receives a named release event rather than a synthesized mouse gesture.

First eligible chances are 8% on the rocket and 3% on dock navigation. Each failed eligible interaction increases the chance by 0.4 percentage points up to 25%; the thirtieth eligible interaction guarantees a discovery opportunity. At most one roll occurs per ten seconds. A portal reveal starts a 30-minute automatic-discovery cooldown, preserved across reloads in session storage. Hidden pages, an already-open portal, an already-flying rocket, and the Arena page do not roll.

Manual double-click behavior remains available. Docking hides the portal. Finding the portal does not grant a reward: guiding the rocket into it still invokes the existing account-scoped discovery recorder and retry flow.

Validation: npm run test:rocket-easter-egg covers RNG, spam throttling, cooldown, unlucky-user assistance, and the existing account-safe completion retries. npm run lint and npm run build also pass.
