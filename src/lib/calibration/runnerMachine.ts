import type { Reading, RepeatabilityRun } from "./repeatability";

export type RunnerStatus = "idle" | "capturing" | "measuring" | "waiting" | "done";

export interface RunnerState {
  status: RunnerStatus;
  runs: RepeatabilityRun[];
  target: number;
  autoAdvance: boolean;
  /** Consecutive unreadable captures. */
  failures: number;
  error: string | null;
  /** Bumped every time a fresh capture must begin; the hook calls reset() on change. */
  epoch: number;
}

export const MAX_CONSECUTIVE_FAILURES = 3;
export const MIN_TARGET = 2;
export const MAX_TARGET = 100;

export const initialRunnerState: RunnerState = {
  status: "idle",
  runs: [],
  target: 10,
  autoAdvance: true,
  failures: 0,
  error: null,
  epoch: 0,
};

export type RunnerAction =
  | { type: "start"; target: number; autoAdvance: boolean }
  | { type: "captured" }
  | { type: "measured"; values: Reading; frameCount: number; now: number }
  | { type: "measureFailed"; message: string }
  | { type: "resume" }
  | { type: "stop" }
  | { type: "exit" }
  | { type: "clear" };

/** After a run is counted or a capture fails: pick the next status. */
function advance(state: RunnerState): RunnerState {
  if (state.runs.length >= state.target) return { ...state, status: "done" };
  if (state.autoAdvance) return { ...state, status: "capturing", epoch: state.epoch + 1 };
  return { ...state, status: "waiting" };
}

export function runnerReducer(state: RunnerState, action: RunnerAction): RunnerState {
  switch (action.type) {
    case "start": {
      const target = Math.min(MAX_TARGET, Math.max(MIN_TARGET, Math.round(action.target) || MIN_TARGET));
      return {
        ...state,
        status: "capturing",
        runs: [],
        target,
        autoAdvance: action.autoAdvance,
        failures: 0,
        error: null,
        epoch: state.epoch + 1,
      };
    }
    case "captured":
      return state.status === "capturing" ? { ...state, status: "measuring" } : state;

    case "measured": {
      if (state.status !== "measuring") return state;
      const run: RepeatabilityRun = {
        index: state.runs.length + 1,
        capturedAt: action.now,
        mode: state.autoAdvance ? "auto" : "manual",
        frameCount: action.frameCount,
        values: action.values,
      };
      return advance({ ...state, runs: [...state.runs, run], failures: 0, error: null });
    }
    case "measureFailed": {
      if (state.status !== "measuring") return state;
      const failures = state.failures + 1;
      const next = { ...state, failures, error: action.message };
      if (failures >= MAX_CONSECUTIVE_FAILURES) return { ...next, status: "done" };
      return advance(next);
    }
    case "resume":
      return state.status === "waiting" ? { ...state, status: "capturing", epoch: state.epoch + 1 } : state;

    case "stop":
      return state.status === "idle" ? state : { ...state, status: "done" };

    case "exit":
      return { ...state, status: "idle" };

    case "clear":
      return { ...state, status: "idle", runs: [], failures: 0, error: null };
  }
}

/** True while the runner owns the screen (results screens must stay hidden). */
export function isTakeover(state: RunnerState): boolean {
  return state.status !== "idle";
}
