import type { FaceMetrics } from "./faceMetrics";
import type { BodyMetrics } from "./bodyMetrics";

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

export interface SynthesisRequest {
  faceMetrics?: FaceMetrics;
  bodyMetrics?: BodyMetrics;
}
