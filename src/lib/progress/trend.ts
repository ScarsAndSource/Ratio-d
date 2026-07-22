export interface TrendPoint {
  capturedAt: number;
  value: number;
}

export type TrendDirection = "up" | "down" | "flat";

export interface TrendResult {
  hasTrend: boolean;
  direction: TrendDirection;
  delta: number;
  points: TrendPoint[];
}

const FLAT_EPSILON = 1.5;

export function computeTrend(pointsDescending: TrendPoint[]): TrendResult {
  const points = [...pointsDescending].reverse();

  if (points.length < 2) {
    return { hasTrend: false, direction: "flat", delta: 0, points };
  }

  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const delta = latest.value - previous.value;
  const direction: TrendDirection = Math.abs(delta) < FLAT_EPSILON ? "flat" : delta > 0 ? "up" : "down";

  return { hasTrend: true, direction, delta, points };
}
