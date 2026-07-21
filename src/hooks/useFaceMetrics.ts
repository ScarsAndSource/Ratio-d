import { useEffect, useState } from "react";
import type { CaptureResult } from "../types/capture";
import type { FaceMetrics } from "../types/faceMetrics";
import { computeCanthalTilt, computeFaceShape, computeSymmetry } from "../lib/face/geometry";
import { analyzeSkin } from "../lib/face/skinAnalysis";
import { buildFaceMetrics } from "../lib/face/score";

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
    if (!result?.faceLandmarksAveraged || !result.representativeImage) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const landmarks = result.faceLandmarksAveraged;
    const img = new Image();

    img.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Could not read the captured frame.");
        setLoading(false);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const canthal = computeCanthalTilt(landmarks);
      const shape = computeFaceShape(landmarks);
      const symmetry = computeSymmetry(landmarks);
      const skin = analyzeSkin(imageData, landmarks);

      if (!canthal || !shape || !symmetry || !skin) {
        setError("Could not read enough of the face to score this scan. Try recalibrating with more even lighting.");
        setLoading(false);
        return;
      }

      setFaceShape(shape.shape);
      setMetrics(
        buildFaceMetrics({
          subScores: [canthal.subScore, shape.subScore, symmetry.subScore, skin.darkCircle, skin.pores],
          angles: [canthal.angle, shape.widthGuide, shape.heightGuide],
          undertone: skin.undertone,
        })
      );
      setLoading(false);
    };

    img.onerror = () => {
      if (!cancelled) {
        setError("Could not load the captured frame.");
        setLoading(false);
      }
    };
    img.src = result.representativeImage;

    return () => {
      cancelled = true;
    };
  }, [result]);

  return { metrics, faceShape, loading, error };
}
