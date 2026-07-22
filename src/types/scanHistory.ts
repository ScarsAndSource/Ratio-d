import type { FaceMetrics } from "./faceMetrics";
import type { BodyMetrics } from "./bodyMetrics";
import type { LandmarkPoint } from "./landmarks";

export interface StoredFaceScan {
  id: string;
  capturedAt: number;
  metrics: FaceMetrics;
  representativeImage: string | null;
}

export interface StoredBodyScan {
  id: string;
  capturedAt: number;
  metrics: BodyMetrics;
  frontReferenceImage: string | null;
  frontLandmarks: LandmarkPoint[] | null;
}
