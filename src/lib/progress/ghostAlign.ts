import type { LandmarkPoint } from "../../types/landmarks";

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

export interface AffineFit {
  scale: number;
  translateXPct: number;
  translateYPct: number;
}

function torsoAnchor(landmarks: LandmarkPoint[]): { cx: number; cy: number; span: number } | null {
  const lShoulder = landmarks[LEFT_SHOULDER];
  const rShoulder = landmarks[RIGHT_SHOULDER];
  const lHip = landmarks[LEFT_HIP];
  const rHip = landmarks[RIGHT_HIP];
  if (!lShoulder || !rShoulder || !lHip || !rHip) return null;

  const shoulderMidY = (lShoulder.y + rShoulder.y) / 2;
  const hipMidY = (lHip.y + rHip.y) / 2;
  const cx = (lShoulder.x + rShoulder.x + lHip.x + rHip.x) / 4;
  const cy = (shoulderMidY + hipMidY) / 2;

  return { cx, cy, span: Math.abs(hipMidY - shoulderMidY) };
}

export function computeGhostAffine(oldLandmarks: LandmarkPoint[], newLandmarks: LandmarkPoint[]): AffineFit | null {
  const oldAnchor = torsoAnchor(oldLandmarks);
  const newAnchor = torsoAnchor(newLandmarks);
  if (!oldAnchor || !newAnchor || oldAnchor.span === 0) return null;

  return {
    scale: newAnchor.span / oldAnchor.span,
    translateXPct: (newAnchor.cx - oldAnchor.cx) * 100,
    translateYPct: (newAnchor.cy - oldAnchor.cy) * 100,
  };
}
