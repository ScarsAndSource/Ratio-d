export interface ConsentRecord {
  userId: string;
  consentedAt: string;
  consentVersion: string;
}


// Bump whenever the ConsentScreen text changes, so existing users are asked again.
export const CURRENT_CONSENT_VERSION = "2026-10-v3";
