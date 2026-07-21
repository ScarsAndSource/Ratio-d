import { useCallback, useEffect, useRef, useState } from "react";
import { useCamera } from "../hooks/useCamera";
import { useLandmarkStream } from "../hooks/useLandmarkStream";
import { useMultiAngleCapture } from "../hooks/useMultiAngleCapture";
import { computeBrightness, computeSharpness } from "../lib/guidance/alignment";
import { BODY_ANGLE_SEQUENCE, BODY_ANGLE_LABEL } from "../types/bodyCapture";
import type { TrainingAge } from "../types/bodyMetrics";
import ReadingRing from "./ReadingRing";
import BodyCalibrationHarness from "./BodyCalibrationHarness";
import TrainingAgeSelect from "./TrainingAgeSelect";
import BodyResultsScreen from "./BodyResultsScreen";
import type { QualityReport } from "../types/landmarks";

export default function BodyCaptureFlow() {
  const { videoRef, ready, error } = useCamera();
  const { faceLandmarks, poseLandmarks, fps, modelsReady } = useLandmarkStream(videoRef, ready);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiResCanvasRef = useRef<HTMLCanvasElement>(null);

  const [quality, setQuality] = useState<QualityReport>({
    brightness: 0,
    sharpness: 0,
    faceDetected: false,
    poseDetected: false,
  });
  const [trainingAge, setTrainingAge] = useState<TrainingAge>("unsure");

  useEffect(() => {
    if (!ready || !modelsReady) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const width = 160;
    const height = 120;
    canvas.width = width;
    canvas.height = height;

    const interval = setInterval(() => {
      if (video.readyState < 2) return;
      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      setQuality({
        brightness: computeBrightness(imageData),
        sharpness: computeSharpness(imageData, width),
        faceDetected: faceLandmarks !== null,
        poseDetected: poseLandmarks !== null,
      });
    }, 200);

    return () => clearInterval(interval);
  }, [ready, modelsReady, faceLandmarks, poseLandmarks, videoRef]);

  const grabRepresentativeFrame = useCallback((): string | null => {
    const canvas = hiResCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return null;
    canvas.width = 480;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, 480, 640);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, [videoRef]);

  const { currentAngle, angleIndex, alignment, phase, acceptedCount, targetFrames, recentRejections, session, resetSession } =
    useMultiAngleCapture({
      poseLandmarks,
      faceDetected: faceLandmarks !== null,
      quality,
      grabRepresentativeFrame,
    });

  const ringLabel = !modelsReady
    ? "LOADING"
    : phase === "aligning"
    ? alignment.guidance.toUpperCase()
    : phase === "capturing"
    ? `${acceptedCount}/${targetFrames}`
    : phase === "angleComplete"
    ? "LOCKED"
    : "DONE";

  const ringProgress = phase === "capturing" ? acceptedCount / targetFrames : alignment.progress;

  if (!error && phase === "sessionComplete" && session) {
    return <BodyResultsScreen session={session} trainingAge={trainingAge} onRecalibrate={resetSession} />;
  }

  return (
    <div className="min-h-screen bg-ink text-ink-text flex flex-col items-center justify-center gap-8 px-6">
      <video ref={videoRef} muted playsInline className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={hiResCanvasRef} className="hidden" />

      {error && (
        <p className="text-signal reading text-sm max-w-sm text-center">
          {error} - camera access is required to scan.
        </p>
      )}

      {!error && (
        <>
          <div className="reading text-brass-dim text-xs tracking-[0.15em]">
            ANGLE {angleIndex + 1}/{BODY_ANGLE_SEQUENCE.length} - {BODY_ANGLE_LABEL[currentAngle].toUpperCase()}
          </div>
          <ReadingRing progress={ringProgress} label={ringLabel} />
          <p className="text-muted-onink text-sm text-center max-w-sm">
            {!modelsReady
              ? "Warming up the instrument..."
              : phase === "aligning"
              ? "Step back so your whole body is in frame - about 2-3 minutes for all four angles."
              : phase === "capturing"
              ? "Stay still - collecting clean frames."
              : "Angle locked. Moving to the next one."}
          </p>

          <div className="w-full max-w-xs">
            <TrainingAgeSelect value={trainingAge} onChange={setTrainingAge} />
          </div>
        </>
      )}

      <BodyCalibrationHarness alignment={alignment} quality={quality} fps={fps} recentRejections={recentRejections} />
    </div>
  );
}
