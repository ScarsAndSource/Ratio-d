import type { FaceLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;
let poseLandmarkerPromise: Promise<PoseLandmarker> | null = null;

// Dynamic import: @mediapipe/tasks-vision is ~500KB and is only ever needed
// once a user reaches the capture screen (after auth + consent). Splitting
// it into its own chunk keeps the initial app load (login/consent) fast.
async function getVisionModule() {
  return import("@mediapipe/tasks-vision");
}

export function loadFaceLandmarker(): Promise<FaceLandmarker> {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = getVisionModule().then(
      async ({ FilesetResolver, FaceLandmarker }) => {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        return FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
      }
    );
  }
  return faceLandmarkerPromise;
}

export function loadPoseLandmarker(): Promise<PoseLandmarker> {
  if (!poseLandmarkerPromise) {
    poseLandmarkerPromise = getVisionModule().then(
      async ({ FilesetResolver, PoseLandmarker }) => {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        return PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
      }
    );
  }
  return poseLandmarkerPromise;
}
