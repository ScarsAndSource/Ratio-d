import { describe, it, expect } from "vitest";
import { getFaceRecommendations } from "./careRecommendations";

describe("getFaceRecommendations", () => {
  it("returns recommendations for darkCircle", () => {
    const result = getFaceRecommendations("darkCircle");
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.detail.length).toBeGreaterThan(0);
    }
  });

  it("returns recommendations for pores", () => {
    const result = getFaceRecommendations("pores");
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes a medical-caution item for darkCircle given it can have non-lifestyle causes", () => {
    const result = getFaceRecommendations("darkCircle");
    expect(result.some((item) => /doctor/i.test(item.title) || /doctor/i.test(item.detail))).toBe(true);
  });

  it("returns an empty array for a structural (non-actionable) sub-score key", () => {
    // canthalTilt, faceShape, symmetry are all structural (actionable: false
    // in geometry.ts) and must never surface care suggestions.
    expect(getFaceRecommendations("canthalTilt")).toEqual([]);
    expect(getFaceRecommendations("faceShape")).toEqual([]);
    expect(getFaceRecommendations("symmetry")).toEqual([]);
  });

  it("returns an empty array for 'none' (the fairly-balanced priority lever key)", () => {
    expect(getFaceRecommendations("none")).toEqual([]);
  });

  it("returns an empty array for an unrecognized key rather than a generic fallback", () => {
    expect(getFaceRecommendations("someFutureSubScoreKey")).toEqual([]);
  });
});
