from pathlib import Path

path = Path('server.ts')
text = path.read_text()

old = """const SPMT_SESSION_COOKIE = 'spacemountain_spmt_session';
const SPMT_REFRESH_COOKIE = 'spacemountain_spmt_refresh';
"""
new = old + """
let spmtXpClientToken = '';
let spmtXpClientTokenExpiresAt = 0;

async function getSpmtXpClientToken() {
  const now = Date.now();
  if (spmtXpClientToken && now < spmtXpClientTokenExpiresAt - 30_000) return spmtXpClientToken;

  const clientSecret = String(process.env.SPACEMOUNTAIN_CLIENT_SECRET || '').trim();
  if (!clientSecret) return '';

  try {
    const response = await fetch(`${SPMT_BASE_URL}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: 'spacemountain-live',
        client_secret: clientSecret,
        scope: 'xp:write',
      }),
    });
    const data = await response.json() as any;
    if (!response.ok || !data?.access_token) return '';
    spmtXpClientToken = String(data.access_token);
    spmtXpClientTokenExpiresAt = now + Math.max(60, Number(data.expires_in || 900)) * 1000;
    return spmtXpClientToken;
  } catch {
    return '';
  }
}
"""
if old not in text:
    raise SystemExit('SPMT cookie constants block not found')
text = text.replace(old, new, 1)

old = """async function awardSpmtXp(input: {
  userId: string;
  accessToken: string;
  eventType: Extract<XpMappedEventTypeV1, 'spacemountain.tool.trigger' | 'spacemountain.arena.kill'>;
  upstreamEventId: string;
  delta: number;
  metadata?: Record<string, unknown>;
}) {
  if (!input.accessToken) return { skipped: true, reason: 'SPMT OAuth session not available' };

  const award = mappedXpAwardV1({"""
new = """async function awardSpmtXp(input: {
  userId: string;
  eventType: Extract<XpMappedEventTypeV1, 'spacemountain.tool.trigger' | 'spacemountain.arena.kill'>;
  upstreamEventId: string;
  delta: number;
  metadata?: Record<string, unknown>;
}) {
  const serviceToken = await getSpmtXpClientToken();
  if (!serviceToken) return { skipped: true, reason: 'SPMT OAuth client credentials unavailable' };

  const award = mappedXpAwardV1({"""
if old not in text:
    raise SystemExit('awardSpmtXp signature block not found')
text = text.replace(old, new, 1)

old = "Authorization: `Bearer ${input.accessToken}`"
new = "Authorization: `Bearer ${serviceToken}`"
if old not in text:
    raise SystemExit('XP authorization header not found')
text = text.replace(old, new, 1)

removed = text.count("          accessToken: readCookie(req.headers.cookie, SPMT_SESSION_COOKIE),\n")
text = text.replace("          accessToken: readCookie(req.headers.cookie, SPMT_SESSION_COOKIE),\n", "")
removed += text.count("        accessToken: readCookie(req.headers.cookie, SPMT_SESSION_COOKIE),\n")
text = text.replace("        accessToken: readCookie(req.headers.cookie, SPMT_SESSION_COOKIE),\n", "")
if removed != 2:
    raise SystemExit(f'expected to remove 2 user bearer XP call-site arguments, removed {removed}')

old = "? { status: 'configured', auth: 'spmt-oauth-session' }"
new = "? { status: 'configured', auth: 'spmt-oauth-client-credentials' }"
if old not in text:
    raise SystemExit('XP health auth label not found')
text = text.replace(old, new, 1)

path.write_text(text)
