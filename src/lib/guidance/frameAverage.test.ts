import { describe, it, expect } from "vitest";
import { averageLandmarks, averageQuality } from "./frameAverage";
import type { LandmarkPoint, QualityReport } from "../../types/landmarks";

function pt(x: number, y: number, z = 0): LandmarkPoint {
  return { x, y, z };
}

describe("averageLandmarks", () => {
  it("returns null for empty frame sets", () => {
    expect(averageLandmarks([])).toBeNull();
  });

  it("averages coordinates point by point across frames", () => {
    const frame1 = [pt(0.2, 0.4, 0.1), pt(0.6, 0.8, 0.2)];
    const frame2 = [pt(0.4, 0.6, 0.3), pt(0.8, 1.0, 0.4)];

    const result = averageLandmarks([frame1, frame2]);
    expect(result).not.toBeNull();
    expect(result![0]!.x).toBeCloseTo(0.3, 5);
    expect(result![0]!.y).toBeCloseTo(0.5, 5);
    expect(result![0]!.z).toBeCloseTo(0.2, 5);
    expect(result![1]!.x).toBeCloseTo(0.7, 5);
    expect(result![1]!.y).toBeCloseTo(0.9, 5);
    expect(result![1]!.z).toBeCloseTo(0.3, 5);
  });

  it("handles a single frame by returning identical point values", () => {
    const frame = [pt(0.5, 0.5, 0.5)];
    const result = averageLandmarks([frame]);
    expect(result).toEqual([pt(0.5, 0.5, 0.5)]);
  });
});

describe("averageQuality", () => {
  it("returns default zeroed report for empty array", () => {
    expect(averageQuality([])).toEqual({
      brightness: 0,
      sharpness: 0,
      faceDetected: false,
      poseDetected: false,
    });
  });

  it("averages numeric fields, requires every frame faceDetected, and any frame poseDetected", () => {
    const q1: QualityReport = { brightness: 100, sharpness: 20, faceDetected: true, poseDetected: false };
    const q2: QualityReport = { brightness: 140, sharpness: 40, faceDetected: true, poseDetected: true };
    const result = averageQuality([q1, q2]);

    expect(result.brightness).toBe(120);
    expect(result.sharpness).toBe(30);
    expect(result.faceDetected).toBe(true);
    expect(result.poseDetected).toBe(true);
  });

  it("sets faceDetected to false if any single frame misses face detection", () => {
    const q1: QualityReport = { brightness: 100, sharpness: 20, faceDetected: true, poseDetected: true };
    const q2: QualityReport = { brightness: 100, sharpness: 20, faceDetected: false, poseDetected: true };
    expect(averageQuality([q1, q2]).faceDetected).toBe(false);
  });
});
