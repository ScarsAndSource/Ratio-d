export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  /**
   * Pose landmarks only: model confidence in [0,1] that the joint is actually
   * visible. Pose returns all 33 points even for off-frame / occluded joints,
   * so a point without enough visibility is a guess, not a measurement.
   */
  visibility?: number;
}

/** Head orientation relative to the camera, in degrees. */
export interface HeadPose {
  yawDeg: number;
  pitchDeg: number;
  rollDeg: number;
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
  /** Face captures only. Undefined = pose not available this frame. */
  headPose?: HeadPose | null;
}
