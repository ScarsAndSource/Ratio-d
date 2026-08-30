import { describe, it, expect } from "vitest";
import { computeCooldown } from "./cooldown";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("computeCooldown", () => {
  it("returns onCooldown: false when lastScanAt is null", () => {
    const result = computeCooldown(null, Date.now());
    expect(result).toEqual({ onCooldown: false, daysRemaining: 0, lastScanAt: null });
  });

  it("returns onCooldown: true with remaining days when last scan was recent (< 7 days)", () => {
    const now = 1000000000000;
    const lastScanAt = now - 2 * DAY_MS; // 2 days ago -> 5 days remaining
    const result = computeCooldown(lastScanAt, now);
    expect(result.onCooldown).toBe(true);
    expect(result.daysRemaining).toBe(5);
    expect(result.lastScanAt).toBe(lastScanAt);
  });

  it("returns onCooldown: false when last scan was >= 7 days ago", () => {
    const now = 1000000000000;
    const lastScanAt = now - 7 * DAY_MS; // exactly 7 days ago
    const result = computeCooldown(lastScanAt, now);
    expect(result.onCooldown).toBe(false);
    expect(result.daysRemaining).toBe(0);

    const oldScanAt = now - 10 * DAY_MS; // 10 days ago
    const oldResult = computeCooldown(oldScanAt, now);
    expect(oldResult.onCooldown).toBe(false);
    expect(oldResult.daysRemaining).toBe(0);
  });
});
