import { useState, useMemo } from "react";
import {
  summarizeRuns,
  runsToCsv,
  summaryToCsv,
  thresholdsSnippet,
  type RepeatRun,
} from "../lib/stats/repeatability";
import { loadRuns, addRun, clearRuns } from "../lib/stats/repeatLog";

interface Props {
  mode: "face" | "body";
  values: Record<string, number>;
}

export default function RepeatabilityPanel({ mode, values }: Props) {
  if (!import.meta.env.DEV) return null;

  const [runs, setRuns] = useState<RepeatRun[]>(() => loadRuns());
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState(false);

  const summaries = useMemo(() => summarizeRuns(runs), [runs]);

  const handleLogCurrent = () => {
    const updated = addRun(values, label.trim() || undefined);
    setRuns(updated);
  };

  const handleClear = () => {
    if (window.confirm("Clear all repeatability runs?")) {
      clearRuns();
      setRuns([]);
    }
  };

  const downloadText = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-6 p-4 rounded-xl border border-amber-500/30 bg-amber-950/10 text-xs font-mono">
      <div className="flex items-center justify-between">
        <span className="font-bold text-amber-400 uppercase tracking-wider">
          Repeatability harness ({mode}) — {runs.length} runs logged
        </span>
        <button
          onClick={() => setOpen(!open)}
          className="text-amber-400/80 hover:text-amber-300 underline"
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          placeholder="Session label (e.g. lighting-dim, subject-sitting)..."
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded bg-paper-card border border-paper-line text-foreground"
        />
        <button
          onClick={handleLogCurrent}
          className="px-3 py-1.5 rounded font-medium bg-amber-500 hover:bg-amber-400 text-black transition-colors"
        >
          Log current scan
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {summaries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-amber-500/20 text-amber-300/70">
                    <th className="py-1 pr-2">Metric</th>
                    <th className="py-1 px-2 text-right">Mean</th>
                    <th className="py-1 px-2 text-right">SD</th>
                    <th className="py-1 px-2 text-right">SEM</th>
                    <th className="py-1 px-2 text-right">CI95</th>
                    <th className="py-1 px-2 text-right">MDC95</th>
                    <th className="py-1 pl-2 text-center">Drift?</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s) => (
                    <tr key={s.key} className="border-b border-paper-line/30">
                      <td className="py-1 pr-2 text-foreground font-semibold">{s.key}</td>
                      <td className="py-1 px-2 text-right">{s.mean.toFixed(2)}</td>
                      <td className="py-1 px-2 text-right">{s.sd.toFixed(2)}</td>
                      <td className="py-1 px-2 text-right">{s.sem.toFixed(2)}</td>
                      <td className="py-1 px-2 text-right">±{s.ci95HalfWidth.toFixed(2)}</td>
                      <td className="py-1 px-2 text-right font-bold text-amber-400">{s.mdc95.toFixed(2)}</td>
                      <td className="py-1 pl-2 text-center">
                        {s.isDrifting ? <span className="text-red-400 font-bold">DRIFT</span> : <span className="text-muted font-normal">ok</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
            <button
              onClick={() => downloadText(`ratiod-runs-${mode}.csv`, runsToCsv(runs))}
              disabled={runs.length === 0}
              className="px-2.5 py-1 rounded border border-paper-line bg-paper-card hover:bg-paper-line/30 text-foreground disabled:opacity-40"
            >
              Export runs CSV
            </button>
            <button
              onClick={() => downloadText(`ratiod-summary-${mode}.csv`, summaryToCsv(summaries))}
              disabled={runs.length === 0}
              className="px-2.5 py-1 rounded border border-paper-line bg-paper-card hover:bg-paper-line/30 text-foreground disabled:opacity-40"
            >
              Export summary CSV
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(thresholdsSnippet(summaries))}
              disabled={runs.length === 0}
              className="px-2.5 py-1 rounded border border-paper-line bg-paper-card hover:bg-paper-line/30 text-foreground disabled:opacity-40"
            >
              Copy MDC95 TS code
            </button>
            <button
              onClick={handleClear}
              disabled={runs.length === 0}
              className="ml-auto px-2.5 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-950/20 disabled:opacity-40"
            >
              Clear log
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
