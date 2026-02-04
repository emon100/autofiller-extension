/**
 * KnowledgeNormalizer - Standardizes user profile data
 *
 * Architecture: LLM-first with local rules as fallback
 * - Primary: LLM handles standardization (flexible, handles edge cases)
 * - Fallback: Local rules when LLM unavailable (fast, offline)
 */

import { Taxonomy, AnswerValue, ExperienceEntry } from '@/types'
import { parseJSONSafe } from '@/utils/jsonRepair'
import {
  LLMConfig,
  callLLM,
  loadLLMConfig,
  resetLLMConfigCache,
  MONTH_MAP,
} from '@/utils/llmProvider'

// ============================================================================
// Type Definitions
// ============================================================================

export interface NormalizationResult<T = string> {
  original: string
  normalized: T
  confidence: number
  method: 'llm' | 'rule' | 'passthrough'
  aliases?: string[]
}

export interface AddressComponents {
  country?: string
  countryCode?: string
  state?: string
  city?: string
  street?: string
  postalCode?: string
}

export interface DegreeInfo {
  level: 'high_school' | 'associate' | 'bachelor' | 'master' | 'doctoral' | 'professional' | 'other'
  standardName: string
  abbreviation: string
}

export interface SkillInfo {
  name: string
  category: 'language' | 'framework' | 'tool' | 'database' | 'cloud' | 'soft_skill' | 'other'
  aliases: string[]
}

// LLMConfig imported from @/utils/llmProvider

// ============================================================================
// LLM Provider Configuration
// ============================================================================

// PROVIDER_ENDPOINTS and DEFAULT_MODELS imported from @/utils/llmProvider

// ============================================================================
// Local Fallback Rules (used when LLM unavailable)
// ============================================================================

const DEGREE_FALLBACK: Record<string, DegreeInfo> = {
  "bachelor's": { level: 'bachelor', standardName: "Bachelor's Degree", abbreviation: 'BS' },
  'bs': { level: 'bachelor', standardName: "Bachelor's Degree", abbreviation: 'BS' },
  'ba': { level: 'bachelor', standardName: "Bachelor's Degree", abbreviation: 'BA' },
  '本科': { level: 'bachelor', standardName: "Bachelor's Degree", abbreviation: 'BS' },
  "master's": { level: 'master', standardName: "Master's Degree", abbreviation: 'MS' },
  'ms': { level: 'master', standardName: "Master's Degree", abbreviation: 'MS' },
  'mba': { level: 'master', standardName: 'MBA', abbreviation: 'MBA' },
  '硕士': { level: 'master', standardName: "Master's Degree", abbreviation: 'MS' },
  'phd': { level: 'doctoral', standardName: 'PhD', abbreviation: 'PhD' },
  '博士': { level: 'doctoral', standardName: 'PhD', abbreviation: 'PhD' },
}

const SKILL_FALLBACK: Record<string, SkillInfo> = {
  'javascript': { name: 'JavaScript', category: 'language', aliases: ['JS'] },
  'js': { name: 'JavaScript', category: 'language', aliases: ['JS'] },
  'typescript': { name: 'TypeScript', category: 'language', aliases: ['TS'] },
  'python': { name: 'Python', category: 'language', aliases: [] },
  'react': { name: 'React', category: 'framework', aliases: ['ReactJS'] },
  'vue': { name: 'Vue.js', category: 'framework', aliases: ['Vue'] },
  'node': { name: 'Node.js', category: 'framework', aliases: ['NodeJS'] },
}

const COUNTRY_FALLBACK: Record<string, { name: string; code: string }> = {
  'us': { name: 'United States', code: 'US' },
  'usa': { name: 'United States', code: 'US' },
  '美国': { name: 'United States', code: 'US' },
  'china': { name: 'China', code: 'CN' },
  '中国': { name: 'China', code: 'CN' },
  'uk': { name: 'United Kingdom', code: 'GB' },
}

// ============================================================================
// KnowledgeNormalizer Class
// ============================================================================

export class KnowledgeNormalizer {
  private config: LLMConfig | null = null
  private configLoaded = false

  constructor() {
    this.initConfig()
  }

  private async initConfig(): Promise<void> {
    this.config = await loadLLMConfig()
    this.configLoaded = true
  }

  private async ensureConfigLoaded(): Promise<LLMConfig | null> {
    if (!this.configLoaded) {
      this.config = await loadLLMConfig()
      this.configLoaded = true
    }
    return this.config
  }

  private isLLMAvailable(): boolean {
    return !!(this.config?.enabled && this.config?.apiKey)
  }

  // --------------------------------------------------------------------------
  // Main Normalization API (LLM-first)
  // --------------------------------------------------------------------------

  /**
   * Normalize a degree value
   * LLM-first with local fallback
   */
  async normalizeDegree(degree: string): Promise<NormalizationResult<DegreeInfo>> {
    await this.ensureConfigLoaded()

    if (this.isLLMAvailable()) {
      try {
        const result = await this.llmNormalizeDegree(degree)
        if (result.confidence >= 0.7) return result
      } catch (e) {
        console.warn('[KnowledgeNormalizer] LLM degree normalization failed, using fallback:', e)
      }
    }

    return this.fallbackNormalizeDegree(degree)
  }

  /**
   * Normalize a major/field of study
   */
  async normalizeMajor(major: string): Promise<NormalizationResult<string>> {
    await this.ensureConfigLoaded()

    if (this.isLLMAvailable()) {
      try {
        const result = await this.llmNormalize('major', major, `
Standardize this field of study/major to a common format.
- Use standard English names (e.g., "Computer Science", "Business Administration")
- Include common abbreviations as aliases
- For Chinese majors, translate to English equivalent`)
        if (result.confidence >= 0.7) return result
      } catch (e) {
        console.warn('[KnowledgeNormalizer] LLM major normalization failed:', e)
      }
    }

    return this.fallbackNormalizeMajor(major)
  }

  /**
   * Normalize a skill name
   */
  async normalizeSkill(skill: string): Promise<NormalizationResult<SkillInfo>> {
    await this.ensureConfigLoaded()

    if (this.isLLMAvailable()) {
      try {
        const result = await this.llmNormalizeSkill(skill)
        if (result.confidence >= 0.7) return result
      } catch (e) {
        console.warn('[KnowledgeNormalizer] LLM skill normalization failed:', e)
      }
    }

    return this.fallbackNormalizeSkill(skill)
  }

  /**
   * Normalize a list of skills (with deduplication)
   */
  async normalizeSkills(skills: string[]): Promise<SkillInfo[]> {
    const seen = new Set<string>()
    const result: SkillInfo[] = []

    // Batch normalize with LLM if available
    await this.ensureConfigLoaded()
    if (this.isLLMAvailable() && skills.length > 0) {
      try {
        const batchResult = await this.llmNormalizeSkillsBatch(skills)
        for (const info of batchResult) {
          const key = info.name.toLowerCase()
          if (!seen.has(key)) {
            seen.add(key)
            result.push(info)
          }
        }
        return result
      } catch (e) {
        console.warn('[KnowledgeNormalizer] LLM batch skill normalization failed:', e)
      }
    }

    // Fallback: normalize individually
    for (const skill of skills) {
      const normalized = await this.normalizeSkill(skill)
      const key = normalized.normalized.name.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        result.push(normalized.normalized)
      }
    }

    return result
  }

  /**
   * Normalize a company name
   */
  async normalizeCompany(company: string): Promise<NormalizationResult<string>> {
    await this.ensureConfigLoaded()

    if (this.isLLMAvailable()) {
      try {
        const result = await this.llmNormalize('company', company, `
Clean and standardize this company name:
- Remove suffixes like Inc., Ltd., LLC, Corp., GmbH, 有限公司, etc.
- Keep the core brand name
- Fix capitalization
- Do NOT translate company names`)
        if (result.confidence >= 0.7) return result
      } catch (e) {
        console.warn('[KnowledgeNormalizer] LLM company normalization failed:', e)
      }
    }

    return this.fallbackNormalizeCompany(company)
  }

  /**
   * Normalize a location/address
   */
  async normalizeLocation(location: string): Promise<NormalizationResult<AddressComponents>> {
    await this.ensureConfigLoaded()

    if (this.isLLMAvailable()) {
      try {
        const result = await this.llmNormalizeLocation(location)
        if (result.confidence >= 0.6) return result
      } catch (e) {
        console.warn('[KnowledgeNormalizer] LLM location normalization failed:', e)
      }
    }

    return this.fallbackNormalizeLocation(location)
  }

  /**
   * Normalize work authorization status
   */
  async normalizeWorkAuth(auth: string): Promise<NormalizationResult<{ standard: string; needsSponsorship: boolean }>> {
    await this.ensureConfigLoaded()

    if (this.isLLMAvailable()) {
      try {
        const result = await this.llmNormalizeWorkAuth(auth)
        if (result.confidence >= 0.7) return result
      } catch (e) {
        console.warn('[KnowledgeNormalizer] LLM work auth normalization failed:', e)
      }
    }

    return this.fallbackNormalizeWorkAuth(auth)
  }

  /**
   * Normalize phone number to E.164 format
   */
  normalizePhone(phone: string, defaultCountryCode = '+1'): NormalizationResult<string> {
    // Phone normalization is rule-based (no LLM needed)
    let digits = phone.replace(/[^\d+]/g, '')

    if (digits.startsWith('+')) {
      return { original: phone, normalized: digits, confidence: 0.95, method: 'rule' }
    }

    if (digits.length === 10) {
      return { original: phone, normalized: `+1${digits}`, confidence: 0.9, method: 'rule' }
    }

    if (digits.length === 11 && digits.startsWith('1')) {
      // Could be US with country code or China mobile
      if (/^1[3-9]\d{9}$/.test(digits)) {
        return { original: phone, normalized: `+86${digits}`, confidence: 0.85, method: 'rule' }
      }
      return { original: phone, normalized: `+${digits}`, confidence: 0.8, method: 'rule' }
    }

    return { original: phone, normalized: `${defaultCountryCode}${digits}`, confidence: 0.6, method: 'rule' }
  }

  /**
   * Normalize a date string to YYYY-MM format
   */
  normalizeDate(date: string): NormalizationResult<string> {
    // Date normalization is rule-based
    if (!date || date.toLowerCase() === 'present') {
      return { original: date, normalized: date?.toLowerCase() === 'present' ? 'present' : '', confidence: 1, method: 'passthrough' }
    }

    if (/^\d{4}-\d{2}$/.test(date)) {
      return { original: date, normalized: date, confidence: 1, method: 'passthrough' }
    }

    const chineseMatch = date.match(/(\d{4})年(\d{1,2})月?/)
    if (chineseMatch) {
      return { original: date, normalized: `${chineseMatch[1]}-${chineseMatch[2].padStart(2, '0')}`, confidence: 0.95, method: 'rule' }
    }

    // MONTH_MAP imported from @/utils/llmProvider
    const englishMatch = date.match(/([A-Za-z]+)\s+(\d{4})/)
    if (englishMatch) {
      const month = MONTH_MAP[englishMatch[1].toLowerCase().slice(0, 3)]
      if (month) {
        return { original: date, normalized: `${englishMatch[2]}-${month}`, confidence: 0.95, method: 'rule' }
      }
    }

    const yearMatch = date.match(/^(\d{4})$/)
    if (yearMatch) {
      return { original: date, normalized: `${yearMatch[1]}-01`, confidence: 0.7, method: 'rule' }
    }

    return { original: date, normalized: date, confidence: 0.3, method: 'passthrough' }
  }

  // --------------------------------------------------------------------------
  // Batch Processing
  // --------------------------------------------------------------------------

  /**
   * Normalize an entire AnswerValue
   */
  async normalizeAnswer(answer: AnswerValue): Promise<AnswerValue> {
    const normalized = { ...answer }

    switch (answer.type) {
      case Taxonomy.DEGREE: {
        const result = await this.normalizeDegree(answer.value)
        normalized.value = result.normalized.standardName
        normalized.aliases = result.aliases || []
        break
      }
      case Taxonomy.MAJOR: {
        const result = await this.normalizeMajor(answer.value)
        normalized.value = result.normalized
        normalized.aliases = result.aliases || []
        break
      }
      case Taxonomy.PHONE: {
        const result = this.normalizePhone(answer.value)
        normalized.value = result.normalized
        break
      }
      case Taxonomy.COMPANY_NAME: {
        const result = await this.normalizeCompany(answer.value)
        normalized.value = result.normalized
        break
      }
      case Taxonomy.LOCATION:
      case Taxonomy.CITY: {
        const result = await this.normalizeLocation(answer.value)
        if (answer.type === Taxonomy.CITY && result.normalized.city) {
          normalized.value = result.normalized.city
        }
        break
      }
      case Taxonomy.WORK_AUTH:
      case Taxonomy.NEED_SPONSORSHIP: {
        const result = await this.normalizeWorkAuth(answer.value)
        normalized.value = result.normalized.standard
        break
      }
      case Taxonomy.SKILLS: {
        const skills = answer.value.split(/[,;，；]/).map(s => s.trim()).filter(Boolean)
        const normalizedSkills = await this.normalizeSkills(skills)
        normalized.value = normalizedSkills.map(s => s.name).join(', ')
        break
      }
    }

    return normalized
  }

  /**
   * Normalize an ExperienceEntry
   */
  async normalizeExperience(entry: ExperienceEntry): Promise<ExperienceEntry> {
    const normalized = { ...entry, fields: { ...entry.fields } }

    if (entry.startDate) normalized.startDate = this.normalizeDate(entry.startDate).normalized
    if (entry.endDate) normalized.endDate = this.normalizeDate(entry.endDate).normalized

    if (entry.groupType === 'WORK') {
      if (normalized.fields[Taxonomy.COMPANY_NAME]) {
        normalized.fields[Taxonomy.COMPANY_NAME] = (await this.normalizeCompany(normalized.fields[Taxonomy.COMPANY_NAME]!)).normalized
      }
    }

    if (entry.groupType === 'EDUCATION') {
      if (normalized.fields[Taxonomy.DEGREE]) {
        const result = await this.normalizeDegree(normalized.fields[Taxonomy.DEGREE]!)
        normalized.fields[Taxonomy.DEGREE] = result.normalized.standardName
      }
      if (normalized.fields[Taxonomy.MAJOR]) {
        normalized.fields[Taxonomy.MAJOR] = (await this.normalizeMajor(normalized.fields[Taxonomy.MAJOR]!)).normalized
      }
      if (normalized.fields[Taxonomy.SCHOOL]) {
        normalized.fields[Taxonomy.SCHOOL] = (await this.normalizeCompany(normalized.fields[Taxonomy.SCHOOL]!)).normalized
      }
    }

    for (const field of [Taxonomy.START_DATE, Taxonomy.END_DATE, Taxonomy.GRAD_DATE]) {
      if (normalized.fields[field]) {
        normalized.fields[field] = this.normalizeDate(normalized.fields[field]!).normalized
      }
    }

    return normalized
  }

  // --------------------------------------------------------------------------
  // LLM Normalization Methods
  // --------------------------------------------------------------------------

  private async llmNormalizeDegree(degree: string): Promise<NormalizationResult<DegreeInfo>> {
    const prompt = `Standardize this academic degree to a common format.

Input: "${degree}"

Rules:
- Map to standard English degree names
- Identify the level: high_school, associate, bachelor, master, doctoral, professional, other
- Provide standard name and common abbreviation
- Handle Chinese degrees (本科=Bachelor's, 硕士=Master's, 博士=PhD)

Return JSON only:
{
  "level": "bachelor|master|doctoral|...",
  "standardName": "Bachelor's Degree",
  "abbreviation": "BS",
  "confidence": 0.0-1.0,
  "aliases": ["other forms"]
}`

    const response = await this.callLLMInternal(prompt)
    const parsed = this.parseJSON(response) as {
      level?: string
      standardName?: string
      abbreviation?: string
      confidence?: number
      aliases?: string[]
    }

    return {
      original: degree,
      normalized: {
        level: (parsed.level as DegreeInfo['level']) || 'other',
        standardName: parsed.standardName || degree,
        abbreviation: parsed.abbreviation || degree,
      },
      confidence: parsed.confidence || 0.8,
      method: 'llm',
      aliases: parsed.aliases,
    }
  }

  private async llmNormalizeSkill(skill: string): Promise<NormalizationResult<SkillInfo>> {
    const prompt = `Standardize this technical skill name.

Input: "${skill}"

Rules:
- Use official/common industry naming (e.g., "JavaScript" not "javascript")
- Categorize: language, framework, tool, database, cloud, soft_skill, other
- Include common aliases/abbreviations

Return JSON only:
{
  "name": "JavaScript",
  "category": "language",
  "aliases": ["JS", "js"],
  "confidence": 0.0-1.0
}`

    const response = await this.callLLMInternal(prompt)
    const parsed = this.parseJSON(response) as {
      name?: string
      category?: string
      aliases?: string[]
      confidence?: number
    }

    return {
      original: skill,
      normalized: {
        name: parsed.name || skill,
        category: (parsed.category as SkillInfo['category']) || 'other',
        aliases: parsed.aliases || [],
      },
      confidence: parsed.confidence || 0.8,
      method: 'llm',
      aliases: parsed.aliases,
    }
  }

  private async llmNormalizeSkillsBatch(skills: string[]): Promise<SkillInfo[]> {
    const prompt = `Standardize these technical skills.

Input: ${JSON.stringify(skills)}

Rules:
- Use official/common industry naming
- Categorize each: language, framework, tool, database, cloud, soft_skill, other
- Deduplicate (e.g., "JS" and "JavaScript" are the same)
- Include aliases for each

Return JSON array only:
[{"name": "JavaScript", "category": "language", "aliases": ["JS"]}]`

    const response = await this.callLLMInternal(prompt)
    const parsed = this.parseJSON(response) as Array<{
      name?: string
      category?: string
      aliases?: string[]
    }> | Record<string, unknown>

    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        name: item.name || '',
        category: (item.category as SkillInfo['category']) || 'other',
        aliases: item.aliases || [],
      }))
    }

    throw new Error('Invalid batch response')
  }

  private async llmNormalizeLocation(location: string): Promise<NormalizationResult<AddressComponents>> {
    const prompt = `Parse and standardize this location/address.

Input: "${location}"

Rules:
- Extract: city, state/province, country, countryCode (ISO 3166-1 alpha-2)
- Standardize country names to English
- For Chinese addresses, extract city name without 市/区/县 suffix
- For Western addresses, preserve original city names

Return JSON only:
{
  "city": "San Francisco",
  "state": "California",
  "country": "United States",
  "countryCode": "US",
  "confidence": 0.0-1.0
}`

    const response = await this.callLLMInternal(prompt)
    const parsed = this.parseJSON(response) as {
      city?: string
      state?: string
      country?: string
      countryCode?: string
      confidence?: number
    }

    return {
      original: location,
      normalized: {
        city: parsed.city,
        state: parsed.state,
        country: parsed.country,
        countryCode: parsed.countryCode,
      },
      confidence: parsed.confidence || 0.8,
      method: 'llm',
    }
  }

  private async llmNormalizeWorkAuth(auth: string): Promise<NormalizationResult<{ standard: string; needsSponsorship: boolean }>> {
    const prompt = `Standardize this work authorization status.

Input: "${auth}"

Rules:
- Determine if person needs visa sponsorship
- Map to standard terms:
  - "US Citizen", "Permanent Resident", "Green Card" → needsSponsorship: false
  - "H1B", "OPT", "F1", "Requires Sponsorship" → needsSponsorship: true
  - "Authorized to work" (without context) → assume needsSponsorship: false

Return JSON only:
{
  "standard": "Permanent Resident",
  "needsSponsorship": false,
  "confidence": 0.0-1.0
}`

    const response = await this.callLLMInternal(prompt)
    const parsed = this.parseJSON(response) as {
      standard?: string
      needsSponsorship?: boolean
      confidence?: number
    }

    return {
      original: auth,
      normalized: {
        standard: parsed.standard || auth,
        needsSponsorship: !!parsed.needsSponsorship,
      },
      confidence: parsed.confidence || 0.8,
      method: 'llm',
    }
  }

  private async llmNormalize(_type: string, value: string, instructions: string): Promise<NormalizationResult<string>> {
    const prompt = `${instructions}

Input: "${value}"

Return JSON only:
{
  "normalized": "standardized value",
  "confidence": 0.0-1.0,
  "aliases": ["other forms"]
}`

    const response = await this.callLLMInternal(prompt)
    const parsed = this.parseJSON(response) as {
      normalized?: string
      confidence?: number
      aliases?: string[]
    }

    return {
      original: value,
      normalized: parsed.normalized || value,
      confidence: parsed.confidence || 0.8,
      method: 'llm',
      aliases: parsed.aliases,
    }
  }

  // --------------------------------------------------------------------------
  // Fallback Methods (when LLM unavailable)
  // --------------------------------------------------------------------------

  private fallbackNormalizeDegree(degree: string): NormalizationResult<DegreeInfo> {
    const lower = degree.toLowerCase().trim()

    for (const [key, info] of Object.entries(DEGREE_FALLBACK)) {
      if (lower === key || lower.includes(key)) {
        return { original: degree, normalized: info, confidence: 0.8, method: 'rule' }
      }
    }

    return {
      original: degree,
      normalized: { level: 'other', standardName: degree, abbreviation: degree },
      confidence: 0.3,
      method: 'passthrough',
    }
  }

  private fallbackNormalizeMajor(major: string): NormalizationResult<string> {
    return { original: major, normalized: this.titleCase(major), confidence: 0.5, method: 'passthrough' }
  }

  private fallbackNormalizeSkill(skill: string): NormalizationResult<SkillInfo> {
    const lower = skill.toLowerCase().trim()
    const mapped = SKILL_FALLBACK[lower]

    if (mapped) {
      return { original: skill, normalized: mapped, confidence: 0.8, method: 'rule', aliases: mapped.aliases }
    }

    return {
      original: skill,
      normalized: { name: skill, category: 'other', aliases: [] },
      confidence: 0.3,
      method: 'passthrough',
    }
  }

  private fallbackNormalizeCompany(company: string): NormalizationResult<string> {
    const suffixes = [
      /,?\s*(inc\.?|incorporated|corp\.?|corporation|llc|ltd\.?|limited|co\.?|company|plc|gmbh|ag|sa|pte\.?\s*ltd\.?)$/i,
      /,?\s*(株式会社|有限公司|有限责任公司|集团|控股)$/,
    ]

    let normalized = company.trim()
    for (const pattern of suffixes) {
      normalized = normalized.replace(pattern, '').trim()
    }

    return {
      original: company,
      normalized,
      confidence: normalized !== company ? 0.85 : 0.5,
      method: 'rule',
    }
  }

  private fallbackNormalizeLocation(location: string): NormalizationResult<AddressComponents> {
    const parts = location.split(/[,，·]/).map(p => p.trim()).filter(Boolean)
    const components: AddressComponents = {}

    for (let i = parts.length - 1; i >= 0; i--) {
      const lower = parts[i].toLowerCase()
      const country = COUNTRY_FALLBACK[lower]
      if (country) {
        components.country = country.name
        components.countryCode = country.code
        parts.splice(i, 1)
        break
      }
    }

    if (/[\u4e00-\u9fa5]/.test(location)) {
      for (let i = parts.length - 1; i >= 0; i--) {
        if (!parts[i].includes('省') && !parts[i].includes('国')) {
          components.city = parts[i].replace(/[市区县]$/, '')
          break
        }
      }
    } else if (parts.length > 0) {
      components.city = parts[0]
      if (parts.length > 1) components.state = parts[1]
    }

    return {
      original: location,
      normalized: components,
      confidence: components.city ? 0.7 : 0.4,
      method: 'rule',
    }
  }

  private fallbackNormalizeWorkAuth(auth: string): NormalizationResult<{ standard: string; needsSponsorship: boolean }> {
    const lower = auth.toLowerCase()

    if (/citizen|permanent|green\s*card|authorized/i.test(lower)) {
      return {
        original: auth,
        normalized: { standard: 'Authorized to work', needsSponsorship: false },
        confidence: 0.7,
        method: 'rule',
      }
    }

    if (/h1b|opt|f1|sponsor|visa/i.test(lower)) {
      return {
        original: auth,
        normalized: { standard: 'Requires Sponsorship', needsSponsorship: true },
        confidence: 0.7,
        method: 'rule',
      }
    }

    return {
      original: auth,
      normalized: { standard: auth, needsSponsorship: false },
      confidence: 0.3,
      method: 'passthrough',
    }
  }

  // --------------------------------------------------------------------------
  // LLM Call Infrastructure (using shared @/utils/llmProvider)
  // --------------------------------------------------------------------------

  private async callLLMInternal(prompt: string): Promise<string> {
    if (!this.config) throw new Error('LLM config not loaded')
    return callLLM(
      this.config,
      prompt,
      'You are a data normalization assistant. Respond with valid JSON only.',
      { maxTokens: 300 }
    )
  }

  private parseJSON(text: string): Record<string, unknown> {
    return parseJSONSafe(text, {})
  }

  private titleCase(str: string): string {
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  /** Reset config (for testing or after settings change) */
  resetConfig(): void {
    this.configLoaded = false
    this.config = null
    resetLLMConfigCache()
  }
}

export const knowledgeNormalizer = new KnowledgeNormalizer()

