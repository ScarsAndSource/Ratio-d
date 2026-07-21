import { useCallback, useEffect, useRef, useState } from "react";
import { useCamera } from "../hooks/useCamera";
import { useLandmarkStream } from "../hooks/useLandmarkStream";
import { useAutoCapture } from "../hooks/useAutoCapture";
import {
  computeFaceAlignment,
  computeBrightness,
  computeSharpness,
} from "../lib/guidance/alignment";
import ReadingRing from "./ReadingRing";
import CalibrationHarness from "./CalibrationHarness";
import type { QualityReport } from "../types/landmarks";

export default function CaptureStage() {
  const { videoRef, ready, error } = useCamera();
  const { faceLandmarks, poseLandmarks, fps, modelsReady } = useLandmarkStream(
    videoRef,
    ready
  );

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
    const width = 480;
    const height = 360;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, [videoRef]);

  const { phase, acceptedCount, targetFrames, recentRejections, result, reset } =
    useAutoCapture({
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

  const ringProgress =
    phase === "capturing" ? acceptedCount / targetFrames : alignment.progress;

  return (
    <div className="min-h-screen bg-ink text-ink-text flex flex-col items-center justify-center gap-8 px-6">
      <video ref={videoRef} muted playsInline className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={hiResCanvasRef} className="hidden" />

      {error && (
        <p className="text-signal reading text-sm max-w-sm text-center">
          {error} - camera access is required to calibrate.
        </p>
      )}

      {!error && phase !== "complete" && (
        <>
          <ReadingRing progress={ringProgress} label={ringLabel} />
          <p className="text-muted-onink text-sm">
            {!modelsReady
              ? "Warming up the instrument..."
              : phase === "aligning"
              ? "Hold steady until the ring locks."
              : "Stay still - collecting clean frames."}
          </p>
        </>
      )}

      {!error && phase === "complete" && result && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="reading text-reading text-sm tracking-[0.15em]">
            BASELINE SET
          </div>
          {result.representativeImage && (
            <img
              src={result.representativeImage}
              alt="Captured reference frame"
              className="w-40 h-30 object-cover rounded-lg border border-ink-line"
            />
          )}
          <div className="reading text-xs text-muted-onink space-y-1">
            <div>{result.frameCount} frames averaged</div>
            <div>brightness {result.avgQuality.brightness.toFixed(0)}</div>
            <div>sharpness {result.avgQuality.sharpness.toFixed(1)}</div>
          </div>
          <button
            onClick={reset}
            className="reading rounded-full border border-brass-dim px-5 py-2 text-xs tracking-[0.15em] text-brass hover:bg-brass hover:text-ink transition-colors"
          >
            RECALIBRATE
          </button>
        </div>
      )}

      <CalibrationHarness
        alignment={alignment}
        quality={quality}
        fps={fps}
        recentRejections={recentRejections}
      />
    </div>
  );
}
