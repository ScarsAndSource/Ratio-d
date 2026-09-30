import type { CaptureResult } from "../../types/capture";
import type { BodyCaptureSession } from "../../types/bodyCapture";
import type { FaceReading } from "../face/compute";
import { computeFaceReading } from "../face/compute";
import { computeBodyMetricsFromSession } from "../body/fromSession";
import type { BodyMetrics } from "../../types/bodyMetrics";
import { sanitizeAspect } from "../geometry/space";
import { loadImageData } from "./decode";
import type { Reading } from "./repeatability";

export interface Measured {
  values: Reading;
  frameCount: number;
}

/**
 * Flatten a face reading into numeric columns.
 * `overall:unrounded` is the mean of the sub-scores BEFORE rounding: the app
 * shows (and trends on) the rounded integer, but estimating noise from
 * integers adds quantisation error, so both are logged.
 */
export function faceReadingValues(reading: FaceReading, result: CaptureResult): Reading {
  const { metrics } = reading;
  const values: Reading = {
    overallScore: metrics.overallScore,
    "overall:unrounded": metrics.subScores.reduce((s, x) => s + x.value, 0) / metrics.subScores.length,
    "raw:faceRatio": reading.raw.faceRatio,
    "raw:jawToCheek": reading.raw.jawToCheek,
    brightness: result.avgQuality.brightness,
    sharpness: result.avgQuality.sharpness,
  };
  for (const s of metrics.subScores) values[`score:${s.key}`] = s.value;
  if (result.jitter !== null) values.jitter = result.jitter;
  return values;
}

export function bodyReadingValues(
  metrics: BodyMetrics,
  raw: { forwardHeadOffset: number | null },
  session: BodyCaptureSession
): Reading {
  const values: Reading = { overallSymmetry: metrics.overallSymmetry };
  for (const z of metrics.zones) values[`zone:${z.key}`] = z.value;
  if (raw.forwardHeadOffset !== null) values["raw:forwardHeadOffset"] = raw.forwardHeadOffset;
  for (const c of session.captures) {
    if (c.result.jitter !== null) values[`jitter:${c.angle}`] = c.result.jitter;
  }
  return values;
}

export async function measureFaceCapture(result: CaptureResult): Promise<Measured | null> {
  if (!result.faceLandmarksAveraged || !result.representativeImage) return null;
  const imageData = await loadImageData(result.representativeImage);
  const reading = computeFaceReading(result.faceLandmarksAveraged, sanitizeAspect(result.aspect), imageData);
  if (!reading) return null;
  return { values: faceReadingValues(reading, result), frameCount: result.frameCount };
}

export async function measureBodySession(session: BodyCaptureSession): Promise<Measured | null> {
  const out = computeBodyMetricsFromSession(session, "unsure");
  if ("error" in out) return null;
  return {
    values: bodyReadingValues(out.metrics, out.raw, session),
    frameCount: session.captures.reduce((n, c) => n + c.result.frameCount, 0),
  };
}
