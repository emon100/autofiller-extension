/**
 * Proxy fetch through background service worker to avoid page CSP restrictions.
 *
 * - Content script context → sends message to background for execution
 * - Extension page / background context → uses native fetch directly
 */

const isContentScript =
  typeof window !== 'undefined' && !location.protocol.startsWith('chrome-extension:')

export interface ProxyResponse {
  ok: boolean
  status: number
  body: string
}

export async function backgroundFetch(
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<ProxyResponse> {
  if (!isContentScript) {
    // Extension page or background: use native fetch
    const resp = await fetch(url, init)
    const body = await resp.text()
    return { ok: resp.ok, status: resp.status, body }
  }

  // Content script: proxy through background service worker
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'fetchProxy', url, method: init?.method, headers: init?.headers, body: init?.body },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        if (!response) {
          reject(new Error('No response from background'))
          return
        }
        resolve(response as ProxyResponse)
      }
    )
  })
}
