import type { TrainingAge } from "../types/bodyMetrics";

interface TrainingAgeSelectProps {
  value: TrainingAge;
  onChange: (value: TrainingAge) => void;
}

const OPTIONS: { value: TrainingAge; label: string }[] = [
  { value: "new", label: "Just starting out" },
  { value: "under1y", label: "Under a year" },
  { value: "1to3y", label: "1-3 years" },
  { value: "3plus", label: "3+ years" },
  { value: "unsure", label: "Prefer not to say" },
];

export default function TrainingAgeSelect({ value, onChange }: TrainingAgeSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="reading text-xs tracking-[0.15em] text-muted-onink">TRAINING AGE</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TrainingAge)}
        className="reading rounded-md border border-ink-line bg-ink-panel px-3 py-2 text-sm text-ink-text focus:outline-none focus:border-brass"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
