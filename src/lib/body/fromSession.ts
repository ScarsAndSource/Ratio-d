import type { BodyCaptureSession } from "../../types/bodyCapture";
import type { BodyMetrics, TrainingAge } from "../../types/bodyMetrics";
import {
  computeShoulderHipRatio,
  computeLimbSymmetry,
  computePostureTilt,
  computeForwardHead,
  measureForwardHeadOffset,
} from "./geometry";
import { buildBodyMetrics } from "./score";
import { sanitizeAspect } from "../geometry/space";

export const UNREADABLE_FRONT =
  "Could not read enough of the front angle to score this scan. Try recalibrating with more even lighting.";

export type BodyFromSession =
  | { metrics: BodyMetrics; raw: { forwardHeadOffset: number | null } }
  | { error: string };

/**
 * All body metrics from a finished capture session. Shared by the results screen
 * and the repeatability harness. Needs a reliable front capture; the side
 * capture only adds the forward-head zone.
 */
export function computeBodyMetricsFromSession(session: BodyCaptureSession, trainingAge: TrainingAge): BodyFromSession {
  const frontCapture = session.captures.find((c) => c.angle === "front")?.result;
  const sideCapture = session.captures.find((c) => c.angle === "side")?.result;
  const front = frontCapture?.poseLandmarksAveraged;
  const side = sideCapture?.poseLandmarksAveraged;
  if (!front) return { error: UNREADABLE_FRONT };

  const frontAspect = sanitizeAspect(frontCapture?.aspect);
  const sideAspect = sanitizeAspect(sideCapture?.aspect);

  const shoulderHip = computeShoulderHipRatio(front, frontAspect);
  const posture = computePostureTilt(front, frontAspect);
  const symmetry = computeLimbSymmetry(front, frontAspect);
  const forwardHead = side ? computeForwardHead(side, sideAspect) : null;
  if (!shoulderHip || !posture) return { error: UNREADABLE_FRONT };

  const zones = [shoulderHip, posture, ...symmetry, ...(forwardHead ? [forwardHead] : [])];
  return {
    metrics: buildBodyMetrics({
      zones,
      trainingAge,
      frontReferenceImage: frontCapture?.representativeImage ?? null,
    }),
    raw: { forwardHeadOffset: side ? measureForwardHeadOffset(side, sideAspect) : null },
  };
}
