import { describe, it, expect } from "vitest";
import { evaluateBodyFrame } from "./bodyQualityGate";
import type { QualityReport } from "../../types/landmarks";

function quality(overrides?: Partial<QualityReport>): QualityReport {
  return {
    brightness: 120,
    sharpness: 20,
    faceDetected: true,
    poseDetected: true,
    ...overrides,
  };
}

describe("evaluateBodyFrame", () => {
  it("rejects when no pose is detected", () => {
    const result = evaluateBodyFrame({
      quality: quality({ poseDetected: false }),
      alignmentProgress: 0.9,
      angleMatch: 1,
    });
    expect(result).toEqual({ accepted: false, reason: "No body detected" });
  });

  it("rejects when too dark (< 50)", () => {
    const result = evaluateBodyFrame({
      quality: quality({ brightness: 45 }),
      alignmentProgress: 0.9,
      angleMatch: 1,
    });
    expect(result).toEqual({ accepted: false, reason: "Too dark" });
  });

  it("rejects when overexposed (> 210)", () => {
    const result = evaluateBodyFrame({
      quality: quality({ brightness: 215 }),
      alignmentProgress: 0.9,
      angleMatch: 1,
    });
    expect(result).toEqual({ accepted: false, reason: "Overexposed" });
  });

  it("rejects when too blurry (< 10)", () => {
    const result = evaluateBodyFrame({
      quality: quality({ sharpness: 8 }),
      alignmentProgress: 0.9,
      angleMatch: 1,
    });
    expect(result).toEqual({ accepted: false, reason: "Too blurry" });
  });

  it("rejects when angle match is below threshold (< 0.7)", () => {
    const result = evaluateBodyFrame({
      quality: quality(),
      alignmentProgress: 0.9,
      angleMatch: 0.6,
    });
    expect(result).toEqual({ accepted: false, reason: "Wrong angle for this step" });
  });

  it("rejects when alignment progress is below threshold (< 0.6)", () => {
    const result = evaluateBodyFrame({
      quality: quality(),
      alignmentProgress: 0.5,
      angleMatch: 1,
    });
    expect(result).toEqual({ accepted: false, reason: "Lost alignment" });
  });

  it("accepts when all criteria pass threshold", () => {
    const result = evaluateBodyFrame({
      quality: quality(),
      alignmentProgress: 0.8,
      angleMatch: 0.8,
    });
    expect(result).toEqual({ accepted: true, reason: "Accepted" });
  });
});
