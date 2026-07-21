import type {
  MuscleZoneScore,
  PriorityLever,
  BodyMetrics,
  BodyFatEstimate,
  TrainingAge,
} from "../../types/bodyMetrics";

export function buildBodyMetrics(params: {
  zones: MuscleZoneScore[];
  bodyFatEstimate: BodyFatEstimate;
  trainingAge: TrainingAge;
  frontReferenceImage: string | null;
}): BodyMetrics {
  const { zones, bodyFatEstimate, trainingAge, frontReferenceImage } = params;
  const overallSymmetry = Math.round(zones.reduce((sum, z) => sum + z.value, 0) / zones.length);

  return {
    zones,
    overallSymmetry,
    priorityLever: pickPriorityLever(zones),
    bodyFatEstimate,
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
    case "chestDepthProxy":
      return "This is a rough fullness read, not a girth measurement — take it as a loose signal, not a verdict.";
    default:
      return "This is the reading furthest from your own baseline right now.";
  }
}

export function estimateBodyFatBand(taperScore: number): BodyFatEstimate {
  const note = "A rough estimate based on visual body-frame taper, not a clinical measurement.";
  if (taperScore >= 70) return { band: "lower", note };
  if (taperScore >= 40) return { band: "moderate", note };
  return { band: "higher", note };
}
