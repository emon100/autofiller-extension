/**
 * Crypto Service for GDPR-compliant sensitive data encryption
 *
 * Uses AES-256-GCM for encryption with PBKDF2 key derivation.
 * Key is derived from extension ID to tie encrypted data to this installation.
 */

import { EncryptedPayload, DEFAULT_CRYPTO_CONFIG } from './types'

class CryptoService {
  private cryptoKey: CryptoKey | null = null
  private initialized = false
  private initPromise: Promise<void> | null = null

  /**
   * Initialize the crypto service with a derived key.
   * Uses extension ID as the primary key material.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this._doInitialize()
    await this.initPromise
    this.initialized = true
  }

  private async _doInitialize(): Promise<void> {
    // Use extension ID as the primary key material
    // This ties encrypted data to this specific extension installation
    const extensionId = typeof chrome !== 'undefined' && chrome.runtime?.id
      ? chrome.runtime.id
      : 'dev-mode-fallback-key'

    // Derive key using PBKDF2
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(extensionId),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    // Use a fixed salt derived from extension ID for consistency
    const salt = encoder.encode(`autofiller-${extensionId}-salt`)

    this.cryptoKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: DEFAULT_CRYPTO_CONFIG.saltRounds,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: DEFAULT_CRYPTO_CONFIG.keyLength },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt plaintext string to an EncryptedPayload
   */
  async encrypt(plaintext: string): Promise<string> {
    await this.initialize()

    if (!this.cryptoKey) {
      throw new Error('CryptoService not initialized')
    }

    // Generate random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoder = new TextEncoder()

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey,
      encoder.encode(plaintext)
    )

    const payload: EncryptedPayload = {
      v: 1,
      iv: this.arrayBufferToBase64(iv),
      ct: this.arrayBufferToBase64(ciphertext),
    }

    return JSON.stringify(payload)
  }

  /**
   * Decrypt an EncryptedPayload back to plaintext string
   */
  async decrypt(encryptedString: string): Promise<string> {
    await this.initialize()

    if (!this.cryptoKey) {
      throw new Error('CryptoService not initialized')
    }

    const payload: EncryptedPayload = JSON.parse(encryptedString)

    // Version check for future migrations
    if (payload.v !== 1) {
      throw new Error(`Unsupported encryption version: ${payload.v}`)
    }

    const iv = this.base64ToArrayBuffer(payload.iv)
    const ciphertext = this.base64ToArrayBuffer(payload.ct)

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      this.cryptoKey,
      ciphertext.buffer as ArrayBuffer
    )

    return new TextDecoder().decode(plaintext)
  }

  /**
   * Check if a string looks like an encrypted payload
   */
  isEncrypted(value: string): boolean {
    if (!value || typeof value !== 'string') return false
    try {
      const parsed = JSON.parse(value)
      return parsed && parsed.v === 1 && parsed.iv && parsed.ct
    } catch {
      return false
    }
  }

  /**
   * Encrypt a JSON object
   */
  async encryptObject<T>(obj: T): Promise<string> {
    return this.encrypt(JSON.stringify(obj))
  }

  /**
   * Decrypt to a JSON object
   */
  async decryptObject<T>(encryptedString: string): Promise<T> {
    const plaintext = await this.decrypt(encryptedString)
    return JSON.parse(plaintext)
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
}

// Singleton instance
export const cryptoService = new CryptoService()

export { CryptoService }
export * from './types'
