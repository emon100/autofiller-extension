/**
 * Background service worker handler for proxying fetch requests from content scripts.
 * Handles both regular and SSE streaming responses.
 */

/**
 * Parse SSE streaming response, collecting all chunks into a single content string,
 * then wrapping it in standard OpenAI JSON format.
 */
async function parseSSE(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let content = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content
            if (delta) {
              content += delta
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return content
}

export function handleFetchProxy(
  message: { url: string; method?: string; headers?: Record<string, string>; body?: string },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: { ok: boolean; status: number; body: string }) => void
): boolean {
  const { url, method, headers, body } = message

  fetch(url, {
    method: method || 'GET',
    headers: headers,
    body: body,
  })
    .then(async (response) => {
      const contentType = response.headers.get('content-type') || ''

      // Check if the request asked for streaming
      let requestedStream = false
      try {
        requestedStream = !!(body && JSON.parse(body).stream === true)
      } catch { /* not JSON body */ }

      if (contentType.includes('text/event-stream') || requestedStream) {
        // SSE streaming → parse all chunks and wrap as standard JSON
        const content = await parseSSE(response)
        const wrapped = JSON.stringify({ choices: [{ message: { content } }] })
        sendResponse({ ok: response.ok, status: response.status, body: wrapped })
      } else {
        const text = await response.text()
        sendResponse({ ok: response.ok, status: response.status, body: text })
      }
    })
    .catch((err) => {
      sendResponse({ ok: false, status: 0, body: err.message })
    })

  return true // Keep sendResponse channel open for async
}
