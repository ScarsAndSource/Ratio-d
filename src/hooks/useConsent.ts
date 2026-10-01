import { useEffect, useState, useCallback } from "react";
import { hasCurrentConsent, recordConsent } from "../lib/consent/consentRepository";


interface UseConsentResult {
  consented: boolean;
  loading: boolean;
  giveConsent: () => Promise<void>;
}


interface ConsentState {
  /** The user this answer belongs to. */
  userId: string;
  consented: boolean;
}


export function useConsent(userId: string | null): UseConsentResult {
  const [state, setState] = useState<ConsentState | null>(null);


  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    hasCurrentConsent(userId).then((result) => {
      if (!cancelled) setState({ userId, consented: result });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);


  // Derived, not stored: the moment a user id appears there is no answer for it
  // yet, so `loading` is true on that very render (no flash of the consent screen).
  const answered = state !== null && state.userId === userId;
  const loading = userId !== null && !answered;
  const consented = answered && state.consented;


  const giveConsent = useCallback(async () => {
    if (!userId) return;
    await recordConsent(userId);
    setState({ userId, consented: true });
  }, [userId]);


  return { consented, loading, giveConsent };
}
