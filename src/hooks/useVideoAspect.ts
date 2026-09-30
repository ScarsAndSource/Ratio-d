import { useEffect, useState } from "react";
import { REFERENCE_ASPECT, aspectOf } from "../lib/geometry/space";

/**
 * Live width/height of the camera stream. Landmarks are normalised per-axis,
 * so every distance/angle must be measured with this aspect (see
 * lib/geometry/space.ts). Updates on metadata load and on stream resize
 * (device rotation).
 */
export function useVideoAspect(videoRef: React.RefObject<HTMLVideoElement>, ready: boolean): number {
  const [aspect, setAspect] = useState(REFERENCE_ASPECT);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready) return;

    const update = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setAspect(aspectOf(video.videoWidth, video.videoHeight));
      }
    };

    update();
    video.addEventListener("loadedmetadata", update);
    video.addEventListener("resize", update);
    return () => {
      video.removeEventListener("loadedmetadata", update);
      video.removeEventListener("resize", update);
    };
  }, [videoRef, ready]);

  return aspect;
}
