const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export interface CooldownStatus {
  onCooldown: boolean;
  daysRemaining: number;
  lastScanAt: number | null;
}

export function computeCooldown(lastScanAt: number | null, now: number = Date.now()): CooldownStatus {
  if (lastScanAt === null) {
    return { onCooldown: false, daysRemaining: 0, lastScanAt: null };
  }
  const remaining = COOLDOWN_MS - (now - lastScanAt);
  return {
    onCooldown: remaining > 0,
    daysRemaining: remaining > 0 ? Math.ceil(remaining / (24 * 60 * 60 * 1000)) : 0,
    lastScanAt,
  };
}
