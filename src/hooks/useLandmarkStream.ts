import { useEffect, useRef, useState } from "react";
import { loadFaceLandmarker, loadPoseLandmarker } from "../lib/mediapipe/setup";
import type { HeadPose, LandmarkPoint } from "../types/landmarks";
import { headPoseFromMatrix } from "../lib/face/headPose";

interface LandmarkStreamResult {
  faceLandmarks: LandmarkPoint[] | null;
  poseLandmarks: LandmarkPoint[] | null;
  headPose: HeadPose | null;
  fps: number;
  modelsReady: boolean;
}

export function useLandmarkStream(
  videoRef: React.RefObject<HTMLVideoElement>,
  active: boolean
): LandmarkStreamResult {
  const [faceLandmarks, setFaceLandmarks] = useState<LandmarkPoint[] | null>(null);
  const [poseLandmarks, setPoseLandmarks] = useState<LandmarkPoint[] | null>(null);
  const [headPose, setHeadPose] = useState<HeadPose | null>(null);
  const [fps, setFps] = useState(0);
  const [modelsReady, setModelsReady] = useState(false);

  const rafId = useRef<number>();
  const lastFrameTime = useRef(performance.now());
  const lastVideoTime = useRef(-1);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let face: Awaited<ReturnType<typeof loadFaceLandmarker>>;
    let pose: Awaited<ReturnType<typeof loadPoseLandmarker>>;

    async function init() {
      [face, pose] = await Promise.all([loadFaceLandmarker(), loadPoseLandmarker()]);
      if (cancelled) return;
      setModelsReady(true);
      loop();
    }

    function loop() {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafId.current = requestAnimationFrame(loop);
        return;
      }

      // rAF runs at display rate (60+ Hz) but the camera delivers ~30 fps. Running
      // the models on an unchanged frame just re-counts the same observation,
      // so skip until the video actually advances.
      if (video.currentTime === lastVideoTime.current) {
        rafId.current = requestAnimationFrame(loop);
        return;
      }
      lastVideoTime.current = video.currentTime;

      const now = performance.now();
      const faceResult = face.detectForVideo(video, now);
      const poseResult = pose.detectForVideo(video, now);

      setFaceLandmarks(
        faceResult.faceLandmarks?.[0]
          ? faceResult.faceLandmarks[0].map((p) => ({ x: p.x, y: p.y, z: p.z }))
          : null
      );
      setPoseLandmarks(
        poseResult.landmarks?.[0]
          ? poseResult.landmarks[0].map((p) => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility }))
          : null
      );
      setHeadPose(headPoseFromMatrix(faceResult.facialTransformationMatrixes?.[0]?.data));

      const delta = now - lastFrameTime.current;
      lastFrameTime.current = now;
      setFps(delta > 0 ? Math.round(1000 / delta) : 0);

      rafId.current = requestAnimationFrame(loop);
    }

    init();

    return () => {
      cancelled = true;
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [active, videoRef]);

  return { faceLandmarks, poseLandmarks, headPose, fps, modelsReady };
}
