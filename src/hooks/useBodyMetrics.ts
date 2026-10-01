import { useMemo } from "react";
import type { BodyCaptureSession } from "../types/bodyCapture";
import type { BodyMetrics, TrainingAge } from "../types/bodyMetrics";
import { computeBodyMetricsFromSession } from "../lib/body/fromSession";

interface UseBodyMetricsResult {
  metrics: BodyMetrics | null;
  loading: boolean;
  error: string | null;
}

export function useBodyMetrics(session: BodyCaptureSession | null, trainingAge: TrainingAge): UseBodyMetricsResult {
  // Same code path as the repeatability harness (lib/body/fromSession.ts).
  // Synchronous, so there is no loading state; memoised so `metrics` keeps one
  // identity (and one capturedAt) for as long as the session is on screen.
  return useMemo<UseBodyMetricsResult>(() => {
    if (!session) return { metrics: null, loading: false, error: null };
    const out = computeBodyMetricsFromSession(session, trainingAge);
    if ("error" in out) return { metrics: null, loading: false, error: out.error };
    return { metrics: out.metrics, loading: false, error: null };
  }, [session, trainingAge]);
}
