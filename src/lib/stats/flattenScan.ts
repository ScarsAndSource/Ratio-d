import type { FaceMetrics } from "../../types/faceMetrics";
import type { BodyMetrics } from "../../types/bodyMetrics";

export function flattenFace(m: FaceMetrics, jitterSd?: number | null): Record<string, number> {
  const out: Record<string, number> = {
    "score.overall": m.overallScore,
    "undertone.confidence": m.undertone.confidence,
  };
  if (typeof jitterSd === "number") {
    out["capture.jitterSd"] = jitterSd;
  }
  for (const s of m.subScores) {
    out[`score.${s.key}`] = s.value;
    if (typeof s.raw === "number") {
      out[`raw.${s.key}`] = s.raw;
    }
  }
  return out;
}

export function flattenBody(m: BodyMetrics, jitterSd?: number | null): Record<string, number> {
  const out: Record<string, number> = {
    "score.overallSymmetry": m.overallSymmetry,
  };
  if (typeof jitterSd === "number") {
    out["capture.jitterSd"] = jitterSd;
  }
  for (const z of m.zones) {
    out[`score.${z.key}`] = z.value;
    if (typeof z.raw === "number") {
      out[`raw.${z.key}`] = z.raw;
    }
  }
  return out;
}
