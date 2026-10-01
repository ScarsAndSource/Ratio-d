import { useEffect, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase/client";


interface UseAuthResult {
  session: Session | null;
  loading: boolean;
  error: string | null;
  /** A non-error message for the auth screen, e.g. "check your email". */
  notice: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}


export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);


  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch((err) => {
        console.error("Could not read the auth session:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });


    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);


  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    setNotice(null);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    // With email confirmation on, Supabase reports an already-registered address
    // as a "success" whose user has no identities. Say so instead of silently waiting.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError("An account with this email already exists. Sign in instead.");
      return;
    }
    // No session back means email confirmation is required before the first sign-in.
    if (!data.session) {
      setNotice("Check your email to confirm your account, then sign in.");
    }
  }, []);


  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setNotice(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
  }, []);


  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);


  return { session, loading, error, notice, signUp, signIn, signOut };
}
