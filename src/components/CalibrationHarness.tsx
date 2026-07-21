import type { AlignmentReading, QualityReport } from "../types/landmarks";

interface CalibrationHarnessProps {
  alignment: AlignmentReading;
  quality: QualityReport;
  fps: number;
}

export default function CalibrationHarness({
  alignment,
  quality,
  fps,
}: CalibrationHarnessProps) {
  if (!import.meta.env.DEV) return null;

  const rows: [string, string, boolean][] = [
    ["fps", fps.toString(), fps > 20],
    ["offset.x", alignment.raw.offsetX.toFixed(3), Math.abs(alignment.raw.offsetX) < 0.08],
    ["offset.y", alignment.raw.offsetY.toFixed(3), Math.abs(alignment.raw.offsetY) < 0.08],
    ["interocular", alignment.raw.interocular.toFixed(3), alignment.distanceFit > 0.7],
    ["tilt.deg", alignment.raw.tiltDeg.toFixed(1), alignment.levelness > 0.7],
    ["brightness", quality.brightness.toFixed(0), quality.brightness > 60 && quality.brightness < 200],
    ["sharpness", quality.sharpness.toFixed(1), quality.sharpness > 15],
    ["face", quality.faceDetected ? "yes" : "no", quality.faceDetected],
    ["pose", quality.poseDetected ? "yes" : "no", quality.poseDetected],
  ];

  return (
    <div className="fixed bottom-4 right-4 w-64 rounded-lg border border-ink-line bg-ink-panel/95 backdrop-blur p-4 reading text-xs">
      <div className="text-brass-dim mb-2 tracking-[0.15em]">CALIBRATION - DEV ONLY</div>
      <div className="space-y-1">
        {rows.map(([label, value, ok]) => (
          <div key={label} className="flex justify-between">
            <span className="text-muted-onink">{label}</span>
            <span className={ok ? "text-reading" : "text-signal"}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
