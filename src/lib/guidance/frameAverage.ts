import type { LandmarkPoint, QualityReport } from "../../types/landmarks";

export function averageLandmarks(
  frameSets: LandmarkPoint[][]
): LandmarkPoint[] | null {
  if (frameSets.length === 0) return null;
  const firstFrame = frameSets[0];
  if (!firstFrame) return null;
  const pointCount = firstFrame.length;

  const sums = Array.from({ length: pointCount }, () => ({ x: 0, y: 0, z: 0 }));

  for (const frame of frameSets) {
    for (let i = 0; i < pointCount; i++) {
      const p = frame[i];
      const sum = sums[i];
      if (!p || !sum) continue;
      sum.x += p.x;
      sum.y += p.y;
      sum.z += p.z;
    }
  }

  return sums.map((s) => ({
    x: s.x / frameSets.length,
    y: s.y / frameSets.length,
    z: s.z / frameSets.length,
  }));
}

export function averageQuality(qualities: QualityReport[]): QualityReport {
  if (qualities.length === 0) {
    return { brightness: 0, sharpness: 0, faceDetected: false, poseDetected: false };
  }
  const n = qualities.length;
  return {
    brightness: qualities.reduce((sum, q) => sum + q.brightness, 0) / n,
    sharpness: qualities.reduce((sum, q) => sum + q.sharpness, 0) / n,
    faceDetected: qualities.every((q) => q.faceDetected),
    poseDetected: qualities.some((q) => q.poseDetected),
  };
}
