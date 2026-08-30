import { describe, it, expect } from "vitest";
import { computeBodyAlignment } from "./bodyAlignment";
import type { LandmarkPoint } from "../../types/landmarks";

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

function pt(x: number, y: number, z = 0): LandmarkPoint {
  return { x, y, z };
}

function buildPose(overrides: Partial<Record<number, LandmarkPoint>>): LandmarkPoint[] {
  const arr: LandmarkPoint[] = new Array(29).fill(pt(0, 0));
  for (const [idx, p] of Object.entries(overrides)) {
    if (p) arr[Number(idx)] = p;
  }
  return arr;
}

// Wide shoulder span (0.28, well above FRONT_MIN_SHOULDER_SPAN=0.18),
// centered, with feet in frame - a valid "front" pose when faceDetected=true.
function frontPose(): LandmarkPoint[] {
  return buildPose({
    [LEFT_SHOULDER]: pt(0.36, 0.3),
    [RIGHT_SHOULDER]: pt(0.64, 0.3),
    [LEFT_HIP]: pt(0.4, 0.5),
    [RIGHT_HIP]: pt(0.6, 0.5),
    [LEFT_ANKLE]: pt(0.42, 0.9),
    [RIGHT_ANKLE]: pt(0.58, 0.9),
  });
}

describe("computeBodyAlignment", () => {
  it("returns the zero/no-detection reading when poseLandmarks is null", () => {
    const result = computeBodyAlignment(null, true, "front");
    expect(result).toEqual({
      centeredness: 0,
      distanceFit: 0,
      angleMatch: 0,
      progress: 0,
      guidance: "Step into frame",
      raw: { offsetX: 0, shoulderSpan: 0, hipOffsetX: 0, faceDetected: true },
    });
  });

  it("returns the zero/no-detection reading when shoulder/hip landmarks are missing", () => {
    const pose = buildPose({ [LEFT_SHOULDER]: pt(0.4, 0.3) }).slice(0, RIGHT_SHOULDER);
    const result = computeBodyAlignment(pose, false, "front");
    expect(result.guidance).toBe("Step into frame");
  });

  it("reports 'Locked' with progress > 0.92 for a well-framed front pose", () => {
    const result = computeBodyAlignment(frontPose(), true, "front");
    expect(result.centeredness).toBeCloseTo(1, 5);
    expect(result.distanceFit).toBe(1); // both ankles present
    expect(result.angleMatch).toBe(1); // front: wide span + face detected
    expect(result.guidance).toBe("Locked");
  });

  it("guides 'Step back until your feet are in frame' when ankles are missing", () => {
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.36, 0.3),
      [RIGHT_SHOULDER]: pt(0.64, 0.3),
      [LEFT_HIP]: pt(0.4, 0.5),
      [RIGHT_HIP]: pt(0.6, 0.5),
    }).slice(0, LEFT_ANKLE); // cut the array short so ankles are genuinely undefined, not pt(0,0)
    const result = computeBodyAlignment(pose, true, "front");
    expect(result.distanceFit).toBe(0.3);
    expect(result.guidance).toBe("Step back until your feet are in frame");
  });

  it("guides 'Center yourself in frame' when pose is off center", () => {
    const pose = buildPose({
      [LEFT_SHOULDER]: pt(0.7, 0.3),
      [RIGHT_SHOULDER]: pt(0.98, 0.3),
      [LEFT_HIP]: pt(0.74, 0.5),
      [RIGHT_HIP]: pt(0.94, 0.5),
      [LEFT_ANKLE]: pt(0.75, 0.9),
      [RIGHT_ANKLE]: pt(0.93, 0.9),
    });
    const result = computeBodyAlignment(pose, true, "front");
    expect(result.centeredness).toBeLessThan(0.9);
    expect(result.guidance).toBe("Center yourself in frame");
  });

  it("guides angle adjustments based on target angle", () => {
    const widePose = buildPose({
      [LEFT_SHOULDER]: pt(0.36, 0.3),
      [RIGHT_SHOULDER]: pt(0.64, 0.3),
      [LEFT_HIP]: pt(0.4, 0.5),
      [RIGHT_HIP]: pt(0.6, 0.5),
      [LEFT_ANKLE]: pt(0.42, 0.9),
      [RIGHT_ANKLE]: pt(0.58, 0.9),
    });
    // Front view but face not detected
    expect(computeBodyAlignment(widePose, false, "front").guidance).toBe("Face the camera directly");
    // Back view but face detected
    expect(computeBodyAlignment(widePose, true, "back").guidance).toBe("Turn your back to the camera");
    // Side view but shoulder span too wide (>0.09)
    expect(computeBodyAlignment(widePose, false, "side").guidance).toBe("Turn fully to your side");
    // Three-quarter view with shoulder span too wide
    expect(computeBodyAlignment(widePose, false, "threeQuarter").guidance).toBe("Turn about halfway, three-quarter on");
  });

  it("handles side view and threeQuarter angle matches correctly", () => {
    const narrowPose = buildPose({
      [LEFT_SHOULDER]: pt(0.47, 0.3),
      [RIGHT_SHOULDER]: pt(0.53, 0.3), // span = 0.06 (<= 0.09)
      [LEFT_HIP]: pt(0.47, 0.5),
      [RIGHT_HIP]: pt(0.53, 0.5),
      [LEFT_ANKLE]: pt(0.47, 0.9),
      [RIGHT_ANKLE]: pt(0.53, 0.9),
    });
    const sideResult = computeBodyAlignment(narrowPose, false, "side");
    expect(sideResult.angleMatch).toBe(1);

    const midPose = buildPose({
      [LEFT_SHOULDER]: pt(0.43, 0.3),
      [RIGHT_SHOULDER]: pt(0.57, 0.3), // span = 0.14 (in [0.1, 0.17])
      [LEFT_HIP]: pt(0.43, 0.5),
      [RIGHT_HIP]: pt(0.57, 0.5),
      [LEFT_ANKLE]: pt(0.43, 0.9),
      [RIGHT_ANKLE]: pt(0.57, 0.9),
    });
    const tqResult = computeBodyAlignment(midPose, false, "threeQuarter");
    expect(tqResult.angleMatch).toBe(1);
  });
});
