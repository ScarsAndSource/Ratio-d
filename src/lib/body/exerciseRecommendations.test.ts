import { describe, it, expect } from "vitest";
import { getBodyRecommendations } from "./exerciseRecommendations";

describe("getBodyRecommendations", () => {
  it("returns recommendations for postureTilt", () => {
    const result = getBodyRecommendations("postureTilt");
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.detail.length).toBeGreaterThan(0);
    }
  });

  it("returns recommendations for chestDepthProxy", () => {
    const result = getBodyRecommendations("chestDepthProxy");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns an empty array for a structural (non-actionable) zone key", () => {
    // shoulderHipRatio, upperArmSymmetry, thighSymmetry are all structural
    // (see classifyZone) and must never surface exercise suggestions.
    expect(getBodyRecommendations("shoulderHipRatio")).toEqual([]);
    expect(getBodyRecommendations("upperArmSymmetry")).toEqual([]);
    expect(getBodyRecommendations("thighSymmetry")).toEqual([]);
  });

  it("returns an empty array for 'none' (the fairly-balanced priority lever key)", () => {
    expect(getBodyRecommendations("none")).toEqual([]);
  });

  it("returns an empty array for an unrecognized key rather than a generic fallback", () => {
    expect(getBodyRecommendations("someFutureZoneKey")).toEqual([]);
  });
});
