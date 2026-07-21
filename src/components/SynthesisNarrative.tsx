import type { SynthesisResult } from "../types/synthesis";

interface SynthesisNarrativeProps {
  synthesis: SynthesisResult | null;
  loading: boolean;
  error: string | null;
}

export default function SynthesisNarrative({ synthesis, loading, error }: SynthesisNarrativeProps) {
  if (loading) {
    return <p className="text-muted-onpaper text-sm">Writing up the read...</p>;
  }

  if (error) {
    return (
      <p className="text-muted-onpaper text-sm">
        Narration is unavailable right now, but the readings above are unaffected.
      </p>
    );
  }

  if (!synthesis) return null;

  return (
    <div className="flex flex-col gap-5 border-t border-paper-line pt-6">
      <p className="text-paper-text leading-relaxed">{synthesis.summary}</p>

      {synthesis.withinNormalRange && (
        <div className="reading text-xs tracking-[0.15em] text-reading">WITHIN NORMAL RANGE</div>
      )}

      <div className="rounded-lg bg-paper-panel border border-paper-line p-5">
        <div className="reading text-brass text-xs tracking-[0.15em] mb-1">PRIORITY LEVER, EXPANDED</div>
        <p className="text-sm text-paper-text">{synthesis.priorityLeverNarrative}</p>
      </div>

      {synthesis.tips.length > 0 && (
        <div className="space-y-3">
          {synthesis.tips.map((tip, i) => (
            <div key={tip.title + i}>
              <div className="font-display text-base text-paper-text">{tip.title}</div>
              <p className="text-sm text-muted-onpaper">{tip.detail}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-onpaper italic">{synthesis.timelineNarrative}</p>
    </div>
  );
}
