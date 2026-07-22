interface ConsentScreenProps {
  onConsent: () => Promise<void>;
}


export default function ConsentScreen({ onConsent }: ConsentScreenProps) {
  return (
    <main className="min-h-screen bg-paper text-paper-text flex items-center justify-center px-6">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div>
          <div className="reading text-brass-dim text-xs tracking-[0.15em] mb-1">BEFORE YOU SCAN</div>
          <h1 className="font-display text-2xl font-light">What this instrument stores</h1>
        </div>


        <ul className="text-sm text-paper-text space-y-3 list-disc pl-5">
          <li>Your scan history: the computed scores and measurements from each face or body scan you complete.</li>
          <li>One representative photo per scan, used only to draw the explainability overlay and progress comparisons back to you.</li>
          <li>Nothing here is ever shown to, or shared with, any other user of this app.</li>
        </ul>


        <div className="rounded-lg bg-paper-panel border border-paper-line p-5">
          <div className="reading text-brass text-xs tracking-[0.15em] mb-1">THE ONE PERMANENT PROMISE</div>
          <p className="text-sm text-paper-text">
            Every reading is measured against your own past scans only. There is no leaderboard, no
            comparison to other people, and no plan to add one.
          </p>
        </div>


        <p className="text-sm text-muted-onpaper">
          You can delete your account and everything stored under it at any time, from the account menu.
        </p>


        <button
          onClick={onConsent}
          className="reading self-start rounded-full border border-brass-dim px-6 py-3 text-sm tracking-[0.15em] text-brass hover:bg-brass hover:text-paper-text transition-colors"
        >
          I UNDERSTAND, CONTINUE
        </button>
      </div>
    </main>
  );
}
