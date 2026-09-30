import type { LandmarkPoint } from "../../types/landmarks";
import type { MuscleZoneScore } from "../../types/bodyMetrics";
import { classifyZone } from "./classification";
import { metricDist } from "../geometry/space";
import { isReliable } from "../geometry/reliability";

const NOSE = 0;
const LEFT_EAR = 7;
const RIGHT_EAR = 8;
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
  if (!isReliable(lShoulder) || !isReliable(rShoulder) || !isReliable(lHip) || !isReliable(rHip)) return null;

  const shoulderWidth = metricDist(lShoulder, rShoulder, aspect);
  const hipWidth = metricDist(lHip, rHip, aspect);
  const ratio = shoulderWidth / hipWidth;

  return zone("shoulderHipRatio", "Shoulder-to-hip width", "shoulders", scoreFromDeviation(ratio, 1.4, 0.5));
}

export function computeLimbSymmetry(front: LandmarkPoint[], aspect: number): MuscleZoneScore[] {
  const results: MuscleZoneScore[] = [];

  const lShoulder = front[LEFT_SHOULDER];
  const rShoulder = front[RIGHT_SHOULDER];
  const lElbow = front[LEFT_ELBOW];
  const rElbow = front[RIGHT_ELBOW];
  if (isReliable(lShoulder) && isReliable(rShoulder) && isReliable(lElbow) && isReliable(rElbow)) {
    const upperArmL = metricDist(lShoulder, lElbow, aspect);
    const upperArmR = metricDist(rShoulder, rElbow, aspect);
    const asymmetry = Math.abs(upperArmL - upperArmR) / ((upperArmL + upperArmR) / 2);
    results.push(zone("upperArmSymmetry", "Upper-arm length symmetry", "arms", clamp(100 - asymmetry * 400, 0, 100)));
  }

  const lHip = front[LEFT_HIP];
  const rHip = front[RIGHT_HIP];
  const lKnee = front[LEFT_KNEE];
  const rKnee = front[RIGHT_KNEE];
  if (isReliable(lHip) && isReliable(rHip) && isReliable(lKnee) && isReliable(rKnee)) {
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
  if (!isReliable(lShoulder) || !isReliable(rShoulder)) return null;

  const run = Math.abs(rShoulder.x - lShoulder.x) * aspect;
  const rise = Math.abs(rShoulder.y - lShoulder.y);
  const tiltDeg = Math.atan2(rise, run) * (180 / Math.PI);
  const value = clamp(100 - tiltDeg * 12, 0, 100);

  return zone("postureTilt", "Shoulder level", "posture", value);
}

/**
 * Forward-head offset from the SIDE view: horizontal distance of the ear ahead
 * of the shoulder, as a fraction of torso length (shoulder -> hip).
 *
 * Normalising by torso length makes it independent of how far the person
 * stands from the camera. Only the body side facing the camera is used (the
 * far-side joints are occluded and the model just guesses them): we pick the
 * side whose ear/shoulder/hip have the higher minimum visibility. "Ahead" is
 * the direction the nose points relative to that ear, so it works whichever
 * way the person faces.
 *
 * Scoring: 100 up to 0.10 torso-lengths forward, falling linearly to 0 at 0.40.
 * These two constants are UNCALIBRATED placeholders - tune them with the
 * repeatability harness before trusting the absolute value.
 */
export const FORWARD_HEAD_FREE = 0.1;
export const FORWARD_HEAD_ZERO = 0.4;

export function computeForwardHead(side: LandmarkPoint[], aspect: number): MuscleZoneScore | null {
  const nose = side[NOSE];
  if (!isReliable(nose)) return null;

  const candidates = [
    { ear: side[LEFT_EAR], shoulder: side[LEFT_SHOULDER], hip: side[LEFT_HIP] },
    { ear: side[RIGHT_EAR], shoulder: side[RIGHT_SHOULDER], hip: side[RIGHT_HIP] },
  ];

  let best: { ear: LandmarkPoint; shoulder: LandmarkPoint; hip: LandmarkPoint } | null = null;
  let bestVis = -1;
  for (const c of candidates) {
    if (!isReliable(c.ear) || !isReliable(c.shoulder) || !isReliable(c.hip)) continue;
    const vis = Math.min(c.ear.visibility ?? 1, c.shoulder.visibility ?? 1, c.hip.visibility ?? 1);
    if (vis > bestVis) {
      bestVis = vis;
      best = { ear: c.ear, shoulder: c.shoulder, hip: c.hip };
    }
  }
  if (!best) return null;

  const torso = metricDist(best.shoulder, best.hip, aspect);
  if (torso < 0.05) return null; // too small / degenerate to normalise by

  const facing = Math.sign(nose.x - best.ear.x);
  if (facing === 0) return null;

  const forward = ((best.ear.x - best.shoulder.x) * aspect * facing) / torso; // > 0 = ear ahead of shoulder
  const value = clamp(
    100 - (Math.max(0, forward - FORWARD_HEAD_FREE) / (FORWARD_HEAD_ZERO - FORWARD_HEAD_FREE)) * 100,
    0,
    100
  );

  return zone("forwardHead", "Head-over-shoulder alignment", "posture", value);
}
