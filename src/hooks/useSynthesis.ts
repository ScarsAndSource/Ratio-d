import { useEffect, useState } from "react";
import type { FaceMetrics } from "../types/faceMetrics";
import type { BodyMetrics } from "../types/bodyMetrics";
import type { SynthesisResult } from "../types/synthesis";
import { requestSynthesis } from "../lib/synthesis/client";

interface UseSynthesisResult {
  synthesis: SynthesisResult | null;
  loading: boolean;
  error: string | null;
}

export function useSynthesis(
  faceMetrics: FaceMetrics | null,
  bodyMetrics: BodyMetrics | null
): UseSynthesisResult {
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!faceMetrics && !bodyMetrics) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    requestSynthesis({
      faceMetrics: faceMetrics ?? undefined,
      bodyMetrics: bodyMetrics ?? undefined,
    })
      .then((result) => {
        if (!cancelled) setSynthesis(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not reach the synthesis service.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [faceMetrics, bodyMetrics]);

  return { synthesis, loading, error };
}
