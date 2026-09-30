import { describe, it, expect } from "vitest";
import { summarize, runsToCsv, isDrifting } from "./repeatability";

describe("repeatability stats", () => {
  it("computes stats correctly", () => {
    const s = summarize("test", [10, 10, 10, 10]);
    expect(s).not.toBeNull();
    expect(s!.mean).toBe(10);
    expect(s!.sd).toBe(0);
    expect(s!.mdc95).toBe(0);
  });

  it("detects drift", () => {
    expect(isDrifting([1, 2, 3, 4, 5])).toBe(true);
    expect(isDrifting([1, 3, 2, 4, 3])).toBe(false);
  });

  it("exports csv formats", () => {
    const runs = [
      { id: "1", timestamp: 1000, label: "a", values: { m1: 10 } },
      { id: "2", timestamp: 2000, label: "b", values: { m1: 12 } },
    ];
    const csv = runsToCsv(runs);
    expect(csv).toContain("run_id,timestamp,label,m1");
    expect(csv).toContain("1,");
  });
});
