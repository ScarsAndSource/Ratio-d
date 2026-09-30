import type { BodyMetrics } from "../../types/bodyMetrics";

/**
 * The body photo lives in its own column (`body_scans.front_reference_image`).
 * It used to ALSO be embedded in the `metrics` JSON, storing every full-body
 * photo twice. `metrics` is now written without it and the photo is
 * re-attached on load.
 */
export function bodyMetricsForStorage(metrics: BodyMetrics): BodyMetrics {
  return { ...metrics, frontReferenceImage: null };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Rebuilds BodyMetrics from a stored row. Works for both new rows (image only
 * in the column) and legacy rows (image duplicated inside the JSON). Returns
 * null for a malformed row so one bad record cannot break the whole history.
 */
export function bodyMetricsFromStorage(raw: unknown, imageColumn: string | null): BodyMetrics | null {
  if (!isPlainObject(raw)) return null;
  const legacyEmbedded = typeof raw.frontReferenceImage === "string" ? raw.frontReferenceImage : null;
  return { ...(raw as unknown as BodyMetrics), frontReferenceImage: imageColumn ?? legacyEmbedded };
}
