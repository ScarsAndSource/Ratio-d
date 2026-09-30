import { sampleSd } from "../guidance/landmarkStats";

/** One numeric column per metric, e.g. { "overall:unrounded": 81.2, "score:symmetry": 93.4 }. */
export type Reading = Record<string, number>;

export interface RepeatabilityRun {
  /** 1-based, in capture order. */
  index: number;
  capturedAt: number;
  /** "auto" = re-captured immediately without moving; "manual" = user re-positioned between runs. */
  mode: "auto" | "manual";
  frameCount: number;
  values: Reading;
}

export interface MetricSummary {
  key: string;
  n: number;
  mean: number;
  /** Sample SD (n - 1). null with fewer than two runs. */
  sd: number | null;
  /** Minimum detectable change at 95% confidence for a difference of two scans. */
  mdc95: number | null;
  min: number;
  max: number;
}

/** z for a two-sided 95% interval. */
export const Z95 = 1.96;

/**
 * Smallest difference between two single scans that is unlikely (95%) to be
 * measurement noise: z * sqrt(2) * SD. With z = 1.96 that is ~2.77 * SD.
 * The sqrt(2) is there because BOTH scans carry noise.
 */
export function minimumDetectableChange(sd: number, z: number = Z95): number {
  return z * Math.SQRT2 * sd;
}

export function summarizeRuns(runs: RepeatabilityRun[]): MetricSummary[] {
  const columns = new Map<string, number[]>();
  for (const run of runs) {
    for (const [key, v] of Object.entries(run.values)) {
      if (!Number.isFinite(v)) continue;
      const col = columns.get(key);
      if (col) col.push(v);
      else columns.set(key, [v]);
    }
  }

  return [...columns.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => {
      const n = vals.length;
      const sd = n >= 2 ? sampleSd(vals) : null;
      return {
        key,
        n,
        mean: vals.reduce((a, b) => a + b, 0) / n,
        sd,
        mdc95: sd === null ? null : minimumDetectableChange(sd),
        min: Math.min(...vals),
        max: Math.max(...vals),
      };
    });
}

/** Linear-interpolated percentile, p in [0, 1]. null for no values. */
export function percentile(values: number[], p: number): number | null {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length === 0) return null;
  if (v.length === 1) return v[0]!;
  const pos = Math.min(1, Math.max(0, p)) * (v.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return v[lo]! + (v[hi]! - v[lo]!) * (pos - lo);
}

/**
 * Suggested reject threshold for capture jitter: the 95th percentile of jitter
 * seen on deliberate "hold still" captures, times a margin. It exists to drop
 * captures where the subject clearly moved, not to police normal tracker noise.
 * The margin (1.5) is a judgement call, not a derived quantity. Null until there
 * are enough runs to have a meaningful tail.
 */
export function suggestJitterGate(jitters: number[], margin = 1.5, minRuns = 8): number | null {
  const clean = jitters.filter(Number.isFinite);
  if (clean.length < minRuns) return null;
  const p95 = percentile(clean, 0.95);
  return p95 === null ? null : p95 * margin;
}

function csvCell(s: string): string {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with one row per run and one column per metric (blank where a run lacks it). */
export function toCsv(runs: RepeatabilityRun[]): string {
  const keys = [...new Set(runs.flatMap((r) => Object.keys(r.values)))].sort();
  const header = ["index", "capturedAt", "mode", "frameCount", ...keys].map(csvCell).join(",");
  const rows = runs.map((r) =>
    [
      String(r.index),
      new Date(r.capturedAt).toISOString(),
      r.mode,
      String(r.frameCount),
      ...keys.map((k) => {
        const v = r.values[k];
        return v !== undefined && Number.isFinite(v) ? String(v) : "";
      }),
    ]
      .map(csvCell)
      .join(",")
  );
  return [header, ...rows].join("\n") + "\n";
}

/** Plain-text table for the clipboard / a bug report. */
export function formatSummary(summaries: MetricSummary[]): string {
  const f = (v: number | null, d = 3) => (v === null ? "n/a" : v.toFixed(d));
  const keyWidth = Math.max(6, ...summaries.map((s) => s.key.length));
  const lines = [
    `${"metric".padEnd(keyWidth)}  n   mean      sd        mdc95`,
    ...summaries.map(
      (s) =>
        `${s.key.padEnd(keyWidth)}  ${String(s.n).padEnd(3)} ${f(s.mean).padEnd(9)} ${f(s.sd).padEnd(9)} ${f(s.mdc95)}`
    ),
  ];
  return lines.join("\n");
}
