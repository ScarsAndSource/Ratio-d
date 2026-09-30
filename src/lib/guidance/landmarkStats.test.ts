import { describe, it, expect } from "vitest";
import {
  median,
  sampleSd,
  summarizeLandmarks,
  jitterOf,
  isFreshSample,
  MIN_SAMPLE_INTERVAL_MS,
  DEFAULT_TARGET_FRAMES,
} from "./landmarkStats";
import type { LandmarkPoint } from "../../types/landmarks";

const pt = (x: number, y: number, z = 0, visibility?: number): LandmarkPoint =>
  visibility === undefined ? { x, y, z } : { x, y, z, visibility };

describe("median / sampleSd", () => {
  it("median handles odd, even and unsorted input", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([5])).toBe(5);
    expect(Number.isNaN(median([]))).toBe(true);
  });
  it("sampleSd uses n-1 and is 0 below two values", () => {
    expect(sampleSd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(Math.sqrt(32 / 7), 12);
    expect(sampleSd([1])).toBe(0);
    expect(sampleSd([])).toBe(0);
  });
});

describe("summarizeLandmarks", () => {
  it("returns null for no frames", () => {
    expect(summarizeLandmarks([], 1)).toBeNull();
  });

  it("takes the per-coordinate median, so one glitched frame cannot move the result", () => {
    const frames = [0.5, 0.5, 0.5, 0.5, 0.9].map((x) => [pt(x, 0.5)]); // one wild outlier
    const s = summarizeLandmarks(frames, 1)!;
    expect(s.landmarks[0]!.x).toBe(0.5);
    expect(s.frameCount).toBe(5);
  });

  it("reports SD in isotropic frame-height units (x scaled by aspect)", () => {
    const frames = [[pt(0.4, 0.5)], [pt(0.6, 0.5)]]; // x varies only; sample SD of {0.4,0.6}
    const sdx = sampleSd([0.4, 0.6]);
    expect(summarizeLandmarks(frames, 1)!.sd[0]).toBeCloseTo(sdx, 12);
    expect(summarizeLandmarks(frames, 2)!.sd[0]).toBeCloseTo(sdx * 2, 12);
    // y-only variation is not scaled
    const yFrames = [[pt(0.5, 0.4)], [pt(0.5, 0.6)]];
    expect(summarizeLandmarks(yFrames, 2)!.sd[0]).toBeCloseTo(sampleSd([0.4, 0.6]), 12);
  });

  it("has SD 0 for perfectly still landmarks and for a single frame", () => {
    const still = Array.from({ length: 10 }, () => [pt(0.3, 0.7)]);
    expect(summarizeLandmarks(still, 1.33)!.sd[0]).toBeCloseTo(0, 12); // float mean error ~1e-16, not exactly 0
    expect(summarizeLandmarks([[pt(0.3, 0.7)]], 1)!.sd[0]).toBe(0);
  });

  it("carries the median visibility through, and omits it when no frame has one", () => {
    const withVis = [0.9, 0.2, 0.8].map((v) => [pt(0.5, 0.5, 0, v)]);
    expect(summarizeLandmarks(withVis, 1)!.landmarks[0]!.visibility).toBeCloseTo(0.8, 12);
    const noVis = summarizeLandmarks([[pt(0.5, 0.5)], [pt(0.5, 0.5)]], 1)!;
    expect("visibility" in noVis.landmarks[0]!).toBe(false);
  });

  it("keeps the landmark count of the first frame", () => {
    const frames = [[pt(0.1, 0.1), pt(0.2, 0.2)], [pt(0.1, 0.1), pt(0.2, 0.2)]];
    const s = summarizeLandmarks(frames, 1)!;
    expect(s.landmarks).toHaveLength(2);
    expect(s.sd).toHaveLength(2);
  });
});

describe("jitterOf", () => {
  // landmark 0/1/2 still, moderate, wild-but-low-visibility
  const build = (): ReturnType<typeof summarizeLandmarks> => {
    const frames: LandmarkPoint[][] = [];
    for (let k = 0; k < 20; k++) {
      const wobble = k % 2 === 0 ? 0.01 : -0.01;
      frames.push([
        pt(0.5, 0.5, 0, 0.95),
        pt(0.5 + wobble, 0.5, 0, 0.95),
        pt(0.5 + wobble * 30, 0.5, 0, 0.2), // a guessed joint: huge SD, must be ignored
      ]);
    }
    return summarizeLandmarks(frames, 1);
  };

  it("is the median SD over reliable key landmarks only", () => {
    const s = build()!;
    const j = jitterOf(s, [0, 1, 2])!;
    // reliable SDs are {0, sd1}; the median of two is their mean
    expect(j).toBeCloseTo((0 + s.sd[1]!) / 2, 12);
    expect(j).toBeLessThan(s.sd[2]!);
  });

  it("is null when no key landmark is reliable", () => {
    const s = build()!;
    expect(jitterOf(s, [2])).toBeNull();
    expect(jitterOf(s, [])).toBeNull();
  });
});

describe("isFreshSample", () => {
  const face = [pt(0.5, 0.5)];
  const pose = [pt(0.5, 0.5)];

  it("accepts the first sample", () => {
    expect(isFreshSample(null, face, pose, 1000)).toBe(true);
  });
  it("rejects a re-run that reuses the same detection (unrelated state change)", () => {
    expect(isFreshSample({ face, pose, t: 1000 }, face, pose, 5000)).toBe(false);
  });
  it("rejects new detections closer than the minimum spacing", () => {
    const last = { face, pose, t: 1000 };
    expect(isFreshSample(last, [pt(0.5, 0.5)], [pt(0.5, 0.5)], 1000 + MIN_SAMPLE_INTERVAL_MS - 1)).toBe(false);
    expect(isFreshSample(last, [pt(0.5, 0.5)], [pt(0.5, 0.5)], 1000 + MIN_SAMPLE_INTERVAL_MS)).toBe(true);
  });
  it("30 spaced samples cannot complete in under ~1 second", () => {
    expect(DEFAULT_TARGET_FRAMES).toBeGreaterThanOrEqual(30);
    expect((DEFAULT_TARGET_FRAMES - 1) * MIN_SAMPLE_INTERVAL_MS).toBeGreaterThanOrEqual(950);
  });
});
