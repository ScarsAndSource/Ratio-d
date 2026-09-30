import type { QualityReport } from "../../types/landmarks";

export interface FrameEvaluation {
  accepted: boolean;
  reason: string;
}

const MIN_BRIGHTNESS = 50;
const MAX_BRIGHTNESS = 210;
const MIN_SHARPNESS = 12;
const MIN_FRAME_ALIGNMENT = 0.75;

/**
 * Head-turn limits for face scoring. A turned head moves the (3D) nose/bridge
 * landmarks sideways in the image, which reads as facial asymmetry and shrinks
 * width ratios, so off-axis frames must not reach the metrics at all.
 */
export const MAX_YAW_DEG = 5;
export const MAX_PITCH_DEG = 6;

export function evaluateFrame(params: {
  quality: QualityReport;
  alignmentProgress: number;
}): FrameEvaluation {
  const { quality, alignmentProgress } = params;

  if (!quality.faceDetected) {
    return { accepted: false, reason: "No face detected" };
  }
  if (!quality.headPose) {
    // Fail closed: without a pose we cannot vouch for the geometry.
    return { accepted: false, reason: "Head pose unavailable" };
  }
  if (Math.abs(quality.headPose.yawDeg) > MAX_YAW_DEG) {
    return { accepted: false, reason: "Face the camera (head turned)" };
  }
  if (Math.abs(quality.headPose.pitchDeg) > MAX_PITCH_DEG) {
    return { accepted: false, reason: "Level your chin (head tilted up/down)" };
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
