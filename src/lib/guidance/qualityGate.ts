import type { QualityReport } from "../../types/landmarks";

export interface FrameEvaluation {
  accepted: boolean;
  reason: string;
}

const MIN_BRIGHTNESS = 50;
const MAX_BRIGHTNESS = 210;
const MIN_SHARPNESS = 12;
const MIN_FRAME_ALIGNMENT = 0.75;

export function evaluateFrame(params: {
  quality: QualityReport;
  alignmentProgress: number;
}): FrameEvaluation {
  const { quality, alignmentProgress } = params;

  if (!quality.faceDetected) {
    return { accepted: false, reason: "No face detected" };
  }
  if (quality.brightness < MIN_BRIGHTNESS) {
    return { accepted: false, reason: "Too dark" };
  }
  if (quality.brightness > MAX_BRIGHTNESS) {
    return { accepted: false, reason: "Overexposed" };
  }
  if (quality.sharpness < MIN_SHARPNESS) {
    return { accepted: false, reason: "Too blurry" };
  }
  if (alignmentProgress < MIN_FRAME_ALIGNMENT) {
    return { accepted: false, reason: "Lost alignment" };
  }

  return { accepted: true, reason: "Accepted" };
}
