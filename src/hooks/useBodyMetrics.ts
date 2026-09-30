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
import { sanitizeAspect } from "../lib/geometry/space";

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

    const frontCapture = session.captures.find((c) => c.angle === "front")?.result;
    const sideCapture = session.captures.find((c) => c.angle === "side")?.result;
    const front = frontCapture?.poseLandmarksAveraged;
    const side = sideCapture?.poseLandmarksAveraged;
    const frontImage = frontCapture?.representativeImage ?? null;
    const frontAspect = sanitizeAspect(frontCapture?.aspect);
    const sideAspect = sanitizeAspect(sideCapture?.aspect);

    if (!front) {
      setError("Could not read enough of the front angle to score this scan. Try recalibrating with more even lighting.");
      setLoading(false);
      return;
    }

    const shoulderHip = computeShoulderHipRatio(front, frontAspect);
    const posture = computePostureTilt(front, frontAspect);
    const symmetry = computeLimbSymmetry(front, frontAspect);
    const chestDepth = side ? computeChestDepthProxy(front, side, frontAspect, sideAspect) : null;

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
