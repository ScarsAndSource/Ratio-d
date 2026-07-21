import type { FaceMetrics } from "../../types/faceMetrics";
import type { BodyMetrics } from "../../types/bodyMetrics";
import type { SynthesisResult } from "../../types/synthesis";

const SYNTHESIS_ENDPOINT =
  import.meta.env.VITE_SYNTHESIS_ENDPOINT ?? "http://localhost:8787";

export async function requestSynthesis(params: {
  faceMetrics?: FaceMetrics;
  bodyMetrics?: BodyMetrics;
}): Promise<SynthesisResult> {
  const res = await fetch(SYNTHESIS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      faceMetrics: params.faceMetrics ?? null,
      bodyMetrics: params.bodyMetrics ?? null,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errBody.error ?? `Synthesis request failed (${res.status})`);
  }

  return (await res.json()) as SynthesisResult;
}
