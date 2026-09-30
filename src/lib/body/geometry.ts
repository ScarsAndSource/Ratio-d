import type { LandmarkPoint } from "../../types/landmarks";
import type { MuscleZoneScore } from "../../types/bodyMetrics";
import { classifyZone } from "./classification";
import { metricDist } from "../geometry/space";

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function scoreFromDeviation(ratio: number, target: number, spread: number): number {
  return clamp(100 - (Math.abs(ratio - target) / spread) * 100, 0, 100);
}

function zone(key: string, label: string, region: MuscleZoneScore["region"], value: number): MuscleZoneScore {
  const actionable = classifyZone(key);
  return {
    key,
    label,
    region,
    value,
    actionable,
    heatColor: value >= 80 ? "green" : value >= 55 ? "yellow" : "red",
  };
}

export function computeShoulderHipRatio(front: LandmarkPoint[], aspect: number): MuscleZoneScore | null {
  const lShoulder = front[LEFT_SHOULDER];
  const rShoulder = front[RIGHT_SHOULDER];
  const lHip = front[LEFT_HIP];
  const rHip = front[RIGHT_HIP];
  if (!lShoulder || !rShoulder || !lHip || !rHip) return null;

  const shoulderWidth = metricDist(lShoulder, rShoulder, aspect);
  const hipWidth = metricDist(lHip, rHip, aspect);
  const ratio = shoulderWidth / hipWidth;

  return zone("shoulderHipRatio", "Shoulder-to-waist frame", "shoulders", scoreFromDeviation(ratio, 1.4, 0.5));
}

export function computeLimbSymmetry(front: LandmarkPoint[], aspect: number): MuscleZoneScore[] {
  const results: MuscleZoneScore[] = [];

  const lShoulder = front[LEFT_SHOULDER];
  const rShoulder = front[RIGHT_SHOULDER];
  const lElbow = front[LEFT_ELBOW];
  const rElbow = front[RIGHT_ELBOW];
  if (lShoulder && rShoulder && lElbow && rElbow) {
    const upperArmL = metricDist(lShoulder, lElbow, aspect);
    const upperArmR = metricDist(rShoulder, rElbow, aspect);
    const asymmetry = Math.abs(upperArmL - upperArmR) / ((upperArmL + upperArmR) / 2);
    results.push(zone("upperArmSymmetry", "Upper-arm length symmetry", "arms", clamp(100 - asymmetry * 400, 0, 100)));
  }

  const lHip = front[LEFT_HIP];
  const rHip = front[RIGHT_HIP];
  const lKnee = front[LEFT_KNEE];
  const rKnee = front[RIGHT_KNEE];
  if (lHip && rHip && lKnee && rKnee) {
    const thighL = metricDist(lHip, lKnee, aspect);
    const thighR = metricDist(rHip, rKnee, aspect);
    const asymmetry = Math.abs(thighL - thighR) / ((thighL + thighR) / 2);
    results.push(zone("thighSymmetry", "Thigh length symmetry", "legs", clamp(100 - asymmetry * 400, 0, 100)));
  }

  return results;
}

/**
 * Shoulder-line tilt from horizontal, in degrees, measured isotropically.
 *
 * Direction-agnostic on purpose: MediaPipe's "left" shoulder (11) is the
 * subject's left, which appears on the image RIGHT of an un-mirrored frame, so
 * (right.x - left.x) is NEGATIVE for a real front photo. The old
 * atan2(dy, right.x - left.x) therefore returned ~180deg for perfectly level
 * shoulders and scored them 0. Using |dx| makes the result independent of
 * which shoulder happens to be on which side.
 */
export function computePostureTilt(front: LandmarkPoint[], aspect: number): MuscleZoneScore | null {
  const lShoulder = front[LEFT_SHOULDER];
  const rShoulder = front[RIGHT_SHOULDER];
  if (!lShoulder || !rShoulder) return null;

  const run = Math.abs(rShoulder.x - lShoulder.x) * aspect;
  const rise = Math.abs(rShoulder.y - lShoulder.y);
  const tiltDeg = Math.atan2(rise, run) * (180 / Math.PI);
  const value = clamp(100 - tiltDeg * 12, 0, 100);

  return zone("postureTilt", "Shoulder level", "posture", value);
}

export function computeChestDepthProxy(
  front: LandmarkPoint[],
  side: LandmarkPoint[],
  frontAspect: number,
  sideAspect: number
): MuscleZoneScore | null {
  const lShoulderF = front[LEFT_SHOULDER];
  const rShoulderF = front[RIGHT_SHOULDER];
  const lShoulderS = side[LEFT_SHOULDER];
  const rShoulderS = side[RIGHT_SHOULDER];
  if (!lShoulderF || !rShoulderF || !lShoulderS || !rShoulderS) return null;

  const frontSpan = metricDist(lShoulderF, rShoulderF, frontAspect);
  const sideSpan = metricDist(lShoulderS, rShoulderS, sideAspect);
  if (frontSpan === 0) return null;

  const ratio = sideSpan / frontSpan;
  return zone("chestDepthProxy", "Chest/torso fullness", "chest", scoreFromDeviation(ratio, 0.55, 0.35));
}
