import { useState } from "react";


interface AuthScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  error: string | null;
}


export default function AuthScreen({ onSignIn, onSignUp, error }: AuthScreenProps) {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (mode === "signIn") {
      await onSignIn(email, password);
    } else {
      await onSignUp(email, password);
    }
    setSubmitting(false);
  };


  return (
    <main className="min-h-screen bg-ink text-ink-text flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-light">Plumbline</h1>
          <p className="mt-2 text-muted-onink text-sm">
            {mode === "signIn" ? "Sign in to your instrument." : "Set up your own baseline account."}
          </p>
        </div>


        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="reading rounded-md border border-ink-line bg-ink-panel px-3 py-2 text-sm text-ink-text focus:outline-none focus:border-brass"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="reading rounded-md border border-ink-line bg-ink-panel px-3 py-2 text-sm text-ink-text focus:outline-none focus:border-brass"
          />


          {error && <p className="text-signal text-sm">{error}</p>}


          <button
            type="submit"
            disabled={submitting}
            className="reading rounded-full border border-brass-dim px-6 py-3 text-sm tracking-[0.15em] text-brass hover:bg-brass hover:text-ink transition-colors disabled:opacity-50"
          >
            {submitting ? "WORKING..." : mode === "signIn" ? "SIGN IN" : "SIGN UP"}
          </button>
        </form>


        <button
          onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
          className="reading text-xs tracking-[0.1em] text-muted-onink hover:text-brass-dim transition-colors"
        >
          {mode === "signIn" ? "NEED AN ACCOUNT? SIGN UP" : "ALREADY HAVE ONE? SIGN IN"}
        </button>
      </div>
    </main>
  );
}
