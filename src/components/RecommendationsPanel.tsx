import type { Recommendation } from "../types/recommendation";

interface RecommendationsPanelProps {
  title: string;
  items: Recommendation[];
}

export default function RecommendationsPanel({ title, items }: RecommendationsPanelProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg bg-paper-panel border border-paper-line p-5">
      <div className="reading text-brass-dim text-xs tracking-[0.15em] mb-3">{title}</div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.title}>
            <div className="text-sm text-paper-text font-medium">{item.title}</div>
            <p className="text-sm text-muted-onpaper">{item.detail}</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-onpaper mt-4 pt-3 border-t border-paper-line">
        General information, not a program or medical advice - read against your own results only.
      </p>
    </div>
  );
}
