import type { FaceMetrics } from "../../types/faceMetrics";
import type { BodyMetrics } from "../../types/bodyMetrics";
import type { SynthesisBodyPayload, SynthesisFacePayload } from "../../types/synthesis";

/**
 * Builds the minimal, whitelisted payload sent to the narration service.
 *
 * Every field is copied explicitly. Nothing is spread from the source object,
 * so a field added to FaceMetrics / BodyMetrics later (a photo, raw landmarks,
 * a new identifier) can never leak to the AI by accident. In particular the
 * body scan's full-body photo (`frontReferenceImage`) is never included: it
 * used to ride along inside `bodyMetrics` and cost tens of thousands of tokens
 * per call while contradicting the consent screen.
 */

/**
 * Angle entries that are real measurements. The face pipeline also emits
 * overlay guide lines ("cheek width", "face height") with valueDeg = 0; those
 * are drawing aids, and would read to the narrator as a measured 0 degrees.
 */
export const MEANINGFUL_ANGLE_LABELS: readonly string[] = ["canthal tilt"];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function toSynthesisFace(metrics: FaceMetrics): SynthesisFacePayload {
  return {
    overallScore: round1(metrics.overallScore),
    subScores: metrics.subScores.map((s) => ({
      key: s.key,
      label: s.label,
      value: round1(s.value),
      actionable: s.actionable,
      ...(s.trend ? { trend: s.trend } : {}),
    })),
    priorityLever: {
      subScoreKey: metrics.priorityLever.subScoreKey,
      label: metrics.priorityLever.label,
      reason: metrics.priorityLever.reason,
    },
    angles: metrics.angles
      .filter((a) => MEANINGFUL_ANGLE_LABELS.includes(a.label))
      .map((a) => ({ label: a.label, valueDeg: round1(a.valueDeg) })),
    undertone: {
      classification: metrics.undertone.classification,
      confidence: round2(metrics.undertone.confidence),
    },
  };
}

export function toSynthesisBody(metrics: BodyMetrics): SynthesisBodyPayload {
  return {
    overallSymmetry: round1(metrics.overallSymmetry),
    zones: metrics.zones.map((z) => ({
      key: z.key,
      label: z.label,
      region: z.region,
      value: round1(z.value),
      actionable: z.actionable,
    })),
    priorityLever: {
      zoneKey: metrics.priorityLever.zoneKey,
      label: metrics.priorityLever.label,
      reason: metrics.priorityLever.reason,
    },
    bodyFatEstimate: {
      band: metrics.bodyFatEstimate.band,
      note: metrics.bodyFatEstimate.note,
    },
    trainingAge: metrics.trainingAge,
  };
}
