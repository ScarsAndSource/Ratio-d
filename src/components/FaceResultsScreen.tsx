import type { CaptureResult } from "../types/capture";
import { useFaceMetrics } from "../hooks/useFaceMetrics";
import { useFaceProgress } from "../hooks/useFaceProgress";
import { useSynthesis } from "../hooks/useSynthesis";
import FaceExplainabilityOverlay from "./FaceExplainabilityOverlay";
import SynthesisNarrative from "./SynthesisNarrative";
import ScoreTrendDisplay from "./ScoreTrendDisplay";

interface FaceResultsScreenProps {
  result: CaptureResult;
  onRecalibrate: () => void;
}

export default function FaceResultsScreen({ result, onRecalibrate }: FaceResultsScreenProps) {
  const { metrics, faceShape, loading, error } = useFaceMetrics(result);
  const { synthesis, loading: synthesisLoading, error: synthesisError } = useSynthesis(metrics, null);
  const { trend } = useFaceProgress(metrics, result.representativeImage);

  return (
    <div className="min-h-screen bg-paper text-paper-text">
      <div className="mx-auto max-w-xl px-6 py-16 flex flex-col gap-8">
        <div>
          <div className="reading text-brass-dim text-xs tracking-[0.15em] mb-1">BASELINE READ</div>
          <h1 className="font-display text-3xl font-light">Your reading</h1>
        </div>

        {loading && <p className="text-muted-onpaper text-sm">Reading the capture...</p>}
        {error && <p className="text-signal text-sm">{error}</p>}

        {metrics && result.representativeImage && (
          <>
            <FaceExplainabilityOverlay imageSrc={result.representativeImage} angles={metrics.angles} />

            <ScoreTrendDisplay trend={trend} currentValue={metrics.overallScore} />

            <div className="rounded-lg bg-paper-panel border border-paper-line p-5">
              <div className="reading text-brass text-xs tracking-[0.15em] mb-1">PRIORITY LEVER</div>
              <div className="font-display text-lg mb-1">{metrics.priorityLever.label}</div>
              <p className="text-sm text-muted-onpaper">{metrics.priorityLever.reason}</p>
            </div>

            <div className="space-y-3">
              {metrics.subScores.map((s) => (
                <div key={s.key} className="flex items-center justify-between text-sm">
                  <span className="text-paper-text">{s.label}</span>
                  <div className="flex items-center gap-3">
                    {!s.actionable && (
                      <span className="reading text-[10px] text-muted-onpaper tracking-wide">STRUCTURAL</span>
                    )}
                    <span className="reading text-paper-text">{Math.round(s.value)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm border-t border-paper-line pt-4">
              <span className="text-muted-onpaper">Undertone</span>
              <span className="reading text-paper-text capitalize">
                {metrics.undertone.classification}
                {metrics.undertone.confidence < 0.4 && <span className="text-muted-onpaper text-xs"> (uncertain)</span>}
              </span>
            </div>

            {faceShape && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-onpaper">Face shape</span>
                <span className="reading text-paper-text capitalize">{faceShape}</span>
              </div>
            )}

            <SynthesisNarrative synthesis={synthesis} loading={synthesisLoading} error={synthesisError} />
          </>
        )}

        <button
          onClick={onRecalibrate}
          className="reading self-start rounded-full border border-brass-dim px-5 py-2 text-xs tracking-[0.15em] text-brass hover:bg-brass hover:text-ink transition-colors"
        >
          RECALIBRATE
        </button>
      </div>
    </div>
  );
}
