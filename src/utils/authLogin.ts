/**
 * Shared Google login utility for Chrome extension OAuth flow.
 *
 * Opens a new tab for login (instead of popup), then listens for
 * the callback URL containing the auth token via background messaging.
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
 * Launch Google login by opening a new tab.
 * Background script monitors the tab for the callback URL.
 */
export async function launchLogin(): Promise<LoginResult> {
  try {
    const tokenData = await attemptLogin()
    await storage.auth.setAuthState(tokenData)
    return { success: true, user: tokenData.user }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Login failed'

    // User deliberately closed the tab — not an error to display
    if (msg.includes('canceled') || msg.includes('cancelled') || msg.includes('closed') || msg.includes('Tab closed')) {
      return { success: false }
    }

    return { success: false, error: msg }
  }
}

async function attemptLogin(): Promise<AuthState> {
  const redirectUrl = chrome.identity.getRedirectURL('callback')
  const authUrl = `${WEBSITE_URL}/extension/auth?redirect_uri=${encodeURIComponent(redirectUrl)}`

  // Ask background to open a tab and watch for callback
  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'openLoginTab', url: authUrl, redirectUrl },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        if (!response) {
          reject(new Error('No response from background'))
          return
        }
        if (response.error) {
          reject(new Error(response.error))
          return
        }
        resolve(response.callbackUrl)
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
