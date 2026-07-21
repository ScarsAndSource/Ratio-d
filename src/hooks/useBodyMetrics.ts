import { useEffect, useState } from "react";
import type { BodyCaptureSession } from "../types/bodyCapture";
import type { BodyMetrics, TrainingAge } from "../types/bodyMetrics";
import {
  computeShoulderHipRatio,
  computeLimbSymmetry,
  computePostureTilt,
  computeChestDepthProxy,
} from "../lib/body/geometry";
import { buildBodyMetrics, estimateBodyFatBand } from "../lib/body/score";

interface UseBodyMetricsResult {
  metrics: BodyMetrics | null;
  loading: boolean;
  error: string | null;
}

export function useBodyMetrics(session: BodyCaptureSession | null, trainingAge: TrainingAge): UseBodyMetricsResult {
  const [metrics, setMetrics] = useState<BodyMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError(null);

    const front = session.captures.find((c) => c.angle === "front")?.result.poseLandmarksAveraged;
    const side = session.captures.find((c) => c.angle === "side")?.result.poseLandmarksAveraged;
    const frontImage = session.captures.find((c) => c.angle === "front")?.result.representativeImage ?? null;

    if (!front) {
      setError("Could not read enough of the front angle to score this scan. Try recalibrating with more even lighting.");
      setLoading(false);
      return;
    }

    const shoulderHip = computeShoulderHipRatio(front);
    const posture = computePostureTilt(front);
    const symmetry = computeLimbSymmetry(front);
    const chestDepth = side ? computeChestDepthProxy(front, side) : null;

    if (!shoulderHip || !posture) {
      setError("Could not read enough of the front angle to score this scan. Try recalibrating with more even lighting.");
      setLoading(false);
      return;
    }

    const zones = [shoulderHip, posture, ...symmetry, ...(chestDepth ? [chestDepth] : [])];

    setMetrics(
      buildBodyMetrics({
        zones,
        bodyFatEstimate: estimateBodyFatBand(shoulderHip.value),
        trainingAge,
        frontReferenceImage: frontImage,
      })
    );
    setLoading(false);
  }, [session, trainingAge]);

  return { metrics, loading, error };
}
