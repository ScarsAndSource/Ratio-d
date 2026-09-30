import type { TrainingAge, ZoneRegion } from "./bodyMetrics";

export interface SynthesisTip {
  title: string;
  detail: string;
}

export interface SynthesisResult {
  summary: string;
  tips: SynthesisTip[];
  priorityLeverNarrative: string;
  timelineNarrative: string;
  withinNormalRange: boolean;
}

/**
 * The ONLY shapes that ever leave the device for narration. They are built by
 * lib/synthesis/payload.ts from a whitelist of fields: no photos, no landmark
 * coordinates, no timestamps. The worker re-validates the same shapes
 * (worker/src/payload.ts) and drops anything else.
 */
export interface SynthesisFacePayload {
  overallScore: number;
  subScores: {
    key: string;
    label: string;
    value: number;
    actionable: boolean;
    trend?: "up" | "down" | "flat";
  }[];
  priorityLever: { subScoreKey: string; label: string; reason: string };
  angles: { label: string; valueDeg: number }[];
  undertone: { classification: "warm" | "cool" | "neutral"; confidence: number };
}

export interface SynthesisBodyPayload {
  overallSymmetry: number;
  zones: {
    key: string;
    label: string;
    region: ZoneRegion;
    value: number;
    actionable: boolean;
  }[];
  priorityLever: { zoneKey: string; label: string; reason: string };
  bodyFatEstimate: { band: "lower" | "moderate" | "higher"; note: string };
  trainingAge: TrainingAge;
}

export interface SynthesisRequest {
  faceMetrics: SynthesisFacePayload | null;
  bodyMetrics: SynthesisBodyPayload | null;
}
