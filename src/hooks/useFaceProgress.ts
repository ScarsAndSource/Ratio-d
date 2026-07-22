import { useEffect, useRef, useState } from "react";
import type { FaceMetrics } from "../types/faceMetrics";
import type { StoredFaceScan } from "../types/scanHistory";
import { saveFaceScan, loadFaceScans } from "../lib/storage/scanRepository";
import { computeTrend, type TrendResult } from "../lib/progress/trend";

interface UseFaceProgressResult {
  trend: TrendResult;
  scanCount: number;
}

export function useFaceProgress(metrics: FaceMetrics | null, representativeImage: string | null): UseFaceProgressResult {
  const [scans, setScans] = useState<StoredFaceScan[]>([]);
  const savedForTimestamp = useRef<number | null>(null);

  useEffect(() => {
    if (!metrics) return;
    if (savedForTimestamp.current === metrics.capturedAt) return;
    savedForTimestamp.current = metrics.capturedAt;

    let cancelled = false;
    saveFaceScan(metrics, representativeImage)
      .then(() => loadFaceScans())
      .then((all) => {
        if (!cancelled) setScans(all);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [metrics, representativeImage]);

  const trend = computeTrend(scans.map((s) => ({ capturedAt: s.capturedAt, value: s.metrics.overallScore })));

  return { trend, scanCount: scans.length };
}
