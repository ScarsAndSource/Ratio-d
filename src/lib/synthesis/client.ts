import type { FaceMetrics } from "../../types/faceMetrics";
import type { BodyMetrics } from "../../types/bodyMetrics";
import type { SynthesisRequest, SynthesisResult } from "../../types/synthesis";
import { toSynthesisBody, toSynthesisFace } from "./payload";
import { supabase } from "../supabase/client";


const SYNTHESIS_ENDPOINT = import.meta.env.VITE_SYNTHESIS_ENDPOINT ?? "http://localhost:8787";
const REQUEST_TIMEOUT_MS = 15_000;


async function postSynthesis(token: string, body: SynthesisRequest): Promise<SynthesisResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);


  try {
    const res = await fetch(SYNTHESIS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });


    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errBody.error ?? `Synthesis request failed (${res.status})`);
    }


    return (await res.json()) as SynthesisResult;
  } finally {
    clearTimeout(timeout);
  }
}


export async function requestSynthesis(params: {
  faceMetrics?: FaceMetrics;
  bodyMetrics?: BodyMetrics;
}): Promise<SynthesisResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to get a narrated read.");


  // Whitelisted, photo-free payload (see payload.ts): never send the raw metrics objects.
  const body: SynthesisRequest = {
    faceMetrics: params.faceMetrics ? toSynthesisFace(params.faceMetrics) : null,
    bodyMetrics: params.bodyMetrics ? toSynthesisBody(params.bodyMetrics) : null,
  };


  try {
    return await postSynthesis(token, body);
  } catch (err) {
    // One silent retry for transient failures only: a timeout (AbortError)
    // or a network-level failure (TypeError from fetch itself). A real
    // 4xx/5xx from the worker already threw a descriptive Error above and
    // is not retried, since retrying won't change a server-side rejection.
    const isTransient =
      err instanceof DOMException && err.name === "AbortError"
        ? true
        : err instanceof TypeError;
    if (!isTransient) throw err;
    try {
      return await postSynthesis(token, body);
    } catch {
      throw new Error("Could not reach the synthesis service. Please try again.");
    }
  }
}
