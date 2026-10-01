import { useEffect, useRef, useState } from "react";

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  ready: boolean;
  error: string | null;
}

/**
 * Opens the front camera into `videoRef` while `enabled` is true and releases it
 * (camera light off) while it is false. The <video> element must stay mounted
 * across enable/disable so the ref keeps pointing at it.
 */
export function useCamera(enabled: boolean = true): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    let stream: MediaStream | null = null;
    let cancelled = false;

    const stopStream = (s: MediaStream | null) => s?.getTracks().forEach((track) => track.stop());

    async function start() {
      try {
        setError(null);
        const opened = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });
        // Unmounted (or disabled) while the permission prompt was open: release it,
        // otherwise the camera would stay on with nothing using it.
        if (cancelled || !videoRef.current) {
          stopStream(opened);
          return;
        }
        stream = opened;
        videoRef.current.srcObject = opened;
        await videoRef.current.play();
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) setError(describeCameraError(err));
      }
    }

    start();

    return () => {
      cancelled = true;
      stopStream(stream);
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [enabled]);

  return { videoRef, ready, error };
}

function describeCameraError(err: unknown): string {
  if (!(err instanceof Error)) return "Camera access was denied.";
  switch (err.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was denied. Allow camera access in your browser's site settings and reload.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device.";
    case "NotReadableError":
      return "Your camera is already in use by another app or tab. Close it and try again.";
    default:
      return err.message || "Camera access was denied.";
  }
}
