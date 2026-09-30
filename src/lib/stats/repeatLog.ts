import type { RepeatRun } from "./repeatability";

const STORAGE_KEY = "ratiod.repeatLog.v1";

export function loadRuns(): RepeatRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RepeatRun[]) : [];
  } catch {
    return [];
  }
}

export function addRun(values: Record<string, number>, label?: string): RepeatRun[] {
  const runs = loadRuns();
  const newRun: RepeatRun = {
    id: String(Date.now()),
    timestamp: Date.now(),
    label,
    values,
  };
  const updated = [...runs, newRun];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function clearRuns(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
