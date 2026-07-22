import type { FaceMetrics } from "../../types/faceMetrics";
import type { BodyMetrics } from "../../types/bodyMetrics";
import type { SynthesisResult } from "../../types/synthesis";
import { supabase } from "../supabase/client";


const SYNTHESIS_ENDPOINT = import.meta.env.VITE_SYNTHESIS_ENDPOINT ?? "http://localhost:8787";


export async function requestSynthesis(params: {
  faceMetrics?: FaceMetrics;
  bodyMetrics?: BodyMetrics;
}): Promise<SynthesisResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to get a narrated read.");


  const res = await fetch(SYNTHESIS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
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
