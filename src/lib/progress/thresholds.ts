export const MDC95: Record<string, number> = {};

export const UNCALIBRATED_EPSILON = 1.5;

export function mdcFor(key: string): { epsilon: number; calibrated: boolean } {
  const v = MDC95[key];
  return typeof v === "number" && v > 0
    ? { epsilon: v, calibrated: true }
    : { epsilon: UNCALIBRATED_EPSILON, calibrated: false };
}
