import { describe, it, expect } from "vitest";
import { headPoseFromMatrix } from "./headPose";

/** Build a column-major 4x4 identity matrix. */
function identity(): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/**
 * Build a pure yaw rotation matrix (rotation around Y axis) in column-major order.
 * For a yaw of theta:
 *   R = [cos θ, 0, sin θ, 0,
 *         0,    1,  0,    0,
 *       -sin θ, 0, cos θ, 0,
 *         0,    0,  0,    1]   (row-major)
 * Column-major (what MediaPipe uses): transpose of the above.
 */
function yawMatrix(deg: number): number[] {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  // column 0: (c, 0, -s, 0)
  // column 1: (0, 1,  0, 0)
  // column 2: (s, 0,  c, 0)
  // column 3: (0, 0,  0, 1)
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}

/**
 * Build a pure pitch rotation matrix (rotation around X axis) in column-major order.
 * For a pitch of theta:
 *   R = [1,  0,     0,    0,
 *        0, cos θ,-sin θ, 0,
 *        0, sin θ, cos θ, 0,
 *        0,  0,     0,    1]  (row-major)
 */
function pitchMatrix(deg: number): number[] {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  // column 0: (1, 0, 0, 0)
  // column 1: (0, c, s, 0)
  // column 2: (0, -s, c, 0)
  // column 3: (0, 0, 0, 1)
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}

describe("headPoseFromMatrix", () => {
  it("returns null for null input", () => {
    expect(headPoseFromMatrix(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(headPoseFromMatrix(undefined)).toBeNull();
  });

  it("returns null for short array", () => {
    expect(headPoseFromMatrix([1, 2, 3])).toBeNull();
  });

  it("returns null when any element is NaN", () => {
    const m = identity();
    m[5] = NaN;
    expect(headPoseFromMatrix(m)).toBeNull();
  });

  it("returns null when any element is Infinity", () => {
    const m = identity();
    m[0] = Infinity;
    expect(headPoseFromMatrix(m)).toBeNull();
  });

  it("returns null for zero-scale column (degenerate matrix)", () => {
    const m = identity();
    m[0] = 0; m[1] = 0; m[2] = 0; // zero first column
    expect(headPoseFromMatrix(m)).toBeNull();
  });

  it("returns zero angles for the identity matrix (camera looking straight at face)", () => {
    const pose = headPoseFromMatrix(identity());
    expect(pose).not.toBeNull();
    expect(pose!.yawDeg).toBeCloseTo(0, 3);
    expect(pose!.pitchDeg).toBeCloseTo(0, 3);
    expect(pose!.rollDeg).toBeCloseTo(0, 3);
  });

  it("returns correct yaw for a pure yaw rotation", () => {
    const pose = headPoseFromMatrix(yawMatrix(15));
    expect(pose).not.toBeNull();
    expect(pose!.yawDeg).toBeCloseTo(15, 1);
    expect(pose!.pitchDeg).toBeCloseTo(0, 1);
  });

  it("handles negative yaw", () => {
    const pose = headPoseFromMatrix(yawMatrix(-10));
    expect(pose).not.toBeNull();
    expect(pose!.yawDeg).toBeCloseTo(-10, 1);
  });

  it("returns correct pitch for a pure pitch rotation", () => {
    const pose = headPoseFromMatrix(pitchMatrix(8));
    expect(pose).not.toBeNull();
    expect(pose!.pitchDeg).toBeCloseTo(-8, 1); // sign per decomposition convention
    expect(pose!.yawDeg).toBeCloseTo(0, 1);
  });

  it("accepts a Float32Array (ArrayLike)", () => {
    const m = new Float32Array(identity());
    const pose = headPoseFromMatrix(m);
    expect(pose).not.toBeNull();
    expect(pose!.yawDeg).toBeCloseTo(0, 3);
  });
});
