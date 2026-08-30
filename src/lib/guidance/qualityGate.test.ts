import { describe, it, expect } from "vitest";
import { evaluateFrame } from "./qualityGate";
import type { QualityReport } from "../../types/landmarks";

function quality(overrides?: Partial<QualityReport>): QualityReport {
  return {
    brightness: 120,
    sharpness: 20,
    faceDetected: true,
    poseDetected: false,
    ...overrides,
  };
}

describe("evaluateFrame", () => {
  it("rejects when no face is detected", () => {
    const result = evaluateFrame({
      quality: quality({ faceDetected: false }),
      alignmentProgress: 0.9,
    });
    expect(result).toEqual({ accepted: false, reason: "No face detected" });
  });

  it("rejects when too dark (< 50)", () => {
    const result = evaluateFrame({
      quality: quality({ brightness: 40 }),
      alignmentProgress: 0.9,
    });
    expect(result).toEqual({ accepted: false, reason: "Too dark" });
  });

  it("rejects when overexposed (> 210)", () => {
    const result = evaluateFrame({
      quality: quality({ brightness: 220 }),
      alignmentProgress: 0.9,
    });
    expect(result).toEqual({ accepted: false, reason: "Overexposed" });
  });

  it("rejects when too blurry (< 12)", () => {
    const result = evaluateFrame({
      quality: quality({ sharpness: 10 }),
      alignmentProgress: 0.9,
    });
    expect(result).toEqual({ accepted: false, reason: "Too blurry" });
  });

  it("rejects when alignment progress is below threshold (< 0.75)", () => {
    const result = evaluateFrame({
      quality: quality(),
      alignmentProgress: 0.7,
    });
    expect(result).toEqual({ accepted: false, reason: "Lost alignment" });
  });

  it("accepts when all criteria pass threshold", () => {
    const result = evaluateFrame({
      quality: quality(),
      alignmentProgress: 0.8,
    });
    expect(result).toEqual({ accepted: true, reason: "Accepted" });
  });
});
