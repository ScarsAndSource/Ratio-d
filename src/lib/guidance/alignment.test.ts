import { describe, it, expect } from "vitest";
import { computeFaceAlignment, computeBrightness, computeSharpness } from "./alignment";
import type { LandmarkPoint } from "../../types/landmarks";

const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
const NOSE_TIP = 1;

function pt(x: number, y: number, z = 0): LandmarkPoint {
  return { x, y, z };
}

function buildLandmarks(overrides: Partial<Record<number, LandmarkPoint>>): LandmarkPoint[] {
  const arr: LandmarkPoint[] = new Array(264).fill(pt(0, 0));
  for (const [idx, p] of Object.entries(overrides)) {
    if (p) arr[Number(idx)] = p;
  }
  return arr;
}

// A configuration that lands centered, at the target interocular distance
// (0.18), and level -> should read as "Locked".
function perfectLandmarks(): LandmarkPoint[] {
  return buildLandmarks({
    [LEFT_EYE_OUTER]: pt(0.41, 0.5),
    [RIGHT_EYE_OUTER]: pt(0.59, 0.5), // interocular = 0.18 exactly
    [NOSE_TIP]: pt(0.5, 0.5), // centered
  });
}

describe("computeFaceAlignment", () => {
  it("returns the zero/no-detection reading when landmarks is null", () => {
    const result = computeFaceAlignment(null);
    expect(result).toEqual({
      centeredness: 0,
      distanceFit: 0,
      levelness: 0,
      progress: 0,
      guidance: "Bring your face into frame",
      raw: { offsetX: 0, offsetY: 0, interocular: 0, tiltDeg: 0 },
    });
  });

  it("returns the zero/no-detection reading when required landmarks are missing", () => {
    const landmarks = buildLandmarks({ [LEFT_EYE_OUTER]: pt(0.4, 0.5) }).slice(0, RIGHT_EYE_OUTER);
    const result = computeFaceAlignment(landmarks);
    expect(result.guidance).toBe("Bring your face into frame");
    expect(result.progress).toBe(0);
  });

  it("reports 'Locked' with progress > 0.92 for a centered, correctly-sized, level face", () => {
    const result = computeFaceAlignment(perfectLandmarks());
    expect(result.centeredness).toBeCloseTo(1, 5);
    expect(result.distanceFit).toBeCloseTo(1, 5);
    expect(result.levelness).toBeCloseTo(1, 5);
    expect(result.progress).toBeCloseTo(1, 5);
    expect(result.guidance).toBe("Locked");
  });

  it("guides 'Step back' when interocular distance is below target (current implementation)", () => {
    const landmarks = buildLandmarks({
      [LEFT_EYE_OUTER]: pt(0.49, 0.5),
      [RIGHT_EYE_OUTER]: pt(0.51, 0.5), // interocular = 0.02, below target 0.18
      [NOSE_TIP]: pt(0.5, 0.5),
    });
    const result = computeFaceAlignment(landmarks);
    expect(result.guidance).toBe("Step back");
  });

  it("guides 'Move closer' when interocular distance is at/above target (current implementation)", () => {
    const landmarks = buildLandmarks({
      [LEFT_EYE_OUTER]: pt(0.3, 0.5),
      [RIGHT_EYE_OUTER]: pt(0.7, 0.5), // interocular = 0.4, above target 0.18
      [NOSE_TIP]: pt(0.5, 0.5),
    });
    const result = computeFaceAlignment(landmarks);
    expect(result.guidance).toBe("Move closer");
  });

  it("guides 'Center your face' when the nose is off-center but distance/level are fine", () => {
    const landmarks = buildLandmarks({
      [LEFT_EYE_OUTER]: pt(0.61, 0.5),
      [RIGHT_EYE_OUTER]: pt(0.79, 0.5), // interocular still 0.18, shifted right
      [NOSE_TIP]: pt(0.7, 0.5), // offsetX = 0.2, way past the 0.08 tolerance
    });
    const result = computeFaceAlignment(landmarks);
    expect(result.guidance).toBe("Center your face");
  });

  it("guides 'Level your head' when eyes are tilted beyond tolerance", () => {
    // Eye points rotated 30deg around the frame center while preserving
    // the exact target interocular distance (0.18), so distanceFit stays
    // perfect and levelness alone is pushed below tolerance.
    const landmarks = buildLandmarks({
      [LEFT_EYE_OUTER]: pt(0.42206, 0.455),
      [RIGHT_EYE_OUTER]: pt(0.57794, 0.545),
      [NOSE_TIP]: pt(0.5, 0.5),
    });
    const result = computeFaceAlignment(landmarks);
    expect(result.raw.interocular).toBeCloseTo(0.18, 3);
    expect(result.distanceFit).toBeCloseTo(1, 2);
    expect(result.guidance).toBe("Level your head");
  });

  it("computes tiltDeg and interocular in the raw output for downstream consumers", () => {
    const result = computeFaceAlignment(perfectLandmarks());
    expect(result.raw.interocular).toBeCloseTo(0.18, 5);
    expect(result.raw.tiltDeg).toBeCloseTo(0, 5);
  });

  it("keeps progress and every component clamped to [0, 1] for extreme inputs", () => {
    const landmarks = buildLandmarks({
      [LEFT_EYE_OUTER]: pt(0, 0),
      [RIGHT_EYE_OUTER]: pt(1, 1),
      [NOSE_TIP]: pt(1, 1),
    });
    const result = computeFaceAlignment(landmarks);
    for (const v of [result.centeredness, result.distanceFit, result.levelness, result.progress]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("computeBrightness", () => {
  function makeImageData(pixels: [number, number, number][]): ImageData {
    const data = new Uint8ClampedArray(pixels.length * 4);
    pixels.forEach(([r, g, b], i) => {
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = 255;
    });
    return { data, width: pixels.length, height: 1, colorSpace: "srgb" } as ImageData;
  }

  it("returns 0 for a pure black image", () => {
    const image = makeImageData([
      [0, 0, 0],
      [0, 0, 0],
    ]);
    expect(computeBrightness(image)).toBe(0);
  });

  it("returns 255 for a pure white image", () => {
    const image = makeImageData([
      [255, 255, 255],
      [255, 255, 255],
    ]);
    expect(computeBrightness(image)).toBeCloseTo(255, 5);
  });

  it("weights channels by the standard luminance coefficients (0.299/0.587/0.114)", () => {
    const image = makeImageData([[100, 0, 0]]); // pure red
    expect(computeBrightness(image)).toBeCloseTo(0.299 * 100, 5);
  });

  it("averages brightness across multiple pixels", () => {
    const image = makeImageData([
      [0, 0, 0],
      [255, 255, 255],
    ]);
    expect(computeBrightness(image)).toBeCloseTo(127.5, 5);
  });
});

describe("computeSharpness", () => {
  function makeImageData(rows: number[][]): { image: ImageData; width: number } {
    const width = rows[0]?.length ?? 0;
    const height = rows.length;
    const data = new Uint8ClampedArray(width * height * 4);
    let i = 0;
    for (const row of rows) {
      for (const gray of row) {
        data[i * 4] = gray;
        data[i * 4 + 1] = gray;
        data[i * 4 + 2] = gray;
        data[i * 4 + 3] = 255;
        i++;
      }
    }
    return { image: { data, width, height, colorSpace: "srgb" } as ImageData, width };
  }

  it("returns 0 for a perfectly flat (uniform) image", () => {
    const { image, width } = makeImageData([
      [100, 100, 100],
      [100, 100, 100],
    ]);
    expect(computeSharpness(image, width)).toBe(0);
  });

  it("returns a positive value for an image with horizontal contrast", () => {
    const { image, width } = makeImageData([
      [0, 255, 0, 255],
      [0, 255, 0, 255],
    ]);
    expect(computeSharpness(image, width)).toBeGreaterThan(0);
  });

  it("does not count the wraparound pair at each row boundary", () => {
    // Two rows where only the row-end -> next-row-start transition has a
    // huge jump; every real within-row transition is flat. If the
    // wraparound were (incorrectly) included, sharpness would be enormous.
    const { image, width } = makeImageData([
      [10, 10, 10],
      [250, 250, 250],
    ]);
    expect(computeSharpness(image, width)).toBe(0);
  });

  it("increases as within-row contrast increases", () => {
    const low = makeImageData([[100, 110, 100, 110]]);
    const high = makeImageData([[0, 255, 0, 255]]);
    expect(computeSharpness(high.image, high.width)).toBeGreaterThan(
      computeSharpness(low.image, low.width)
    );
  });
});
