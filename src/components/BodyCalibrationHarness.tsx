import type { BodyAlignmentReading } from "../types/bodyCapture";
import type { QualityReport } from "../types/landmarks";
import type { RejectedFrameLog } from "../types/capture";

interface BodyCalibrationHarnessProps {
  alignment: BodyAlignmentReading;
  quality: QualityReport;
  fps: number;
  recentRejections?: RejectedFrameLog[];
}

export default function BodyCalibrationHarness({
  alignment,
  quality,
  fps,
  recentRejections = [],
}: BodyCalibrationHarnessProps) {
  if (!import.meta.env.DEV) return null;

  const rows: [string, string, boolean][] = [
    ["fps", fps.toString(), fps > 20],
    ["offset.x", alignment.raw.offsetX.toFixed(3), Math.abs(alignment.raw.offsetX) < 0.12],
    ["shoulder.span", alignment.raw.shoulderSpan.toFixed(3), alignment.angleMatch > 0.7],
    ["hip.offset.x", alignment.raw.hipOffsetX.toFixed(3), Math.abs(alignment.raw.hipOffsetX) < 0.15],
    ["face.detected", alignment.raw.faceDetected ? "yes" : "no", true],
    ["brightness", quality.brightness.toFixed(0), quality.brightness > 60 && quality.brightness < 200],
    ["sharpness", quality.sharpness.toFixed(1), quality.sharpness > 12],
    ["pose", quality.poseDetected ? "yes" : "no", quality.poseDetected],
  ];

  return (
    <div className="fixed bottom-4 right-4 w-64 rounded-lg border border-ink-line bg-ink-panel/95 backdrop-blur p-4 reading text-xs">
      <div className="text-brass-dim mb-2 tracking-[0.15em]">BODY CALIBRATION - DEV ONLY</div>
      <div className="space-y-1">
        {rows.map(([label, value, ok]) => (
          <div key={label} className="flex justify-between">
            <span className="text-muted-onink">{label}</span>
            <span className={ok ? "text-reading" : "text-signal"}>{value}</span>
          </div>
        ))}
      </div>
      {recentRejections.length > 0 && (
        <div className="mt-3 pt-3 border-t border-ink-line">
          <div className="text-muted-onink mb-1">rejected</div>
          <div className="space-y-0.5">
            {recentRejections.map((r, i) => (
              <div key={r.timestamp + i} className="text-signal">
                {r.reason}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
