import type { Recommendation } from "../../types/recommendation";

export type { Recommendation };

/**
 * Keyed by MuscleZoneScore.key. Only ever looked up with a zone that's
 * already actionable (see classifyZone in ./classification.ts) - a
 * structural zone like shoulderHipRatio or upperArmSymmetry should never
 * reach this map, so there's deliberately no entry for one. If it ever is
 * looked up with an unrecognized or structural key, getBodyRecommendations
 * returns an empty array rather than falling back to something generic -
 * silence is correct there, not a guess.
 */
const BODY_RECOMMENDATIONS: Record<string, Recommendation[]> = {
  postureTilt: [
    {
      title: "Wall angels",
      detail: "Builds shoulder-blade control, which is often what's really behind an uneven resting shoulder line.",
    },
    {
      title: "Doorway chest stretch",
      detail: "A tight chest can pull one shoulder forward more than the other - loosening it often evens things out.",
    },
    {
      title: "Single-arm carries",
      detail: "Carrying load on one side trains the smaller stabilizing muscles that hold your shoulders level.",
    },
  ],
  forwardHead: [
    {
      title: "Chin tucks",
      detail: "Trains the deep neck flexors that pull your head back over your shoulders - small, daily, low load.",
    },
    {
      title: "Band pull-aparts or rows",
      detail: "Strengthens the upper back that holds your shoulders (and so your head) in a stacked position.",
    },
    {
      title: "Raise your screen to eye level",
      detail: "Most forward-head posture is a screen-height habit - fixing the setup beats fighting it with exercises.",
    },
  ],
};

export function getBodyRecommendations(zoneKey: string): Recommendation[] {
  return BODY_RECOMMENDATIONS[zoneKey] ?? [];
}
