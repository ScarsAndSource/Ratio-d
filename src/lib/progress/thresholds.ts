/**
 * Minimum detectable change (95%) per metric, in score points: the smallest
 * difference between two scans that is unlikely to be measurement noise.
 *
 * Empty on purpose until it has been MEASURED - do not guess numbers here.
 * To fill it: run `npm run dev`, finish a scan, use the REPEATABILITY panel
 * (10+ captures), then copy the `mdc95` column for
 *   face: "overall:unrounded"  ->  "score.overall"
 *   body: "overallSymmetry"    ->  "score.overallSymmetry"
 * While a key is missing the trend arrows use UNCALIBRATED_EPSILON.
 */
export const MDC95: Record<string, number> = {};

export const UNCALIBRATED_EPSILON = 1.5;

export function mdcFor(key: string): { epsilon: number; calibrated: boolean } {
  const v = MDC95[key];
  return typeof v === "number" && v > 0
    ? { epsilon: v, calibrated: true }
    : { epsilon: UNCALIBRATED_EPSILON, calibrated: false };
}
