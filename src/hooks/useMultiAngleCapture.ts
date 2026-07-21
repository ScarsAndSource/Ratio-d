import { useCallback, useEffect, useRef, useState } from "react";
import type { LandmarkPoint, QualityReport } from "../types/landmarks";
import { BODY_ANGLE_SEQUENCE, type AngleCapture, type BodyCaptureSession } from "../types/bodyCapture";
import { computeBodyAlignment } from "../lib/guidance/bodyAlignment";
import { evaluateBodyFrame } from "../lib/guidance/bodyQualityGate";
import { averageLandmarks, averageQuality } from "../lib/guidance/frameAverage";
import type { RejectedFrameLog } from "../types/capture";

type CapturePhase = "aligning" | "capturing" | "angleComplete" | "sessionComplete";

interface UseMultiAngleCaptureParams {
  poseLandmarks: LandmarkPoint[] | null;
  faceDetected: boolean;
  quality: QualityReport;
  grabRepresentativeFrame: () => string | null;
  targetFrames?: number;
  lockThreshold?: number;
  lockSustainFrames?: number;
}

const MAX_REJECTION_LOG = 5;

export function useMultiAngleCapture({
  poseLandmarks,
  faceDetected,
  quality,
  grabRepresentativeFrame,
  targetFrames = 8,
  lockThreshold = 0.85,
  lockSustainFrames = 5,
}: UseMultiAngleCaptureParams) {
  const [angleIndex, setAngleIndex] = useState(0);
  const [phase, setPhase] = useState<CapturePhase>("aligning");
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [recentRejections, setRecentRejections] = useState<RejectedFrameLog[]>([]);
  const [session, setSession] = useState<BodyCaptureSession | null>(null);

  const consecutiveLock = useRef(0);
  const acceptedPoseFrames = useRef<LandmarkPoint[][]>([]);
  const acceptedQuality = useRef<QualityReport[]>([]);
  const bestSharpness = useRef(0);
  const bestImage = useRef<string | null>(null);
  const capturesSoFar = useRef<AngleCapture[]>([]);

  const currentAngle = BODY_ANGLE_SEQUENCE[angleIndex] ?? "front";
  const alignment = computeBodyAlignment(poseLandmarks, faceDetected, currentAngle);

  const resetAngleState = useCallback(() => {
    consecutiveLock.current = 0;
    acceptedPoseFrames.current = [];
    acceptedQuality.current = [];
    bestSharpness.current = 0;
    bestImage.current = null;
    setAcceptedCount(0);
    setRecentRejections([]);
  }, []);

  const resetSession = useCallback(() => {
    capturesSoFar.current = [];
    setAngleIndex(0);
    setSession(null);
    resetAngleState();
    setPhase("aligning");
  }, [resetAngleState]);

  useEffect(() => {
    if (phase === "sessionComplete" || phase === "angleComplete") return;

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
      resetAngleState();
      setPhase("aligning");
      return;
    }

    const evaluation = evaluateBodyFrame({
      quality,
      alignmentProgress: alignment.progress,
      angleMatch: alignment.angleMatch,
    });

    if (!evaluation.accepted) {
      setRecentRejections((prev) =>
        [{ reason: evaluation.reason, timestamp: Date.now() }, ...prev].slice(0, MAX_REJECTION_LOG)
      );
      return;
    }

    if (poseLandmarks) acceptedPoseFrames.current.push(poseLandmarks);
    acceptedQuality.current.push(quality);

    if (quality.sharpness > bestSharpness.current) {
      bestSharpness.current = quality.sharpness;
      bestImage.current = grabRepresentativeFrame();
    }

    setAcceptedCount(acceptedPoseFrames.current.length);

    if (acceptedPoseFrames.current.length >= targetFrames) {
      const angleCapture: AngleCapture = {
        angle: currentAngle,
        result: {
          faceLandmarksAveraged: null,
          poseLandmarksAveraged: averageLandmarks(acceptedPoseFrames.current),
          representativeImage: bestImage.current,
          frameCount: acceptedPoseFrames.current.length,
          avgQuality: averageQuality(acceptedQuality.current),
          capturedAt: Date.now(),
        },
      };
      capturesSoFar.current = [...capturesSoFar.current, angleCapture];

      if (angleIndex >= BODY_ANGLE_SEQUENCE.length - 1) {
        setSession({ captures: capturesSoFar.current, completedAt: Date.now() });
        setPhase("sessionComplete");
      } else {
        setPhase("angleComplete");
      }
    }
  }, [poseLandmarks, quality, alignment, phase, currentAngle, angleIndex]);

  useEffect(() => {
    if (phase !== "angleComplete") return;
    const timeout = setTimeout(() => {
      resetAngleState();
      setAngleIndex((i) => i + 1);
      setPhase("aligning");
    }, 900);
    return () => clearTimeout(timeout);
  }, [phase, resetAngleState]);

  return {
    currentAngle,
    angleIndex,
    alignment,
    phase,
    acceptedCount,
    targetFrames,
    recentRejections,
    session,
    resetSession,
  };
}
