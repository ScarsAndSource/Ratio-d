import type { CooldownStatus } from "../lib/progress/cooldown";

interface RescanCooldownNoticeProps {
  cooldown: CooldownStatus;
}

export default function RescanCooldownNotice({ cooldown }: RescanCooldownNoticeProps) {
  if (!cooldown.onCooldown) return null;

  return (
    <p className="reading text-xs text-muted-onink tracking-wide">
      Come back in {cooldown.daysRemaining} {cooldown.daysRemaining === 1 ? "day" : "days"} - change needs time to show.
    </p>
  );
}
