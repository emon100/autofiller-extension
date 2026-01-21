// LLM helper functions for profile parsing

export interface LLMConfig {
  enabled: boolean
  provider: 'openai' | 'anthropic' | 'dashscope' | 'deepseek' | 'zhipu' | 'custom'
  apiKey: string
  endpoint?: string
  model?: string
}

const DEFAULT_LLM_CONFIG: LLMConfig = {
  enabled: false,
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
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
  return config.enabled && !!config.apiKey
}

interface LLMCallOptions {
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

/**
 * Call LLM with text prompt and return raw response content
 */
export async function callLLMWithText(
  prompt: string,
  options: LLMCallOptions = {}
): Promise<string> {
  const config = await getLLMConfig()

  if (!config.enabled || !config.apiKey) {
    throw new Error('LLM is not configured or enabled')
  }

  const { systemPrompt, maxTokens = 2000, temperature = 0 } = options

  if (config.provider === 'anthropic') {
    return callAnthropicText(config, prompt, systemPrompt, maxTokens, temperature)
  }

  return callOpenAICompatibleText(config, prompt, systemPrompt, maxTokens, temperature)
}

/**
 * Call LLM with image (base64) and return raw response content
 * Used for OCR-like tasks on resume images
 */
export async function callLLMWithImage(
  imageBase64: string,
  prompt: string,
  mimeType: string = 'image/png',
  options: LLMCallOptions = {}
): Promise<string> {
  const config = await getLLMConfig()

  if (!config.enabled || !config.apiKey) {
    throw new Error('LLM is not configured or enabled')
  }

  const { systemPrompt, maxTokens = 4000, temperature = 0 } = options

  if (config.provider === 'anthropic') {
    return callAnthropicVision(config, imageBase64, prompt, mimeType, systemPrompt, maxTokens, temperature)
  }

  return callOpenAIVision(config, imageBase64, prompt, mimeType, systemPrompt, maxTokens, temperature)
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
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error ${response.status}: ${errorText}`)
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
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Vision API error ${response.status}: ${errorText}`)
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
