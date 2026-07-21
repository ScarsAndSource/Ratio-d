import { useEffect, useRef, useState } from "react";
import { useCamera } from "../hooks/useCamera";
import { useLandmarkStream } from "../hooks/useLandmarkStream";
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

  return (
    <div className="min-h-screen bg-ink text-ink-text flex flex-col items-center justify-center gap-8 px-6">
      <video ref={videoRef} muted playsInline className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <p className="text-signal reading text-sm max-w-sm text-center">
          {error} - camera access is required to calibrate.
        </p>
      )}

      {!error && (
        <>
          <ReadingRing
            progress={alignment.progress}
            label={modelsReady ? alignment.guidance.toUpperCase() : "LOADING"}
          />
          <p className="text-muted-onink text-sm">
            {modelsReady
              ? "Hold steady until the ring locks."
              : "Warming up the instrument..."}
          </p>
        </>
      )}

      <CalibrationHarness alignment={alignment} quality={quality} fps={fps} />
    </div>
  );
}
