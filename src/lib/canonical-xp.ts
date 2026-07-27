export type CanonicalXpBalance = {
  xp: number;
  level: number;
};

export function parseCanonicalXpBalance(value: unknown): CanonicalXpBalance | null {
  if (!value || typeof value !== 'object') return null;
  const xp = Number((value as any).xp);
  const level = Number((value as any).level);
  if (!Number.isFinite(xp) || !Number.isFinite(level)) return null;
  return {
    xp: Math.max(0, Math.trunc(xp)),
    level: Math.max(1, Math.trunc(level)),
  };
}
