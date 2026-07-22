interface DailyFocusWidgetProps {
  label: string;
  reason: string;
}

export default function DailyFocusWidget({ label, reason }: DailyFocusWidgetProps) {
  return (
    <div className="rounded-lg bg-ink-panel border border-ink-line p-5 text-left">
      <div className="reading text-brass-dim text-xs tracking-[0.15em] mb-1">TODAY'S FOCUS</div>
      <div className="font-display text-lg mb-1 text-ink-text">{label}</div>
      <p className="text-sm text-muted-onink">{reason}</p>
    </div>
  );
}
