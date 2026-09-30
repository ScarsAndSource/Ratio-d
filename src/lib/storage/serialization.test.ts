import { describe, it, expect } from "vitest";
import { bodyMetricsForStorage, bodyMetricsFromStorage } from "./serialization";
import type { BodyMetrics } from "../../types/bodyMetrics";

const PHOTO = "data:image/jpeg;base64," + "A".repeat(10_000);

function metrics(image: string | null = PHOTO): BodyMetrics {
  return {
    zones: [{ key: "postureTilt", label: "Shoulder level", region: "posture", value: 80, actionable: true, heatColor: "green" }],
    overallSymmetry: 80,
    priorityLever: { zoneKey: "none", label: "Fairly balanced", reason: "ok" },
    bodyFatEstimate: { band: "moderate", note: "n" },
    trainingAge: "unsure",
    frontReferenceImage: image,
    capturedAt: 1700000000000,
  };
}

describe("bodyMetricsForStorage", () => {
  it("removes the photo from the JSON that is stored (it lives in its own column)", () => {
    const stored = bodyMetricsForStorage(metrics());
    expect(stored.frontReferenceImage).toBeNull();
    expect(JSON.stringify(stored)).not.toContain("AAAAAAAAAA");
  });

  it("does not mutate the in-memory metrics the results screen still needs", () => {
    const m = metrics();
    bodyMetricsForStorage(m);
    expect(m.frontReferenceImage).toBe(PHOTO);
  });

  it("keeps every other field intact", () => {
    const m = metrics();
    expect({ ...bodyMetricsForStorage(m), frontReferenceImage: PHOTO }).toEqual(m);
  });
});

describe("bodyMetricsFromStorage", () => {
  it("re-attaches the photo from the dedicated column (new rows)", () => {
    const row = bodyMetricsForStorage(metrics());
    expect(bodyMetricsFromStorage(row, PHOTO)!.frontReferenceImage).toBe(PHOTO);
  });

  it("still reads legacy rows that embed the photo in the JSON", () => {
    expect(bodyMetricsFromStorage(metrics(), PHOTO)!.frontReferenceImage).toBe(PHOTO);
    expect(bodyMetricsFromStorage(metrics(), null)!.frontReferenceImage).toBe(PHOTO); // column empty, JSON has it
  });

  it("prefers the column over an embedded copy", () => {
    expect(bodyMetricsFromStorage(metrics("data:old"), "data:new")!.frontReferenceImage).toBe("data:new");
  });

  it("yields null photo when neither has one", () => {
    expect(bodyMetricsFromStorage(metrics(null), null)!.frontReferenceImage).toBeNull();
  });

  it("returns null for malformed rows instead of throwing, so one bad row cannot break history", () => {
    for (const bad of [null, undefined, 5, "x", [], true]) {
      expect(bodyMetricsFromStorage(bad, PHOTO)).toBeNull();
    }
  });
});
