import { describe, it, expect } from "vitest";
import { isReliable, MIN_VISIBILITY } from "./reliability";
import type { LandmarkPoint } from "../../types/landmarks";

function pt(x: number, y: number, visibility?: number): LandmarkPoint {
  return { x, y, z: 0, ...(visibility !== undefined ? { visibility } : {}) };
}

describe("isReliable", () => {
  it("returns false for null", () => {
    expect(isReliable(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isReliable(undefined)).toBe(false);
  });

  it("returns true for an in-frame point with no visibility field (face mesh)", () => {
    expect(isReliable(pt(0.5, 0.5))).toBe(true);
  });

  it("returns true when visibility equals MIN_VISIBILITY exactly", () => {
    expect(isReliable(pt(0.5, 0.5, MIN_VISIBILITY))).toBe(true);
  });

  it("returns true when visibility is above MIN_VISIBILITY", () => {
    expect(isReliable(pt(0.5, 0.5, 0.9))).toBe(true);
  });

  it("returns false when visibility is below MIN_VISIBILITY", () => {
    expect(isReliable(pt(0.5, 0.5, MIN_VISIBILITY - 0.01))).toBe(false);
  });

  it("returns false for x < 0 (off-frame left)", () => {
    expect(isReliable(pt(-0.01, 0.5))).toBe(false);
  });

  it("returns false for x > 1 (off-frame right)", () => {
    expect(isReliable(pt(1.01, 0.5))).toBe(false);
  });

  it("returns false for y < 0 (off-frame top)", () => {
    expect(isReliable(pt(0.5, -0.01))).toBe(false);
  });

  it("returns false for y > 1 (off-frame bottom)", () => {
    expect(isReliable(pt(0.5, 1.01))).toBe(false);
  });

  it("returns true at the exact frame corners (0,0) and (1,1)", () => {
    expect(isReliable(pt(0, 0))).toBe(true);
    expect(isReliable(pt(1, 1))).toBe(true);
  });

  it("accepts a custom minVisibility threshold", () => {
    expect(isReliable(pt(0.5, 0.5, 0.7), 0.8)).toBe(false);
    expect(isReliable(pt(0.5, 0.5, 0.7), 0.6)).toBe(true);
  });

  it("fails a low-visibility point that is also off-frame (both conditions)", () => {
    expect(isReliable(pt(-0.1, 0.5, 0.2))).toBe(false);
  });
});
