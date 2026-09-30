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
}

export interface RejectedFrameLog {
  reason: string;
  timestamp: number;
}
