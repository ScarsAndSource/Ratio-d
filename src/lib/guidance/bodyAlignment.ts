import type { LandmarkPoint } from "../../types/landmarks";
import type { BodyAlignmentReading, BodyAngle } from "../../types/bodyCapture";

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

const FRONT_MIN_SHOULDER_SPAN = 0.18;
const SIDE_MAX_SHOULDER_SPAN = 0.09;
const THREE_QUARTER_MIN_SPAN = 0.1;
const THREE_QUARTER_MAX_SPAN = 0.17;
const CENTER_TOLERANCE = 0.12;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function computeBodyAlignment(
  poseLandmarks: LandmarkPoint[] | null,
  faceDetected: boolean,
  targetAngle: BodyAngle
): BodyAlignmentReading {
  const lShoulder = poseLandmarks?.[LEFT_SHOULDER];
  const rShoulder = poseLandmarks?.[RIGHT_SHOULDER];
  const lHip = poseLandmarks?.[LEFT_HIP];
  const rHip = poseLandmarks?.[RIGHT_HIP];
  const lAnkle = poseLandmarks?.[LEFT_ANKLE];
  const rAnkle = poseLandmarks?.[RIGHT_ANKLE];

  if (!lShoulder || !rShoulder || !lHip || !rHip) {
    return {
      centeredness: 0,
      distanceFit: 0,
      angleMatch: 0,
      progress: 0,
      guidance: "Step into frame",
      raw: { offsetX: 0, shoulderSpan: 0, hipOffsetX: 0, faceDetected },
    };
  }

  const shoulderSpan = Math.abs(rShoulder.x - lShoulder.x);
  const shoulderCenterX = (lShoulder.x + rShoulder.x) / 2;
  const hipCenterX = (lHip.x + rHip.x) / 2;
  const offsetX = shoulderCenterX - 0.5;
  const hipOffsetX = hipCenterX - 0.5;

  const centeredness = clamp01(1 - Math.abs(offsetX) / CENTER_TOLERANCE);

  const distanceFit = lAnkle && rAnkle ? 1 : 0.3;

  const angleMatch = matchAngle(shoulderSpan, faceDetected, targetAngle);

  const progress = (centeredness + distanceFit + angleMatch) / 3;

  let guidance = "Hold steady";
  const worst = Math.min(centeredness, distanceFit, angleMatch);
  if (worst === distanceFit && distanceFit < 0.9) {
    guidance = "Step back until your feet are in frame";
  } else if (worst === centeredness && centeredness < 0.9) {
    guidance = "Center yourself in frame";
  } else if (worst === angleMatch && angleMatch < 0.9) {
    guidance = angleGuidance(targetAngle);
  } else if (progress > 0.92) {
    guidance = "Locked";
  }

  return {
    centeredness,
    distanceFit,
    angleMatch,
    progress,
    guidance,
    raw: { offsetX, shoulderSpan, hipOffsetX, faceDetected },
  };
}

function matchAngle(shoulderSpan: number, faceDetected: boolean, targetAngle: BodyAngle): number {
  switch (targetAngle) {
    case "front":
      return shoulderSpan >= FRONT_MIN_SHOULDER_SPAN && faceDetected ? 1 : 0.4;
    case "back":
      return shoulderSpan >= FRONT_MIN_SHOULDER_SPAN && !faceDetected ? 1 : 0.4;
    case "side":
      return shoulderSpan <= SIDE_MAX_SHOULDER_SPAN ? 1 : 0.4;
    case "threeQuarter":
      return shoulderSpan >= THREE_QUARTER_MIN_SPAN && shoulderSpan <= THREE_QUARTER_MAX_SPAN
        ? 1
        : 0.4;
    default:
      return 0.4;
  }
}

function angleGuidance(targetAngle: BodyAngle): string {
  switch (targetAngle) {
    case "front":
      return "Face the camera directly";
    case "side":
      return "Turn fully to your side";
    case "back":
      return "Turn your back to the camera";
    case "threeQuarter":
      return "Turn about halfway, three-quarter on";
    default:
      return "Adjust your angle";
  }
}
