import { describe, it, expect } from "vitest";
import { evaluateFrame, MAX_YAW_DEG, MAX_PITCH_DEG } from "./qualityGate";
import type { QualityReport } from "../../types/landmarks";

/** A well-formed QualityReport that passes every gate by default. */
function quality(overrides?: Partial<QualityReport>): QualityReport {
  return {
    brightness: 120,
    sharpness: 20,
    faceDetected: true,
    poseDetected: false,
    headPose: { yawDeg: 0, pitchDeg: 0, rollDeg: 0 },
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

  // ── Head-pose gate ──────────────────────────────────────────────────────────

  it("rejects when headPose is absent (fail-closed)", () => {
    const result = evaluateFrame({
      quality: quality({ headPose: undefined }),
      alignmentProgress: 0.9,
    });
    expect(result).toEqual({ accepted: false, reason: "Head pose unavailable" });
  });

  it("rejects when yaw exceeds MAX_YAW_DEG", () => {
    const result = evaluateFrame({
      quality: quality({ headPose: { yawDeg: MAX_YAW_DEG + 0.1, pitchDeg: 0, rollDeg: 0 } }),
      alignmentProgress: 0.9,
    });
    expect(result).toEqual({ accepted: false, reason: "Face the camera (head turned)" });
  });

  it("rejects when yaw is below -MAX_YAW_DEG", () => {
    const result = evaluateFrame({
      quality: quality({ headPose: { yawDeg: -(MAX_YAW_DEG + 0.1), pitchDeg: 0, rollDeg: 0 } }),
      alignmentProgress: 0.9,
    });
    expect(result).toEqual({ accepted: false, reason: "Face the camera (head turned)" });
  });

  it("accepts yaw exactly at MAX_YAW_DEG (boundary inclusive)", () => {
    const result = evaluateFrame({
      quality: quality({ headPose: { yawDeg: MAX_YAW_DEG, pitchDeg: 0, rollDeg: 0 } }),
      alignmentProgress: 0.9,
    });
    expect(result.accepted).toBe(true);
  });

  it("rejects when pitch exceeds MAX_PITCH_DEG", () => {
    const result = evaluateFrame({
      quality: quality({ headPose: { yawDeg: 0, pitchDeg: MAX_PITCH_DEG + 0.1, rollDeg: 0 } }),
      alignmentProgress: 0.9,
    });
    expect(result).toEqual({ accepted: false, reason: "Level your chin (head tilted up/down)" });
  });

  it("rejects when pitch is below -MAX_PITCH_DEG", () => {
    const result = evaluateFrame({
      quality: quality({ headPose: { yawDeg: 0, pitchDeg: -(MAX_PITCH_DEG + 0.1), rollDeg: 0 } }),
      alignmentProgress: 0.9,
    });
    expect(result).toEqual({ accepted: false, reason: "Level your chin (head tilted up/down)" });
  });

  // ── Lighting / sharpness / alignment gates ──────────────────────────────────

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
