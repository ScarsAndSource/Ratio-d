import { putRecord, getAllRecords, FACE_STORE, BODY_STORE } from "./db";
import type { StoredFaceScan, StoredBodyScan } from "../../types/scanHistory";
import type { FaceMetrics } from "../../types/faceMetrics";
import type { BodyMetrics } from "../../types/bodyMetrics";
import type { LandmarkPoint } from "../../types/landmarks";

function makeId(capturedAt: number): string {
  return `scan_${capturedAt}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveFaceScan(metrics: FaceMetrics, representativeImage: string | null): Promise<void> {
  const record: StoredFaceScan = {
    id: makeId(metrics.capturedAt),
    capturedAt: metrics.capturedAt,
    metrics,
    representativeImage,
  };
  await putRecord(FACE_STORE, record);
}

export async function saveBodyScan(metrics: BodyMetrics, frontLandmarks: LandmarkPoint[] | null): Promise<void> {
  const record: StoredBodyScan = {
    id: makeId(metrics.capturedAt),
    capturedAt: metrics.capturedAt,
    metrics,
    frontReferenceImage: metrics.frontReferenceImage,
    frontLandmarks,
  };
  await putRecord(BODY_STORE, record);
}

export async function loadFaceScans(): Promise<StoredFaceScan[]> {
  const records = await getAllRecords<StoredFaceScan>(FACE_STORE);
  return records.sort((a, b) => b.capturedAt - a.capturedAt);
}

export async function loadBodyScans(): Promise<StoredBodyScan[]> {
  const records = await getAllRecords<StoredBodyScan>(BODY_STORE);
  return records.sort((a, b) => b.capturedAt - a.capturedAt);
}
