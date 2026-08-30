import type { TrendResult } from "../lib/progress/trend";

interface ScoreTrendDisplayProps {
  trend: TrendResult;
  currentValue: number;
}

export default function ScoreTrendDisplay({ trend, currentValue }: ScoreTrendDisplayProps) {
  if (!trend.hasTrend) {
    return (
      <div className="flex items-baseline gap-4 border-t border-paper-line pt-6">
        <div className="reading text-5xl text-paper-text">{currentValue}</div>
        <div className="text-sm text-muted-onpaper max-w-xs">
          Baseline set. Everything from here reads against your own future scans, not anyone else's.
        </div>
      </div>
    );
  }

  const arrow = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
  const directionWord = trend.direction === "up" ? "up" : trend.direction === "down" ? "down" : "flat";
  const deltaText =
    trend.direction === "flat" ? "holding steady" : `${Math.abs(trend.delta).toFixed(0)} since your last scan`;

  return (
    <div className="flex flex-col gap-2 border-t border-paper-line pt-6">
      <div className="flex items-baseline gap-4">
        <div className="reading text-5xl text-paper-text">{currentValue}</div>
        <div className="reading text-reading text-sm" role="status">
          {trend.direction !== "flat" && (
            <span aria-hidden="true" className="mr-1">
              {arrow}
            </span>
          )}
          <span className="sr-only">{directionWord}, </span>
          {deltaText}
        </div>
      </div>
      <div className="text-sm text-muted-onpaper max-w-sm">
        Trend across {trend.points.length} scans - read against your own baseline only.
      </div>
    </div>
  );
}
