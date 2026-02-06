/**
 * Shared Google login utility for Chrome extension OAuth flow.
 *
 * Handles the common issue where users already logged into onefil.help
 * cause the OAuth popup to redirect so fast that Chrome's
 * launchWebAuthFlow may fail to capture the callback URL.
 *
 * Fixes:
 * 1. Check callbackUrl before chrome.runtime.lastError (URL takes priority)
 * 2. Check both query params and hash fragment for token
 * 3. Retry once with delay on quick failures
 */

import { storage } from '@/storage'
import { AuthState } from '@/types'

const WEBSITE_URL = 'https://www.onefil.help'

export interface LoginResult {
  success: boolean
  user?: AuthState['user']
  error?: string
}

/**
 * Launch Google login via chrome.identity.launchWebAuthFlow.
 * Retries once on quick failure (common when user is already logged in).
 */
export async function launchLogin(): Promise<LoginResult> {
  const maxAttempts = 2

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const tokenData = await attemptLogin()
      await storage.auth.setAuthState(tokenData)
      return { success: true, user: tokenData.user }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'

      // On first attempt failure, retry after delay if it looks like a quick-close issue
      if (attempt < maxAttempts - 1 && isRetryableError(msg)) {
        console.log('[Auth] Quick popup close detected, retrying...', msg)
        await sleep(800)
        continue
      }

      // User deliberately closed the popup — not an error to display
      if (msg.includes('canceled') || msg.includes('cancelled') || msg.includes('closed')) {
        return { success: false }
      }

      return { success: false, error: msg }
    }
  }

  return { success: false, error: 'Login failed after retries' }
}

async function attemptLogin(): Promise<AuthState> {
  const redirectUrl = chrome.identity.getRedirectURL('callback')
  const authUrl = `${WEBSITE_URL}/extension/auth?redirect_uri=${encodeURIComponent(redirectUrl)}`

  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (callbackUrl) => {
        // IMPORTANT: Check callbackUrl FIRST — Chrome may set lastError as a
        // warning even when the URL is valid (especially on fast redirects)
        if (callbackUrl) {
          resolve(callbackUrl)
        } else if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          reject(new Error('No callback URL received'))
        }
      }
    )
  })

  // Extract token from query params first, then hash fragment
  const url = new URL(responseUrl)
  let encodedToken = url.searchParams.get('token')

  if (!encodedToken && url.hash) {
    // Check hash fragment: #token=...
    const hashParams = new URLSearchParams(url.hash.slice(1))
    encodedToken = hashParams.get('token')
  }

  if (!encodedToken) {
    throw new Error('No token in callback URL')
  }

  const tokenData = JSON.parse(decodeURIComponent(encodedToken)) as AuthState

  if (!tokenData.accessToken || !tokenData.user) {
    throw new Error('Invalid token data')
  }

  return tokenData
}

function isRetryableError(message: string): boolean {
  const retryablePatterns = [
    'user interaction required',
    'user did not approve',
    'the user turned off sync',
    'no callback url received',
    'authorization page could not be loaded',
    'cannot contact the identity service',
  ]
  const lower = message.toLowerCase()
  return retryablePatterns.some(p => lower.includes(p))
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
