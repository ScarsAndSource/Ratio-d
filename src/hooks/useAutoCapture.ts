import { useCallback, useEffect, useRef, useState } from "react";
import type { AlignmentReading, LandmarkPoint, QualityReport } from "../types/landmarks";
import { evaluateFrame } from "../lib/guidance/qualityGate";
import { averageQuality } from "../lib/guidance/frameAverage";
import {
  DEFAULT_TARGET_FRAMES,
  FACE_KEY_LANDMARKS,
  isFreshSample,
  jitterOf,
  summarizeLandmarks,
  type LastSample,
} from "../lib/guidance/landmarkStats";
import type { AcceptedFrame, CaptureResult, RejectedFrameLog } from "../types/capture";

type CapturePhase = "aligning" | "capturing" | "complete";

interface UseAutoCaptureParams {
  faceLandmarks: LandmarkPoint[] | null;
  poseLandmarks: LandmarkPoint[] | null;
  alignment: AlignmentReading;
  quality: QualityReport;
  grabRepresentativeFrame: () => string | null;
  aspect: number;
  targetFrames?: number;
  lockThreshold?: number;
  lockSustainFrames?: number;
}

const MAX_REJECTION_LOG = 5;

export function useAutoCapture({
  faceLandmarks,
  poseLandmarks,
  alignment,
  quality,
  grabRepresentativeFrame,
  aspect,
  targetFrames = DEFAULT_TARGET_FRAMES,
  lockThreshold = 0.85,
  lockSustainFrames = 5,
}: UseAutoCaptureParams) {
  const [phase, setPhase] = useState<CapturePhase>("aligning");
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [recentRejections, setRecentRejections] = useState<RejectedFrameLog[]>([]);
  const [result, setResult] = useState<CaptureResult | null>(null);

  const consecutiveLock = useRef(0);
  const acceptedFrames = useRef<AcceptedFrame[]>([]);
  const bestSharpness = useRef(0);
  const bestImage = useRef<string | null>(null);
  const lastSample = useRef<LastSample | null>(null);

  const reset = useCallback(() => {
    consecutiveLock.current = 0;
    acceptedFrames.current = [];
    bestSharpness.current = 0;
    bestImage.current = null;
    lastSample.current = null;
    setAcceptedCount(0);
    setRecentRejections([]);
    setResult(null);
    setPhase("aligning");
  }, []);

  useEffect(() => {
    if (phase === "complete") return;

    if (phase === "aligning") {
      if (alignment.progress >= lockThreshold) {
        consecutiveLock.current += 1;
        if (consecutiveLock.current >= lockSustainFrames) {
          consecutiveLock.current = 0;
          setPhase("capturing");
        }
      } else {
        consecutiveLock.current = 0;
      }
      return;
    }

    if (alignment.progress < lockThreshold - 0.2) {
      acceptedFrames.current = [];
      bestSharpness.current = 0;
      bestImage.current = null;
      lastSample.current = null;
      setAcceptedCount(0);
      setPhase("aligning");
      return;
    }

    // Only count genuinely new detections, spaced apart (see isFreshSample).
    const now = Date.now();
    if (!isFreshSample(lastSample.current, faceLandmarks, poseLandmarks, now)) return;

    const evaluation = evaluateFrame({ quality, alignmentProgress: alignment.progress });

    if (!evaluation.accepted) {
      setRecentRejections((prev) =>
        [{ reason: evaluation.reason, timestamp: Date.now() }, ...prev].slice(
          0,
          MAX_REJECTION_LOG
        )
      );
      return;
    }

    // The quality report is up to 200 ms old; never count a frame with no face.
    if (!faceLandmarks) {
      setRecentRejections((prev) =>
        [{ reason: "No face detected", timestamp: now }, ...prev].slice(0, MAX_REJECTION_LOG)
      );
      return;
    }

    lastSample.current = { face: faceLandmarks, pose: poseLandmarks, t: now };
    acceptedFrames.current.push({
      faceLandmarks,
      poseLandmarks,
      quality,
      timestamp: Date.now(),
    });

    if (quality.sharpness > bestSharpness.current) {
      bestSharpness.current = quality.sharpness;
      bestImage.current = grabRepresentativeFrame();
    }

    setAcceptedCount(acceptedFrames.current.length);

    if (acceptedFrames.current.length >= targetFrames) {
      const faceSets = acceptedFrames.current
        .map((f) => f.faceLandmarks)
        .filter((f): f is LandmarkPoint[] => f !== null);
      const poseSets = acceptedFrames.current
        .map((f) => f.poseLandmarks)
        .filter((f): f is LandmarkPoint[] => f !== null);

      const faceSummary = summarizeLandmarks(faceSets, aspect);
      const poseSummary = summarizeLandmarks(poseSets, aspect);

      setResult({
        faceLandmarksAveraged: faceSummary?.landmarks ?? null,
        poseLandmarksAveraged: poseSummary?.landmarks ?? null,
        faceLandmarkSd: faceSummary?.sd ?? null,
        poseLandmarkSd: poseSummary?.sd ?? null,
        jitter: faceSummary ? jitterOf(faceSummary, FACE_KEY_LANDMARKS) : null,
        representativeImage: bestImage.current,
        frameCount: acceptedFrames.current.length,
        avgQuality: averageQuality(acceptedFrames.current.map((f) => f.quality)),
        capturedAt: Date.now(),
        aspect,
      });
      setPhase("complete");
    }
  }, [faceLandmarks, poseLandmarks, quality, alignment.progress, phase]);

  return { phase, acceptedCount, targetFrames, recentRejections, result, reset };
}
