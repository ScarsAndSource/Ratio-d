import { useCallback, useEffect, useState } from "react";
import { loadFaceScans, loadBodyScans } from "../lib/storage/scanRepository";
import type { StoredFaceScan, StoredBodyScan } from "../types/scanHistory";
import { computeCooldown, type CooldownStatus } from "../lib/progress/cooldown";

interface DailyFocus {
  label: string;
  reason: string;
  scanType: "face" | "body";
}

interface UseScanHistoryResult {
  dailyFocus: DailyFocus | null;
  cooldown: CooldownStatus;
  loading: boolean;
  refresh: () => void;
}

export function useScanHistory(): UseScanHistoryResult {
  const [faceScans, setFaceScans] = useState<StoredFaceScan[]>([]);
  const [bodyScans, setBodyScans] = useState<StoredBodyScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadFaceScans(), loadBodyScans()])
      .then(([face, body]) => {
        if (cancelled) return;
        setFaceScans(face);
        setBodyScans(body);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const mostRecentFace = faceScans[0] ?? null;
  const mostRecentBody = bodyScans[0] ?? null;

  let dailyFocus: DailyFocus | null = null;
  if (mostRecentFace && mostRecentBody) {
    dailyFocus =
      mostRecentFace.capturedAt >= mostRecentBody.capturedAt
        ? { label: mostRecentFace.metrics.priorityLever.label, reason: mostRecentFace.metrics.priorityLever.reason, scanType: "face" }
        : { label: mostRecentBody.metrics.priorityLever.label, reason: mostRecentBody.metrics.priorityLever.reason, scanType: "body" };
  } else if (mostRecentFace) {
    dailyFocus = { label: mostRecentFace.metrics.priorityLever.label, reason: mostRecentFace.metrics.priorityLever.reason, scanType: "face" };
  } else if (mostRecentBody) {
    dailyFocus = { label: mostRecentBody.metrics.priorityLever.label, reason: mostRecentBody.metrics.priorityLever.reason, scanType: "body" };
  }

  const lastScanAt = Math.max(mostRecentFace?.capturedAt ?? 0, mostRecentBody?.capturedAt ?? 0) || null;

  return { dailyFocus, cooldown: computeCooldown(lastScanAt), loading, refresh };
}
