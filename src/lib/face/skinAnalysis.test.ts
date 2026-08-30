import { describe, it, expect } from "vitest";
import { analyzeSkin } from "./skinAnalysis";
import type { LandmarkPoint } from "../../types/landmarks";

// Face mesh indices used internally by skinAnalysis.ts
const UNDER_EYE_L = 230;
const UNDER_EYE_R = 450;
const CHEEK_L = 50;
const CHEEK_R = 280;

const WIDTH = 100;
const HEIGHT = 100;

/**
 * Builds a synthetic ImageData-shaped object (structurally typed, no DOM
 * dependency needed since analyzeSkin only ever reads .data/.width/.height).
 * `paint(x, y)` returns the [r,g,b] for each pixel.
 */
function buildImage(paint: (x: number, y: number) => [number, number, number]): ImageData {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const idx = (y * WIDTH + x) * 4;
      const [r, g, b] = paint(x, y);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  return { data, width: WIDTH, height: HEIGHT, colorSpace: "srgb" } as ImageData;
}

function solidImage(r: number, g: number, b: number): ImageData {
  return buildImage(() => [r, g, b]);
}

function pt(x: number, y: number, z = 0): LandmarkPoint {
  return { x, y, z };
}

// Landmarks placed (in normalized 0-1 coords) so their pixel regions land
// safely inside the 100x100 canvas with room for the sampling box.
function buildLandmarks(): LandmarkPoint[] {
  const arr: LandmarkPoint[] = new Array(451).fill(pt(0.5, 0.5));
  arr[UNDER_EYE_L] = pt(0.3, 0.4);
  arr[UNDER_EYE_R] = pt(0.7, 0.4);
  arr[CHEEK_L] = pt(0.3, 0.6);
  arr[CHEEK_R] = pt(0.7, 0.6);
  return arr;
}

describe("analyzeSkin", () => {
  it("returns null when any of the four required landmarks are missing", () => {
    const landmarks = buildLandmarks().slice(0, CHEEK_L); // cuts off before cheeks exist
    const image = solidImage(180, 150, 130);
    expect(analyzeSkin(image, landmarks)).toBeNull();
  });

  it("returns a full result with darkCircle, pores, and undertone for a uniform image", () => {
    const landmarks = buildLandmarks();
    const image = solidImage(180, 150, 130);
    const result = analyzeSkin(image, landmarks);
    expect(result).not.toBeNull();
    expect(result!.darkCircle.key).toBe("darkCircle");
    expect(result!.pores.key).toBe("pores");
    expect(result!.undertone.classification).toBeDefined();
  });

  it("scores darkCircle near 100 (even tone) when under-eye and cheek regions match", () => {
    const landmarks = buildLandmarks();
    const image = solidImage(160, 140, 120); // identical color everywhere
    const result = analyzeSkin(image, landmarks)!;
    // relativeDrop clamps to 0 when cheek and under-eye luminance are equal
    // -> darkCircleValue = 100 - 0*220 = 100
    expect(result.darkCircle.value).toBeCloseTo(100, 0);
  });

  it("scores darkCircle lower when the under-eye region is noticeably darker than the cheeks", () => {
    const landmarks = buildLandmarks();
    // Cheeks bright, under-eyes dark
    const image = buildImage((_x, y) => {
      const isUnderEye = y < 50; // under-eye landmarks are at y=0.4*100=40, cheeks at y=0.6*100=60
      return isUnderEye ? [40, 30, 25] : [220, 200, 190];
    });
    const result = analyzeSkin(image, landmarks)!;
    expect(result.darkCircle.value).toBeLessThan(100);
  });

  it("clamps darkCircle to [0, 100]", () => {
    const landmarks = buildLandmarks();
    // Extreme darkness under the eyes relative to very bright cheeks
    const image = buildImage((_x, y) => (y < 50 ? [0, 0, 0] : [255, 255, 255]));
    const result = analyzeSkin(image, landmarks)!;
    expect(result.darkCircle.value).toBeGreaterThanOrEqual(0);
    expect(result.darkCircle.value).toBeLessThanOrEqual(100);
  });

  it("scores pores near 100 for a perfectly flat/uniform cheek region (zero variance)", () => {
    const landmarks = buildLandmarks();
    const image = solidImage(170, 150, 130);
    const result = analyzeSkin(image, landmarks)!;
    // variance() is 0 for a uniform region -> poresValue = 100 - 0/4 = 100
    expect(result.pores.value).toBeCloseTo(100, 0);
  });

  it("scores pores lower for a high-variance (noisy/textured) cheek region", () => {
    const landmarks = buildLandmarks();
    // Checkerboard pattern on the cheeks creates high local luminance variance
    const image = buildImage((x, y) => {
      const checker = (x + y) % 2 === 0;
      return checker ? [255, 255, 255] : [0, 0, 0];
    });
    const result = analyzeSkin(image, landmarks)!;
    expect(result.pores.value).toBeLessThan(100);
  });

  it("classifies undertone as 'warm' when red channel clearly exceeds blue", () => {
    const landmarks = buildLandmarks();
    const image = solidImage(200, 150, 100); // r - b = 100, well past the +/-6 neutral band
    const result = analyzeSkin(image, landmarks)!;
    expect(result.undertone.classification).toBe("warm");
    expect(result.undertone.confidence).toBeGreaterThan(0);
  });

  it("classifies undertone as 'cool' when blue channel clearly exceeds red", () => {
    const landmarks = buildLandmarks();
    const image = solidImage(100, 150, 200); // r - b = -100
    const result = analyzeSkin(image, landmarks)!;
    expect(result.undertone.classification).toBe("cool");
  });

  it("classifies undertone as 'neutral' when warmth and greenness are both within +/-6", () => {
    const landmarks = buildLandmarks();
    const image = solidImage(150, 150, 150); // r == g == b -> warmth 0, greenness 0
    const result = analyzeSkin(image, landmarks)!;
    expect(result.undertone.classification).toBe("neutral");
    expect(result.undertone.confidence).toBe(0.5);
  });

  it("caps undertone confidence at 1 for extreme warmth/coolness (clamp01)", () => {
    const landmarks = buildLandmarks();
    const image = solidImage(255, 0, 0); // r - b = 255, far past the /30 confidence scale
    const result = analyzeSkin(image, landmarks)!;
    expect(result.undertone.confidence).toBe(1);
  });

  it("marks both darkCircle and pores as actionable sub-scores", () => {
    const landmarks = buildLandmarks();
    const image = solidImage(180, 150, 130);
    const result = analyzeSkin(image, landmarks)!;
    expect(result.darkCircle.actionable).toBe(true);
    expect(result.pores.actionable).toBe(true);
  });
});
