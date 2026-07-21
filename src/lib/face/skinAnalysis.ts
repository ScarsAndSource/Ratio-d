import type { LandmarkPoint } from "../../types/landmarks";
import type { SubScore, UndertoneReading } from "../../types/faceMetrics";

const UNDER_EYE_L = 230;
const UNDER_EYE_R = 450;
const CHEEK_L = 50;
const CHEEK_R = 280;

interface RGB {
  r: number;
  g: number;
  b: number;
}

function sampleRegion(imageData: ImageData, point: LandmarkPoint, boxSize = 8): RGB {
  const { width, height, data } = imageData;
  const cx = Math.round(point.x * width);
  const cy = Math.round(point.y * height);
  let r = 0, g = 0, b = 0, count = 0;

  for (let y = cy - boxSize; y <= cy + boxSize; y++) {
    for (let x = cx - boxSize; x <= cx + boxSize; x++) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const idx = (y * width + x) * 4;
      r += data[idx];
      g += data[idx + 1];
      b += data[idx + 2];
      count++;
    }
  }
  if (count === 0) return { r: 0, g: 0, b: 0 };
  return { r: r / count, g: g / count, b: b / count };
}

function luminance({ r, g, b }: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function variance(imageData: ImageData, point: LandmarkPoint, boxSize = 10): number {
  const { width, height, data } = imageData;
  const cx = Math.round(point.x * width);
  const cy = Math.round(point.y * height);
  const lums: number[] = [];

  for (let y = cy - boxSize; y <= cy + boxSize; y++) {
    for (let x = cx - boxSize; x <= cx + boxSize; x++) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const idx = (y * width + x) * 4;
      lums.push(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    }
  }
  if (lums.length === 0) return 0;
  const mean = lums.reduce((s, l) => s + l, 0) / lums.length;
  return lums.reduce((s, l) => s + (l - mean) ** 2, 0) / lums.length;
}

function averageRGB(a: RGB, b: RGB): RGB {
  return { r: (a.r + b.r) / 2, g: (a.g + b.g) / 2, b: (a.b + b.b) / 2 };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

export interface SkinAnalysisResult {
  darkCircle: SubScore;
  pores: SubScore;
  undertone: UndertoneReading;
}

export function analyzeSkin(imageData: ImageData, landmarks: LandmarkPoint[]): SkinAnalysisResult | null {
  const underEyeL = landmarks[UNDER_EYE_L];
  const underEyeR = landmarks[UNDER_EYE_R];
  const cheekL = landmarks[CHEEK_L];
  const cheekR = landmarks[CHEEK_R];
  if (!underEyeL || !underEyeR || !cheekL || !cheekR) return null;

  const underEyeColor = averageRGB(sampleRegion(imageData, underEyeL), sampleRegion(imageData, underEyeR));
  const cheekColor = averageRGB(sampleRegion(imageData, cheekL), sampleRegion(imageData, cheekR));

  const underEyeLum = luminance(underEyeColor);
  const cheekLum = luminance(cheekColor);
  const relativeDrop = clamp01((cheekLum - underEyeLum) / Math.max(cheekLum, 1));
  const darkCircleValue = clamp(100 - relativeDrop * 220, 0, 100);

  const avgVariance = (variance(imageData, cheekL) + variance(imageData, cheekR)) / 2;
  const poresValue = clamp(100 - avgVariance / 4, 0, 100);

  return {
    darkCircle: { key: "darkCircle", label: "Under-eye evenness", value: darkCircleValue, actionable: true },
    pores: { key: "pores", label: "Skin texture", value: poresValue, actionable: true },
    undertone: classifyUndertone(cheekColor),
  };
}

function classifyUndertone(color: RGB): UndertoneReading {
  const warmth = color.r - color.b;
  const greenness = color.g - (color.r + color.b) / 2;

  if (Math.abs(warmth) < 6 && Math.abs(greenness) < 6) {
    return { classification: "neutral", confidence: 0.5 };
  }
  return warmth > 0
    ? { classification: "warm", confidence: clamp01(warmth / 30) }
    : { classification: "cool", confidence: clamp01(-warmth / 30) };
}
