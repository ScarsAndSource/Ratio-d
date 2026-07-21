import type { CaptureResult } from "./capture";

export type BodyAngle = "front" | "side" | "back" | "threeQuarter";

export const BODY_ANGLE_SEQUENCE: BodyAngle[] = ["front", "side", "back", "threeQuarter"];

export const BODY_ANGLE_LABEL: Record<BodyAngle, string> = {
  front: "Front",
  side: "Side",
  back: "Back",
  threeQuarter: "Three-quarter",
};

export interface BodyAlignmentReading {
  centeredness: number;
  distanceFit: number;
  angleMatch: number;
  progress: number;
  guidance: string;
  raw: {
    offsetX: number;
    shoulderSpan: number;
    hipOffsetX: number;
    faceDetected: boolean;
  };
}

export interface AngleCapture {
  angle: BodyAngle;
  result: CaptureResult;
}

export interface BodyCaptureSession {
  captures: AngleCapture[];
  completedAt: number;
}
