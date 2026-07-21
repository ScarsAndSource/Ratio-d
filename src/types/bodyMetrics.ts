export type ZoneRegion =
  | "shoulders"
  | "chest"
  | "waist"
  | "arms"
  | "legs"
  | "posture";

export interface MuscleZoneScore {
  key: string;
  label: string;
  region: ZoneRegion;
  value: number;
  actionable: boolean;
  heatColor: "green" | "yellow" | "red";
}

export interface PriorityLever {
  zoneKey: string;
  label: string;
  reason: string;
}

export type TrainingAge = "new" | "under1y" | "1to3y" | "3plus" | "unsure";

export interface BodyFatEstimate {
  band: "lower" | "moderate" | "higher";
  note: string;
}

export interface BodyMetrics {
  zones: MuscleZoneScore[];
  overallSymmetry: number;
  priorityLever: PriorityLever;
  bodyFatEstimate: BodyFatEstimate;
  trainingAge: TrainingAge;
  frontReferenceImage: string | null;
  capturedAt: number;
}
