/**
 * Consent types for GDPR-compliant user consent management
 */

export const CONSENT_VERSION = '1.0'

export interface ConsentPreferences {
  version: string           // Consent version (e.g., "1.0")
  timestamp: number         // Unix timestamp when consent was given
  dataCollection: boolean   // Required: consent to local data collection
  llmDataSharing: boolean   // Optional: consent to share field metadata with LLM
  acknowledgedPrivacyPolicy: boolean  // User acknowledged reading privacy policy
}

export interface ConsentState {
  preferences: ConsentPreferences | null
  isValid: boolean
}

export const STORAGE_KEY_CONSENT = 'userConsent'
