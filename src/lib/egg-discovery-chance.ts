export type DiscoveryChanceState = { attempts: number; lastAttemptAt: number; lastOpenedAt: number };
export const DISCOVERY_COOLDOWN_MS = 30 * 60 * 1000;

export function rollDiscoveryChance(
  state: DiscoveryChanceState,
  source: 'rocket' | 'navigation',
  now: number,
  random: () => number = Math.random,
): { open: boolean; state: DiscoveryChanceState } {
  if ((state.lastOpenedAt > 0 && now - state.lastOpenedAt < DISCOVERY_COOLDOWN_MS)
    || (state.lastAttemptAt > 0 && now - state.lastAttemptAt < 10_000)) return { open: false, state };
  const attempts = Math.max(0, state.attempts) + 1;
  // Browsing gives a real chance; sustained curiosity eventually gets a break.
  const chance = Math.min(.25, (source === 'rocket' ? .08 : .03) + (attempts - 1) * .004);
  const open = attempts >= 30 || random() < chance;
  return { open, state: { attempts: open ? 0 : attempts, lastAttemptAt: now, lastOpenedAt: open ? now : state.lastOpenedAt } };
}
