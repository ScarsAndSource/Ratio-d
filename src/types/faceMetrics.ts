import type { LandmarkPoint } from "./landmarks";

export interface AngleMeasurement {
  label: string;
  valueDeg: number;
  points: [LandmarkPoint, LandmarkPoint];
}

export interface SubScore {
  key: string;
  label: string;
  value: number;
  actionable: boolean;
  trend?: "up" | "down" | "flat";
}

export interface PriorityLever {
  subScoreKey: string;
  label: string;
  reason: string;
}

export interface UndertoneReading {
  classification: "warm" | "cool" | "neutral";
  confidence: number;
}

export interface FaceMetrics {
  subScores: SubScore[];
  overallScore: number;
  priorityLever: PriorityLever;
  angles: AngleMeasurement[];
  undertone: UndertoneReading;
  capturedAt: number;
}
