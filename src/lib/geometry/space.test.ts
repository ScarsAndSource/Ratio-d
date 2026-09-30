import { describe, it, expect } from "vitest";
import {
  REFERENCE_ASPECT,
  sanitizeAspect,
  aspectOf,
  metricDist,
  metricAngleDeg,
  toReferenceUnits,
  scaledFrameSize,
} from "./space";

const p = (x: number, y: number) => ({ x, y, z: 0 });

describe("sanitizeAspect / aspectOf", () => {
  it("passes sane values through", () => {
    expect(sanitizeAspect(0.75)).toBe(0.75);
    expect(sanitizeAspect(16 / 9)).toBeCloseTo(16 / 9, 9);
  });
  it("falls back for null/undefined/NaN/Infinity/zero/negative/absurd", () => {
    for (const bad of [null, undefined, NaN, Infinity, 0, -1, 0.01, 99]) {
      expect(sanitizeAspect(bad as number | null | undefined)).toBe(REFERENCE_ASPECT);
    }
  });
  it("aspectOf divides width by height and guards zero dimensions", () => {
    expect(aspectOf(640, 480)).toBeCloseTo(4 / 3, 9);
    expect(aspectOf(480, 640)).toBeCloseTo(0.75, 9);
    expect(aspectOf(0, 480)).toBe(REFERENCE_ASPECT);
    expect(aspectOf(640, 0)).toBe(REFERENCE_ASPECT);
  });
});

describe("metricDist / metricAngleDeg", () => {
  it("a physically square 100px x 100px step has equal length on both axes at 640x480", () => {
    const aspect = 640 / 480;
    const horizontal = metricDist(p(0, 0), p(100 / 640, 0), aspect);
    const vertical = metricDist(p(0, 0), p(0, 100 / 480), aspect);
    expect(horizontal).toBeCloseTo(vertical, 9);
  });
  it("a true 45-degree pixel line reads 45 degrees on a non-square frame", () => {
    for (const [w, h] of [[640, 480], [480, 640], [1280, 720]] as const) {
      const angle = metricAngleDeg(p(0, 0), p(100 / w, 100 / h), w / h);
      expect(angle).toBeCloseTo(45, 6);
    }
  });
  it("aspect 1 reduces to the plain euclidean formulas", () => {
    expect(metricDist(p(0, 0), p(0.3, 0.4), 1)).toBeCloseTo(0.5, 9);
    expect(metricAngleDeg(p(0, 0), p(1, 1), 1)).toBeCloseTo(45, 9);
  });
});

describe("toReferenceUnits", () => {
  it("leaves x unchanged at the reference aspect", () => {
    expect(toReferenceUnits(0.18, 0, REFERENCE_ASPECT).x).toBeCloseTo(0.18, 9);
  });
  it("shrinks x on a portrait frame and converts y to width units", () => {
    const r = toReferenceUnits(0.2, 0.2, 0.75);
    expect(r.x).toBeCloseTo((0.2 * 0.75) / REFERENCE_ASPECT, 9);
    expect(r.y).toBeCloseTo(0.2 / REFERENCE_ASPECT, 9);
  });
});

describe("scaledFrameSize", () => {
  it("keeps the source aspect (no stretching)", () => {
    expect(scaledFrameSize(4 / 3, 480)).toEqual({ width: 480, height: 360 });
    expect(scaledFrameSize(0.75, 480)).toEqual({ width: 480, height: 640 });
    expect(scaledFrameSize(16 / 9, 480)).toEqual({ width: 480, height: 270 });
  });
  it("falls back to the reference aspect for bad input", () => {
    expect(scaledFrameSize(NaN, 480)).toEqual({ width: 480, height: 360 });
  });
});
