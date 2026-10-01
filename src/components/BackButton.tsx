interface BackButtonProps {
  onClick: () => void;
}

/** Fixed top-left exit from a scan or results screen back to Home. Readable on dark and light screens. */
export default function BackButton({ onClick }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back to home"
      className="fixed top-4 left-4 z-20 reading rounded-full border border-ink-line bg-ink/80 px-4 py-2 text-xs tracking-[0.15em] text-ink-text backdrop-blur hover:border-brass hover:text-brass transition-colors"
    >
      BACK
    </button>
  );
}
