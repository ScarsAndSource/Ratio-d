import { useCallback, useEffect, useRef, useState } from "react";
import { useCamera } from "../hooks/useCamera";
import { useLandmarkStream } from "../hooks/useLandmarkStream";
import { useAutoCapture } from "../hooks/useAutoCapture";
import { computeFaceAlignment, computeBrightness, computeSharpness } from "../lib/guidance/alignment";
import ReadingRing from "./ReadingRing";
import CalibrationHarness from "./CalibrationHarness";
import FaceResultsScreen from "./FaceResultsScreen";
import type { QualityReport } from "../types/landmarks";

export default function CaptureStage() {
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

  const alignment = computeFaceAlignment(faceLandmarks);

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
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, 480, 360);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, [videoRef]);

  const { phase, acceptedCount, targetFrames, recentRejections, result, reset } = useAutoCapture({
    faceLandmarks,
    poseLandmarks,
    alignment,
    quality,
    grabRepresentativeFrame,
  });

  const ringLabel = !modelsReady
    ? "LOADING"
    : phase === "aligning"
    ? alignment.guidance.toUpperCase()
    : phase === "capturing"
    ? `${acceptedCount}/${targetFrames}`
    : "DONE";

  const ringProgress = phase === "capturing" ? acceptedCount / targetFrames : alignment.progress;

  if (!error && phase === "complete" && result) {
    return <FaceResultsScreen result={result} onRecalibrate={reset} />;
  }

  return (
    <div className="min-h-screen bg-ink text-ink-text flex flex-col items-center justify-center gap-8 px-6">
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={hiResCanvasRef} className="hidden" />

      {error && (
        <p className="text-signal reading text-sm max-w-sm text-center">
          {error} - camera access is required to calibrate.
        </p>
      )}

      {!error && (
        <>
          <div className="relative w-[420px] max-w-full aspect-[3/4] rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="border-2 border-dashed border-reading/70 rounded-full"
                style={{ width: "55%", height: "72%" }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <ReadingRing progress={ringProgress} label={ringLabel} size={220} />
            </div>
          </div>

          <p className="text-muted-onink text-sm">
            {!modelsReady
              ? "Warming up the instrument..."
              : phase === "aligning"
              ? "Hold steady until the ring locks."
              : "Stay still - collecting clean frames."}
          </p>
        </>
      )}

      <CalibrationHarness alignment={alignment} quality={quality} fps={fps} recentRejections={recentRejections} />
    </div>
  );
}
