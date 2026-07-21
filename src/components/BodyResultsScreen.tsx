import { useMemo } from "react";
import type { BodyCaptureSession } from "../types/bodyCapture";
import type { TrainingAge } from "../types/bodyMetrics";
import { useBodyMetrics } from "../hooks/useBodyMetrics";
import { useSynthesis } from "../hooks/useSynthesis";
import BodySymmetryHeatmap from "./BodySymmetryHeatmap";
import SynthesisNarrative from "./SynthesisNarrative";

interface BodyResultsScreenProps {
  session: BodyCaptureSession;
  trainingAge: TrainingAge;
  onRecalibrate: () => void;
}

const TRAINING_AGE_LABEL: Record<TrainingAge, string> = {
  new: "Just starting out",
  under1y: "Under a year",
  "1to3y": "1-3 years",
  "3plus": "3+ years",
  unsure: "Not specified",
};

const BODY_FAT_LABEL = { lower: "Leaner", moderate: "Moderate", higher: "Higher" };

export default function BodyResultsScreen({ session, trainingAge, onRecalibrate }: BodyResultsScreenProps) {
  const { metrics, loading, error } = useBodyMetrics(session, trainingAge);
  const { synthesis, loading: synthesisLoading, error: synthesisError } = useSynthesis(null, metrics);

  const frontLandmarks = useMemo(
    () => session.captures.find((c) => c.angle === "front")?.result.poseLandmarksAveraged ?? null,
    [session]
  );

  return (
    <div className="min-h-screen bg-paper text-paper-text">
      <div className="mx-auto max-w-xl px-6 py-16 flex flex-col gap-8">
        <div>
          <div className="reading text-brass-dim text-xs tracking-[0.15em] mb-1">BASELINE READ</div>
          <h1 className="font-display text-3xl font-light">Your body reading</h1>
        </div>

        {loading && <p className="text-muted-onpaper text-sm">Reading the capture...</p>}
        {error && <p className="text-signal text-sm">{error}</p>}

        {metrics && frontLandmarks && metrics.frontReferenceImage && (
          <>
            <BodySymmetryHeatmap
              imageSrc={metrics.frontReferenceImage}
              frontLandmarks={frontLandmarks}
              zones={metrics.zones}
            />

            <div className="flex items-baseline gap-4 border-t border-paper-line pt-6">
              <div className="reading text-5xl text-paper-text">{metrics.overallSymmetry}</div>
              <div className="text-sm text-muted-onpaper max-w-xs">
                Read against your own baseline - not a rating against anyone else's.
              </div>
            </div>

            <div className="rounded-lg bg-paper-panel border border-paper-line p-5">
              <div className="reading text-brass text-xs tracking-[0.15em] mb-1">PRIORITY LEVER</div>
              <div className="font-display text-lg mb-1">{metrics.priorityLever.label}</div>
              <p className="text-sm text-muted-onpaper">{metrics.priorityLever.reason}</p>
            </div>

            <div className="space-y-3">
              {metrics.zones.map((z) => (
                <div key={z.key} className="flex items-center justify-between text-sm">
                  <span className="text-paper-text">{z.label}</span>
                  <div className="flex items-center gap-3">
                    {!z.actionable && (
                      <span className="reading text-[10px] text-muted-onpaper tracking-wide">STRUCTURAL</span>
                    )}
                    <span className="reading text-paper-text">{Math.round(z.value)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm border-t border-paper-line pt-4">
              <span className="text-muted-onpaper">Body-fat estimate</span>
              <span className="reading text-paper-text">
                {BODY_FAT_LABEL[metrics.bodyFatEstimate.band]}
                <span className="text-muted-onpaper text-xs"> (estimate only)</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-onpaper">Training age</span>
              <span className="reading text-paper-text">{TRAINING_AGE_LABEL[metrics.trainingAge]}</span>
            </div>

            <SynthesisNarrative synthesis={synthesis} loading={synthesisLoading} error={synthesisError} />
          </>
        )}

        <button
          onClick={onRecalibrate}
          className="reading self-start rounded-full border border-brass-dim px-5 py-2 text-xs tracking-[0.15em] text-brass hover:bg-brass hover:text-ink transition-colors"
        >
          RESCAN
        </button>
      </div>
    </div>
  );
}
