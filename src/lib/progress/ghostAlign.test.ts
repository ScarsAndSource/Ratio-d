import { describe, it, expect } from "vitest";
import { computeGhostAffine } from "./ghostAlign";
import type { LandmarkPoint } from "../../types/landmarks";

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

function pt(x: number, y: number, z = 0): LandmarkPoint {
  return { x, y, z };
}

function buildPose(overrides: Partial<Record<number, LandmarkPoint>>): LandmarkPoint[] {
  const arr: LandmarkPoint[] = new Array(25).fill(pt(0, 0));
  for (const [idx, p] of Object.entries(overrides)) {
    if (p) arr[Number(idx)] = p;
  }
  return arr;
}

function sampleTorso(cx = 0.5, cy = 0.4, span = 0.2): LandmarkPoint[] {
  // shoulderMidY = cy - span/2, hipMidY = cy + span/2
  const sY = cy - span / 2;
  const hY = cy + span / 2;
  return buildPose({
    [LEFT_SHOULDER]: pt(cx - 0.1, sY),
    [RIGHT_SHOULDER]: pt(cx + 0.1, sY),
    [LEFT_HIP]: pt(cx - 0.1, hY),
    [RIGHT_HIP]: pt(cx + 0.1, hY),
  });
}

describe("computeGhostAffine", () => {
  it("returns null when required torso landmarks are missing", () => {
    const oldPose = sampleTorso();
    const shortPose = sampleTorso().slice(0, LEFT_HIP);
    expect(computeGhostAffine(oldPose, shortPose)).toBeNull();
    expect(computeGhostAffine(shortPose, oldPose)).toBeNull();
  });

  it("returns null when old torso span is 0", () => {
    const flatOld = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.4),
      [RIGHT_SHOULDER]: pt(0.6, 0.4),
      [LEFT_HIP]: pt(0.4, 0.4),
      [RIGHT_HIP]: pt(0.6, 0.4),
    });
    const newPose = sampleTorso();
    expect(computeGhostAffine(flatOld, newPose)).toBeNull();
  });

  it("computes scale and translation percentages between two poses", () => {
    const oldPose = sampleTorso(0.5, 0.4, 0.2); // cx=0.5, cy=0.4, span=0.2
    const newPose = sampleTorso(0.6, 0.45, 0.3); // cx=0.6, cy=0.45, span=0.3

    const fit = computeGhostAffine(oldPose, newPose);
    expect(fit).not.toBeNull();
    expect(fit!.scale).toBeCloseTo(1.5, 5); // 0.3 / 0.2
    expect(fit!.translateXPct).toBeCloseTo(10, 5); // (0.6 - 0.5) * 100
    expect(fit!.translateYPct).toBeCloseTo(5, 5); // (0.45 - 0.4) * 100
  });
});
