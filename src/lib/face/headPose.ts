import type { HeadPose } from "../../types/landmarks";

/**
 * Head pose from MediaPipe's facial transformation matrix (4x4, column-major,
 * canonical face -> camera space). Uniform scale is stripped per column, then
 * the rotation is decomposed as R = Ry(yaw) * Rx(pitch) * Rz(roll):
 *
 *   yaw   = atan2(r02, r22)
 *   pitch = atan2(-r12, hypot(r02, r22))
 *   roll  = atan2(r10, r11)
 *
 * Returns null for malformed / degenerate matrices so callers fail closed.
 */
export function headPoseFromMatrix(m: ArrayLike<number> | null | undefined): HeadPose | null {
  if (!m || m.length < 16) return null;
  for (let i = 0; i < 16; i++) if (!Number.isFinite(m[i])) return null;

  const cx = Math.hypot(m[0]!, m[1]!, m[2]!);
  const cy = Math.hypot(m[4]!, m[5]!, m[6]!);
  const cz = Math.hypot(m[8]!, m[9]!, m[10]!);
  if (cx < 1e-9 || cy < 1e-9 || cz < 1e-9) return null;

  const r10 = m[1]! / cx;
  const r11 = m[5]! / cy;
  const r02 = m[8]! / cz;
  const r12 = m[9]! / cz;
  const r22 = m[10]! / cz;

  const deg = 180 / Math.PI;
  return {
    yawDeg: Math.atan2(r02, r22) * deg,
    pitchDeg: Math.atan2(-r12, Math.hypot(r02, r22)) * deg,
    rollDeg: Math.atan2(r10, r11) * deg,
  };
}
