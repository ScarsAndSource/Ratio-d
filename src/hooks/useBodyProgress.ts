import { useEffect, useRef, useState } from "react";
import type { BodyMetrics } from "../types/bodyMetrics";
import type { LandmarkPoint } from "../types/landmarks";
import type { StoredBodyScan } from "../types/scanHistory";
import { saveBodyScan, loadBodyScans } from "../lib/storage/scanRepository";
import { computeTrend, type TrendResult } from "../lib/progress/trend";
import { mdcFor } from "../lib/progress/thresholds";

interface UseBodyProgressResult {
  trend: TrendResult;
  previousScan: StoredBodyScan | null;
  scanCount: number;
  /** Set when the scan could not be saved to the account. */
  saveError: string | null;
}

export function useBodyProgress(metrics: BodyMetrics | null, frontLandmarks: LandmarkPoint[] | null): UseBodyProgressResult {
  const [scans, setScans] = useState<StoredBodyScan[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedForTimestamp = useRef<number | null>(null);

  // Tracks real unmounting only (see useFaceProgress for why not a per-effect flag).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!metrics) return;
    if (savedForTimestamp.current === metrics.capturedAt) return;
    savedForTimestamp.current = metrics.capturedAt;

    saveBodyScan(metrics, frontLandmarks)
      .then(() => loadBodyScans())
      .then((all) => {
        if (mounted.current) setScans(all);
      })
      .catch((err: unknown) => {
        console.error("Could not save body scan:", err);
        if (mounted.current) {
          setSaveError("This scan could not be saved to your account, so it won't appear in your history or trend.");
        }
      });
  }, [metrics, frontLandmarks]);

  const trend = computeTrend(
    scans.map((s) => ({ capturedAt: s.capturedAt, value: s.metrics.overallSymmetry })),
    mdcFor("score.overallSymmetry")
  );
  const previousScan = scans.length > 1 ? scans[1] ?? null : null;

  return { trend, previousScan, scanCount: scans.length, saveError };
}
