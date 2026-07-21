import type { LandmarkPoint } from "../../types/landmarks";
import type { AngleMeasurement, SubScore } from "../../types/faceMetrics";

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

function angleDeg(a: LandmarkPoint, b: LandmarkPoint): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

function dist(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export interface CanthalTiltResult {
  subScore: SubScore;
  angle: AngleMeasurement;
}

export function computeCanthalTilt(landmarks: LandmarkPoint[]): CanthalTiltResult | null {
  const lOuter = landmarks[L_EYE_OUTER];
  const lInner = landmarks[L_EYE_INNER];
  const rInner = landmarks[R_EYE_INNER];
  const rOuter = landmarks[R_EYE_OUTER];
  if (!lOuter || !lInner || !rInner || !rOuter) return null;

  const leftTiltDeg = -angleDeg(lInner, lOuter);
  const rightTiltDeg = angleDeg(rInner, rOuter);
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

export function computeFaceShape(landmarks: LandmarkPoint[]): FaceShapeResult | null {
  const forehead = landmarks[FOREHEAD];
  const chin = landmarks[CHIN];
  const lCheek = landmarks[L_CHEEKBONE];
  const rCheek = landmarks[R_CHEEKBONE];
  const lJaw = landmarks[L_JAW];
  const rJaw = landmarks[R_JAW];
  if (!forehead || !chin || !lCheek || !rCheek || !lJaw || !rJaw) return null;

  const faceHeight = dist(forehead, chin);
  const cheekWidth = dist(lCheek, rCheek);
  const jawWidth = dist(lJaw, rJaw);
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
      value: clamp(50 + (1.35 - Math.abs(ratio - 1.35)) * 60, 0, 100),
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

export function computeSymmetry(landmarks: LandmarkPoint[]): SymmetryResult | null {
  const nose = landmarks[NOSE_TIP];
  const lEye = landmarks[L_EYE_OUTER];
  const rEye = landmarks[R_EYE_OUTER];
  const lMouth = landmarks[MOUTH_L];
  const rMouth = landmarks[MOUTH_R];
  if (!nose || !lEye || !rEye || !lMouth || !rMouth) return null;

  const eyeToNoseL = dist(lEye, nose);
  const eyeToNoseR = dist(rEye, nose);
  const mouthToNoseL = dist(lMouth, nose);
  const mouthToNoseR = dist(rMouth, nose);

  const eyeAsymmetry = Math.abs(eyeToNoseL - eyeToNoseR) / ((eyeToNoseL + eyeToNoseR) / 2);
  const mouthAsymmetry = Math.abs(mouthToNoseL - mouthToNoseR) / ((mouthToNoseL + mouthToNoseR) / 2);
  const avgAsymmetry = (eyeAsymmetry + mouthAsymmetry) / 2;

  const value = clamp(100 - avgAsymmetry * 300, 0, 100);

  return {
    subScore: { key: "symmetry", label: "Facial symmetry", value, actionable: false },
  };
}
