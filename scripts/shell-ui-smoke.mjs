import assert from 'node:assert/strict';
import fs from 'node:fs';

const authServer = fs.readFileSync(new URL('../auth-server.ts', import.meta.url), 'utf8');
const homeRoute = fs.readFileSync(new URL('../src/features/home/HomeRoute.tsx', import.meta.url), 'utf8');
const rocketDock = fs.readFileSync(new URL('../src/components/RocketDock.tsx', import.meta.url), 'utf8');
const collapseCss = fs.readFileSync(new URL('../src/sidebar-collapse.css', import.meta.url), 'utf8');

assert.match(authServer, /pathname === '\/auth\/login'/, 'SpaceMountain should own a visible branded login route');
assert.match(authServer, /pathname === '\/auth\/continue'/, 'login hero should continue into the SPMT OAuth flow');
assert.match(authServer, /space-logo-main\.png/, 'login hero should show the canonical SpaceMountain logo');
assert.match(authServer, /spacemountain_oauth_state/, 'login continuation must preserve OAuth state protection');
assert.match(homeRoute, /space-logo-main\.png/, 'home welcome hero should show the canonical logo');
assert.match(rocketDock, /sm-sidebar-collapsed/, 'RocketDock should drive the collapsed shell state');
assert.match(rocketDock, /\/api\/spmt\/api\/workspace-profile/, 'sidebar collapse should persist to the canonical SPMT workspace profile');
assert.match(collapseCss, /header\.fixed/, 'collapsed sidebar should release header space');
assert.match(collapseCss, /main\.flex-1/, 'collapsed sidebar should release main content space');

console.log('SpaceMountain shell UI smoke checks passed');
