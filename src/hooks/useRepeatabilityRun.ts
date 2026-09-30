import { useCallback, useEffect, useReducer, useRef } from "react";
import { initialRunnerState, isTakeover, runnerReducer, type RunnerState } from "../lib/calibration/runnerMachine";
import type { Measured } from "../lib/calibration/measure";

interface Params<T> {
  /** The finished capture (face: CaptureResult, body: BodyCaptureSession), or null while capturing. */
  result: T | null;
  /** Restarts the capture flow (aligning -> capturing -> complete). */
  reset: () => void;
  measure: (result: T) => Promise<Measured | null>;
}

export interface RepeatabilityRunController {
  state: RunnerState;
  /** While true the parent must NOT show its results screen. */
  takeover: boolean;
  start: (target: number, autoAdvance: boolean) => void;
  resume: () => void;
  stop: () => void;
  exit: () => void;
  clear: () => void;
}

/**
 * Drives "capture N times, record each reading". All decisions live in the pure
 * reducer (runnerMachine.ts); this hook only wires it to the capture flow:
 *  - a new `result` while capturing -> measure it and record the run
 *  - a bumped `epoch` -> call reset() so the next capture begins
 */
export function useRepeatabilityRun<T>({ result, reset, measure }: Params<T>): RepeatabilityRunController {
  const [state, dispatch] = useReducer(runnerReducer, initialRunnerState);

  const resetRef = useRef(reset);
  const measureRef = useRef(measure);
  const resultRef = useRef(result);
  resetRef.current = reset;
  measureRef.current = measure;
  resultRef.current = result;

  // Each result is measured at most once (also guards React StrictMode's double effects).
  const processed = useRef<T | null>(null);

  useEffect(() => {
    if (state.epoch > 0) {
      // Whatever result exists right now belongs to the PREVIOUS capture: mark it
      // as seen so it is never recorded twice, then start the next capture.
      processed.current = resultRef.current;
      resetRef.current();
    }
  }, [state.epoch]);

  useEffect(() => {
    if (state.status !== "capturing" || result === null) return;
    if (processed.current === result) return;
    processed.current = result;
    dispatch({ type: "captured" });

    measureRef
      .current(result)
      .then((m) => {
        if (m) dispatch({ type: "measured", values: m.values, frameCount: m.frameCount, now: Date.now() });
        else dispatch({ type: "measureFailed", message: "Could not read that capture; it was discarded." });
      })
      .catch((e: unknown) => {
        dispatch({ type: "measureFailed", message: e instanceof Error ? e.message : String(e) });
      });
  }, [result, state.status]);

  const start = useCallback((target: number, autoAdvance: boolean) => dispatch({ type: "start", target, autoAdvance }), []);
  const resume = useCallback(() => dispatch({ type: "resume" }), []);
  const stop = useCallback(() => dispatch({ type: "stop" }), []);
  const exit = useCallback(() => dispatch({ type: "exit" }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  return { state, takeover: isTakeover(state), start, resume, stop, exit, clear };
}
