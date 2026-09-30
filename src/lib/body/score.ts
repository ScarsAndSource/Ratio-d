import type {
  MuscleZoneScore,
  PriorityLever,
  BodyMetrics,
  TrainingAge,
} from "../../types/bodyMetrics";

export function buildBodyMetrics(params: {
  zones: MuscleZoneScore[];
  trainingAge: TrainingAge;
  frontReferenceImage: string | null;
}): BodyMetrics {
  const { zones, trainingAge, frontReferenceImage } = params;
  const overallSymmetry = Math.round(zones.reduce((sum, z) => sum + z.value, 0) / zones.length);

  return {
    zones,
    overallSymmetry,
    priorityLever: pickPriorityLever(zones),
    trainingAge,
    frontReferenceImage,
    capturedAt: Date.now(),
  };
}

function pickPriorityLever(zones: MuscleZoneScore[]): PriorityLever {
  const actionable = zones.filter((z) => z.actionable);

  if (actionable.length === 0) {
    return {
      zoneKey: "none",
      label: "Fairly balanced",
      reason: "Nothing actionable stands out enough to call a priority right now.",
    };
  }

  const lowest = actionable.reduce((worst, z) => (z.value < worst.value ? z : worst));

  if (lowest.value > 75) {
    return {
      zoneKey: "none",
      label: "Fairly balanced",
      reason: "Everything actionable here is within a normal range for you today.",
    };
  }

  return { zoneKey: lowest.key, label: lowest.label, reason: reasonFor(lowest.key) };
}

function reasonFor(key: string): string {
  switch (key) {
    case "postureTilt":
      return "Your shoulder line reads uneven in this scan — often postural, and it responds well to mobility and unilateral work.";
    case "forwardHead":
      return "In the side view your head sits forward of your shoulders — a habit-driven posture pattern that responds to cueing and upper-back work.";
    default:
      return "This is the reading furthest from your own baseline right now.";
  }
}
