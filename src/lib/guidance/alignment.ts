import type { AlignmentReading, LandmarkPoint } from "../../types/landmarks";

const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
const NOSE_TIP = 1;

const TARGET_INTEROCULAR = 0.18;
const INTEROCULAR_TOLERANCE = 0.05;
const CENTER_TOLERANCE = 0.08;
const TILT_TOLERANCE_DEG = 6;

export function computeFaceAlignment(
  landmarks: LandmarkPoint[] | null
): AlignmentReading {
  const leftEye = landmarks?.[LEFT_EYE_OUTER];
  const rightEye = landmarks?.[RIGHT_EYE_OUTER];
  const nose = landmarks?.[NOSE_TIP];

  if (!leftEye || !rightEye || !nose) {
    return {
      centeredness: 0,
      distanceFit: 0,
      levelness: 0,
      progress: 0,
      guidance: "Bring your face into frame",
      raw: { offsetX: 0, offsetY: 0, interocular: 0, tiltDeg: 0 },
    };
  }

  const offsetX = nose.x - 0.5;
  const offsetY = nose.y - 0.5;
  const offsetMag = Math.sqrt(offsetX ** 2 + offsetY ** 2);
  const centeredness = clamp01(1 - offsetMag / CENTER_TOLERANCE);

  const interocular = Math.sqrt(
    (rightEye.x - leftEye.x) ** 2 + (rightEye.y - leftEye.y) ** 2
  );
  const distanceError = Math.abs(interocular - TARGET_INTEROCULAR);
  const distanceFit = clamp01(1 - distanceError / INTEROCULAR_TOLERANCE);

  const tiltDeg =
    (Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180) / Math.PI;
  const levelness = clamp01(1 - Math.abs(tiltDeg) / TILT_TOLERANCE_DEG);

  const progress = (centeredness + distanceFit + levelness) / 3;

  let guidance = "Hold steady";
  const worst = Math.min(centeredness, distanceFit, levelness);
  if (worst === distanceFit && distanceFit < 0.9) {
    guidance = interocular < TARGET_INTEROCULAR ? "Step back" : "Move closer";
  } else if (worst === centeredness && centeredness < 0.9) {
    guidance = "Center your face";
  } else if (worst === levelness && levelness < 0.9) {
    guidance = "Level your head";
  } else if (progress > 0.92) {
    guidance = "Locked";
  }

  return {
    centeredness,
    distanceFit,
    levelness,
    progress,
    guidance,
    raw: { offsetX, offsetY, interocular, tiltDeg },
  };
}

export function computeBrightness(imageData: ImageData): number {
  let total = 0;
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / (data.length / 4);
}

export function computeSharpness(imageData: ImageData, width: number): number {
  const { data } = imageData;
  const lum: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    lum.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  let sumSq = 0;
  let count = 0;
  for (let i = 0; i < lum.length - 1; i++) {
    if (i % width === width - 1) continue;
    const diff = lum[i + 1] - lum[i];
    sumSq += diff * diff;
    count++;
  }
  return count > 0 ? sumSq / count : 0;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
