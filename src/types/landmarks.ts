export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export interface AlignmentReading {
  centeredness: number;
  distanceFit: number;
  levelness: number;
  progress: number;
  guidance: string;
  raw: {
    offsetX: number;
    offsetY: number;
    interocular: number;
    tiltDeg: number;
  };
}

export interface QualityReport {
  brightness: number;
  sharpness: number;
  faceDetected: boolean;
  poseDetected: boolean;
}
