import { useEffect, useState } from "react";
import type { CaptureResult } from "../types/capture";
import type { FaceMetrics } from "../types/faceMetrics";
import { computeFaceReading } from "../lib/face/compute";
import { loadImageData } from "../lib/calibration/decode";
import { sanitizeAspect } from "../lib/geometry/space";

interface UseFaceMetricsResult {
  metrics: FaceMetrics | null;
  faceShape: string | null;
  loading: boolean;
  error: string | null;
}

export function useFaceMetrics(result: CaptureResult | null): UseFaceMetricsResult {
  const [metrics, setMetrics] = useState<FaceMetrics | null>(null);
  const [faceShape, setFaceShape] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!result) return;
    const landmarks = result.faceLandmarksAveraged;
    const image = result.representativeImage;
    if (!landmarks || !image) {
      setError("No face was captured. Try recalibrating with your face fully in frame.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const aspect = sanitizeAspect(result.aspect);

    // Same code path as the repeatability harness (lib/face/compute.ts), so the
    // number on screen is exactly the number the harness measures.
    loadImageData(image)
      .then((imageData) => {
        if (cancelled) return;
        const reading = computeFaceReading(landmarks, aspect, imageData);
        if (!reading) {
          setError("Could not read enough of the face to score this scan. Try recalibrating with more even lighting.");
          return;
        }
        setFaceShape(reading.faceShape);
        setMetrics(reading.metrics);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the captured frame.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [result]);

  return { metrics, faceShape, loading, error };
}
