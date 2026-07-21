import type { SubScore, PriorityLever, FaceMetrics, AngleMeasurement, UndertoneReading } from "../../types/faceMetrics";

export function buildFaceMetrics(params: {
  subScores: SubScore[];
  angles: AngleMeasurement[];
  undertone: UndertoneReading;
}): FaceMetrics {
  const { subScores, angles, undertone } = params;
  const overallScore = Math.round(subScores.reduce((sum, s) => sum + s.value, 0) / subScores.length);

  return {
    subScores,
    overallScore,
    priorityLever: pickPriorityLever(subScores),
    angles,
    undertone,
    capturedAt: Date.now(),
  };
}

function pickPriorityLever(subScores: SubScore[]): PriorityLever {
  const actionable = subScores.filter((s) => s.actionable);

  if (actionable.length === 0) {
    return {
      subScoreKey: "none",
      label: "Fairly balanced",
      reason: "Nothing actionable stands out enough to call a priority right now.",
    };
  }

  const lowest = actionable.reduce((worst, s) => (s.value < worst.value ? s : worst));

  if (lowest.value > 75) {
    return {
      subScoreKey: "none",
      label: "Fairly balanced",
      reason: "Everything actionable here is within a normal range for you today.",
    };
  }

  return { subScoreKey: lowest.key, label: lowest.label, reason: reasonFor(lowest.key) };
}

function reasonFor(key: string): string {
  switch (key) {
    case "darkCircle":
      return "This reads noticeably darker than the rest of your skin in this shot - often sleep, hydration, or screen glare, not something fixed.";
    case "pores":
      return "Texture reads rougher here than your baseline - this is the most lighting-sensitive reading in the app, take it as a loose signal.";
    default:
      return "This is the reading furthest from your own baseline right now.";
  }
}
