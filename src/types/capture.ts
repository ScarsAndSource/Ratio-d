import type { LandmarkPoint, QualityReport } from "./landmarks";

export interface AcceptedFrame {
  faceLandmarks: LandmarkPoint[] | null;
  poseLandmarks: LandmarkPoint[] | null;
  quality: QualityReport;
  timestamp: number;
}

export interface CaptureResult {
  faceLandmarksAveraged: LandmarkPoint[] | null;
  poseLandmarksAveraged: LandmarkPoint[] | null;
  representativeImage: string | null;
  frameCount: number;
  avgQuality: QualityReport;
  capturedAt: number;
  /** width / height of the video frame the landmarks were measured in. */
  aspect: number;
  /** Median per-landmark SD across accepted frames, in frame-heights. Capture-time noise floor. */
  landmarkJitterSd?: number | null;
  /** Wall-clock span (ms) between first and last accepted frame. */
  captureSpanMs?: number;
}

export interface RejectedFrameLog {
  reason: string;
  timestamp: number;
}
