const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync('server.ts', 'utf8');

test('SpaceMountain XP uses SPMT OAuth client credentials', () => {
  assert.match(source, /grant_type: 'client_credentials'/);
  assert.match(source, /scope: 'xp:write'/);
  assert.match(source, /Authorization: `Bearer \$\{serviceToken\}`/);
  assert.match(source, /auth: 'spmt-oauth-client-credentials'/);
});

test('user SPMT session bearer is not passed to platform XP', () => {
  const awardBlock = source.slice(source.indexOf('async function awardSpmtXp'), source.indexOf('async function getHydratedTools'));
  assert.doesNotMatch(awardBlock, /input\.accessToken|SPMT_SESSION_COOKIE/);
  assert.doesNotMatch(source, /accessToken: readCookie\(req\.headers\.cookie, SPMT_SESSION_COOKIE\)/);
});
