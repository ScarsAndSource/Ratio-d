import { useMemo, useState } from "react";
import type { RepeatabilityRunController } from "../hooks/useRepeatabilityRun";
import {
  formatSummary,
  suggestJitterGate,
  summarizeRuns,
  toCsv,
  type MetricSummary,
} from "../lib/calibration/repeatability";

interface RepeatabilityPanelProps {
  controller: RepeatabilityRunController;
  /** CSV filename prefix, e.g. "face" or "body". */
  label: string;
  /** Summary key whose MDC is compared to the current trend threshold (face: "overall:unrounded"). */
  trendKey?: string;
  /** The threshold the app currently uses to call a change "real". */
  trendEpsilon?: number;
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const fmt = (v: number | null, d = 3) => (v === null ? "n/a" : v.toFixed(d));

/** Dev-only. The guard lives in a wrapper so the hooks below are never conditional. */
export default function RepeatabilityPanel(props: RepeatabilityPanelProps) {
  if (!import.meta.env.DEV) return null;
  return <Panel {...props} />;
}

function Panel({ controller, label, trendKey, trendEpsilon }: RepeatabilityPanelProps) {
  const { state, start, resume, stop, exit, clear } = controller;
  const [target, setTarget] = useState(10);
  const [auto, setAuto] = useState(true);

  const summaries = useMemo(() => summarizeRuns(state.runs), [state.runs]);
  const jitterKeys = summaries.filter((s) => s.key.startsWith("jitter"));
  const jitterGates = jitterKeys.map((s) => ({
    key: s.key,
    gate: suggestJitterGate(state.runs.map((r) => r.values[s.key]).filter((v): v is number => v !== undefined)),
  }));
  const trend: MetricSummary | undefined = trendKey ? summaries.find((s) => s.key === trendKey) : undefined;

  return (
    <div
      role="region"
      aria-label="Repeatability harness"
      className="fixed bottom-4 left-4 w-80 max-h-[80vh] overflow-auto rounded-lg border border-ink-line bg-ink-panel/95 backdrop-blur p-4 reading text-xs"
    >
      <div className="text-brass-dim mb-2 tracking-[0.15em]">REPEATABILITY - DEV ONLY</div>

      {state.status === "idle" || state.status === "done" ? (
        <div className="space-y-2">
          <label className="flex justify-between items-center">
            <span className="text-muted-onink">captures</span>
            <input
              type="number"
              min={2}
              max={100}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="w-16 bg-transparent border border-ink-line rounded px-1 text-right"
            />
          </label>
          <label className="flex justify-between items-center">
            <span className="text-muted-onink">auto-advance (no re-positioning)</span>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          </label>
          <p className="text-muted-onink">
            Auto = back-to-back captures without moving (a lower bound on noise). Uncheck and re-stand between
            captures for real-world noise. Keep lighting fixed.
          </p>
          <button
            onClick={() => start(target, auto)}
            className="w-full rounded border border-ink-line py-1 text-reading"
          >
            {state.runs.length > 0 ? "start new run (discards current)" : "start"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-onink">progress</span>
            <span className="text-reading">
              {state.runs.length}/{state.target} - {state.status}
            </span>
          </div>
          {state.status === "waiting" && (
            <button onClick={resume} className="w-full rounded border border-ink-line py-1 text-reading">
              capture next
            </button>
          )}
          <button onClick={stop} className="w-full rounded border border-ink-line py-1">
            stop
          </button>
        </div>
      )}

      {state.status !== "idle" && (
        <button onClick={exit} className="mt-2 w-full rounded border border-ink-line py-1 text-muted-onink">
          exit harness (back to results)
        </button>
      )}

      {state.error && <div className="mt-2 text-signal">{state.error}</div>}
      {state.status === "done" && state.failures >= 3 && (
        <div className="mt-1 text-signal">Stopped: three unreadable captures in a row.</div>
      )}

      {summaries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-ink-line space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 text-muted-onink">
            <span>metric</span>
            <span className="text-right">mean</span>
            <span className="text-right">sd</span>
            <span className="text-right">mdc95</span>
          </div>
          {summaries.map((s) => (
            <div key={s.key} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2">
              <span className="truncate" title={s.key}>
                {s.key}
              </span>
              <span className="text-right">{fmt(s.mean, 2)}</span>
              <span className="text-right">{fmt(s.sd)}</span>
              <span className="text-right text-reading">{fmt(s.mdc95)}</span>
            </div>
          ))}

          {trend && trend.mdc95 !== null && trendEpsilon !== undefined && (
            <p className={trend.mdc95 > trendEpsilon ? "text-signal" : "text-reading"}>
              trend threshold is {trendEpsilon}; measured noise floor for a real change is {fmt(trend.mdc95, 2)}
              {trend.mdc95 > trendEpsilon ? " - arrows currently flag noise as change." : " - threshold is safe."}
            </p>
          )}
          {jitterGates.map(({ key, gate }) => (
            <p key={key} className="text-muted-onink">
              {key}: suggested reject gate {gate === null ? "needs 8+ runs" : fmt(gate, 4)}
            </p>
          ))}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => download(`${label}-runs.csv`, toCsv(state.runs))}
              className="flex-1 rounded border border-ink-line py-1"
            >
              CSV
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(formatSummary(summaries))}
              className="flex-1 rounded border border-ink-line py-1"
            >
              Copy
            </button>
            <button onClick={clear} className="rounded border border-ink-line px-2 py-1 text-muted-onink">
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
