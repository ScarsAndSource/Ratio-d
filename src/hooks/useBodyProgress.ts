import { useEffect, useRef, useState } from "react";
import type { BodyMetrics } from "../types/bodyMetrics";
import type { LandmarkPoint } from "../types/landmarks";
import type { StoredBodyScan } from "../types/scanHistory";
import { saveBodyScan, loadBodyScans } from "../lib/storage/scanRepository";
import { computeTrend, type TrendResult } from "../lib/progress/trend";

interface UseBodyProgressResult {
  trend: TrendResult;
  previousScan: StoredBodyScan | null;
  scanCount: number;
}

export function useBodyProgress(metrics: BodyMetrics | null, frontLandmarks: LandmarkPoint[] | null): UseBodyProgressResult {
  const [scans, setScans] = useState<StoredBodyScan[]>([]);
  const savedForTimestamp = useRef<number | null>(null);

  useEffect(() => {
    if (!metrics) return;
    if (savedForTimestamp.current === metrics.capturedAt) return;
    savedForTimestamp.current = metrics.capturedAt;

    let cancelled = false;
    saveBodyScan(metrics, frontLandmarks)
      .then(() => loadBodyScans())
      .then((all) => {
        if (!cancelled) setScans(all);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [metrics, frontLandmarks]);

  const trend = computeTrend(scans.map((s) => ({ capturedAt: s.capturedAt, value: s.metrics.overallSymmetry })));
  const previousScan = scans.length > 1 ? scans[1] : null;

  return { trend, previousScan, scanCount: scans.length };
}
