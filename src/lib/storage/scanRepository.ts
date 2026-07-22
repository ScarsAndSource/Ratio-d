import { supabase } from "../supabase/client";
import type { StoredFaceScan, StoredBodyScan } from "../../types/scanHistory";
import type { FaceMetrics } from "../../types/faceMetrics";
import type { BodyMetrics } from "../../types/bodyMetrics";
import type { LandmarkPoint } from "../../types/landmarks";


function makeId(capturedAt: number): string {
  return `scan_${capturedAt}_${Math.random().toString(36).slice(2, 8)}`;
}


async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}


export async function saveFaceScan(metrics: FaceMetrics, representativeImage: string | null): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;


  const { error } = await supabase.from("face_scans").insert({
    id: makeId(metrics.capturedAt),
    user_id: userId,
    captured_at: metrics.capturedAt,
    metrics,
    representative_image: representativeImage,
  });
  if (error) throw error;
}


export async function saveBodyScan(metrics: BodyMetrics, frontLandmarks: LandmarkPoint[] | null): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;


  const { error } = await supabase.from("body_scans").insert({
    id: makeId(metrics.capturedAt),
    user_id: userId,
    captured_at: metrics.capturedAt,
    metrics,
    front_reference_image: metrics.frontReferenceImage,
    front_landmarks: frontLandmarks,
  });
  if (error) throw error;
}


export async function loadFaceScans(): Promise<StoredFaceScan[]> {
  const userId = await currentUserId();
  if (!userId) return [];


  const { data, error } = await supabase
    .from("face_scans")
    .select("id, captured_at, metrics, representative_image")
    .eq("user_id", userId)
    .order("captured_at", { ascending: false });


  if (error || !data) return [];


  return data.map((row) => ({
    id: row.id,
    capturedAt: row.captured_at,
    metrics: row.metrics as FaceMetrics,
    representativeImage: row.representative_image,
  }));
}


export async function loadBodyScans(): Promise<StoredBodyScan[]> {
  const userId = await currentUserId();
  if (!userId) return [];


  const { data, error } = await supabase
    .from("body_scans")
    .select("id, captured_at, metrics, front_reference_image, front_landmarks")
    .eq("user_id", userId)
    .order("captured_at", { ascending: false });


  if (error || !data) return [];


  return data.map((row) => ({
    id: row.id,
    capturedAt: row.captured_at,
    metrics: row.metrics as BodyMetrics,
    frontReferenceImage: row.front_reference_image,
    frontLandmarks: row.front_landmarks as LandmarkPoint[] | null,
  }));
}
