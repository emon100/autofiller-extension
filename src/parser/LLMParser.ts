import { FieldContext, CandidateType, Taxonomy, IFieldParser } from '@/types'

interface LLMConfig {
  enabled: boolean
  provider: 'openai' | 'anthropic' | 'custom'
  apiKey: string
  endpoint?: string
  model?: string
}

interface FieldMetadata {
  tagName: string
  type: string
  name: string
  id: string
  placeholder: string
  labelText: string
  sectionTitle: string
  options: string[]
  ariaLabel: string
}

const TAXONOMY_DESCRIPTIONS: Record<Taxonomy, string> = {
  [Taxonomy.FULL_NAME]: 'Full name (first and last)',
  [Taxonomy.FIRST_NAME]: 'First/given name only',
  [Taxonomy.LAST_NAME]: 'Last/family name only',
  [Taxonomy.EMAIL]: 'Email address',
  [Taxonomy.PHONE]: 'Phone/mobile number',
  [Taxonomy.COUNTRY_CODE]: 'Phone country code',
  [Taxonomy.LOCATION]: 'Full address or location',
  [Taxonomy.CITY]: 'City name',
  [Taxonomy.LINKEDIN]: 'LinkedIn profile URL',
  [Taxonomy.GITHUB]: 'GitHub profile URL',
  [Taxonomy.PORTFOLIO]: 'Portfolio/personal website URL',
  [Taxonomy.SCHOOL]: 'School/university name',
  [Taxonomy.DEGREE]: 'Degree type (Bachelor, Master, PhD)',
  [Taxonomy.MAJOR]: 'Field of study/major',
  [Taxonomy.GRAD_DATE]: 'Graduation date',
  [Taxonomy.GRAD_YEAR]: 'Graduation year',
  [Taxonomy.GRAD_MONTH]: 'Graduation month',
  [Taxonomy.START_DATE]: 'Start date (job/education)',
  [Taxonomy.END_DATE]: 'End date (job/education)',
  [Taxonomy.WORK_AUTH]: 'Work authorization status',
  [Taxonomy.NEED_SPONSORSHIP]: 'Visa sponsorship requirement',
  [Taxonomy.RESUME_TEXT]: 'Resume/CV content',
  [Taxonomy.SALARY]: 'Salary expectation',
  [Taxonomy.EEO_GENDER]: 'Gender (EEO)',
  [Taxonomy.EEO_ETHNICITY]: 'Race/ethnicity (EEO)',
  [Taxonomy.EEO_VETERAN]: 'Veteran status (EEO)',
  [Taxonomy.EEO_DISABILITY]: 'Disability status (EEO)',
  [Taxonomy.GOV_ID]: 'Government ID (SSN, etc.)',
  [Taxonomy.UNKNOWN]: 'Unknown/unrecognized field',
}

const DEFAULT_CONFIG: LLMConfig = {
  enabled: false,
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
}

export class LLMParser implements IFieldParser {
  name = 'LLMParser'
  priority = 50
  
  private cache = new Map<string, { result: CandidateType[]; timestamp: number }>()
  private config: LLMConfig = DEFAULT_CONFIG
  private cacheTimeout = 300000

  async loadConfig(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('llmConfig')
      if (result.llmConfig) {
        this.config = { ...DEFAULT_CONFIG, ...result.llmConfig }
      }
    } catch {
      this.config = DEFAULT_CONFIG
    }
  }

  canParse(_context: FieldContext): boolean {
    return this.config.enabled && !!this.config.apiKey
  }

  async parse(context: FieldContext): Promise<CandidateType[]> {
    await this.loadConfig()
    
    if (!this.canParse(context)) {
      return []
    }

    const cacheKey = this.getCacheKey(context)
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result
    }

    try {
      const metadata = this.extractMetadata(context)
      const scrubbed = this.scrubPII(metadata)
      const result = await this.callLLM(scrubbed)
      
      this.cache.set(cacheKey, { result, timestamp: Date.now() })
      return result
    } catch (error) {
      console.error('LLMParser error:', error)
      return []
    }
  }

  private getCacheKey(context: FieldContext): string {
    const key = [
      context.labelText,
      context.attributes.name || '',
      context.attributes.id || '',
      context.attributes.type || '',
      context.attributes.placeholder || '',
      context.optionsText.slice(0, 5).join(','),
    ].join('|')
    
    return btoa(key).slice(0, 64)
  }

  private extractMetadata(context: FieldContext): FieldMetadata {
    return {
      tagName: context.element.tagName.toLowerCase(),
      type: context.attributes.type || '',
      name: context.attributes.name || '',
      id: context.attributes.id || '',
      placeholder: context.attributes.placeholder || '',
      labelText: context.labelText,
      sectionTitle: context.sectionTitle,
      options: context.optionsText.slice(0, 10),
      ariaLabel: context.attributes['aria-label'] || '',
    }
  }

  private scrubPII(metadata: FieldMetadata): FieldMetadata {
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const phonePattern = /[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{4,6}/g
    const ssnPattern = /\d{3}[-\s]?\d{2}[-\s]?\d{4}/g

    const scrub = (text: string): string => {
      return text
        .replace(emailPattern, '[EMAIL]')
        .replace(phonePattern, '[PHONE]')
        .replace(ssnPattern, '[SSN]')
    }

    return {
      ...metadata,
      labelText: scrub(metadata.labelText),
      placeholder: scrub(metadata.placeholder),
      options: metadata.options.map(scrub),
      ariaLabel: scrub(metadata.ariaLabel),
    }
  }

  private async callLLM(metadata: FieldMetadata): Promise<CandidateType[]> {
    const prompt = this.buildPrompt(metadata)
    
    switch (this.config.provider) {
      case 'openai':
        return this.callOpenAI(prompt)
      case 'anthropic':
        return this.callAnthropic(prompt)
      case 'custom':
        return this.callCustom(prompt)
      default:
        return []
    }
  }

  private buildPrompt(metadata: FieldMetadata): string {
    const taxonomyList = Object.entries(TAXONOMY_DESCRIPTIONS)
      .filter(([key]) => key !== 'UNKNOWN')
      .map(([key, desc]) => `- ${key}: ${desc}`)
      .join('\n')

    return `Classify this form field into one of these types:

${taxonomyList}

Form Field Information:
- Element: <${metadata.tagName}>
- Type: ${metadata.type || 'text'}
- Name attribute: ${metadata.name || 'none'}
- ID attribute: ${metadata.id || 'none'}
- Label text: ${metadata.labelText || 'none'}
- Placeholder: ${metadata.placeholder || 'none'}
- Section/heading: ${metadata.sectionTitle || 'none'}
- ARIA label: ${metadata.ariaLabel || 'none'}
${metadata.options.length > 0 ? `- Options: ${metadata.options.join(', ')}` : ''}

Respond with JSON only: {"type": "TAXONOMY_TYPE", "confidence": 0.0-1.0}
If unsure, respond: {"type": "UNKNOWN", "confidence": 0}`
  }

  private async callOpenAI(prompt: string): Promise<CandidateType[]> {
    const endpoint = this.config.endpoint || 'https://api.openai.com/v1/chat/completions'
    const model = this.config.model || 'gpt-4o-mini'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a form field classifier. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 50,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return this.parseResponse(data.choices?.[0]?.message?.content || '')
  }

  private async callAnthropic(prompt: string): Promise<CandidateType[]> {
    const endpoint = this.config.endpoint || 'https://api.anthropic.com/v1/messages'
    const model = this.config.model || 'claude-3-haiku-20240307'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 50,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    const data = await response.json()
    return this.parseResponse(data.content?.[0]?.text || '')
  }

  private async callCustom(prompt: string): Promise<CandidateType[]> {
    if (!this.config.endpoint) {
      throw new Error('Custom endpoint not configured')
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ prompt }),
    })

    if (!response.ok) {
      throw new Error(`Custom API error: ${response.status}`)
    }

    const data = await response.json()
    return this.parseResponse(data.response || data.content || '')
  }

  private parseResponse(content: string): CandidateType[] {
    try {
      const jsonMatch = content.match(/\{[^}]+\}/)
      if (!jsonMatch) return []

      const parsed = JSON.parse(jsonMatch[0])
      const type = parsed.type as Taxonomy
      const confidence = Math.min(Math.max(parsed.confidence || 0.5, 0), 1)

      if (!Object.values(Taxonomy).includes(type)) {
        return []
      }

      if (type === Taxonomy.UNKNOWN) {
        return []
      }

      return [{
        type,
        score: confidence * 0.8,
        reasons: ['LLM classification'],
      }]
    } catch {
      return []
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export async function configureLLM(config: Partial<LLMConfig>): Promise<void> {
  const current = await chrome.storage.local.get('llmConfig')
  const updated = { ...DEFAULT_CONFIG, ...current.llmConfig, ...config }
  await chrome.storage.local.set({ llmConfig: updated })
}

export async function getLLMConfig(): Promise<LLMConfig> {
  const result = await chrome.storage.local.get('llmConfig')
  return { ...DEFAULT_CONFIG, ...result.llmConfig }
}
