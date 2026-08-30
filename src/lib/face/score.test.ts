import { describe, it, expect, vi } from "vitest";
import { buildFaceMetrics } from "./score";
import type { SubScore, UndertoneReading, AngleMeasurement } from "../../types/faceMetrics";
import type { LandmarkPoint } from "../../types/landmarks";

function subScore(overrides: Partial<SubScore>): SubScore {
  return { key: "someScore", label: "Some score", value: 80, actionable: true, ...overrides };
}

const fakeUndertone: UndertoneReading = { classification: "neutral", confidence: 0.5 };
const pt = (x: number, y: number, z = 0): LandmarkPoint => ({ x, y, z });
const fakeAngle: AngleMeasurement = { label: "test angle", valueDeg: 0, points: [pt(0, 0), pt(1, 1)] };

describe("buildFaceMetrics", () => {
  it("computes overallScore as the rounded average of all sub-score values", () => {
    const subScores = [subScore({ value: 90 }), subScore({ value: 70 }), subScore({ value: 81 })];
    const metrics = buildFaceMetrics({ subScores, angles: [fakeAngle], undertone: fakeUndertone });
    // (90 + 70 + 81) / 3 = 80.33... -> rounds to 80
    expect(metrics.overallScore).toBe(80);
  });

  it("passes through angles and undertone unchanged", () => {
    const metrics = buildFaceMetrics({
      subScores: [subScore({ value: 80 })],
      angles: [fakeAngle],
      undertone: fakeUndertone,
    });
    expect(metrics.angles).toEqual([fakeAngle]);
    expect(metrics.undertone).toEqual(fakeUndertone);
  });

  it("stamps capturedAt with the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-01T00:00:00.000Z"));
    const metrics = buildFaceMetrics({
      subScores: [subScore({ value: 80 })],
      angles: [],
      undertone: fakeUndertone,
    });
    expect(metrics.capturedAt).toBe(new Date("2026-02-01T00:00:00.000Z").getTime());
    vi.useRealTimers();
  });

  describe("priorityLever selection (via buildFaceMetrics)", () => {
    it("returns 'Fairly balanced' / subScoreKey 'none' when no sub-score is actionable", () => {
      const subScores = [
        subScore({ key: "canthalTilt", value: 20, actionable: false }),
        subScore({ key: "symmetry", value: 10, actionable: false }),
      ];
      const metrics = buildFaceMetrics({ subScores, angles: [], undertone: fakeUndertone });
      expect(metrics.priorityLever.subScoreKey).toBe("none");
      expect(metrics.priorityLever.label).toBe("Fairly balanced");
      expect(metrics.priorityLever.reason).toMatch(/Nothing actionable/);
    });

    it("returns 'Fairly balanced' when the lowest actionable sub-score is still above 75", () => {
      const subScores = [
        subScore({ key: "darkCircle", value: 76, actionable: true }),
        subScore({ key: "pores", value: 90, actionable: true }),
      ];
      const metrics = buildFaceMetrics({ subScores, angles: [], undertone: fakeUndertone });
      expect(metrics.priorityLever.subScoreKey).toBe("none");
      expect(metrics.priorityLever.reason).toMatch(/within a normal range/);
    });

    it("flags the lowest actionable sub-score below 75 as the priority lever", () => {
      const subScores = [
        subScore({ key: "darkCircle", label: "Under-eye evenness", value: 40, actionable: true }),
        subScore({ key: "pores", label: "Skin texture", value: 85, actionable: true }),
        subScore({ key: "canthalTilt", value: 5, actionable: false }), // ignored: not actionable
      ];
      const metrics = buildFaceMetrics({ subScores, angles: [], undertone: fakeUndertone });
      expect(metrics.priorityLever.subScoreKey).toBe("darkCircle");
      expect(metrics.priorityLever.label).toBe("Under-eye evenness");
      expect(metrics.priorityLever.reason).toMatch(/darker than the rest/);
    });

    it("gives pores its own specific reason text when it's the priority", () => {
      const subScores = [subScore({ key: "pores", label: "Skin texture", value: 30, actionable: true })];
      const metrics = buildFaceMetrics({ subScores, angles: [], undertone: fakeUndertone });
      expect(metrics.priorityLever.reason).toMatch(/lighting-sensitive reading/);
    });

    it("falls back to the generic reason for any other actionable sub-score key", () => {
      const subScores = [subScore({ key: "someHypotheticalScore", value: 20, actionable: true })];
      const metrics = buildFaceMetrics({ subScores, angles: [], undertone: fakeUndertone });
      expect(metrics.priorityLever.reason).toMatch(/furthest from your own baseline/);
    });

    it("picks the single worst actionable sub-score when several are below 75", () => {
      const subScores = [
        subScore({ key: "darkCircle", value: 60, actionable: true }),
        subScore({ key: "pores", value: 35, actionable: true }), // worst
      ];
      const metrics = buildFaceMetrics({ subScores, angles: [], undertone: fakeUndertone });
      expect(metrics.priorityLever.subScoreKey).toBe("pores");
    });
  });
});
