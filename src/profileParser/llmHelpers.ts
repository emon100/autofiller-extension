// LLM helper functions for profile parsing

const API_BASE_URL = 'https://www.onefil.help/api'

export interface LLMConfig {
  enabled: boolean
  useCustomApi?: boolean
  provider: 'openai' | 'anthropic' | 'dashscope' | 'deepseek' | 'zhipu' | 'custom'
  apiKey: string
  endpoint?: string
  model?: string
  disableThinking?: boolean
}

const DEFAULT_LLM_CONFIG: LLMConfig = {
  enabled: true,
  useCustomApi: false,
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  disableThinking: false,
}

const PROVIDER_ENDPOINTS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  dashscope: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  dashscope: 'qwen-plus',
  deepseek: 'deepseek-chat',
  zhipu: 'glm-4-flash',
}

export async function getLLMConfig(): Promise<LLMConfig> {
  try {
    const result = await chrome.storage.local.get('llmConfig')
    return { ...DEFAULT_LLM_CONFIG, ...result.llmConfig }
  } catch {
    return DEFAULT_LLM_CONFIG
  }
}

export async function isLLMEnabled(): Promise<boolean> {
  const config = await getLLMConfig()
  if (!config.enabled) return false

  // Backend API mode: check if user is logged in
  if (!config.useCustomApi) {
    try {
      const { storage } = await import('@/storage')
      const authState = await storage.auth.getAuthState()
      return !!(authState && authState.expiresAt > Date.now())
    } catch {
      return false
    }
  }

  // Custom API mode: check if API key is configured
  return !!config.apiKey
}

interface LLMCallOptions {
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

/** Get config and verify LLM is enabled; throws if not */
async function requireEnabledConfig(): Promise<LLMConfig> {
  const config = await getLLMConfig()
  const enabled = await isLLMEnabled()
  if (!enabled) throw new Error('LLM is not configured or enabled')
  return config
}

/**
 * Call LLM with text prompt and return raw response content
 */
export async function callLLMWithText(
  prompt: string,
  options: LLMCallOptions = {}
): Promise<string> {
  const config = await requireEnabledConfig()
  const { systemPrompt, maxTokens = 2000, temperature = 0 } = options

  if (!config.useCustomApi) {
    return callBackendLLM({ prompt, systemPrompt, maxTokens, temperature })
  }
  if (config.provider === 'anthropic') {
    return callAnthropicText(config, prompt, systemPrompt, maxTokens, temperature)
  }
  return callOpenAICompatibleText(config, prompt, systemPrompt, maxTokens, temperature)
}

/**
 * Call LLM with image (base64) and return raw response content
 */
export async function callLLMWithImage(
  imageBase64: string,
  prompt: string,
  mimeType: string = 'image/png',
  options: LLMCallOptions = {}
): Promise<string> {
  const config = await requireEnabledConfig()
  const { systemPrompt, maxTokens = 4000, temperature = 0 } = options

  if (!config.useCustomApi) {
    return callBackendLLM({ prompt, systemPrompt, maxTokens, temperature, imageBase64, mimeType })
  }
  if (config.provider === 'anthropic') {
    return callAnthropicVision(config, imageBase64, prompt, mimeType, systemPrompt, maxTokens, temperature)
  }
  return callOpenAIVision(config, imageBase64, prompt, mimeType, systemPrompt, maxTokens, temperature)
}

/**
 * Call LLM through backend API gateway
 */
async function callBackendLLM(params: {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  imageBase64?: string
  mimeType?: string
}): Promise<string> {
  const { storage } = await import('@/storage')
  const token = await storage.auth.getAccessToken()

  if (!token) {
    throw new Error('Not authenticated. Please sign in to use AI features.')
  }

  const response = await fetch(`${API_BASE_URL}/llm/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    if (response.status === 402) {
      throw new Error(`Insufficient credits. Balance: ${errorData.balance || 0}`)
    }
    if (response.status === 401) {
      throw new Error('Authentication expired. Please sign in again.')
    }
    throw new Error(errorData.error || `Backend API error ${response.status}`)
  }

  const data = await response.json()
  return data.text || ''
}

async function callOpenAICompatibleText(
  config: LLMConfig,
  prompt: string,
  systemPrompt?: string,
  maxTokens: number = 2000,
  temperature: number = 0
): Promise<string> {
  const endpoint = config.endpoint || PROVIDER_ENDPOINTS[config.provider] || PROVIDER_ENDPOINTS.openai
  const model = config.model || DEFAULT_MODELS[config.provider] || 'gpt-4o-mini'

  const messages: Array<{ role: string; content: string }> = []

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  // 智谱AI的某些模型只支持流式模式
  const needsStream = config.provider === 'zhipu' || (model && model.startsWith('glm-4'))

  // 构建请求体
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  }

  // 流式模式
  if (needsStream) {
    requestBody.stream = true
  }

  // 禁用thinking模式
  if (config.disableThinking) {
    // 智谱AI GLM系列模型使用 enable_thinking 参数
    requestBody.enable_thinking = false
    // 某些版本可能使用 thinking 对象
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

  if (needsStream) {
    return parseStreamResponse(response)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callAnthropicText(
  config: LLMConfig,
  prompt: string,
  systemPrompt?: string,
  maxTokens: number = 2000,
  temperature: number = 0
): Promise<string> {
  const endpoint = config.endpoint || PROVIDER_ENDPOINTS.anthropic
  const model = config.model || DEFAULT_MODELS.anthropic

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  }

  if (systemPrompt) {
    body.system = systemPrompt
  }
  if (temperature > 0) {
    body.temperature = temperature
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

async function callOpenAIVision(
  config: LLMConfig,
  imageBase64: string,
  prompt: string,
  mimeType: string,
  systemPrompt?: string,
  maxTokens: number = 4000,
  temperature: number = 0
): Promise<string> {
  const endpoint = config.endpoint || PROVIDER_ENDPOINTS[config.provider] || PROVIDER_ENDPOINTS.openai
  // Use a vision-capable model
  let model = config.model || DEFAULT_MODELS[config.provider] || 'gpt-4o-mini'

  // Ensure vision capability for OpenAI
  if (config.provider === 'openai' && !model.includes('vision') && !model.includes('4o')) {
    model = 'gpt-4o-mini'
  }

  const messages: Array<{ role: string; content: unknown }> = []

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }

  messages.push({
    role: 'user',
    content: [
      {
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${imageBase64}`,
        },
      },
      {
        type: 'text',
        text: prompt,
      },
    ],
  })

  // 智谱AI的某些模型只支持流式模式
  const needsStream = config.provider === 'zhipu' || (model && model.startsWith('glm-4'))

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(needsStream && { stream: true }),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Vision API error ${response.status}: ${errorText}`)
  }

  if (needsStream) {
    return parseStreamResponse(response)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callAnthropicVision(
  config: LLMConfig,
  imageBase64: string,
  prompt: string,
  mimeType: string,
  systemPrompt?: string,
  maxTokens: number = 4000,
  temperature: number = 0
): Promise<string> {
  const endpoint = config.endpoint || PROVIDER_ENDPOINTS.anthropic
  // Use a vision-capable model
  let model = config.model || DEFAULT_MODELS.anthropic

  // Ensure vision capability for Anthropic
  if (!model.includes('claude-3')) {
    model = 'claude-3-haiku-20240307'
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  }

  if (systemPrompt) {
    body.system = systemPrompt
  }
  if (temperature > 0) {
    body.temperature = temperature
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Anthropic Vision API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

/**
 * Parse JSON from LLM response, handling markdown code blocks
 */
export function parseJSONFromLLMResponse<T>(content: string): T | null {
  try {
    // Try to find JSON in markdown code block
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim())
    }

    // Try to find JSON object
    const objectMatch = content.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      return JSON.parse(objectMatch[0])
    }

    // Try to find JSON array
    const arrayMatch = content.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0])
    }

    return null
  } catch (error) {
    console.error('[llmHelpers] Failed to parse JSON from LLM response:', error)
    return null
  }
}

/**
 * 解析流式响应 (SSE 格式)
 */
async function parseStreamResponse(response: Response): Promise<string> {
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
            // 忽略解析错误的行
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return content
}
