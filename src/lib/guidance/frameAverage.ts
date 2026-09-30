import type { LandmarkPoint, QualityReport } from "../../types/landmarks";

/** Median of a non-empty list (mean of the two middle values when even). */
export function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  const mid = v.length >> 1;
  return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2;
}

function sd(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / (values.length - 1));
}

/**
 * Per-coordinate MEDIAN across frames (robust to the occasional jumped landmark
 * a mean would smear in). Visibility is averaged and carried through so
 * downstream metrics can reject guessed joints.
 */
export function averageLandmarks(frameSets: LandmarkPoint[][]): LandmarkPoint[] | null {
  if (frameSets.length === 0) return null;
  const firstFrame = frameSets[0];
  if (!firstFrame) return null;

  const out: LandmarkPoint[] = [];
  for (let i = 0; i < firstFrame.length; i++) {
    const pts = frameSets.map((f) => f[i]).filter((p): p is LandmarkPoint => !!p);
    if (pts.length === 0) {
      out.push({ x: 0, y: 0, z: 0 });
      continue;
    }
    const point: LandmarkPoint = {
      x: median(pts.map((p) => p.x)),
      y: median(pts.map((p) => p.y)),
      z: median(pts.map((p) => p.z)),
    };
    const vis = pts.map((p) => p.visibility).filter((v): v is number => typeof v === "number");
    if (vis.length > 0) point.visibility = vis.reduce((a, b) => a + b, 0) / vis.length;
    out.push(point);
  }
  return out;
}

/**
 * Capture-time jitter: the median over landmarks of the per-landmark positional
 * SD across frames, in fractions of frame HEIGHT (x is scaled by aspect so the
 * unit is isotropic). This is the noise floor of a single capture; it is NOT
 * the between-scan repeatability, which only the repeat-scan harness measures.
 */
export function landmarkJitterSd(frameSets: LandmarkPoint[][], aspect: number): number | null {
  if (frameSets.length < 2) return null;
  const n = frameSets[0]?.length ?? 0;
  const sds: number[] = [];
  for (let i = 0; i < n; i++) {
    const pts = frameSets.map((f) => f[i]).filter((p): p is LandmarkPoint => !!p);
    if (pts.length < 2) continue;
    const sx = sd(pts.map((p) => p.x * aspect));
    const sy = sd(pts.map((p) => p.y));
    sds.push(Math.hypot(sx, sy));
  }
  return sds.length ? median(sds) : null;
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
