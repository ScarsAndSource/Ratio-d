import type { QualityReport } from "../../types/landmarks";

export interface FrameEvaluation {
  accepted: boolean;
  reason: string;
}

const MIN_BRIGHTNESS = 50;
const MAX_BRIGHTNESS = 210;
const MIN_SHARPNESS = 10;
const MIN_FRAME_ANGLE_MATCH = 0.7;

export function evaluateBodyFrame(params: {
  quality: QualityReport;
  alignmentProgress: number;
  angleMatch: number;
}): FrameEvaluation {
  const { quality, alignmentProgress, angleMatch } = params;

  if (!quality.poseDetected) {
    return { accepted: false, reason: "No body detected" };
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
  if (angleMatch < MIN_FRAME_ANGLE_MATCH) {
    return { accepted: false, reason: "Wrong angle for this step" };
  }
  if (alignmentProgress < 0.6) {
    return { accepted: false, reason: "Lost alignment" };
  }

  return { accepted: true, reason: "Accepted" };
}
