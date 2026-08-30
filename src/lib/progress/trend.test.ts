import { describe, it, expect } from "vitest";
import { computeTrend } from "./trend";
import type { TrendPoint } from "./trend";

describe("computeTrend", () => {
  it("returns hasTrend: false when fewer than 2 points are provided", () => {
    expect(computeTrend([])).toEqual({ hasTrend: false, direction: "flat", delta: 0, points: [] });
    const p1: TrendPoint = { capturedAt: 100, value: 80 };
    expect(computeTrend([p1])).toEqual({ hasTrend: false, direction: "flat", delta: 0, points: [p1] });
  });

  it("reverses descending points array to chronological order and computes upward trend", () => {
    // Input is descending by time: latest first
    const pLatest: TrendPoint = { capturedAt: 200, value: 85 };
    const pPrev: TrendPoint = { capturedAt: 100, value: 80 };
    const result = computeTrend([pLatest, pPrev]);

    expect(result.hasTrend).toBe(true);
    expect(result.direction).toBe("up");
    expect(result.delta).toBe(5);
    expect(result.points).toEqual([pPrev, pLatest]);
  });

  it("computes downward trend when latest is lower than previous by > 1.5", () => {
    const pLatest: TrendPoint = { capturedAt: 200, value: 70 };
    const pPrev: TrendPoint = { capturedAt: 100, value: 80 };
    const result = computeTrend([pLatest, pPrev]);

    expect(result.direction).toBe("down");
    expect(result.delta).toBe(-10);
  });

  it("classifies delta within FLAT_EPSILON (+/- 1.5) as flat", () => {
    const pLatest: TrendPoint = { capturedAt: 200, value: 81.2 };
    const pPrev: TrendPoint = { capturedAt: 100, value: 80.0 };
    const result = computeTrend([pLatest, pPrev]);

    expect(result.direction).toBe("flat");
    expect(result.delta).toBeCloseTo(1.2, 5);
  });
});
