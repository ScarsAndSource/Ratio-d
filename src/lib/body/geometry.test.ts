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

const SQUARE = 1; // frame aspect for hand-built square-coordinate fixtures

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
    const pose = buildPose({ [LEFT_SHOULDER]: pt(0.3, 0.2) });
    const shortPose = pose.slice(0, LEFT_HIP);
    expect(computeShoulderHipRatio(shortPose, SQUARE)).toBeNull();
  });

  it("scores near 100 when ratio matches the 1.4 target exactly", () => {
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.36, 0.3),
      [RIGHT_SHOULDER]: pt(0.64, 0.3),
      [LEFT_HIP]: pt(0.4, 0.5),
      [RIGHT_HIP]: pt(0.6, 0.5),
    });
    const result = computeShoulderHipRatio(pose, SQUARE);
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(100, 0);
    expect(result!.key).toBe("shoulderHipRatio");
    expect(result!.region).toBe("shoulders");
    expect(result!.actionable).toBe(false);
  });

  it("scores lower the further the ratio deviates from 1.4", () => {
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.3),
      [RIGHT_SHOULDER]: pt(0.6, 0.3),
      [LEFT_HIP]: pt(0.4, 0.5),
      [RIGHT_HIP]: pt(0.6, 0.5),
    });
    const result = computeShoulderHipRatio(pose, SQUARE);
    expect(result!.value).toBeCloseTo(20, 0);
  });

  it("clamps to 0 for extreme deviation rather than going negative", () => {
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.49, 0.3),
      [RIGHT_SHOULDER]: pt(0.51, 0.3),
      [LEFT_HIP]: pt(0.2, 0.5),
      [RIGHT_HIP]: pt(0.8, 0.5),
    });
    const result = computeShoulderHipRatio(pose, SQUARE);
    expect(result!.value).toBe(0);
  });

  it("assigns heatColor bands consistently with value (green >=80, yellow >=55, else red)", () => {
    const perfectPose = buildPose({
      [LEFT_SHOULDER]: pt(0.36, 0.3),
      [RIGHT_SHOULDER]: pt(0.64, 0.3),
      [LEFT_HIP]: pt(0.4, 0.5),
      [RIGHT_HIP]: pt(0.6, 0.5),
    });
    expect(computeShoulderHipRatio(perfectPose, SQUARE)!.heatColor).toBe("green");

    const worstPose = buildPose({
      [LEFT_SHOULDER]: pt(0.49, 0.3),
      [RIGHT_SHOULDER]: pt(0.51, 0.3),
      [LEFT_HIP]: pt(0.2, 0.5),
      [RIGHT_HIP]: pt(0.8, 0.5),
    });
    expect(computeShoulderHipRatio(worstPose, SQUARE)!.heatColor).toBe("red");
  });
});

describe("computeLimbSymmetry", () => {
  it("returns an empty array when no relevant landmarks are present", () => {
    const pose = buildPose({});
    const shortPose = pose.slice(0, LEFT_ELBOW);
    const results = computeLimbSymmetry(shortPose, SQUARE);
    expect(results).toEqual([]);
  });

  it("scores upper-arm symmetry at 100 when both arms are identical length", () => {
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.3),
      [RIGHT_SHOULDER]: pt(0.6, 0.3),
      [LEFT_ELBOW]: pt(0.4, 0.5),
      [RIGHT_ELBOW]: pt(0.6, 0.5),
    });
    const results = computeLimbSymmetry(pose, SQUARE);
    const upperArm = results.find((r) => r.key === "upperArmSymmetry");
    expect(upperArm).toBeDefined();
    expect(upperArm!.value).toBe(100);
    expect(upperArm!.actionable).toBe(false);
    expect(upperArm!.region).toBe("arms");
  });

  it("scores thigh symmetry below 100 when one leg reads longer than the other", () => {
    const pose = buildPose({
      [LEFT_HIP]: pt(0.4, 0.5),
      [RIGHT_HIP]: pt(0.6, 0.5),
      [LEFT_KNEE]: pt(0.4, 0.7),
      [RIGHT_KNEE]: pt(0.62, 0.9),
    });
    const results = computeLimbSymmetry(pose, SQUARE);
    const thigh = results.find((r) => r.key === "thighSymmetry");
    expect(thigh).toBeDefined();
    expect(thigh!.value).toBeLessThan(100);
    expect(thigh!.region).toBe("legs");
  });

  it("includes only the zones whose landmarks are available", () => {
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.3),
      [RIGHT_SHOULDER]: pt(0.6, 0.3),
      [LEFT_ELBOW]: pt(0.4, 0.5),
      [RIGHT_ELBOW]: pt(0.6, 0.5),
    }).slice(0, LEFT_HIP);
    const results = computeLimbSymmetry(pose, SQUARE);
    expect(results.map((r) => r.key)).toEqual(["upperArmSymmetry"]);
  });
});

describe("computePostureTilt", () => {
  it("returns null when shoulder landmarks are missing", () => {
    const pose = buildPose({}).slice(0, LEFT_SHOULDER);
    expect(computePostureTilt(pose, SQUARE)).toBeNull();
  });

  it("scores 100 when shoulders are perfectly level", () => {
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.3),
      [RIGHT_SHOULDER]: pt(0.6, 0.3),
    });
    const result = computePostureTilt(pose, SQUARE);
    expect(result!.value).toBe(100);
    expect(result!.key).toBe("postureTilt");
    expect(result!.actionable).toBe(true);
    expect(result!.region).toBe("posture");
  });

  it("scores lower as shoulder tilt increases", () => {
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.25),
      [RIGHT_SHOULDER]: pt(0.6, 0.35),
    });
    const result = computePostureTilt(pose, SQUARE);
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
    expect(computePostureTilt(tiltedRightDown, SQUARE)!.value).toBeCloseTo(
      computePostureTilt(tiltedLeftDown, SQUARE)!.value,
      5
    );
  });
});

describe("computePostureTilt on REAL MediaPipe geometry", () => {
  // In an un-mirrored frame the subject's LEFT shoulder (11) is on the image
  // RIGHT (larger x), so the "right" shoulder (12) has the SMALLER x.
  const level = () =>
    buildPose({
      [LEFT_SHOULDER]: pt(0.62, 0.3),
      [RIGHT_SHOULDER]: pt(0.38, 0.3),
    });

  it("scores level shoulders 100 (previously ~0 because atan2 returned 180deg)", () => {
    expect(computePostureTilt(level(), SQUARE)!.value).toBe(100);
  });

  it("scores a real tilt the same regardless of which shoulder is on which side", () => {
    const realConvention = buildPose({
      [LEFT_SHOULDER]: pt(0.62, 0.32),
      [RIGHT_SHOULDER]: pt(0.38, 0.28),
    });
    const testConvention = buildPose({
      [LEFT_SHOULDER]: pt(0.38, 0.32),
      [RIGHT_SHOULDER]: pt(0.62, 0.28),
    });
    expect(computePostureTilt(realConvention, SQUARE)!.value).toBeCloseTo(
      computePostureTilt(testConvention, SQUARE)!.value,
      9
    );
    expect(computePostureTilt(realConvention, SQUARE)!.value).toBeLessThan(100);
  });

  it("reads the true angle on non-square frames (same physical pose, different aspect)", () => {
    const build = (w: number, h: number) =>
      buildPose({
        [LEFT_SHOULDER]: pt(0.5 + 100 / w, 0.4 + 5 / h),
        [RIGHT_SHOULDER]: pt(0.5 - 100 / w, 0.4 - 5 / h),
      });
    const land = computePostureTilt(build(640, 480), 640 / 480)!.value;
    const port = computePostureTilt(build(480, 640), 480 / 640)!.value;
    expect(port).toBeCloseTo(land, 6);
    expect(land).toBeCloseTo(100 - 2.862405 * 12, 3);
  });
});

describe("body geometry is aspect-invariant for the same physical pose", () => {
  it("shoulder/hip ratio and limb symmetry match on landscape and portrait frames", () => {
    const build = (w: number, h: number) =>
      buildPose({
        [LEFT_SHOULDER]: pt(0.5 + 140 / w, 0.3),
        [RIGHT_SHOULDER]: pt(0.5 - 140 / w, 0.3),
        [LEFT_ELBOW]: pt(0.5 + 150 / w, 0.3 + 90 / h),
        [RIGHT_ELBOW]: pt(0.5 - 150 / w, 0.3 + 100 / h),
        [LEFT_HIP]: pt(0.5 + 100 / w, 0.3 + 200 / h),
        [RIGHT_HIP]: pt(0.5 - 100 / w, 0.3 + 200 / h),
        [LEFT_KNEE]: pt(0.5 + 100 / w, 0.3 + 340 / h),
        [RIGHT_KNEE]: pt(0.5 - 100 / w, 0.3 + 340 / h),
      });
    const a = computeShoulderHipRatio(build(640, 480), 640 / 480)!.value;
    const b = computeShoulderHipRatio(build(480, 640), 480 / 640)!.value;
    expect(b).toBeCloseTo(a, 6);
    const sa = computeLimbSymmetry(build(640, 480), 640 / 480).map((z) => z.value);
    const sb = computeLimbSymmetry(build(480, 640), 480 / 640).map((z) => z.value);
    sb.forEach((v, i) => expect(v).toBeCloseTo(sa[i]!, 6));
  });
});

describe("computeChestDepthProxy", () => {
  it("returns null when any of the four required landmarks are missing", () => {
    const front = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.3),
      [RIGHT_SHOULDER]: pt(0.6, 0.3),
    });
    const side = buildPose({}).slice(0, LEFT_SHOULDER);
    expect(computeChestDepthProxy(front, side, SQUARE, SQUARE)).toBeNull();
  });

  it("returns null when the front shoulder span is zero (guards divide-by-zero)", () => {
    const front = buildPose({
      [LEFT_SHOULDER]: pt(0.5, 0.3),
      [RIGHT_SHOULDER]: pt(0.5, 0.3),
    });
    const side = buildPose({
      [LEFT_SHOULDER]: pt(0.45, 0.3),
      [RIGHT_SHOULDER]: pt(0.55, 0.3),
    });
    expect(computeChestDepthProxy(front, side, SQUARE, SQUARE)).toBeNull();
  });

  it("scores near 100 when side/front span ratio matches the 0.55 target", () => {
    const front = buildPose({
      [LEFT_SHOULDER]: pt(0.4, 0.3),
      [RIGHT_SHOULDER]: pt(0.6, 0.3),
    });
    const side = buildPose({
      [LEFT_SHOULDER]: pt(0.445, 0.3),
      [RIGHT_SHOULDER]: pt(0.555, 0.3),
    });
    const result = computeChestDepthProxy(front, side, SQUARE, SQUARE);
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(100, 0);
    expect(result!.key).toBe("chestDepthProxy");
    expect(result!.actionable).toBe(true);
    expect(result!.region).toBe("chest");
  });
});
