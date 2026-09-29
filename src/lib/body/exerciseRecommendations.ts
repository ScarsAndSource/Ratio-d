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
  chestDepthProxy: [
    {
      title: "Progressive push work (push-ups, presses)",
      detail: "Chest depth responds to load over time - consistency matters more than any single exercise.",
    },
    {
      title: "Full range of motion",
      detail: "Cutting reps short trains less muscle than it looks like - a full stretch at the bottom drives more of the adaptation.",
    },
    {
      title: "Expect a 2-3 month timeline",
      detail: "Visible chest change is typically a slow story even with good training - a flat week isn't a signal to change anything.",
    },
  ],
};

export function getBodyRecommendations(zoneKey: string): Recommendation[] {
  return BODY_RECOMMENDATIONS[zoneKey] ?? [];
}
