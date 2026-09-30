import type { LandmarkPoint, QualityReport } from "./landmarks";

export interface AcceptedFrame {
  faceLandmarks: LandmarkPoint[] | null;
  poseLandmarks: LandmarkPoint[] | null;
  quality: QualityReport;
  timestamp: number;
}

export interface CaptureResult {
  /** Per-coordinate MEDIAN over the accepted frames (name kept for compatibility; it is no longer a mean). */
  faceLandmarksAveraged: LandmarkPoint[] | null;
  /** Per-coordinate MEDIAN over the accepted frames (see faceLandmarksAveraged). */
  poseLandmarksAveraged: LandmarkPoint[] | null;
  /** Per-landmark positional SD over the accepted frames, frame-height units; same indexing as the landmarks above. */
  faceLandmarkSd: number[] | null;
  poseLandmarkSd: number[] | null;
  /** Median SD over the key landmarks - one "how still was the subject" number. null if nothing reliable. */
  jitter: number | null;
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
