import { useEffect, useRef, useState } from "react";
import type { FaceMetrics } from "../types/faceMetrics";
import type { StoredFaceScan } from "../types/scanHistory";
import { saveFaceScan, loadFaceScans } from "../lib/storage/scanRepository";
import { computeTrend, type TrendResult } from "../lib/progress/trend";
import { mdcFor } from "../lib/progress/thresholds";

interface UseFaceProgressResult {
  trend: TrendResult;
  scanCount: number;
  /** Set when the scan could not be saved to the account. */
  saveError: string | null;
}

export function useFaceProgress(metrics: FaceMetrics | null, representativeImage: string | null): UseFaceProgressResult {
  const [scans, setScans] = useState<StoredFaceScan[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedForTimestamp = useRef<number | null>(null);

  // Tracks real unmounting only. (A per-effect "cancelled" flag would drop the
  // result under React StrictMode, where the effect is cleaned up and re-run
  // but the save-once guard below stops the second run from saving again.)
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

    saveFaceScan(metrics, representativeImage)
      .then(() => loadFaceScans())
      .then((all) => {
        if (mounted.current) setScans(all);
      })
      .catch((err: unknown) => {
        console.error("Could not save face scan:", err);
        if (mounted.current) {
          setSaveError("This scan could not be saved to your account, so it won't appear in your history or trend.");
        }
      });
  }, [metrics, representativeImage]);

  const trend = computeTrend(
    scans.map((s) => ({ capturedAt: s.capturedAt, value: s.metrics.overallScore })),
    mdcFor("score.overall")
  );

  return { trend, scanCount: scans.length, saveError };
}
