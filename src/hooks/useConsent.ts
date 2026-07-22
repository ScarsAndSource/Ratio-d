import { useEffect, useState, useCallback } from "react";
import { hasCurrentConsent, recordConsent } from "../lib/consent/consentRepository";


interface UseConsentResult {
  consented: boolean;
  loading: boolean;
  giveConsent: () => Promise<void>;
}


export function useConsent(userId: string | null): UseConsentResult {
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (!userId) {
      setConsented(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    hasCurrentConsent(userId).then((result) => {
      if (!cancelled) {
        setConsented(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);


  const giveConsent = useCallback(async () => {
    if (!userId) return;
    await recordConsent(userId);
    setConsented(true);
  }, [userId]);


  return { consented, loading, giveConsent };
}
