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
}

export interface RejectedFrameLog {
  reason: string;
  timestamp: number;
}
