import { describe, it, expect } from "vitest";
import {
  computeShoulderHipRatio,
  computeLimbSymmetry,
  computePostureTilt,
  computeChestDepthProxy,
} from "./geometry";
import type { LandmarkPoint } from "../../types/landmarks";

// Pose landmark indices used by geometry.ts (MediaPipe Pose Landmarker layout)
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;

function pt(x: number, y: number, z = 0): LandmarkPoint {
  return { x, y, z };
}

/** Builds a 27-slot pose landmark array with only the given indices set. */
function buildPose(points: Partial<Record<number, LandmarkPoint>>): LandmarkPoint[] {
  const arr: LandmarkPoint[] = new Array(27).fill(pt(0, 0));
  for (const [idx, p] of Object.entries(points)) {
    if (p) arr[Number(idx)] = p;
  }
  return arr;
}

describe("computeShoulderHipRatio", () => {
  it("returns null when a required landmark is missing", () => {
    const pose = buildPose({ [LEFT_SHOULDER]: pt(0.3, 0.2) }); // missing the rest
    // buildPose fills unset slots with pt(0,0), which is a *value*, not
    // "missing" - so to truly test the null path we must shrink the array
    // itself below the required index.
    const shortPose = pose.slice(0, LEFT_HIP); // cuts off before hips exist
    expect(computeShoulderHipRatio(shortPose)).toBeNull();
  });

  it("scores near 100 when ratio matches the 1.4 target exactly", () => {
    // shoulderWidth / hipWidth = 1.4 exactly: shoulders 0.28 apart, hips 0.20 apart
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.36, 0.3),
      [RIGHT_SHOULDER]: pt(0.64, 0.3),
      [LEFT_HIP]: pt(0.4, 0.5),
      [RIGHT_HIP]: pt(0.6, 0.5),
    });
    const result = computeShoulderHipRatio(pose);
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(100, 0);
    expect(result!.key).toBe("shoulderHipRatio");
    expect(result!.region).toBe("shoulders");
    // shoulderHipRatio is in the STRUCTURAL_ZONES set -> never actionable
    expect(result!.actionable).toBe(false);
  });

  it("scores lower the further the ratio deviates from 1.4", () => {
    // ratio = 1.0 (shoulders same width as hips): |1.0 - 1.4| / 0.5 = 0.8 -> value = 20
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.3),
      [RIGHT_SHOULDER]: pt(0.6, 0.3),
      [LEFT_HIP]: pt(0.4, 0.5),
      [RIGHT_HIP]: pt(0.6, 0.5),
    });
    const result = computeShoulderHipRatio(pose);
    expect(result!.value).toBeCloseTo(20, 0);
  });

  it("clamps to 0 for extreme deviation rather than going negative", () => {
    // ratio way off target -> deviation term exceeds 100%, must clamp at 0
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.49, 0.3),
      [RIGHT_SHOULDER]: pt(0.51, 0.3), // very narrow shoulders
      [LEFT_HIP]: pt(0.2, 0.5),
      [RIGHT_HIP]: pt(0.8, 0.5), // very wide hips
    });
    const result = computeShoulderHipRatio(pose);
    expect(result!.value).toBe(0);
  });

  it("assigns heatColor bands consistently with value (green >=80, yellow >=55, else red)", () => {
    const perfectPose = buildPose({
      [LEFT_SHOULDER]: pt(0.36, 0.3),
      [RIGHT_SHOULDER]: pt(0.64, 0.3),
      [LEFT_HIP]: pt(0.4, 0.5),
      [RIGHT_HIP]: pt(0.6, 0.5),
    });
    expect(computeShoulderHipRatio(perfectPose)!.heatColor).toBe("green");

    const worstPose = buildPose({
      [LEFT_SHOULDER]: pt(0.49, 0.3),
      [RIGHT_SHOULDER]: pt(0.51, 0.3),
      [LEFT_HIP]: pt(0.2, 0.5),
      [RIGHT_HIP]: pt(0.8, 0.5),
    });
    expect(computeShoulderHipRatio(worstPose)!.heatColor).toBe("red");
  });
});

describe("computeLimbSymmetry", () => {
  it("returns an empty array when no relevant landmarks are present", () => {
    const pose = buildPose({});
    // buildPose fills every slot with pt(0,0), which *is* a defined point,
    // so both symmetry checks will actually run (arms identical -> perfect
    // score, legs identical -> perfect score). To test the "missing"
    // branch we must shrink the array below the needed indices instead.
    const shortPose = pose.slice(0, LEFT_ELBOW);
    const results = computeLimbSymmetry(shortPose);
    expect(results).toEqual([]);
  });

  it("scores upper-arm symmetry at 100 when both arms are identical length", () => {
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.3),
      [RIGHT_SHOULDER]: pt(0.6, 0.3),
      [LEFT_ELBOW]: pt(0.4, 0.5),
      [RIGHT_ELBOW]: pt(0.6, 0.5),
    });
    const results = computeLimbSymmetry(pose);
    const upperArm = results.find((r) => r.key === "upperArmSymmetry");
    expect(upperArm).toBeDefined();
    expect(upperArm!.value).toBe(100);
    expect(upperArm!.actionable).toBe(false); // upperArmSymmetry is structural
    expect(upperArm!.region).toBe("arms");
  });

  it("scores thigh symmetry below 100 when one leg reads longer than the other", () => {
    const pose = buildPose({
      [LEFT_HIP]: pt(0.4, 0.5),
      [RIGHT_HIP]: pt(0.6, 0.5),
      [LEFT_KNEE]: pt(0.4, 0.7), // thighL length 0.2
      [RIGHT_KNEE]: pt(0.62, 0.9), // thighR notably longer
    });
    const results = computeLimbSymmetry(pose);
    const thigh = results.find((r) => r.key === "thighSymmetry");
    expect(thigh).toBeDefined();
    expect(thigh!.value).toBeLessThan(100);
    expect(thigh!.region).toBe("legs");
  });

  it("includes only the zones whose landmarks are available", () => {
    // Only arm landmarks present, leg landmarks absent (array cut short)
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.3),
      [RIGHT_SHOULDER]: pt(0.6, 0.3),
      [LEFT_ELBOW]: pt(0.4, 0.5),
      [RIGHT_ELBOW]: pt(0.6, 0.5),
    }).slice(0, LEFT_HIP);
    const results = computeLimbSymmetry(pose);
    expect(results.map((r) => r.key)).toEqual(["upperArmSymmetry"]);
  });
});

describe("computePostureTilt", () => {
  it("returns null when shoulder landmarks are missing", () => {
    const pose = buildPose({}).slice(0, LEFT_SHOULDER);
    expect(computePostureTilt(pose)).toBeNull();
  });

  it("scores 100 when shoulders are perfectly level", () => {
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.3),
      [RIGHT_SHOULDER]: pt(0.6, 0.3),
    });
    const result = computePostureTilt(pose);
    expect(result!.value).toBe(100);
    expect(result!.key).toBe("postureTilt");
    // postureTilt is in ACTIONABLE_ZONES
    expect(result!.actionable).toBe(true);
    expect(result!.region).toBe("posture");
  });

  it("scores lower as shoulder tilt increases", () => {
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.25),
      [RIGHT_SHOULDER]: pt(0.6, 0.35), // noticeable tilt
    });
    const result = computePostureTilt(pose);
    expect(result!.value).toBeLessThan(100);
    expect(result!.value).toBeGreaterThanOrEqual(0);
  });

  it("is symmetric under left/right mirroring of the same tilt magnitude", () => {
    const tiltedRightDown = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.25),
      [RIGHT_SHOULDER]: pt(0.6, 0.35),
    });
    const tiltedLeftDown = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.35),
      [RIGHT_SHOULDER]: pt(0.6, 0.25),
    });
    expect(computePostureTilt(tiltedRightDown)!.value).toBeCloseTo(
      computePostureTilt(tiltedLeftDown)!.value,
      5
    );
  });
});

describe("computeChestDepthProxy", () => {
  it("returns null when any of the four required landmarks are missing", () => {
    const front = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.3),
      [RIGHT_SHOULDER]: pt(0.6, 0.3),
    });
    const side = buildPose({}).slice(0, LEFT_SHOULDER); // side view missing shoulders
    expect(computeChestDepthProxy(front, side)).toBeNull();
  });

  it("returns null when the front shoulder span is zero (guards divide-by-zero)", () => {
    const front = buildPose({
      [LEFT_SHOULDER]: pt(0.5, 0.3),
      [RIGHT_SHOULDER]: pt(0.5, 0.3), // identical points -> span 0
    });
    const side = buildPose({
      [LEFT_SHOULDER]: pt(0.45, 0.3),
      [RIGHT_SHOULDER]: pt(0.55, 0.3),
    });
    expect(computeChestDepthProxy(front, side)).toBeNull();
  });

  it("scores near 100 when side/front span ratio matches the 0.55 target", () => {
    // front span 0.2, side span 0.11 -> ratio 0.55 exactly
    const front = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.3),
      [RIGHT_SHOULDER]: pt(0.6, 0.3),
    });
    const side = buildPose({
      [LEFT_SHOULDER]: pt(0.445, 0.3),
      [RIGHT_SHOULDER]: pt(0.555, 0.3),
    });
    const result = computeChestDepthProxy(front, side);
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(100, 0);
    expect(result!.key).toBe("chestDepthProxy");
    // chestDepthProxy is in ACTIONABLE_ZONES
    expect(result!.actionable).toBe(true);
    expect(result!.region).toBe("chest");
  });
});
