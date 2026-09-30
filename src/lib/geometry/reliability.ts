import type { LandmarkPoint } from "../../types/landmarks";

/** Pose joints below this visibility are treated as guesses, not measurements. */
export const MIN_VISIBILITY = 0.6;

/**
 * True when a landmark can be trusted as a measurement:
 *  - it exists,
 *  - its visibility (if the model reported one) is >= minVisibility,
 *  - it lies inside the frame (off-frame joints are extrapolated by the model).
 *
 * A missing `visibility` counts as visible: face-mesh points carry none, and
 * the live pose stream now always supplies it.
 */
export function isReliable(
  p: LandmarkPoint | undefined | null,
  minVisibility: number = MIN_VISIBILITY
): p is LandmarkPoint {
  if (!p) return false;
  if (p.visibility !== undefined && p.visibility < minVisibility) return false;
  return p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
}
