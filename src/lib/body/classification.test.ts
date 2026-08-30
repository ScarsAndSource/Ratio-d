import { describe, it, expect } from "vitest";
import { classifyZone } from "./classification";

describe("classifyZone", () => {
  it("marks structural zones as non-actionable (false)", () => {
    expect(classifyZone("shoulderHipRatio")).toBe(false);
    expect(classifyZone("upperArmSymmetry")).toBe(false);
    expect(classifyZone("thighSymmetry")).toBe(false);
  });

  it("marks actionable zones as actionable (true)", () => {
    expect(classifyZone("postureTilt")).toBe(true);
    expect(classifyZone("chestDepthProxy")).toBe(true);
  });

  it("defaults unknown zone keys to non-actionable (false)", () => {
    expect(classifyZone("someFutureZoneNotYetClassified")).toBe(false);
    expect(classifyZone("")).toBe(false);
  });
});
