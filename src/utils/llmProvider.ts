/**
 * Shared LLM Configuration and Provider Utilities
 *
 * Centralizes all LLM-related configuration to avoid duplication across:
 * - LLMParser
 * - LLMService
 * - KnowledgeNormalizer
 * - llmHelpers
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface LLMConfig {
  enabled: boolean
  useCustomApi?: boolean
  provider: 'openai' | 'anthropic' | 'dashscope' | 'deepseek' | 'zhipu' | 'custom'
  apiKey: string
  endpoint?: string
  model?: string
  disableThinking?: boolean
}

export interface LLMCallOptions {
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

// ============================================================================
// Provider Configuration
// ============================================================================

export const PROVIDER_ENDPOINTS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  dashscope: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
}

export const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  dashscope: 'qwen-plus',
  deepseek: 'deepseek-chat',
  zhipu: 'glm-4-flash',
}

// ============================================================================
// PII Scrubbing Utilities
// ============================================================================

export const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{4,6}/g,
  ssn: /\d{3}[-\s]?\d{2}[-\s]?\d{4}/g,
  // Credit card numbers (with or without separators)
  creditCard: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
  // US addresses (street addresses)
  address: /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|court|ct|boulevard|blvd)/gi,
  // US ZIP codes
  zipCode: /\b\d{5}(?:-\d{4})?\b/g,
  // Chinese ID numbers (18 digits)
  chineseId: /\d{6}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g,
  // Passport numbers (common formats)
  passport: /[A-Z]{1,2}\d{6,9}/gi,
  // IP addresses
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
}

export function scrubPII(text: string): string {
  return text
    .replace(PII_PATTERNS.email, '[EMAIL]')
    .replace(PII_PATTERNS.phone, '[PHONE]')
    .replace(PII_PATTERNS.ssn, '[SSN]')
    .replace(PII_PATTERNS.creditCard, '[CREDIT_CARD]')
    .replace(PII_PATTERNS.address, '[ADDRESS]')
    .replace(PII_PATTERNS.zipCode, '[ZIP]')
    .replace(PII_PATTERNS.chineseId, '[ID_NUMBER]')
    .replace(PII_PATTERNS.passport, '[PASSPORT]')
    .replace(PII_PATTERNS.ipAddress, '[IP]')
}

// ============================================================================
// Date Utilities
// ============================================================================

export const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
}

// ============================================================================
// LLM API Call Utilities
// ============================================================================

/**
 * Call OpenAI-compatible API (OpenAI, DeepSeek, DashScope, Zhipu, etc.)
 */
export async function callOpenAICompatible(
  config: LLMConfig,
  prompt: string,
  systemPrompt = 'You are a helpful assistant. Respond with valid JSON only.',
  options: LLMCallOptions = {}
): Promise<string> {
  const endpoint = config.endpoint || PROVIDER_ENDPOINTS[config.provider] || PROVIDER_ENDPOINTS.openai
  const model = config.model || DEFAULT_MODELS[config.provider] || 'gpt-4o-mini'

  // Zhipu AI GLM models may require streaming
  const needsStream = config.provider === 'zhipu' || (model && model.startsWith('glm-4'))

  const requestBody: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: options.temperature ?? 0,
    max_tokens: options.maxTokens ?? 500,
  }

  if (needsStream || options.stream) {
    requestBody.stream = true
  }

  // Disable thinking mode if configured
  if (config.disableThinking) {
    requestBody.enable_thinking = false
    requestBody.thinking = { type: 'disabled' }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error ${response.status}: ${errorText}`)
  }

  // Handle streaming response
  if (requestBody.stream) {
    return parseStreamResponse(response)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * Call Anthropic API (Claude)
 */
export async function callAnthropic(
  config: LLMConfig,
  prompt: string,
  options: LLMCallOptions = {}
): Promise<string> {
  const endpoint = config.endpoint || PROVIDER_ENDPOINTS.anthropic
  const model = config.model || DEFAULT_MODELS.anthropic

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

/**
 * Universal LLM call - routes to appropriate provider
 */
export async function callLLM(
  config: LLMConfig,
  prompt: string,
  systemPrompt?: string,
  options: LLMCallOptions = {}
): Promise<string> {
  if (config.provider === 'anthropic') {
    // Anthropic doesn't have system prompt in same way, prepend to user message
    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n${prompt}`
      : prompt
    return callAnthropic(config, fullPrompt, options)
  }

  return callOpenAICompatible(config, prompt, systemPrompt, options)
}

/**
 * Parse SSE streaming response
 */
export async function parseStreamResponse(response: Response): Promise<string> {
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

// ============================================================================
// Config Loading Utilities
// ============================================================================

let cachedConfig: LLMConfig | null = null
let configLoaded = false

/**
 * Load LLM config from Chrome storage (with caching)
 */
export async function loadLLMConfig(): Promise<LLMConfig | null> {
  if (configLoaded) {
    return cachedConfig
  }

  try {
    const result = await chrome.storage.local.get('llmConfig')
    cachedConfig = result.llmConfig || null
    configLoaded = true
  } catch {
    configLoaded = true
  }

  return cachedConfig
}

/**
 * Check if LLM is available and configured
 * For backend API mode (useCustomApi=false): requires login (auth token)
 * For custom API mode (useCustomApi=true): requires apiKey
 */
export async function isLLMAvailable(): Promise<boolean> {
  const config = await loadLLMConfig()
  if (!config?.enabled) return false

  if (!config.useCustomApi) {
    // Backend API mode - check for auth token
    try {
      const result = await chrome.storage.local.get('authState')
      const state = result.authState
      if (state && state.accessToken && state.expiresAt > Date.now()) {
        return true
      }
    } catch {
      // Ignore storage errors
    }
    return false
  }

  // Custom API mode - requires apiKey
  return !!config.apiKey
}

/**
 * Reset config cache (call after config changes)
 */
export function resetLLMConfigCache(): void {
  cachedConfig = null
  configLoaded = false
}
