import type { LandmarkPoint } from "../../types/landmarks";
import type { AngleMeasurement, SubScore } from "../../types/faceMetrics";
import { metricDist } from "../geometry/space";

const L_EYE_OUTER = 33;
const L_EYE_INNER = 133;
const R_EYE_INNER = 362;
const R_EYE_OUTER = 263;
const CHIN = 152;
const FOREHEAD = 10;
const L_CHEEKBONE = 234;
const R_CHEEKBONE = 454;
const L_JAW = 172;
const R_JAW = 397;
const MOUTH_L = 61;
const MOUTH_R = 291;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export interface CanthalTiltResult {
  subScore: SubScore;
  angle: AngleMeasurement;
}

/**
 * Tilt of one eye's inner->outer canthus line relative to horizontal, in
 * degrees. POSITIVE = outer corner sits HIGHER than the inner corner.
 *
 * `outwardSign` is -1 for the eye on the image-left (its outer corner has the
 * smaller x) and +1 for the eye on the image-right, so that the horizontal
 * run is always positive and a level eye reads exactly 0.
 *
 * Head roll adds +phi to one eye and -phi to the other, so the two-eye average
 * used by computeCanthalTilt is roll-invariant.
 */
function eyeTiltDeg(
  inner: LandmarkPoint,
  outer: LandmarkPoint,
  outwardSign: -1 | 1,
  aspect: number
): number {
  const run = (outer.x - inner.x) * aspect * outwardSign; // > 0 for a normal face
  const rise = inner.y - outer.y; // > 0 when the outer corner is higher (y grows downward)
  return (Math.atan2(rise, run) * 180) / Math.PI;
}

/** Score = 50 at 0deg, +4 points per degree of positive tilt, clamped to [0,100]. */
export function computeCanthalTilt(
  landmarks: LandmarkPoint[],
  aspect: number
): CanthalTiltResult | null {
  const lOuter = landmarks[L_EYE_OUTER];
  const lInner = landmarks[L_EYE_INNER];
  const rInner = landmarks[R_EYE_INNER];
  const rOuter = landmarks[R_EYE_OUTER];
  if (!lOuter || !lInner || !rInner || !rOuter) return null;

  const leftTiltDeg = eyeTiltDeg(lInner, lOuter, -1, aspect);
  const rightTiltDeg = eyeTiltDeg(rInner, rOuter, 1, aspect);
  const avgTilt = (leftTiltDeg + rightTiltDeg) / 2;

  const value = clamp(50 + avgTilt * 4, 0, 100);

  return {
    subScore: {
      key: "canthalTilt",
      label: "Canthal tilt",
      value,
      raw: avgTilt,
      actionable: false,
    },
    angle: { label: "canthal tilt", valueDeg: Number(avgTilt.toFixed(1)), points: [lInner, lOuter] },
  };
}

export interface FaceShapeResult {
  subScore: SubScore;
  shape: string;
  widthGuide: AngleMeasurement;
  heightGuide: AngleMeasurement;
}

export function computeFaceShape(
  landmarks: LandmarkPoint[],
  aspect: number
): FaceShapeResult | null {
  const forehead = landmarks[FOREHEAD];
  const chin = landmarks[CHIN];
  const lCheek = landmarks[L_CHEEKBONE];
  const rCheek = landmarks[R_CHEEKBONE];
  const lJaw = landmarks[L_JAW];
  const rJaw = landmarks[R_JAW];
  if (!forehead || !chin || !lCheek || !rCheek || !lJaw || !rJaw) return null;

  const faceHeight = metricDist(forehead, chin, aspect);
  const cheekWidth = metricDist(lCheek, rCheek, aspect);
  const jawWidth = metricDist(lJaw, rJaw, aspect);
  const ratio = faceHeight / cheekWidth;
  const jawToCheek = jawWidth / cheekWidth;

  let shape = "oval";
  if (ratio > 1.5) shape = "long";
  else if (ratio < 1.25 && jawToCheek > 0.9) shape = "round";
  else if (jawToCheek > 0.95) shape = "square";
  else if (jawToCheek < 0.75) shape = "heart";

  return {
    subScore: {
      key: "faceShape",
      label: "Face shape ratio",
      value: clamp(100 - Math.abs(ratio - 1.35) * 100, 0, 100),
      raw: ratio,
      actionable: false,
    },
    shape,
    widthGuide: { label: "cheek width", valueDeg: 0, points: [lCheek, rCheek] },
    heightGuide: { label: "face height", valueDeg: 0, points: [forehead, chin] },
  };
}

export interface SymmetryResult {
  subScore: SubScore;
}

const MIDLINE_TOP = 168; // nasal bridge, between the eyes
const MIDLINE_BOTTOM = CHIN; // 152
/** Mirrored landmark pairs: outer eyes, inner eyes, mouth corners, cheekbones, jaw. */
const SYMMETRY_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [L_EYE_OUTER, R_EYE_OUTER],
  [L_EYE_INNER, R_EYE_INNER],
  [MOUTH_L, MOUTH_R],
  [L_CHEEKBONE, R_CHEEKBONE],
  [L_JAW, R_JAW],
];
const MIN_SYMMETRY_PAIRS = 3;

/**
 * Left/right symmetry about the facial midline (nasal bridge -> chin).
 *
 * For each mirrored pair we take the SIGNED perpendicular distance of each
 * point from the midline. A symmetric pair has equal and opposite distances,
 * so asymmetry = 2|sl + sr| / (|sl| + |sr|) (same scale as the old
 * nose-distance ratio: 0 = identical, 0.22 = one side 25% wider).
 *
 * Because distances are perpendicular to the midline itself, in-plane head roll
 * cancels out. The nose tip is NOT used: it sticks out in 3D, so any yaw moved
 * it sideways and read as asymmetry. Residual yaw is handled by the capture
 * gate (see qualityGate.ts), not here.
 */
export function computeSymmetry(
  landmarks: LandmarkPoint[],
  aspect: number
): SymmetryResult | null {
  const top = landmarks[MIDLINE_TOP];
  const bottom = landmarks[MIDLINE_BOTTOM];
  if (!top || !bottom) return null;

  const ux = (bottom.x - top.x) * aspect;
  const uy = bottom.y - top.y;
  const len = Math.hypot(ux, uy);
  if (len < 1e-6) return null;

  const signedDist = (p: LandmarkPoint): number =>
    ((p.x - top.x) * aspect * uy - (p.y - top.y) * ux) / len;

  const asymmetries: number[] = [];
  for (const [li, ri] of SYMMETRY_PAIRS) {
    const l = landmarks[li];
    const r = landmarks[ri];
    if (!l || !r) continue;
    const sl = signedDist(l);
    const sr = signedDist(r);
    const width = Math.abs(sl) + Math.abs(sr);
    if (width < 1e-6) continue;
    asymmetries.push((2 * Math.abs(sl + sr)) / width);
  }
  if (asymmetries.length < MIN_SYMMETRY_PAIRS) return null;

  const avgAsymmetry = asymmetries.reduce((a, b) => a + b, 0) / asymmetries.length;
  const value = clamp(100 - avgAsymmetry * 300, 0, 100);

  return {
    subScore: { key: "symmetry", label: "Facial symmetry", value, raw: avgAsymmetry, actionable: false },
  };
}
