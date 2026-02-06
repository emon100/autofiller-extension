import { FieldContext, CandidateType, Taxonomy, IFieldParser } from '@/types'
import { collectAncestorContext } from '@/scanner'
import { parseJSONSafe } from '@/utils/jsonRepair'
import { storage, isExtensionContextValid } from '@/storage'
import { backgroundFetch } from '@/utils/backgroundFetch'

const API_BASE_URL = 'https://www.onefil.help/api'

interface LLMConfig {
  enabled: boolean
  useCustomApi: boolean  // If true, use custom API; if false, use backend API
  provider: 'openai' | 'anthropic' | 'dashscope' | 'deepseek' | 'zhipu' | 'custom'
  apiKey: string
  endpoint?: string
  model?: string
  disableThinking?: boolean
}

interface FieldMetadata {
  index: number
  tagName: string
  type: string
  name: string
  id: string
  placeholder: string
  labelText: string
  sectionTitle: string
  options: string[]
  ariaLabel: string
  surroundingText: string
  ancestorCandidates: Array<{ text: string; depth: number; type: string }>
}

interface BatchClassificationResult {
  index: number
  type: string
  confidence: number
}

/**
 * Context about already-classified fields in the same form
 */
export interface FilledFieldContext {
  type: Taxonomy
  labelText: string
  value?: string  // Optional: scrubbed value if available
}

/**
 * Page-level context to help LLM understand form type
 */
export interface PageContext {
  title: string
  urlPath: string
  keywords: string[]
}

/**
 * Historical example for few-shot learning
 */
export interface FewShotExample {
  labelText: string
  type: Taxonomy
  confidence: number
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
  [Taxonomy.SUMMARY]: 'Professional summary/objective',
  [Taxonomy.GPA]: 'Grade point average',
  [Taxonomy.COMPANY_NAME]: 'Company/employer name',
  [Taxonomy.JOB_TITLE]: 'Job title/position',
  [Taxonomy.JOB_DESCRIPTION]: 'Job duties/responsibilities',
  [Taxonomy.SKILLS]: 'Skills and competencies',
  [Taxonomy.UNKNOWN]: 'Unknown/unrecognized field',
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

const DEFAULT_CONFIG: LLMConfig = {
  enabled: true,  // Enabled by default (uses backend API)
  useCustomApi: false,  // Default to backend API
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
}

// Batch size for LLM requests
const BATCH_SIZE = 10

export class LLMParser implements IFieldParser {
  name = 'LLMParser'
  priority = 50

  private cache = new Map<string, { result: CandidateType[]; timestamp: number }>()
  private config: LLMConfig | null = null
  private configLoaded = false
  private cacheTimeout = 300000

  async ensureConfigLoaded(): Promise<LLMConfig> {
    if (!this.configLoaded) {
      try {
        const result = await chrome.storage.local.get('llmConfig')
        this.config = result.llmConfig ? { ...DEFAULT_CONFIG, ...result.llmConfig } : DEFAULT_CONFIG
      } catch {
        this.config = DEFAULT_CONFIG
      }
      this.configLoaded = true
    }
    return this.config!
  }

  canParse(_context: FieldContext): boolean {
    // Always return true, actual check is in parse()
    return true
  }

  async parse(context: FieldContext): Promise<CandidateType[]> {
    const config = await this.ensureConfigLoaded()

    if (!config.enabled) {
      return []
    }

    // If using custom API, require API key
    if (config.useCustomApi && !config.apiKey) {
      return []
    }

    // If using backend API, require user to be logged in (skip in test environment)
    if (!config.useCustomApi) {
      if (!isExtensionContextValid()) {
        // In test environment, skip backend API
        return []
      }
      const token = await storage.auth.getAccessToken()
      if (!token) {
        console.log('[LLMParser] Skipped - not logged in for backend API')
        return []
      }
    }

    const cacheKey = this.getCacheKey(context)
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result
    }

    try {
      const metadata = this.extractMetadata(context, 0)
      const scrubbed = this.scrubPII(metadata)
      console.log('[LLMParser] Calling LLM for single field:', scrubbed.labelText || scrubbed.surroundingText.slice(0, 50))
      const result = await this.callLLMSingle(scrubbed)
      console.log('[LLMParser] Result:', result)

      this.cache.set(cacheKey, { result, timestamp: Date.now() })
      return result
    } catch (error) {
      console.error('[LLMParser] Error:', error)
      return []
    }
  }

  /**
   * Batch parse multiple fields - sends fields in batches of BATCH_SIZE
   * Returns a Map from field index to candidates
   *
   * @param contexts - Array of field contexts to classify
   * @param filledFields - Optional array of already-classified fields for context
   * @param pageContext - Optional page-level context (title, URL keywords)
   * @param fewShotExamples - Optional historical examples for few-shot learning
   */
  async parseBatch(
    contexts: FieldContext[],
    filledFields?: FilledFieldContext[],
    pageContext?: PageContext,
    fewShotExamples?: FewShotExample[]
  ): Promise<Map<number, CandidateType[]>> {
    const config = await this.ensureConfigLoaded()
    const results = new Map<number, CandidateType[]>()

    if (!config.enabled) {
      console.log('[LLMParser] Batch parse skipped - not enabled')
      return results
    }

    // If using custom API, require API key
    if (config.useCustomApi && !config.apiKey) {
      console.log('[LLMParser] Batch parse skipped - custom API enabled but no API key')
      return results
    }

    // If using backend API, require user to be logged in (skip in test environment)
    if (!config.useCustomApi) {
      if (!isExtensionContextValid()) {
        console.log('[LLMParser] Batch parse skipped - test environment')
        return results
      }
      const token = await storage.auth.getAccessToken()
      if (!token) {
        console.log('[LLMParser] Batch parse skipped - not logged in for backend API')
        return results
      }
    }

    // Check cache first and collect uncached fields
    const uncachedFields: Array<{ index: number; context: FieldContext }> = []

    for (let i = 0; i < contexts.length; i++) {
      const cacheKey = this.getCacheKey(contexts[i])
      const cached = this.cache.get(cacheKey)

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        results.set(i, cached.result)
      } else {
        uncachedFields.push({ index: i, context: contexts[i] })
      }
    }

    console.log(`[LLMParser] Batch parse: ${contexts.length} total, ${results.size} cached, ${uncachedFields.length} to process`)

    if (uncachedFields.length === 0) {
      return results
    }

    // Process uncached fields in batches
    const batches: Array<Array<{ index: number; context: FieldContext }>> = []
    for (let i = 0; i < uncachedFields.length; i += BATCH_SIZE) {
      batches.push(uncachedFields.slice(i, i + BATCH_SIZE))
    }

    console.log(`[LLMParser] Processing ${batches.length} batches of up to ${BATCH_SIZE} fields each`)

    // Process batches sequentially
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`[LLMParser] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} fields)`)

      try {
        const batchResults = await this.processSingleBatch(batch, filledFields, pageContext, fewShotExamples)

        // Store results and update cache
        for (const [fieldIndex, candidates] of batchResults) {
          results.set(fieldIndex, candidates)
          const cacheKey = this.getCacheKey(contexts[fieldIndex])
          this.cache.set(cacheKey, { result: candidates, timestamp: Date.now() })
        }
      } catch (error) {
        console.error(`[LLMParser] Batch ${batchIndex + 1} failed:`, error)
        // On error, set empty results for this batch
        for (const { index } of batch) {
          results.set(index, [])
        }
      }

      // Small delay between batches to avoid rate limiting
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }

  private async processSingleBatch(
    batch: Array<{ index: number; context: FieldContext }>,
    filledFields?: FilledFieldContext[],
    pageContext?: PageContext,
    fewShotExamples?: FewShotExample[]
  ): Promise<Map<number, CandidateType[]>> {
    const results = new Map<number, CandidateType[]>()
    const config = this.config!

    // Extract and scrub metadata for all fields
    const metadataList = batch.map(({ index, context }) => {
      const metadata = this.extractMetadata(context, index)
      return this.scrubPII(metadata)
    })

    let response: BatchClassificationResult[]

    // Use backend API if not using custom API
    if (!config.useCustomApi) {
      response = await this.callBackendAPI(metadataList)
    } else {
      // Use custom API
      const prompt = this.buildBatchPrompt(metadataList, filledFields, pageContext, fewShotExamples)
      if (config.provider === 'anthropic') {
        response = await this.callAnthropicBatch(prompt)
      } else {
        response = await this.callOpenAICompatibleBatch(prompt)
      }
    }

    // Map results back to field indices
    for (const item of response) {
      const batchItem = batch.find(b => b.index === item.index)
      if (!batchItem) continue

      const type = item.type as Taxonomy
      const confidence = Math.min(Math.max(item.confidence || 0.5, 0), 1)

      if (!Object.values(Taxonomy).includes(type) || type === Taxonomy.UNKNOWN) {
        results.set(item.index, [])
        continue
      }

      results.set(item.index, [{
        type,
        score: confidence * 0.85,
        reasons: [`LLM batch classification (${confidence.toFixed(2)} confidence)`],
      }])
    }

    // Ensure all batch items have results (even if empty)
    for (const { index } of batch) {
      if (!results.has(index)) {
        results.set(index, [])
      }
    }

    return results
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

    return btoa(encodeURIComponent(key)).slice(0, 64)
  }

  private extractMetadata(context: FieldContext, index: number): FieldMetadata {
    const { ancestorCandidates, surroundingText } = this.extractAncestorInfo(context.element)

    return {
      index,
      tagName: context.element.tagName.toLowerCase(),
      type: context.attributes.type || '',
      name: context.attributes.name || '',
      id: context.attributes.id || '',
      placeholder: context.attributes.placeholder || '',
      labelText: context.labelText,
      sectionTitle: context.sectionTitle,
      options: context.optionsText.slice(0, 10),
      ariaLabel: context.attributes['aria-label'] || '',
      surroundingText,
      ancestorCandidates,
    }
  }

  private extractAncestorInfo(element: HTMLElement): {
    ancestorCandidates: Array<{ text: string; depth: number; type: string }>
    surroundingText: string
  } {
    try {
      const candidates = collectAncestorContext(element)
      const ancestorCandidates = candidates.map(c => ({
        text: c.text.slice(0, 200),
        depth: c.depth,
        type: c.type
      }))

      const surroundingText = this.selectBestCandidateText(candidates)
      return { ancestorCandidates, surroundingText }
    } catch {
      return {
        ancestorCandidates: [],
        surroundingText: this.extractFallbackSurroundingText(element)
      }
    }
  }

  private selectBestCandidateText(candidates: Array<{ text: string; depth: number; type: string }>): string {
    if (candidates.length === 0) return ''

    const sorted = [...candidates].sort((a, b) => {
      if (a.type === 'label' && b.type !== 'label') return -1
      if (b.type === 'label' && a.type !== 'label') return 1
      return a.depth - b.depth
    })
    return sorted[0].text.slice(0, 200)
  }

  private extractFallbackSurroundingText(element: HTMLElement): string {
    const parent = element.closest('.form-group, .field, .input-group, [class*="form"], [class*="field"]')
    if (parent?.textContent) {
      return parent.textContent.trim().slice(0, 200)
    }

    const prevSibling = element.previousElementSibling
    if (prevSibling?.textContent) {
      return prevSibling.textContent.trim().slice(0, 200)
    }

    return element.parentElement?.textContent?.trim().slice(0, 200) || ''
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
      surroundingText: scrub(metadata.surroundingText),
      ancestorCandidates: metadata.ancestorCandidates.map(c => ({
        ...c,
        text: scrub(c.text)
      })),
    }
  }

  private buildBatchPrompt(
    metadataList: FieldMetadata[],
    filledFields?: FilledFieldContext[],
    pageContext?: PageContext,
    fewShotExamples?: FewShotExample[]
  ): string {
    const taxonomyList = this.buildTaxonomyList()
    const fieldsDescription = metadataList
      .map(metadata => `[Field ${metadata.index}]\n${this.formatMetadataContext(metadata)}`)
      .join('\n\n')

    // Build multi-faceted context sections
    const contextSections: string[] = []

    // Page Context
    if (pageContext) {
      const pageSection = [
        '## Page Context',
        `- Title: ${pageContext.title}`,
        `- URL Path: ${pageContext.urlPath}`,
        pageContext.keywords.length > 0 ? `- Keywords: ${pageContext.keywords.join(', ')}` : '',
      ].filter(Boolean).join('\n')
      contextSections.push(pageSection)
    }

    // Form State Context (already-filled fields)
    if (filledFields && filledFields.length > 0) {
      const filledSection = [
        '## Form State (already classified fields)',
        ...filledFields.slice(0, 10).map(f =>
          `- "${f.labelText}" → ${f.type}${f.value ? ` (value: ${f.value})` : ''}`
        ),
      ].join('\n')
      contextSections.push(filledSection)
    }

    // Few-shot examples from history
    if (fewShotExamples && fewShotExamples.length > 0) {
      const exampleSection = [
        '## Past Examples (from user history)',
        ...fewShotExamples.map(ex =>
          `- Label "${ex.labelText}" → ${ex.type} (confidence: ${ex.confidence.toFixed(2)})`
        ),
      ].join('\n')
      contextSections.push(exampleSection)
    }

    const contextBlock = contextSections.length > 0
      ? `${contextSections.join('\n\n')}\n\n`
      : ''

    return `Classify these ${metadataList.length} form fields. Available types:

${taxonomyList}

${contextBlock}Fields to classify:

${fieldsDescription}

Return a JSON array with classification for each field:
[{"index": 0, "type": "TYPE_NAME", "confidence": 0.0-1.0}, ...]

Rules:
- Use UNKNOWN with confidence 0 if uncertain
- Each field must have an entry in the response
- Confidence should reflect how certain you are about the classification
- Pay attention to the "Ancestor text" - it often contains the question being asked
- Use the Page Context and Form State to understand field relationships
- Learn from Past Examples to match similar field patterns`
  }

  private buildSinglePrompt(metadata: FieldMetadata): string {
    const taxonomyList = this.buildTaxonomyList()
    const contextParts = this.formatMetadataContext(metadata)

    return `Classify this form field. Available types:

${taxonomyList}

Field context:
${contextParts}

Return JSON only: {"type": "TYPE_NAME", "confidence": 0.0-1.0}
If uncertain: {"type": "UNKNOWN", "confidence": 0}
Note: "Ancestor text candidates" shows text found in parent elements - this often contains the actual question.`
  }

  private buildTaxonomyList(): string {
    return Object.entries(TAXONOMY_DESCRIPTIONS)
      .filter(([key]) => key !== 'UNKNOWN')
      .map(([key, desc]) => `- ${key}: ${desc}`)
      .join('\n')
  }

  private formatMetadataContext(metadata: FieldMetadata): string {
    const parts: string[] = []

    if (metadata.tagName) parts.push(`Element: <${metadata.tagName}>`)
    if (metadata.type) parts.push(`Type: ${metadata.type}`)
    if (metadata.name) parts.push(`Name: ${metadata.name}`)
    if (metadata.id) parts.push(`ID: ${metadata.id}`)
    if (metadata.labelText) parts.push(`Label: ${metadata.labelText}`)
    if (metadata.placeholder) parts.push(`Placeholder: ${metadata.placeholder}`)
    if (metadata.sectionTitle) parts.push(`Section: ${metadata.sectionTitle}`)
    if (metadata.ariaLabel) parts.push(`ARIA: ${metadata.ariaLabel}`)
    if (metadata.options.length > 0) parts.push(`Options: ${metadata.options.join(', ')}`)

    if (metadata.ancestorCandidates.length > 0) {
      const candidatesStr = metadata.ancestorCandidates
        .slice(0, 3)
        .map(c => `[${c.type}@depth${c.depth}] ${c.text.slice(0, 100)}`)
        .join('; ')
      parts.push(`Ancestor text: ${candidatesStr}`)
    } else if (metadata.surroundingText) {
      parts.push(`Context: ${metadata.surroundingText.slice(0, 100)}`)
    }

    return parts.join('\n')
  }

  private async callLLMSingle(metadata: FieldMetadata): Promise<CandidateType[]> {
    const config = this.config!

    // Route through backend API when not using custom API
    if (!config.useCustomApi) {
      const results = await this.callBackendAPI([metadata])
      if (results.length === 0) return []
      const r = results[0]
      return [{ type: r.type as Taxonomy, score: r.confidence, reasons: ['backend-api'] }]
    }

    if (config.provider === 'anthropic') {
      return this.callAnthropicSingle(this.buildSinglePrompt(metadata))
    }
    return this.callOpenAICompatibleSingle(this.buildSinglePrompt(metadata))
  }

  private async callOpenAICompatibleSingle(prompt: string): Promise<CandidateType[]> {
    const config = this.config!
    const endpoint = config.endpoint || PROVIDER_ENDPOINTS[config.provider] || PROVIDER_ENDPOINTS.openai
    const model = config.model || DEFAULT_MODELS[config.provider] || 'gpt-4o-mini'

    // 智谱AI的某些模型只支持流式模式
    const needsStream = config.provider === 'zhipu' || (model && model.startsWith('glm-4'))

    // 构建请求体
    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: 'You are a form field classifier. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 100,
    }

    // 流式模式
    if (needsStream) {
      requestBody.stream = true
    }

    // 禁用thinking模式
    if (config.disableThinking) {
      requestBody.enable_thinking = false
      requestBody.thinking = { type: 'disabled' }
    }

    const response = await backgroundFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.body}`)
    }

    const data = JSON.parse(response.body)
    const content = data.choices?.[0]?.message?.content || ''
    return this.parseSingleResponse(content)
  }

  private async callAnthropicSingle(prompt: string): Promise<CandidateType[]> {
    const config = this.config!
    const endpoint = config.endpoint || PROVIDER_ENDPOINTS.anthropic
    const model = config.model || DEFAULT_MODELS.anthropic

    const response = await backgroundFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error ${response.status}: ${response.body}`)
    }

    const data = JSON.parse(response.body)
    const content = data.content?.[0]?.text || ''
    return this.parseSingleResponse(content)
  }

  /**
   * Call backend API for classification (uses user's credits)
   */
  private async callBackendAPI(fields: FieldMetadata[]): Promise<BatchClassificationResult[]> {
    const token = await storage.auth.getAccessToken()
    if (!token) {
      throw new Error('Not logged in')
    }

    console.log(`[LLMParser] Calling backend API for ${fields.length} fields`)

    const response = await backgroundFetch(`${API_BASE_URL}/llm/classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ fields }),
    })

    if (!response.ok) {
      const errorData = (() => { try { return JSON.parse(response.body) } catch { return {} } })()
      if (response.status === 402) {
        throw new Error(`Insufficient credits: ${errorData.balance || 0} remaining`)
      }
      throw new Error(`Backend API error ${response.status}: ${errorData.error || 'Unknown'}`)
    }

    const data = JSON.parse(response.body)
    if (!data.success || !Array.isArray(data.results)) {
      throw new Error('Invalid backend response')
    }

    console.log(`[LLMParser] Backend API success, used ${data.creditsUsed} credits`)
    return data.results as BatchClassificationResult[]
  }

  private async callOpenAICompatibleBatch(prompt: string): Promise<BatchClassificationResult[]> {
    const config = this.config!
    const endpoint = config.endpoint || PROVIDER_ENDPOINTS[config.provider] || PROVIDER_ENDPOINTS.openai
    const model = config.model || DEFAULT_MODELS[config.provider] || 'gpt-4o-mini'

    console.log(`[LLMParser] Calling ${config.provider} batch at ${endpoint} with model ${model}`)

    // 智谱AI的某些模型只支持流式模式
    const needsStream = config.provider === 'zhipu' || (model && model.startsWith('glm-4'))

    // 构建请求体
    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: 'You are a form field classifier. Respond only with valid JSON array.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 1000, // More tokens for batch response
    }

    // 流式模式
    if (needsStream) {
      requestBody.stream = true
    }

    // 禁用thinking模式
    if (config.disableThinking) {
      requestBody.enable_thinking = false
      requestBody.thinking = { type: 'disabled' }
    }

    const response = await backgroundFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.body}`)
    }

    const data = JSON.parse(response.body)
    const content = data.choices?.[0]?.message?.content || ''
    return this.parseBatchResponse(content)
  }

  private async callAnthropicBatch(prompt: string): Promise<BatchClassificationResult[]> {
    const config = this.config!
    const endpoint = config.endpoint || PROVIDER_ENDPOINTS.anthropic
    const model = config.model || DEFAULT_MODELS.anthropic

    console.log(`[LLMParser] Calling Anthropic batch at ${endpoint} with model ${model}`)

    const response = await backgroundFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error ${response.status}: ${response.body}`)
    }

    const data = JSON.parse(response.body)
    const content = data.content?.[0]?.text || ''
    return this.parseBatchResponse(content)
  }

  private parseSingleResponse(content: string): CandidateType[] {
    console.log('[LLMParser] Raw single response:', content)
    const parsed = parseJSONSafe<{ type?: string; confidence?: number }>(content, {})

    if (!parsed.type) {
      console.log('[LLMParser] No type found in response')
      return []
    }

    const type = parsed.type as Taxonomy
    const confidence = Math.min(Math.max(parsed.confidence || 0.5, 0), 1)

    if (!Object.values(Taxonomy).includes(type) || type === Taxonomy.UNKNOWN) {
      return []
    }

    return [{
      type,
      score: confidence * 0.85,
      reasons: [`LLM classification (${confidence.toFixed(2)} confidence)`],
    }]
  }

  private parseBatchResponse(content: string): BatchClassificationResult[] {
    console.log('[LLMParser] Raw batch response:', content)

    // Use JSON repair for robust parsing
    const parsed = parseJSONSafe<BatchClassificationResult[] | Record<string, unknown>>(content, [])

    // Handle case where parseJSONSafe returns an object instead of array
    if (Array.isArray(parsed)) {
      console.log(`[LLMParser] Parsed ${parsed.length} classifications`)
      return parsed
    }

    console.log('[LLMParser] Parsed result is not an array')
    return []
  }

  clearCache(): void {
    this.cache.clear()
  }

  resetConfig(): void {
    this.configLoaded = false
    this.config = null
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
