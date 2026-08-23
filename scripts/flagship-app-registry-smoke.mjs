import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appSource = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
const typeSource = fs.readFileSync(path.resolve('src/types.ts'), 'utf8');

assert.match(appSource, /app\.launchUrl \|\| app\.url/);
assert.match(appSource, /healthUrl: app\.healthUrl \|\| null/);
assert.match(appSource, /registrySource: app\.registrySource/);
assert.match(appSource, /capabilities: Array\.isArray\(app\.capabilities\)/);
assert.match(appSource, /integration: app\.integration \|\|/);
assert.match(appSource, /SPMT flagship/);
assert.match(appSource, /Approved partner/);
assert.match(appSource, /Health declared/);
assert.match(appSource, /Object\.entries\(app\.integration\)/);
assert.match(typeSource, /manifestVersion\?: 'spmt\.app-manifest\/v1'/);
assert.match(typeSource, /registrySource\?: 'first-party' \| 'approved-partner'/);

console.log('Flagship app registry consumer contract passed.');
