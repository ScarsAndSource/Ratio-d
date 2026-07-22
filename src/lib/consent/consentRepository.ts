import { supabase } from "../supabase/client";
import { CURRENT_CONSENT_VERSION } from "../../types/consent";


export async function hasCurrentConsent(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_consent")
    .select("consent_version")
    .eq("user_id", userId)
    .maybeSingle();


  if (error || !data) return false;
  return data.consent_version === CURRENT_CONSENT_VERSION;
}


export async function recordConsent(userId: string): Promise<void> {
  const { error } = await supabase.from("user_consent").upsert({
    user_id: userId,
    consent_version: CURRENT_CONSENT_VERSION,
    consented_at: new Date().toISOString(),
  });
  if (error) throw error;
}
