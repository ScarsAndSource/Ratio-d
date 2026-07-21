import { useMemo } from "react";

interface ReadingRingProps {
  progress?: number;
  label?: string;
  size?: number;
}

export default function ReadingRing({
  progress = 0.35,
  label = "ALIGNING",
  size = 280,
}: ReadingRingProps) {
  const radius = size / 2 - 24;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(Math.max(progress, 0), 1));

  const ticks = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => {
        const angle = (i / 48) * 360;
        const major = i % 4 === 0;
        return { angle, major };
      }),
    []
  );

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
      >
        <g stroke="#8F6E3F" strokeWidth={1}>
          {ticks.map((t, i) => {
            const r1 = radius + 10;
            const r2 = t.major ? radius + 18 : radius + 14;
            const rad = (t.angle * Math.PI) / 180;
            const cx = size / 2;
            const cy = size / 2;
            return (
              <line
                key={i}
                x1={cx + r1 * Math.cos(rad)}
                y1={cy + r1 * Math.sin(rad)}
                x2={cx + r2 * Math.cos(rad)}
                y2={cy + r2 * Math.sin(rad)}
                opacity={t.major ? 0.9 : 0.35}
              />
            );
          })}
        </g>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#262D37"
          strokeWidth={2}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#6FC9B8"
          strokeWidth={2}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>

      <div className="reading text-center">
        <div className="text-reading text-sm tracking-[0.2em]">{label}</div>
      </div>
    </div>
  );
}
