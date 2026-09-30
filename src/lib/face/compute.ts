import type { LandmarkPoint } from "../../types/landmarks";
import type { FaceMetrics } from "../../types/faceMetrics";
import { computeCanthalTilt, computeFaceShape, computeSymmetry } from "./geometry";
import { analyzeSkin } from "./skinAnalysis";
import { buildFaceMetrics } from "./score";

export interface FaceReading {
  metrics: FaceMetrics;
  faceShape: string;
  /** Un-scored quantities, for calibration. */
  raw: { faceRatio: number; jawToCheek: number };
}

/**
 * Every face metric from one capture. Shared by the results screen and the
 * repeatability harness so both always measure exactly the same thing.
 * Null when any required landmark is missing.
 */
export function computeFaceReading(
  landmarks: LandmarkPoint[],
  aspect: number,
  imageData: ImageData
): FaceReading | null {
  const canthal = computeCanthalTilt(landmarks, aspect);
  const shape = computeFaceShape(landmarks, aspect);
  const symmetry = computeSymmetry(landmarks, aspect);
  if (!canthal || !shape || !symmetry) return null;

  const skin = analyzeSkin(imageData, landmarks);
  if (!skin) return null;

  return {
    metrics: buildFaceMetrics({
      subScores: [canthal.subScore, shape.subScore, symmetry.subScore, skin.darkCircle, skin.pores],
      angles: [canthal.angle, shape.widthGuide, shape.heightGuide],
      undertone: skin.undertone,
    }),
    faceShape: shape.shape,
    raw: { faceRatio: shape.ratio, jawToCheek: shape.jawToCheek },
  };
}
