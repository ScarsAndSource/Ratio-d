import { useState } from "react";
import ReadingRing from "./components/ReadingRing";
import CaptureStage from "./components/CaptureStage";

const steps = [
  {
    n: "01",
    title: "Align",
    body: "Live guidance reads your position - no manual, just adjust until it settles.",
  },
  {
    n: "02",
    title: "Capture",
    body: "Several clean frames are taken and averaged automatically. You just hold still.",
  },
  {
    n: "03",
    title: "Read",
    body: "Everything measured is set against your own baseline - never anyone else's.",
  },
];

export default function App() {
  const [calibrating, setCalibrating] = useState(false);

  if (calibrating) return <CaptureStage />;

  return (
    <main className="min-h-screen bg-ink text-ink-text">
      <div className="mx-auto max-w-3xl px-6 py-20 flex flex-col items-center text-center gap-10">
        <div>
          <h1 className="font-display text-5xl font-light tracking-tight">
            Plumbline
          </h1>
          <p className="mt-3 text-muted-onink max-w-md mx-auto">
            This isn't a rating. It's a baseline - everything after is
            measured against you, not anyone else.
          </p>
        </div>

        <ReadingRing progress={0.4} label="ALIGNING" />

        <button
          onClick={() => setCalibrating(true)}
          className="reading rounded-full border border-brass-dim px-6 py-3 text-sm tracking-[0.15em] text-brass hover:bg-brass hover:text-ink transition-colors"
        >
          BEGIN CALIBRATION
        </button>

        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-px bg-ink-line mt-8 rounded-lg overflow-hidden">
          {steps.map((s) => (
            <div key={s.n} className="bg-ink-panel p-6 text-left">
              <div className="reading text-brass-dim text-xs mb-2">
                STEP {s.n}
              </div>
              <div className="font-display text-lg mb-1">{s.title}</div>
              <p className="text-sm text-muted-onink">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
