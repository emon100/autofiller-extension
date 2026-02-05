/**
 * Consent State Management for GDPR compliance
 *
 * Manages user consent preferences for data collection and processing.
 */

import { ConsentPreferences, ConsentState, CONSENT_VERSION, STORAGE_KEY_CONSENT } from './types'

/**
 * Get current consent state from storage
 */
export async function getConsentState(): Promise<ConsentPreferences | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_CONSENT)
    return result[STORAGE_KEY_CONSENT] || null
  } catch {
    return null
  }
}

/**
 * Save consent preferences to storage
 */
export async function setConsentState(prefs: ConsentPreferences): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_CONSENT]: prefs })
}

/**
 * Check if user has valid consent
 * Returns false if consent is missing or version is outdated
 */
export async function hasValidConsent(): Promise<boolean> {
  const consent = await getConsentState()
  if (!consent) return false

  // Check if consent version matches current version
  if (consent.version !== CONSENT_VERSION) return false

  // Check if required consent is given
  if (!consent.dataCollection) return false

  return true
}

/**
 * Get full consent state including validity
 */
export async function getFullConsentState(): Promise<ConsentState> {
  const preferences = await getConsentState()
  const isValid = preferences
    ? preferences.version === CONSENT_VERSION && preferences.dataCollection
    : false

  return {
    preferences,
    isValid
  }
}

/**
 * Create consent preferences with given choices
 */
export function createConsentPreferences(options: {
  dataCollection: boolean
  llmDataSharing: boolean
  acknowledgedPrivacyPolicy: boolean
}): ConsentPreferences {
  return {
    version: CONSENT_VERSION,
    timestamp: Date.now(),
    dataCollection: options.dataCollection,
    llmDataSharing: options.llmDataSharing,
    acknowledgedPrivacyPolicy: options.acknowledgedPrivacyPolicy,
  }
}

/**
 * Clear consent (for testing or when user withdraws consent)
 */
export async function clearConsent(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY_CONSENT)
}

/**
 * Check if LLM data sharing is allowed
 */
export async function isLLMDataSharingAllowed(): Promise<boolean> {
  const consent = await getConsentState()
  return consent?.llmDataSharing ?? false
}

export * from './types'
