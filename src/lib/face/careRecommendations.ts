import type { Recommendation } from "../../types/recommendation";

export type { Recommendation };

/**
 * Keyed by SubScore.key. Only ever looked up with a sub-score that's
 * already actionable - canthalTilt, faceShape, and symmetry are structural
 * (actionable: false, see geometry.ts) and deliberately have no entry
 * here. If ever looked up with an unrecognized or structural key,
 * getFaceRecommendations returns an empty array rather than a generic
 * fallback.
 */
const FACE_RECOMMENDATIONS: Record<string, Recommendation[]> = {
  darkCircle: [
    {
      title: "Consistent sleep timing",
      detail: "Under-eye evenness tends to track a stable sleep schedule more closely than total hours alone.",
    },
    {
      title: "Less salt/fluid right before bed",
      detail: "Overnight fluid retention is a common, non-medical contributor to a puffier, darker-looking under-eye area.",
    },
    {
      title: "See a doctor if it's sudden or one-sided",
      detail: "Persistent or asymmetric darkening can have causes worth ruling out - this reading is not a diagnosis.",
    },
  ],
  pores: [
    {
      title: "Consistent gentle cleansing",
      detail: "Texture reads worse under buildup - a simple twice-daily routine does more than any single product.",
    },
    {
      title: "Daily SPF",
      detail: "Sun exposure is one of the few texture factors that stays within your control long-term.",
    },
    {
      title: "Expect a steady baseline, not a fix",
      detail: "Pore size itself is largely structural - the realistic win here is consistency in texture, not disappearance.",
    },
  ],
};

export function getFaceRecommendations(subScoreKey: string): Recommendation[] {
  return FACE_RECOMMENDATIONS[subScoreKey] ?? [];
}
