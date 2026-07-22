import { useMemo, useState } from "react";
import type { LandmarkPoint } from "../types/landmarks";
import { computeGhostAffine } from "../lib/progress/ghostAlign";

interface BodyGhostOverlayProps {
  currentImage: string;
  previousImage: string;
  currentLandmarks: LandmarkPoint[];
  previousLandmarks: LandmarkPoint[];
  width?: number;
  height?: number;
}

export default function BodyGhostOverlay({
  currentImage,
  previousImage,
  currentLandmarks,
  previousLandmarks,
  width = 280,
  height = 380,
}: BodyGhostOverlayProps) {
  const [showGhost, setShowGhost] = useState(true);

  const fit = useMemo(() => computeGhostAffine(previousLandmarks, currentLandmarks), [previousLandmarks, currentLandmarks]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-lg overflow-hidden border border-paper-line" style={{ width, height }}>
        <img src={currentImage} alt="Your latest capture" className="absolute inset-0 w-full h-full object-cover" />
        {showGhost && fit && (
          <img
            src={previousImage}
            alt="Your previous capture, faded for comparison"
            className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
            style={{
              transform: `translate(${fit.translateXPct}%, ${fit.translateYPct}%) scale(${fit.scale})`,
              transformOrigin: "center",
              mixBlendMode: "luminosity",
            }}
          />
        )}
      </div>
      <button
        onClick={() => setShowGhost((v) => !v)}
        className="reading self-start text-xs tracking-[0.15em] text-brass-dim hover:text-brass transition-colors"
      >
        {showGhost ? "HIDE" : "SHOW"} PREVIOUS SCAN OVERLAY
      </button>
    </div>
  );
}
