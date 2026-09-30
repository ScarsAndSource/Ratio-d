import type { LandmarkPoint } from "../../types/landmarks";
import { isReliable } from "../geometry/reliability";
import { sanitizeAspect } from "../geometry/space";

/** ~1 s of capture: 30 samples at >= 33 ms spacing can never take less than ~1 s. */
export const DEFAULT_TARGET_FRAMES = 30;
export const MIN_SAMPLE_INTERVAL_MS = 33;

/** Face-mesh landmarks the face metrics actually read; used for the jitter summary. */
export const FACE_KEY_LANDMARKS: readonly number[] = [10, 33, 61, 133, 152, 168, 172, 234, 263, 291, 362, 397, 454];
/** Pose landmarks the body metrics actually read (nose, ears, shoulders, elbows, hips, knees, ankles). */
export const POSE_KEY_LANDMARKS: readonly number[] = [0, 7, 8, 11, 12, 13, 14, 23, 24, 25, 26, 27, 28];

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Sample standard deviation (n - 1). 0 for fewer than two values. */
export function sampleSd(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const ss = values.reduce((a, b) => a + (b - mean) ** 2, 0);
  return Math.sqrt(ss / (n - 1));
}

export interface LandmarkSummary {
  /** Per-coordinate median over the frames (robust to a single glitched frame). */
  landmarks: LandmarkPoint[];
  /**
   * Per-landmark 2D positional SD in frame-height units (x is scaled by the
   * aspect first, so one unit of SD is the same physical distance in x and y).
   * Same indexing as `landmarks`.
   */
  sd: number[];
  frameCount: number;
}

export function summarizeLandmarks(frameSets: LandmarkPoint[][], aspect: number): LandmarkSummary | null {
  const first = frameSets[0];
  if (!first) return null;
  const a = sanitizeAspect(aspect);

  const landmarks: LandmarkPoint[] = [];
  const sd: number[] = [];

  for (let i = 0; i < first.length; i++) {
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    const vs: number[] = [];
    for (const frame of frameSets) {
      const p = frame[i];
      if (!p) continue;
      xs.push(p.x);
      ys.push(p.y);
      zs.push(p.z);
      if (typeof p.visibility === "number") vs.push(p.visibility);
    }
    const point: LandmarkPoint = { x: median(xs), y: median(ys), z: median(zs) };
    if (vs.length > 0) point.visibility = median(vs);
    landmarks.push(point);
    sd.push(Math.hypot(sampleSd(xs) * a, sampleSd(ys)));
  }

  return { landmarks, sd, frameCount: frameSets.length };
}

/**
 * One "how still was the subject" number: the median SD over the key landmarks
 * that are reliable in the summary. Median (not max) so one noisy joint doesn't
 * dominate, while whole-body movement - which shifts every landmark - does.
 * Null when none of the key landmarks are reliable.
 */
export function jitterOf(summary: LandmarkSummary, keyIndices: readonly number[]): number | null {
  const sds: number[] = [];
  for (const i of keyIndices) {
    if (!isReliable(summary.landmarks[i])) continue;
    const v = summary.sd[i];
    if (v !== undefined && Number.isFinite(v)) sds.push(v);
  }
  return sds.length > 0 ? median(sds) : null;
}

export interface LastSample {
  face: unknown;
  pose: unknown;
  t: number;
}

/**
 * Should this detection be counted as a new sample?
 *
 * The capture effect also re-runs for unrelated state changes (the 200 ms
 * brightness/sharpness tick, alignment updates). Those re-runs see the SAME
 * landmark arrays, and counting them would add duplicate frames that shrink the
 * measured SD. So: reject re-used detections, and enforce a minimum spacing so
 * consecutive samples are not near-identical.
 */
export function isFreshSample(last: LastSample | null, face: unknown, pose: unknown, nowMs: number): boolean {
  if (!last) return true;
  if (last.face === face && last.pose === pose) return false;
  return nowMs - last.t >= MIN_SAMPLE_INTERVAL_MS;
}
