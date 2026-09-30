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

const SQUARE = 1; // frame aspect for hand-built square-coordinate fixtures

/** Build both eyes with a given tilt (deg, + = outer corner higher) on a frame of `aspect`. */
function eyesWithTilt(tiltDeg: number, aspect = SQUARE, roll = 0): LandmarkPoint[] {
  const run = 0.1; // normalised x run of each eye
  const rise = Math.tan((tiltDeg * Math.PI) / 180) * run * aspect; // rise in y units
  const face = buildFace({
    [L_EYE_INNER]: pt(0.45, 0.4),
    [L_EYE_OUTER]: pt(0.45 - run, 0.4 - rise),
    [R_EYE_INNER]: pt(0.55, 0.4),
    [R_EYE_OUTER]: pt(0.55 + run, 0.4 - rise),
  });
  if (roll === 0) return face;
  // rotate the four points about the face centre by `roll` degrees, in isotropic space
  const cx = 0.5;
  const cy = 0.4;
  const r = (roll * Math.PI) / 180;
  return face.map((q, i) => {
    if (![L_EYE_INNER, L_EYE_OUTER, R_EYE_INNER, R_EYE_OUTER].includes(i)) return q;
    const dx = (q.x - cx) * aspect;
    const dy = q.y - cy;
    return pt(cx + (dx * Math.cos(r) - dy * Math.sin(r)) / aspect, cy + dx * Math.sin(r) + dy * Math.cos(r));
  });
}

describe("computeCanthalTilt", () => {
  it("returns null when eye landmarks are missing", () => {
    const face = buildFace({ [L_EYE_OUTER]: pt(0.3, 0.4) }).slice(0, L_EYE_INNER);
    expect(computeCanthalTilt(face, SQUARE)).toBeNull();
  });

  it("reads exactly 0 degrees / score 50 for perfectly level eyes", () => {
    const r = computeCanthalTilt(eyesWithTilt(0), SQUARE)!;
    expect(r.angle.valueDeg).toBe(0);
    expect(r.subScore.value).toBe(50);
  });

  it("reads POSITIVE when the outer corners are higher than the inner corners", () => {
    const r = computeCanthalTilt(eyesWithTilt(5), SQUARE)!;
    expect(r.angle.valueDeg).toBeCloseTo(5, 1);
    expect(r.subScore.value).toBeCloseTo(70, 0); // 50 + 5*4
  });

  it("reads NEGATIVE when the outer corners are lower than the inner corners", () => {
    const r = computeCanthalTilt(eyesWithTilt(-5), SQUARE)!;
    expect(r.angle.valueDeg).toBeCloseTo(-5, 1);
    expect(r.subScore.value).toBeCloseTo(30, 0);
  });

  it("is monotonic: more upward tilt never lowers the score", () => {
    const scores = [-8, -4, 0, 4, 8].map((t) => computeCanthalTilt(eyesWithTilt(t), SQUARE)!.subScore.value);
    for (let i = 1; i < scores.length; i++) expect(scores[i]!).toBeGreaterThan(scores[i - 1]!);
  });

  it("is invariant to head roll (rotating the whole face does not change the reading)", () => {
    const upright = computeCanthalTilt(eyesWithTilt(5), SQUARE)!.angle.valueDeg;
    for (const roll of [-15, -7, 7, 15]) {
      const rolled = computeCanthalTilt(eyesWithTilt(5, SQUARE, roll), SQUARE)!.angle.valueDeg;
      expect(rolled).toBeCloseTo(upright, 1);
    }
  });

  it("measures the same true angle on landscape, portrait and square frames", () => {
    for (const aspect of [4 / 3, 3 / 4, 16 / 9, 1]) {
      const r = computeCanthalTilt(eyesWithTilt(5, aspect), aspect)!;
      expect(r.angle.valueDeg).toBeCloseTo(5, 1);
    }
  });

  it("would misread the same landmarks if the aspect were ignored (regression guard)", () => {
    const face = eyesWithTilt(5, 4 / 3);
    const wrong = computeCanthalTilt(face, SQUARE)!.angle.valueDeg;
    const right = computeCanthalTilt(face, 4 / 3)!.angle.valueDeg;
    expect(Math.abs(wrong - right)).toBeGreaterThan(1);
  });

  it("marks canthalTilt as never actionable (structural trait)", () => {
    const result = computeCanthalTilt(eyesWithTilt(3), SQUARE);
    expect(result!.subScore.actionable).toBe(false);
    expect(result!.subScore.key).toBe("canthalTilt");
  });

  it("clamps the sub-score to [0, 100] for extreme tilt angles", () => {
    for (const t of [-80, 80]) {
      const v = computeCanthalTilt(eyesWithTilt(t), SQUARE)!.subScore.value;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("returns the inner/outer eye points (normalised, unscaled) used for the angle overlay", () => {
    const lInner = pt(0.4, 0.4);
    const lOuter = pt(0.25, 0.4);
    const face = buildFace({
      [L_EYE_OUTER]: lOuter,
      [L_EYE_INNER]: lInner,
      [R_EYE_INNER]: pt(0.6, 0.4),
      [R_EYE_OUTER]: pt(0.75, 0.4),
    });
    const result = computeCanthalTilt(face, 4 / 3);
    expect(result!.angle.points).toEqual([lInner, lOuter]);
  });
});

describe("computeFaceShape", () => {
  it("returns null when any of the six required landmarks are missing", () => {
    const face = buildFace({ [FOREHEAD]: pt(0.5, 0.1) }).slice(0, CHIN);
    expect(computeFaceShape(face, SQUARE)).toBeNull();
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
    expect(computeFaceShape(face, SQUARE)!.shape).toBe("long");
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
    expect(computeFaceShape(face, SQUARE)!.shape).toBe("round");
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
    expect(computeFaceShape(face, SQUARE)!.shape).toBe("square");
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
    expect(computeFaceShape(face, SQUARE)!.shape).toBe("heart");
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
    expect(computeFaceShape(face, SQUARE)!.shape).toBe("oval");
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
    const result = computeFaceShape(face, SQUARE);
    expect(result!.subScore.value).toBeCloseTo(100, 0);
    expect(result!.subScore.actionable).toBe(false); // faceShape is structural
  });

  it("scores lower as the ratio moves away from 1.35 (previously saturated at 100 for all faces)", () => {
    const at = (ratio: number) => {
      const w = 0.4;
      const h = w * ratio;
      return computeFaceShape(
        buildFace({
          [FOREHEAD]: pt(0.5, 0.5 - h / 2),
          [CHIN]: pt(0.5, 0.5 + h / 2),
          [L_CHEEKBONE]: pt(0.3, 0.5),
          [R_CHEEKBONE]: pt(0.7, 0.5),
          [L_JAW]: pt(0.335, 0.7),
          [R_JAW]: pt(0.665, 0.7),
        }),
        SQUARE
      )!.subScore.value;
    };
    expect(at(1.35)).toBeCloseTo(100, 6);
    expect(at(1.2)).toBeCloseTo(85, 6);
    expect(at(1.5)).toBeCloseTo(85, 6);
    expect(at(1.0)).toBeLessThan(at(1.2));
    expect(at(1.8)).toBeLessThan(at(1.5));
  });

  it("classifies the same physical face identically on landscape and portrait frames", () => {
    const cheekPx = 200, heightPx = 270, jawPx = 165;
    const build = (w: number, h: number) =>
      buildFace({
        [FOREHEAD]: pt(0.5, 0.5 - heightPx / 2 / h),
        [CHIN]: pt(0.5, 0.5 + heightPx / 2 / h),
        [L_CHEEKBONE]: pt(0.5 - cheekPx / 2 / w, 0.5),
        [R_CHEEKBONE]: pt(0.5 + cheekPx / 2 / w, 0.5),
        [L_JAW]: pt(0.5 - jawPx / 2 / w, 0.7),
        [R_JAW]: pt(0.5 + jawPx / 2 / w, 0.7),
      });
    const land = computeFaceShape(build(640, 480), 640 / 480)!;
    const port = computeFaceShape(build(480, 640), 480 / 640)!;
    expect(port.shape).toBe(land.shape);
    expect(port.subScore.value).toBeCloseTo(land.subScore.value, 6);
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
    const result = computeFaceShape(face, SQUARE);
    expect(result!.widthGuide.points).toEqual([lCheek, rCheek]);
    expect(result!.heightGuide.points).toEqual([forehead, chin]);
  });
});

describe("computeSymmetry", () => {
  it("returns null when any of the five required landmarks are missing", () => {
    const face = buildFace({ [NOSE_TIP]: pt(0.5, 0.5) }).slice(0, MOUTH_L);
    expect(computeSymmetry(face, SQUARE)).toBeNull();
  });

  it("scores 100 when eyes and mouth corners are perfectly symmetric around the nose", () => {
    const face = buildFace({
      [NOSE_TIP]: pt(0.5, 0.5),
      [L_EYE_OUTER]: pt(0.3, 0.4),
      [R_EYE_OUTER]: pt(0.7, 0.4),
      [MOUTH_L]: pt(0.35, 0.65),
      [MOUTH_R]: pt(0.65, 0.65),
    });
    const result = computeSymmetry(face, SQUARE);
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
    const result = computeSymmetry(face, SQUARE);
    expect(result!.subScore.value).toBeLessThan(100);
  });

  it("is aspect-invariant for a physically symmetric face", () => {
    const build = (w: number) =>
      buildFace({
        [NOSE_TIP]: pt(0.5, 0.5),
        [L_EYE_OUTER]: pt(0.5 - 120 / w, 0.4),
        [R_EYE_OUTER]: pt(0.5 + 120 / w, 0.4),
        [MOUTH_L]: pt(0.5 - 70 / w, 0.65),
        [MOUTH_R]: pt(0.5 + 70 / w, 0.65),
      });
    expect(computeSymmetry(build(480), 0.75)!.subScore.value).toBeCloseTo(100, 6);
    expect(computeSymmetry(build(640), 640 / 480)!.subScore.value).toBeCloseTo(100, 6);
  });

  it("clamps to 0 rather than going negative for severe asymmetry", () => {
    const face = buildFace({
      [NOSE_TIP]: pt(0.5, 0.5),
      [L_EYE_OUTER]: pt(0.05, 0.4), // extremely far
      [R_EYE_OUTER]: pt(0.51, 0.4), // extremely close
      [MOUTH_L]: pt(0.1, 0.65),
      [MOUTH_R]: pt(0.52, 0.65),
    });
    const result = computeSymmetry(face, SQUARE);
    expect(result!.subScore.value).toBe(0);
  });
});
