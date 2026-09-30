import type { LandmarkPoint } from "../../types/landmarks";
import type { AngleMeasurement, SubScore } from "../../types/faceMetrics";
import { metricDist } from "../geometry/space";

const L_EYE_OUTER = 33;
const L_EYE_INNER = 133;
const R_EYE_INNER = 362;
const R_EYE_OUTER = 263;
const NOSE_TIP = 1;
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
      // 100 at the 1.35 target, -1 point per 0.01 of deviation. (The previous
      // formula saturated at 100 for every ratio in ~0.83-1.87, i.e. all faces.)
      value: clamp(100 - Math.abs(ratio - 1.35) * 100, 0, 100),
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

export function computeSymmetry(
  landmarks: LandmarkPoint[],
  aspect: number
): SymmetryResult | null {
  const nose = landmarks[NOSE_TIP];
  const lEye = landmarks[L_EYE_OUTER];
  const rEye = landmarks[R_EYE_OUTER];
  const lMouth = landmarks[MOUTH_L];
  const rMouth = landmarks[MOUTH_R];
  if (!nose || !lEye || !rEye || !lMouth || !rMouth) return null;

  const eyeToNoseL = metricDist(lEye, nose, aspect);
  const eyeToNoseR = metricDist(rEye, nose, aspect);
  const mouthToNoseL = metricDist(lMouth, nose, aspect);
  const mouthToNoseR = metricDist(rMouth, nose, aspect);

  const eyeAsymmetry = Math.abs(eyeToNoseL - eyeToNoseR) / ((eyeToNoseL + eyeToNoseR) / 2);
  const mouthAsymmetry = Math.abs(mouthToNoseL - mouthToNoseR) / ((mouthToNoseL + mouthToNoseR) / 2);
  const avgAsymmetry = (eyeAsymmetry + mouthAsymmetry) / 2;

  const value = clamp(100 - avgAsymmetry * 300, 0, 100);

  return {
    subScore: { key: "symmetry", label: "Facial symmetry", value, actionable: false },
  };
}
