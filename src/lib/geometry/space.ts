import type { LandmarkPoint } from "../../types/landmarks";

/**
 * MediaPipe returns landmarks normalised per-axis: x in [0,1] of frame WIDTH,
 * y in [0,1] of frame HEIGHT. On any non-square frame, one normalised unit on
 * x is a different physical length than one on y, so raw distances/angles are
 * distorted. Every geometry function therefore takes the frame `aspect`
 * (width / height) and measures in a single isotropic space.
 */

/** The format useCamera requests (640x480). Alignment thresholds were tuned in it. */
export const REFERENCE_ASPECT = 4 / 3;

/** Falls back to the reference aspect for missing / non-finite / absurd values. */
export function sanitizeAspect(aspect: number | null | undefined): number {
  if (typeof aspect !== "number" || !Number.isFinite(aspect)) return REFERENCE_ASPECT;
  if (aspect < 0.2 || aspect > 5) return REFERENCE_ASPECT;
  return aspect;
}

/** Aspect of a frame, sanitised. */
export function aspectOf(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return REFERENCE_ASPECT;
  return sanitizeAspect(width / height);
}

/** Distance in FRAME-HEIGHT units (isotropic). */
export function metricDist(a: LandmarkPoint, b: LandmarkPoint, aspect: number): number {
  const dx = (b.x - a.x) * aspect;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Angle of a->b in degrees, y-down image space, measured isotropically. */
export function metricAngleDeg(a: LandmarkPoint, b: LandmarkPoint, aspect: number): number {
  const dx = (b.x - a.x) * aspect;
  const dy = b.y - a.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Convert a normalised offset to REFERENCE-WIDTH units: the unit in which the
 * alignment thresholds (0.18 interocular, 0.08 centre tolerance, ...) were
 * tuned on a 4:3 frame. At aspect === REFERENCE_ASPECT the x axis is unchanged.
 */
export function toReferenceUnits(
  dxNorm: number,
  dyNorm: number,
  aspect: number
): { x: number; y: number } {
  return { x: (dxNorm * aspect) / REFERENCE_ASPECT, y: dyNorm / REFERENCE_ASPECT };
}

/**
 * Pixel size for a captured still: fixed width, height derived from the real
 * video aspect so the saved photo is never stretched.
 */
export function scaledFrameSize(aspect: number, width: number): { width: number; height: number } {
  const a = sanitizeAspect(aspect);
  return { width, height: Math.max(1, Math.round(width / a)) };
}
