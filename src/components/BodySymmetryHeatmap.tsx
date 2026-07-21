import type { LandmarkPoint } from "../types/landmarks";
import type { MuscleZoneScore } from "../types/bodyMetrics";

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;

const HEAT_COLOR = { green: "#6FC9B8", yellow: "#C89B5C", red: "#C97B63" };

interface BodySymmetryHeatmapProps {
  imageSrc: string;
  frontLandmarks: LandmarkPoint[];
  zones: MuscleZoneScore[];
  width?: number;
  height?: number;
}

export default function BodySymmetryHeatmap({
  imageSrc,
  frontLandmarks,
  zones,
  width = 280,
  height = 380,
}: BodySymmetryHeatmapProps) {
  const byRegion = Object.fromEntries(zones.map((z) => [z.region, z]));

  const lShoulder = frontLandmarks[LEFT_SHOULDER];
  const rShoulder = frontLandmarks[RIGHT_SHOULDER];
  const lHip = frontLandmarks[LEFT_HIP];
  const rHip = frontLandmarks[RIGHT_HIP];
  const lElbow = frontLandmarks[LEFT_ELBOW];
  const rElbow = frontLandmarks[RIGHT_ELBOW];
  const lKnee = frontLandmarks[LEFT_KNEE];
  const rKnee = frontLandmarks[RIGHT_KNEE];

  const midpoint = (a?: LandmarkPoint, b?: LandmarkPoint) =>
    a && b ? { x: ((a.x + b.x) / 2) * width, y: ((a.y + b.y) / 2) * height } : null;

  const chestPoint =
    lShoulder && rShoulder && lHip && rHip
      ? {
          x: ((lShoulder.x + rShoulder.x) / 2) * width,
          y: (((lShoulder.y + rShoulder.y) / 2) * 0.4 + ((lHip.y + rHip.y) / 2) * 0.6) * height,
        }
      : null;

  const markers: { region: MuscleZoneScore["region"]; point: { x: number; y: number } | null; radius: number }[] = [
    { region: "shoulders", point: midpoint(lShoulder, rShoulder), radius: 16 },
    { region: "posture", point: midpoint(lShoulder, rShoulder), radius: 22 },
    { region: "chest", point: chestPoint, radius: 20 },
    { region: "arms", point: midpoint(lElbow, rElbow), radius: 14 },
    { region: "legs", point: midpoint(lKnee, rKnee), radius: 14 },
    { region: "waist", point: midpoint(lHip, rHip), radius: 18 },
  ];

  return (
    <div className="relative rounded-lg overflow-hidden border border-paper-line" style={{ width, height }}>
      <img src={imageSrc} alt="Your captured front reference frame" className="absolute inset-0 w-full h-full object-cover" />
      <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full h-full">
        {markers.map((m, i) => {
          const score = byRegion[m.region];
          if (!m.point || !score) return null;
          return (
            <circle
              key={m.region + i}
              cx={m.point.x}
              cy={m.point.y}
              r={m.radius}
              fill={HEAT_COLOR[score.heatColor]}
              opacity={0.35}
              stroke={HEAT_COLOR[score.heatColor]}
              strokeWidth={1.5}
            />
          );
        })}
      </svg>
    </div>
  );
}
