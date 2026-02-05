/**
 * Encryption types for GDPR-compliant sensitive data storage
 */

export interface EncryptedPayload {
  v: 1                    // Version for future migration
  iv: string              // Base64-encoded IV (12 bytes for AES-GCM)
  ct: string              // Base64-encoded ciphertext
}

export interface CryptoConfig {
  saltRounds: number      // For PBKDF2 iterations
  keyLength: number       // Key length in bits (256 for AES-256)
}

export const DEFAULT_CRYPTO_CONFIG: CryptoConfig = {
  saltRounds: 100000,     // PBKDF2 iterations (NIST recommended)
  keyLength: 256,         // AES-256
}

// Sensitive storage keys that should be encrypted
export const SENSITIVE_STORAGE_KEYS = [
  'authState',            // Contains accessToken and refreshToken
  'llmConfig',            // Contains apiKey
] as const

export type SensitiveStorageKey = typeof SENSITIVE_STORAGE_KEYS[number]

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_STORAGE_KEYS.includes(key as SensitiveStorageKey)
}
