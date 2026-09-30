import { describe, it, expect } from "vitest";
import { toSynthesisBody, toSynthesisFace, MEANINGFUL_ANGLE_LABELS } from "./payload";
import { buildBodyMetrics } from "../body/score";
import { buildFaceMetrics } from "../face/score";
import type { BodyMetrics, MuscleZoneScore } from "../../types/bodyMetrics";
import type { FaceMetrics, SubScore } from "../../types/faceMetrics";

const HUGE_PHOTO = "data:image/jpeg;base64," + "A".repeat(2_000_000);

function zone(overrides: Partial<MuscleZoneScore>): MuscleZoneScore {
  return { key: "postureTilt", label: "Shoulder level", region: "posture", value: 61.234, actionable: true, heatColor: "yellow", ...overrides };
}

function bodyMetrics(): BodyMetrics {
  return buildBodyMetrics({
    zones: [zone({}), zone({ key: "shoulderHipRatio", label: "Shoulder-to-waist frame", region: "shoulders", value: 88.88, actionable: false, heatColor: "green" })],
    bodyFatEstimate: { band: "moderate", note: "A rough estimate." },
    trainingAge: "1to3y",
    frontReferenceImage: HUGE_PHOTO,
  });
}

function sub(overrides: Partial<SubScore>): SubScore {
  return { key: "pores", label: "Skin texture", value: 71.46, actionable: true, ...overrides };
}

function faceMetrics(): FaceMetrics {
  const p = (x: number, y: number) => ({ x, y, z: 0 });
  return buildFaceMetrics({
    subScores: [sub({}), sub({ key: "canthalTilt", label: "Canthal tilt", value: 70, actionable: false, trend: "up" })],
    angles: [
      { label: "canthal tilt", valueDeg: 5.04, points: [p(0.4, 0.4), p(0.3, 0.39)] },
      { label: "cheek width", valueDeg: 0, points: [p(0.3, 0.5), p(0.7, 0.5)] },
      { label: "face height", valueDeg: 0, points: [p(0.5, 0.2), p(0.5, 0.8)] },
    ],
    undertone: { classification: "warm", confidence: 0.6789 },
  });
}

describe("toSynthesisBody", () => {
  it("never includes the body photo, however large (regression: it used to ride along)", () => {
    const payload = toSynthesisBody(bodyMetrics());
    const json = JSON.stringify(payload);
    expect(json).not.toContain("frontReferenceImage");
    expect(json).not.toContain("data:image");
    expect(json).not.toContain("AAAAAAAAAA");
    expect(json.length).toBeLessThan(2_000);
  });

  it("does not include timestamps or heat colours", () => {
    const json = JSON.stringify(toSynthesisBody(bodyMetrics()));
    expect(json).not.toContain("capturedAt");
    expect(json).not.toContain("heatColor");
  });

  it("keeps every field the narrator needs, rounded", () => {
    const payload = toSynthesisBody(bodyMetrics());
    expect(payload.zones).toHaveLength(2);
    expect(payload.zones[0]).toEqual({ key: "postureTilt", label: "Shoulder level", region: "posture", value: 61.2, actionable: true });
    expect(payload.zones[1]!.actionable).toBe(false);
    expect(payload.trainingAge).toBe("1to3y");
    expect(payload.bodyFatEstimate).toEqual({ band: "moderate", note: "A rough estimate." });
    expect(payload.priorityLever.zoneKey).toBe("postureTilt");
    expect(payload.overallSymmetry).toBe(75);
  });

  it("does not copy fields that are not on the whitelist (future-proofing)", () => {
    const m = { ...bodyMetrics(), secretNewField: "leak me", nested: { photo: HUGE_PHOTO } } as unknown as BodyMetrics;
    const json = JSON.stringify(toSynthesisBody(m));
    expect(json).not.toContain("secretNewField");
    expect(json).not.toContain("leak me");
    expect(json).not.toContain("photo");
  });
});

describe("toSynthesisFace", () => {
  it("drops landmark coordinates and timestamps", () => {
    const json = JSON.stringify(toSynthesisFace(faceMetrics()));
    expect(json).not.toContain("points");
    expect(json).not.toContain('"x"');
    expect(json).not.toContain("capturedAt");
  });

  it("sends only real angle measurements, not overlay guide lines with a fake 0 degrees", () => {
    const payload = toSynthesisFace(faceMetrics());
    expect(MEANINGFUL_ANGLE_LABELS).toEqual(["canthal tilt"]);
    expect(payload.angles).toEqual([{ label: "canthal tilt", valueDeg: 5 }]);
  });

  it("rounds values, preserves actionable flags and optional trend", () => {
    const payload = toSynthesisFace(faceMetrics());
    expect(payload.subScores[0]).toEqual({ key: "pores", label: "Skin texture", value: 71.5, actionable: true });
    expect(payload.subScores[1]).toEqual({ key: "canthalTilt", label: "Canthal tilt", value: 70, actionable: false, trend: "up" });
    expect(payload.subScores[0]).not.toHaveProperty("trend");
    expect(payload.undertone).toEqual({ classification: "warm", confidence: 0.68 });
  });
});
