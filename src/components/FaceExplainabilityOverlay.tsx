import type { AngleMeasurement } from "../types/faceMetrics";

interface FaceExplainabilityOverlayProps {
  imageSrc: string;
  angles: AngleMeasurement[];
  width?: number;
  height?: number;
}

export default function FaceExplainabilityOverlay({
  imageSrc,
  angles,
  width = 320,
  height = 240,
}: FaceExplainabilityOverlayProps) {
  return (
    <div className="relative rounded-lg overflow-hidden border border-paper-line" style={{ width, height }}>
      <img src={imageSrc} alt="Your captured reference frame" className="absolute inset-0 w-full h-full object-cover" />
      <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full h-full">
        {angles.map((a, i) => {
          const [p1, p2] = a.points;
          const x1 = p1.x * width;
          const y1 = p1.y * height;
          const x2 = p2.x * width;
          const y2 = p2.y * height;

          return (
            <g key={a.label + i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6FC9B8" strokeWidth={1.5} opacity={0.9} />
              <circle cx={x1} cy={y1} r={2.5} fill="#C89B5C" />
              <circle cx={x2} cy={y2} r={2.5} fill="#C89B5C" />
              {a.valueDeg !== 0 && (
                <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} fontFamily="IBM Plex Mono" fontSize={11} fill="#6FC9B8" textAnchor="middle">
                  {a.valueDeg.toFixed(1)}°
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
