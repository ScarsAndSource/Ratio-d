import { describe, it, expect, vi } from "vitest";
import { buildBodyMetrics, estimateBodyFatBand } from "./score";
import type { MuscleZoneScore, BodyFatEstimate } from "../../types/bodyMetrics";

function zone(overrides: Partial<MuscleZoneScore>): MuscleZoneScore {
  return {
    key: "someZone",
    label: "Some zone",
    region: "posture",
    value: 80,
    actionable: true,
    heatColor: "green",
    ...overrides,
  };
}

const fakeBodyFat: BodyFatEstimate = { band: "moderate", note: "test note" };

describe("buildBodyMetrics", () => {
  it("computes overallSymmetry as the rounded average of all zone values", () => {
    const zones = [zone({ value: 90 }), zone({ value: 70 }), zone({ value: 81 })];
    const metrics = buildBodyMetrics({
      zones,
      bodyFatEstimate: fakeBodyFat,
      trainingAge: "1to3y",
      frontReferenceImage: null,
    });
    // (90 + 70 + 81) / 3 = 80.333... -> rounds to 80
    expect(metrics.overallSymmetry).toBe(80);
  });

  it("passes through bodyFatEstimate, trainingAge, and frontReferenceImage unchanged", () => {
    const metrics = buildBodyMetrics({
      zones: [zone({ value: 80 })],
      bodyFatEstimate: fakeBodyFat,
      trainingAge: "new",
      frontReferenceImage: "data:image/jpeg;base64,abc123",
    });
    expect(metrics.bodyFatEstimate).toEqual(fakeBodyFat);
    expect(metrics.trainingAge).toBe("new");
    expect(metrics.frontReferenceImage).toBe("data:image/jpeg;base64,abc123");
    expect(metrics.zones).toEqual([zone({ value: 80 })]);
  });

  it("stamps capturedAt with the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T00:00:00.000Z"));
    const metrics = buildBodyMetrics({
      zones: [zone({ value: 80 })],
      bodyFatEstimate: fakeBodyFat,
      trainingAge: "new",
      frontReferenceImage: null,
    });
    expect(metrics.capturedAt).toBe(new Date("2026-01-15T00:00:00.000Z").getTime());
    vi.useRealTimers();
  });

  describe("priorityLever selection (via buildBodyMetrics)", () => {
    it("returns 'Fairly balanced' / zoneKey 'none' when no zone is actionable", () => {
      const zones = [
        zone({ key: "shoulderHipRatio", value: 20, actionable: false }),
        zone({ key: "upperArmSymmetry", value: 10, actionable: false }),
      ];
      const metrics = buildBodyMetrics({
        zones,
        bodyFatEstimate: fakeBodyFat,
        trainingAge: "new",
        frontReferenceImage: null,
      });
      expect(metrics.priorityLever.zoneKey).toBe("none");
      expect(metrics.priorityLever.label).toBe("Fairly balanced");
      expect(metrics.priorityLever.reason).toMatch(/Nothing actionable/);
    });

    it("returns 'Fairly balanced' when the lowest actionable zone is still above 75", () => {
      const zones = [
        zone({ key: "postureTilt", value: 76, actionable: true }),
        zone({ key: "chestDepthProxy", value: 90, actionable: true }),
      ];
      const metrics = buildBodyMetrics({
        zones,
        bodyFatEstimate: fakeBodyFat,
        trainingAge: "new",
        frontReferenceImage: null,
      });
      expect(metrics.priorityLever.zoneKey).toBe("none");
      expect(metrics.priorityLever.reason).toMatch(/within a normal range/);
    });

    it("flags the lowest actionable zone below 75 as the priority lever", () => {
      const zones = [
        zone({ key: "postureTilt", label: "Shoulder level", value: 40, actionable: true }),
        zone({ key: "chestDepthProxy", label: "Chest fullness", value: 85, actionable: true }),
        zone({ key: "shoulderHipRatio", value: 10, actionable: false }), // ignored: not actionable
      ];
      const metrics = buildBodyMetrics({
        zones,
        bodyFatEstimate: fakeBodyFat,
        trainingAge: "new",
        frontReferenceImage: null,
      });
      expect(metrics.priorityLever.zoneKey).toBe("postureTilt");
      expect(metrics.priorityLever.label).toBe("Shoulder level");
      expect(metrics.priorityLever.reason).toMatch(/shoulder line reads uneven/);
    });

    it("gives chestDepthProxy its own specific reason text when it's the priority", () => {
      const zones = [zone({ key: "chestDepthProxy", label: "Chest fullness", value: 30, actionable: true })];
      const metrics = buildBodyMetrics({
        zones,
        bodyFatEstimate: fakeBodyFat,
        trainingAge: "new",
        frontReferenceImage: null,
      });
      expect(metrics.priorityLever.reason).toMatch(/rough fullness read/);
    });

    it("falls back to the generic reason for any other actionable zone key", () => {
      const zones = [zone({ key: "someHypotheticalZone", value: 20, actionable: true })];
      const metrics = buildBodyMetrics({
        zones,
        bodyFatEstimate: fakeBodyFat,
        trainingAge: "new",
        frontReferenceImage: null,
      });
      expect(metrics.priorityLever.reason).toMatch(/furthest from your own baseline/);
    });

    it("picks the single worst actionable zone when several are below 75", () => {
      const zones = [
        zone({ key: "postureTilt", value: 60, actionable: true }),
        zone({ key: "chestDepthProxy", value: 35, actionable: true }), // worst
      ];
      const metrics = buildBodyMetrics({
        zones,
        bodyFatEstimate: fakeBodyFat,
        trainingAge: "new",
        frontReferenceImage: null,
      });
      expect(metrics.priorityLever.zoneKey).toBe("chestDepthProxy");
    });
  });
});

describe("estimateBodyFatBand", () => {
  it("returns 'lower' band for taperScore >= 70", () => {
    expect(estimateBodyFatBand(70).band).toBe("lower");
    expect(estimateBodyFatBand(100).band).toBe("lower");
  });

  it("returns 'moderate' band for taperScore in [40, 70)", () => {
    expect(estimateBodyFatBand(40).band).toBe("moderate");
    expect(estimateBodyFatBand(69.9).band).toBe("moderate");
  });

  it("returns 'higher' band for taperScore < 40", () => {
    expect(estimateBodyFatBand(39.9).band).toBe("higher");
    expect(estimateBodyFatBand(0).band).toBe("higher");
  });

  it("always includes the non-clinical disclaimer note", () => {
    expect(estimateBodyFatBand(80).note).toMatch(/not a clinical measurement/);
    expect(estimateBodyFatBand(10).note).toMatch(/not a clinical measurement/);
  });
});
