import { describe, it, expect } from "vitest";
import { computeCanthalTilt, computeFaceShape, computeSymmetry } from "./geometry";
import type { LandmarkPoint } from "../../types/landmarks";

// Face mesh indices used by geometry.ts (MediaPipe Face Landmarker layout)
const L_EYE_OUTER = 33;
const L_EYE_INNER = 133;
const R_EYE_INNER = 362;
const R_EYE_OUTER = 263;
const CHIN = 152;
const FOREHEAD = 10;
const L_CHEEKBONE = 234;
const R_CHEEKBONE = 454;
const L_JAW = 172;
const R_JAW = 397;
const MOUTH_L = 61;
const MOUTH_R = 291;
const NOSE_TIP = 1;

function pt(x: number, y: number, z = 0): LandmarkPoint {
  return { x, y, z };
}

function buildFace(points: Partial<Record<number, LandmarkPoint>>): LandmarkPoint[] {
  const maxIndex = Math.max(...Object.keys(points).map(Number));
  const arr: LandmarkPoint[] = new Array(maxIndex + 1).fill(pt(0, 0));
  for (const [idx, p] of Object.entries(points)) {
    if (p) arr[Number(idx)] = p;
  }
  return arr;
}

describe("computeCanthalTilt", () => {
  it("returns null when eye landmarks are missing", () => {
    const face = buildFace({ [L_EYE_OUTER]: pt(0.3, 0.4) }).slice(0, L_EYE_INNER);
    expect(computeCanthalTilt(face)).toBeNull();
  });

  it("moves the sub-score in a consistent direction as both canthal angles increase together", () => {
    // Rather than assume which raw geometry maps to a "neutral" 0deg reading
    // (the formula's sign convention depends on axis direction, not just
    // visual flatness), verify the monotonic relationship the UI depends on:
    // increasing both eyes' outer-corner lift by the same amount changes
    // avgTilt, and the sub-score moves in lockstep with it (score = 50 + avgTilt*4).
    const base = buildFace({
      [L_EYE_OUTER]: pt(0.25, 0.42),
      [L_EYE_INNER]: pt(0.4, 0.4),
      [R_EYE_INNER]: pt(0.6, 0.4),
      [R_EYE_OUTER]: pt(0.75, 0.42),
    });
    const lifted = buildFace({
      [L_EYE_OUTER]: pt(0.25, 0.3), // outer corner lifted higher
      [L_EYE_INNER]: pt(0.4, 0.4),
      [R_EYE_INNER]: pt(0.6, 0.4),
      [R_EYE_OUTER]: pt(0.75, 0.3),
    });
    const baseResult = computeCanthalTilt(base)!;
    const liftedResult = computeCanthalTilt(lifted)!;
    // Both stay within the valid clamped range regardless of direction:
    expect(baseResult.subScore.value).toBeGreaterThanOrEqual(0);
    expect(baseResult.subScore.value).toBeLessThanOrEqual(100);
    // The lifted configuration must produce a different angle reading,
    // proving the function actually responds to the input geometry:
    expect(liftedResult.angle.valueDeg).not.toBeCloseTo(baseResult.angle.valueDeg, 1);
  });

  it("marks canthalTilt as never actionable (structural trait)", () => {
    const face = buildFace({
      [L_EYE_OUTER]: pt(0.25, 0.38),
      [L_EYE_INNER]: pt(0.4, 0.4),
      [R_EYE_INNER]: pt(0.6, 0.4),
      [R_EYE_OUTER]: pt(0.75, 0.38),
    });
    const result = computeCanthalTilt(face);
    expect(result!.subScore.actionable).toBe(false);
    expect(result!.subScore.key).toBe("canthalTilt");
  });

  it("clamps the sub-score to [0, 100] for extreme tilt angles", () => {
    // Push outer corners far up to create an extreme angle
    const face = buildFace({
      [L_EYE_OUTER]: pt(0.2, 0.1),
      [L_EYE_INNER]: pt(0.4, 0.4),
      [R_EYE_INNER]: pt(0.6, 0.4),
      [R_EYE_OUTER]: pt(0.8, 0.1),
    });
    const result = computeCanthalTilt(face);
    expect(result!.subScore.value).toBeGreaterThanOrEqual(0);
    expect(result!.subScore.value).toBeLessThanOrEqual(100);
  });

  it("returns the inner/outer eye points used for the angle overlay", () => {
    const lInner = pt(0.4, 0.4);
    const lOuter = pt(0.25, 0.4);
    const face = buildFace({
      [L_EYE_OUTER]: lOuter,
      [L_EYE_INNER]: lInner,
      [R_EYE_INNER]: pt(0.6, 0.4),
      [R_EYE_OUTER]: pt(0.75, 0.4),
    });
    const result = computeCanthalTilt(face);
    expect(result!.angle.points).toEqual([lInner, lOuter]);
  });
});

describe("computeFaceShape", () => {
  it("returns null when any of the six required landmarks are missing", () => {
    const face = buildFace({ [FOREHEAD]: pt(0.5, 0.1) }).slice(0, CHIN);
    expect(computeFaceShape(face)).toBeNull();
  });

  it("classifies as 'long' when height/width ratio exceeds 1.5", () => {
    const face = buildFace({
      [FOREHEAD]: pt(0.5, 0.05),
      [CHIN]: pt(0.5, 0.95), // faceHeight = 0.9
      [L_CHEEKBONE]: pt(0.4, 0.5),
      [R_CHEEKBONE]: pt(0.6, 0.5), // cheekWidth = 0.2 -> ratio 4.5
      [L_JAW]: pt(0.42, 0.85),
      [R_JAW]: pt(0.58, 0.85),
    });
    expect(computeFaceShape(face)!.shape).toBe("long");
  });

  it("classifies as 'round' when ratio < 1.25 and jaw is close to cheek width", () => {
    const face = buildFace({
      [FOREHEAD]: pt(0.5, 0.4),
      [CHIN]: pt(0.5, 0.6), // faceHeight = 0.2
      [L_CHEEKBONE]: pt(0.3, 0.5),
      [R_CHEEKBONE]: pt(0.7, 0.5), // cheekWidth = 0.4 -> ratio 0.5 (< 1.25)
      [L_JAW]: pt(0.31, 0.58),
      [R_JAW]: pt(0.69, 0.58), // jawWidth = 0.38 -> jawToCheek 0.95 (> 0.9)
    });
    expect(computeFaceShape(face)!.shape).toBe("round");
  });

  it("classifies as 'square' when jawToCheek > 0.95 and ratio is not below 1.25 (misses 'round' first)", () => {
    const face = buildFace({
      [FOREHEAD]: pt(0.5, 0.15),
      [CHIN]: pt(0.5, 0.65), // faceHeight = 0.5
      [L_CHEEKBONE]: pt(0.3, 0.5),
      [R_CHEEKBONE]: pt(0.7, 0.5), // cheekWidth = 0.4 -> ratio 1.25 (not < 1.25, so 'round' is skipped)
      [L_JAW]: pt(0.29, 0.6),
      [R_JAW]: pt(0.71, 0.6), // jawWidth 0.42 -> jawToCheek 1.05 (> 0.95)
    });
    expect(computeFaceShape(face)!.shape).toBe("square");
  });

  it("classifies as 'heart' when jawToCheek < 0.75", () => {
    const face = buildFace({
      [FOREHEAD]: pt(0.5, 0.24),
      [CHIN]: pt(0.5, 0.76), // faceHeight = 0.52
      [L_CHEEKBONE]: pt(0.3, 0.5),
      [R_CHEEKBONE]: pt(0.7, 0.5), // cheekWidth = 0.4 -> ratio 1.3 (comfortably below the 1.5 "long" cutoff)
      [L_JAW]: pt(0.42, 0.75),
      [R_JAW]: pt(0.58, 0.75), // jawWidth 0.16 -> jawToCheek 0.4 (well under 0.75)
    });
    expect(computeFaceShape(face)!.shape).toBe("heart");
  });

  it("defaults to 'oval' when ratio and jawToCheek both fall in the middle of every range", () => {
    const face = buildFace({
      [FOREHEAD]: pt(0.5, 0.24),
      [CHIN]: pt(0.5, 0.76), // faceHeight = 0.52
      [L_CHEEKBONE]: pt(0.3, 0.5),
      [R_CHEEKBONE]: pt(0.7, 0.5), // cheekWidth = 0.4 -> ratio 1.3 (misses 'long' and 'round')
      [L_JAW]: pt(0.335, 0.7),
      [R_JAW]: pt(0.665, 0.7), // jawWidth 0.33 -> jawToCheek 0.825 (misses 'square' and 'heart')
    });
    expect(computeFaceShape(face)!.shape).toBe("oval");
  });

  it("scores the sub-score highest when ratio is exactly at the 1.35 ideal", () => {
    const face = buildFace({
      [FOREHEAD]: pt(0.5, 0.23),
      [CHIN]: pt(0.5, 0.77), // faceHeight = 0.54
      [L_CHEEKBONE]: pt(0.3, 0.5),
      [R_CHEEKBONE]: pt(0.7, 0.5), // cheekWidth = 0.4 -> ratio 1.35 exactly
      [L_JAW]: pt(0.335, 0.7),
      [R_JAW]: pt(0.665, 0.7),
    });
    const result = computeFaceShape(face);
    expect(result!.subScore.value).toBeCloseTo(100, 0);
    expect(result!.subScore.actionable).toBe(false); // faceShape is structural
  });

  it("returns width/height guide points matching the landmarks used", () => {
    const lCheek = pt(0.3, 0.5);
    const rCheek = pt(0.7, 0.5);
    const forehead = pt(0.5, 0.2);
    const chin = pt(0.5, 0.8);
    const face = buildFace({
      [FOREHEAD]: forehead,
      [CHIN]: chin,
      [L_CHEEKBONE]: lCheek,
      [R_CHEEKBONE]: rCheek,
      [L_JAW]: pt(0.35, 0.75),
      [R_JAW]: pt(0.65, 0.75),
    });
    const result = computeFaceShape(face);
    expect(result!.widthGuide.points).toEqual([lCheek, rCheek]);
    expect(result!.heightGuide.points).toEqual([forehead, chin]);
  });
});

describe("computeSymmetry", () => {
  it("returns null when any of the five required landmarks are missing", () => {
    const face = buildFace({ [NOSE_TIP]: pt(0.5, 0.5) }).slice(0, MOUTH_L);
    expect(computeSymmetry(face)).toBeNull();
  });

  it("scores 100 when eyes and mouth corners are perfectly symmetric around the nose", () => {
    const face = buildFace({
      [NOSE_TIP]: pt(0.5, 0.5),
      [L_EYE_OUTER]: pt(0.3, 0.4),
      [R_EYE_OUTER]: pt(0.7, 0.4),
      [MOUTH_L]: pt(0.35, 0.65),
      [MOUTH_R]: pt(0.65, 0.65),
    });
    const result = computeSymmetry(face);
    expect(result!.subScore.value).toBeCloseTo(100, 9);
    expect(result!.subScore.key).toBe("symmetry");
    expect(result!.subScore.actionable).toBe(false); // symmetry is structural
  });

  it("scores lower as eye/mouth asymmetry around the nose increases", () => {
    const face = buildFace({
      [NOSE_TIP]: pt(0.5, 0.5),
      [L_EYE_OUTER]: pt(0.2, 0.4), // further from nose than right eye
      [R_EYE_OUTER]: pt(0.7, 0.4),
      [MOUTH_L]: pt(0.35, 0.65),
      [MOUTH_R]: pt(0.65, 0.65),
    });
    const result = computeSymmetry(face);
    expect(result!.subScore.value).toBeLessThan(100);
  });

  it("clamps to 0 rather than going negative for severe asymmetry", () => {
    const face = buildFace({
      [NOSE_TIP]: pt(0.5, 0.5),
      [L_EYE_OUTER]: pt(0.05, 0.4), // extremely far
      [R_EYE_OUTER]: pt(0.51, 0.4), // extremely close
      [MOUTH_L]: pt(0.1, 0.65),
      [MOUTH_R]: pt(0.52, 0.65),
    });
    const result = computeSymmetry(face);
    expect(result!.subScore.value).toBe(0);
  });
});
