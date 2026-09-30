/**
 * Critical values of Student's t distribution at alpha = 0.05 two-tailed (df = N - 1).
 * Used to compute exact 95% Confidence Intervals for small sample sizes (N = 2..30).
 */
const STUDENT_T_975: Record<number, number> = {
  1: 12.706,
  2: 4.303,
  3: 3.182,
  4: 2.776,
  5: 2.571,
  6: 2.447,
  7: 2.365,
  8: 2.306,
  9: 2.262,
  10: 2.228,
  11: 2.201,
  12: 2.179,
  13: 2.16,
  14: 2.145,
  15: 2.131,
  16: 2.12,
  17: 2.11,
  18: 2.101,
  19: 2.093,
  20: 2.086,
  21: 2.08,
  22: 2.074,
  23: 2.069,
  24: 2.064,
  25: 2.06,
  26: 2.056,
  27: 2.052,
  28: 2.048,
  29: 2.045,
};

function getStudentT(df: number): number {
  if (df < 1) return 1.96;
  return STUDENT_T_975[df] ?? 1.96;
}

export interface MetricSummary {
  key: string;
  n: number;
  mean: number;
  sd: number;
  sem: number;
  ci95HalfWidth: number;
  semPercent: number;
  mdc95: number;
  isDrifting: boolean;
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function sampleSd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

export function mdc95(sd: number): number {
  return 1.96 * Math.SQRT2 * sd;
}

export function isDrifting(xs: number[]): boolean {
  if (xs.length < 4) return false;
  let matches = 0;
  for (let i = 1; i < xs.length; i++) {
    if (xs[i]! > xs[i - 1]!) matches++;
    else if (xs[i]! < xs[i - 1]!) matches--;
  }
  return Math.abs(matches) >= xs.length - 2;
}

export function summarize(key: string, values: number[]): MetricSummary | null {
  if (values.length === 0) return null;
  const n = values.length;
  const m = mean(values);
  const sd = sampleSd(values);
  const sem = n > 0 ? sd / Math.sqrt(n) : 0;
  const tVal = getStudentT(n - 1);
  const ci95HalfWidth = tVal * sem;
  const semPercent = m !== 0 ? (sem / Math.abs(m)) * 100 : 0;
  const mdc = mdc95(sd);
  const drifting = isDrifting(values);

  return {
    key,
    n,
    mean: m,
    sd,
    sem,
    ci95HalfWidth,
    semPercent,
    mdc95: mdc,
    isDrifting: drifting,
  };
}

export interface RepeatRun {
  id: string;
  timestamp: number;
  label?: string;
  values: Record<string, number>;
}

export function summarizeRuns(runs: RepeatRun[]): MetricSummary[] {
  if (runs.length === 0) return [];
  const keys = Array.from(new Set(runs.flatMap((r) => Object.keys(r.values))));

  const result: MetricSummary[] = [];
  for (const k of keys) {
    const vals = runs.map((r) => r.values[k]).filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
    const s = summarize(k, vals);
    if (s) result.push(s);
  }
  return result;
}

function csvCell(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "";
  const str = String(v);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function runsToCsv(runs: RepeatRun[]): string {
  if (runs.length === 0) return "";
  const keys = Array.from(new Set(runs.flatMap((r) => Object.keys(r.values))));
  const headers = ["run_id", "timestamp", "label", ...keys];
  const lines = [headers.join(",")];

  for (const r of runs) {
    const row = [r.id, new Date(r.timestamp).toISOString(), r.label ?? "", ...keys.map((k) => r.values[k])];
    lines.push(row.map(csvCell).join(","));
  }
  return lines.join("\n");
}

export function summaryToCsv(summaries: MetricSummary[]): string {
  const headers = ["key", "n", "mean", "sd", "sem", "ci95HalfWidth", "semPercent", "mdc95", "isDrifting"];
  const lines = [headers.join(",")];
  for (const s of summaries) {
    lines.push(
      [
        s.key,
        s.n,
        s.mean.toFixed(4),
        s.sd.toFixed(4),
        s.sem.toFixed(4),
        s.ci95HalfWidth.toFixed(4),
        s.semPercent.toFixed(2),
        s.mdc95.toFixed(4),
        s.isDrifting ? "TRUE" : "FALSE",
      ].join(",")
    );
  }
  return lines.join("\n");
}

export function thresholdsSnippet(summaries: MetricSummary[]): string {
  const lines = summaries.map((s) => `  "${s.key}": ${s.mdc95.toFixed(2)},`);
  return `export const MDC95: Record<string, number> = {\n${lines.join("\n")}\n};`;
}
