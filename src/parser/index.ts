import { FieldContext, CandidateType, Taxonomy, IFieldParser } from '@/types'
import { LLMParser } from './LLMParser'
import { FieldParseLog, ParserLogEntry, logParseField } from '@/utils/logger'

class AutocompleteParser implements IFieldParser {
  name = 'AutocompleteParser'
  priority = 100

  private readonly autocompleteMap: Record<string, Taxonomy> = {
    'name': Taxonomy.FULL_NAME,
    'given-name': Taxonomy.FIRST_NAME,
    'family-name': Taxonomy.LAST_NAME,
    'email': Taxonomy.EMAIL,
    'tel': Taxonomy.PHONE,
    'tel-country-code': Taxonomy.COUNTRY_CODE,
    'address-level2': Taxonomy.CITY,
    'url': Taxonomy.PORTFOLIO,
  }

  canParse(context: FieldContext): boolean {
    const autocomplete = context.attributes.autocomplete
    return !!autocomplete && autocomplete in this.autocompleteMap
  }

  async parse(context: FieldContext): Promise<CandidateType[]> {
    const autocomplete = context.attributes.autocomplete
    const type = this.autocompleteMap[autocomplete]

    if (type) {
      return [{
        type,
        score: 0.95,
        reasons: [`autocomplete="${autocomplete}"`]
      }]
    }
    return []
  }
}

class TypeAttributeParser implements IFieldParser {
  name = 'TypeAttributeParser'
  priority = 90

  private readonly typeMap: Record<string, Taxonomy> = {
    'email': Taxonomy.EMAIL,
    'tel': Taxonomy.PHONE,
    'date': Taxonomy.GRAD_DATE,
    'month': Taxonomy.GRAD_DATE,
    'url': Taxonomy.PORTFOLIO,
  }

  canParse(context: FieldContext): boolean {
    const type = context.attributes.type?.toLowerCase()
    return !!type && type in this.typeMap
  }

  async parse(context: FieldContext): Promise<CandidateType[]> {
    const type = context.attributes.type?.toLowerCase()
    const taxonomy = this.typeMap[type || '']

    if (taxonomy) {
      return [{
        type: taxonomy,
        score: 0.9,
        reasons: [`type="${type}"`]
      }]
    }
    return []
  }
}

class NameIdParser implements IFieldParser {
  name = 'NameIdParser'
  priority = 80

  private readonly patterns: Array<{ pattern: RegExp; type: Taxonomy; score: number }> = [
    { pattern: /full.?name|fullname/i, type: Taxonomy.FULL_NAME, score: 0.9 },
    { pattern: /first.?name|given.?name|fname/i, type: Taxonomy.FIRST_NAME, score: 0.9 },
    { pattern: /last.?name|family.?name|surname|lname/i, type: Taxonomy.LAST_NAME, score: 0.9 },
    { pattern: /^name$/i, type: Taxonomy.FULL_NAME, score: 0.85 },
    { pattern: /e.?mail/i, type: Taxonomy.EMAIL, score: 0.9 },
    { pattern: /phone|mobile|tel/i, type: Taxonomy.PHONE, score: 0.9 },
    { pattern: /country.?code/i, type: Taxonomy.COUNTRY_CODE, score: 0.85 },
    { pattern: /city|town/i, type: Taxonomy.CITY, score: 0.85 },
    { pattern: /linkedin/i, type: Taxonomy.LINKEDIN, score: 0.95 },
    { pattern: /github/i, type: Taxonomy.GITHUB, score: 0.95 },
    { pattern: /portfolio|website/i, type: Taxonomy.PORTFOLIO, score: 0.85 },
    { pattern: /school|university|college|institution/i, type: Taxonomy.SCHOOL, score: 0.9 },
    { pattern: /degree/i, type: Taxonomy.DEGREE, score: 0.85 },
    { pattern: /major|field.?of.?study|specialization/i, type: Taxonomy.MAJOR, score: 0.85 },
    { pattern: /grad.*date|graduation/i, type: Taxonomy.GRAD_DATE, score: 0.85 },
    { pattern: /grad.*year/i, type: Taxonomy.GRAD_YEAR, score: 0.85 },
    { pattern: /grad.*month/i, type: Taxonomy.GRAD_MONTH, score: 0.85 },
    { pattern: /start.?date/i, type: Taxonomy.START_DATE, score: 0.8 },
    { pattern: /end.?date/i, type: Taxonomy.END_DATE, score: 0.8 },
    { pattern: /authorized.?to.?work|work.?auth|legally.?authorized/i, type: Taxonomy.WORK_AUTH, score: 0.9 },
    { pattern: /sponsor|visa/i, type: Taxonomy.NEED_SPONSORSHIP, score: 0.9 },
    { pattern: /gender|sex/i, type: Taxonomy.EEO_GENDER, score: 0.9 },
    { pattern: /ethnic|race/i, type: Taxonomy.EEO_ETHNICITY, score: 0.9 },
    { pattern: /veteran|military/i, type: Taxonomy.EEO_VETERAN, score: 0.9 },
    { pattern: /disab/i, type: Taxonomy.EEO_DISABILITY, score: 0.9 },
    { pattern: /salary|compensation|pay/i, type: Taxonomy.SALARY, score: 0.85 },
    { pattern: /resume|cv/i, type: Taxonomy.RESUME_TEXT, score: 0.85 },
  ]

  canParse(_context: FieldContext): boolean {
    return true
  }

  async parse(context: FieldContext): Promise<CandidateType[]> {
    const name = context.attributes.name || ''
    const id = context.attributes.id || ''
    const combined = `${name} ${id}`.toLowerCase()

    const results: CandidateType[] = []

    for (const { pattern, type, score } of this.patterns) {
      if (pattern.test(combined)) {
        results.push({
          type,
          score,
          reasons: [`name/id matches "${pattern.source}"`]
        })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }
}

class LabelParser implements IFieldParser {
  name = 'LabelParser'
  priority = 70

  private readonly patterns: Array<{ pattern: RegExp; type: Taxonomy; score: number }> = [
    { pattern: /full\s*name|姓名|名字/i, type: Taxonomy.FULL_NAME, score: 0.85 },
    { pattern: /first\s*name|given\s*name|名/i, type: Taxonomy.FIRST_NAME, score: 0.85 },
    { pattern: /last\s*name|family\s*name|surname|姓/i, type: Taxonomy.LAST_NAME, score: 0.85 },
    { pattern: /email|邮箱|电子邮件/i, type: Taxonomy.EMAIL, score: 0.85 },
    { pattern: /phone|电话|手机/i, type: Taxonomy.PHONE, score: 0.85 },
    { pattern: /city|城市/i, type: Taxonomy.CITY, score: 0.8 },
    { pattern: /linkedin/i, type: Taxonomy.LINKEDIN, score: 0.9 },
    { pattern: /github/i, type: Taxonomy.GITHUB, score: 0.9 },
    { pattern: /school|university|学校|大学/i, type: Taxonomy.SCHOOL, score: 0.85 },
    { pattern: /degree|学历|学位/i, type: Taxonomy.DEGREE, score: 0.8 },
    { pattern: /major|专业/i, type: Taxonomy.MAJOR, score: 0.8 },
    { pattern: /graduation|毕业/i, type: Taxonomy.GRAD_DATE, score: 0.8 },
    { pattern: /authorized\s*to\s*work|work\s*authorization|工作授权/i, type: Taxonomy.WORK_AUTH, score: 0.85 },
    { pattern: /sponsorship|签证担保/i, type: Taxonomy.NEED_SPONSORSHIP, score: 0.85 },
    { pattern: /gender|性别/i, type: Taxonomy.EEO_GENDER, score: 0.85 },
    { pattern: /ethnicity|race|种族/i, type: Taxonomy.EEO_ETHNICITY, score: 0.85 },
    { pattern: /veteran|退伍/i, type: Taxonomy.EEO_VETERAN, score: 0.85 },
    { pattern: /disability|残疾/i, type: Taxonomy.EEO_DISABILITY, score: 0.85 },
  ]

  canParse(context: FieldContext): boolean {
    return context.labelText.length > 0
  }

  async parse(context: FieldContext): Promise<CandidateType[]> {
    const label = context.labelText.toLowerCase()
    const section = context.sectionTitle.toLowerCase()
    const combined = `${label} ${section}`

    const results: CandidateType[] = []

    for (const { pattern, type, score } of this.patterns) {
      if (pattern.test(combined)) {
        results.push({
          type,
          score: pattern.test(label) ? score : score * 0.9,
          reasons: [`label matches "${pattern.source}"`]
        })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }
}

// Rule-based parsers (no LLM)
const ruleParsers: IFieldParser[] = [
  new AutocompleteParser(),
  new TypeAttributeParser(),
  new NameIdParser(),
  new LabelParser(),
]

// LLM parser instance (singleton)
const llmParser = new LLMParser()

// All parsers including LLM
const parsers: IFieldParser[] = [
  ...ruleParsers,
  llmParser,
]

export function getParsers(): IFieldParser[] {
  return [...parsers].sort((a, b) => b.priority - a.priority)
}

export function registerParser(parser: IFieldParser): void {
  parsers.push(parser)
  parsers.sort((a, b) => b.priority - a.priority)
}

/**
 * Parse a single field using all parsers (including LLM if enabled)
 */
export async function parseField(context: FieldContext, enableLogging = true): Promise<CandidateType[]> {
  const startTime = performance.now()
  const allResults: CandidateType[] = []
  const sortedParsers = getParsers()
  const parserLogs: ParserLogEntry[] = []

  for (const parser of sortedParsers) {
    const parserStart = performance.now()
    const canParse = parser.canParse(context)

    if (canParse) {
      const results = await parser.parse(context)
      const parserTime = performance.now() - parserStart

      parserLogs.push({
        parserName: parser.name,
        matched: results.length > 0,
        candidates: results.map(r => ({
          type: r.type,
          score: r.score,
          reasons: r.reasons,
        })),
        timeMs: parserTime,
      })

      for (const result of results) {
        const existing = allResults.find(r => r.type === result.type)
        if (existing) {
          if (result.score > existing.score) {
            existing.score = result.score
            existing.reasons = [...existing.reasons, ...result.reasons]
          }
        } else {
          allResults.push(result)
        }
      }
    } else {
      const parserTime = performance.now() - parserStart
      parserLogs.push({
        parserName: parser.name,
        matched: false,
        candidates: [],
        timeMs: parserTime,
      })
    }
  }

  if (allResults.length === 0) {
    allResults.push({
      type: Taxonomy.UNKNOWN,
      score: 0,
      reasons: ['no match found']
    })
  }

  const sortedResults = allResults.sort((a, b) => b.score - a.score)
  const totalTime = performance.now() - startTime

  // Log detailed parsing info
  if (enableLogging) {
    const label = context.labelText || context.attributes.placeholder || context.attributes.name || 'Unknown'
    const parseLog: FieldParseLog = {
      label,
      elementInfo: {
        tagName: context.element.tagName.toLowerCase(),
        type: context.attributes.type,
        name: context.attributes.name,
        id: context.attributes.id,
        autocomplete: context.attributes.autocomplete,
      },
      parsers: parserLogs,
      finalResult: {
        type: sortedResults[0].type,
        score: sortedResults[0].score,
        reasons: sortedResults[0].reasons,
      },
      totalTimeMs: totalTime,
    }
    logParseField(parseLog)
  }

  return sortedResults
}

/**
 * Parse multiple fields with batched LLM calls
 * Uses rule-based parsers first, then batches unrecognized fields for LLM
 */
export async function parseFieldsBatch(
  contexts: FieldContext[],
  enableLogging = true
): Promise<Map<number, CandidateType[]>> {
  const startTime = performance.now()
  const results = new Map<number, CandidateType[]>()
  const fieldsNeedingLLM: Array<{ index: number; context: FieldContext }> = []

  console.log(`[Parser] Batch parsing ${contexts.length} fields`)

  // Phase 1: Try rule-based parsers for all fields
  for (let i = 0; i < contexts.length; i++) {
    const context = contexts[i]
    const fieldResults: CandidateType[] = []

    for (const parser of ruleParsers) {
      if (parser.canParse(context)) {
        const parserResults = await parser.parse(context)
        for (const result of parserResults) {
          const existing = fieldResults.find(r => r.type === result.type)
          if (existing) {
            if (result.score > existing.score) {
              existing.score = result.score
              existing.reasons = [...existing.reasons, ...result.reasons]
            }
          } else {
            fieldResults.push(result)
          }
        }
      }
    }

    // Sort results
    fieldResults.sort((a, b) => b.score - a.score)

    // If no good match from rules, queue for LLM
    const bestResult = fieldResults[0]
    if (!bestResult || bestResult.type === Taxonomy.UNKNOWN || bestResult.score < 0.5) {
      fieldsNeedingLLM.push({ index: i, context })
      // Store placeholder result for now
      results.set(i, fieldResults.length > 0 ? fieldResults : [{
        type: Taxonomy.UNKNOWN,
        score: 0,
        reasons: ['pending LLM classification']
      }])
    } else {
      results.set(i, fieldResults)
    }
  }

  const ruleMatchedCount = contexts.length - fieldsNeedingLLM.length
  console.log(`[Parser] Rule-based: ${ruleMatchedCount} matched, ${fieldsNeedingLLM.length} need LLM`)

  // Phase 2: Batch LLM classification for unrecognized fields
  if (fieldsNeedingLLM.length > 0) {
    const llmContexts = fieldsNeedingLLM.map(f => f.context)
    const llmResults = await llmParser.parseBatch(llmContexts)

    // Merge LLM results back
    for (let i = 0; i < fieldsNeedingLLM.length; i++) {
      const { index } = fieldsNeedingLLM[i]
      const llmCandidates = llmResults.get(i) || []

      if (llmCandidates.length > 0) {
        // LLM found a match - use it
        const existingResults = results.get(index) || []
        const mergedResults = [...existingResults]

        for (const llmResult of llmCandidates) {
          const existing = mergedResults.find(r => r.type === llmResult.type)
          if (existing) {
            if (llmResult.score > existing.score) {
              existing.score = llmResult.score
              existing.reasons = [...existing.reasons, ...llmResult.reasons]
            }
          } else {
            mergedResults.push(llmResult)
          }
        }

        mergedResults.sort((a, b) => b.score - a.score)
        results.set(index, mergedResults)
      } else {
        // LLM didn't find a match - ensure UNKNOWN is set
        const existingResults = results.get(index) || []
        if (existingResults.length === 0 || existingResults[0].type === Taxonomy.UNKNOWN) {
          results.set(index, [{
            type: Taxonomy.UNKNOWN,
            score: 0,
            reasons: ['no match from rules or LLM']
          }])
        }
      }
    }
  }

  const totalTime = performance.now() - startTime
  console.log(`[Parser] Batch parsing complete in ${totalTime.toFixed(1)}ms`)

  // Log results if enabled
  if (enableLogging) {
    for (let i = 0; i < contexts.length; i++) {
      const context = contexts[i]
      const fieldResults = results.get(i) || []
      const label = context.labelText || context.attributes.placeholder || context.attributes.name || 'Unknown'

      const parseLog: FieldParseLog = {
        label,
        elementInfo: {
          tagName: context.element.tagName.toLowerCase(),
          type: context.attributes.type,
          name: context.attributes.name,
          id: context.attributes.id,
          autocomplete: context.attributes.autocomplete,
        },
        parsers: [], // Batch mode doesn't track individual parser logs
        finalResult: {
          type: fieldResults[0]?.type || Taxonomy.UNKNOWN,
          score: fieldResults[0]?.score || 0,
          reasons: fieldResults[0]?.reasons || ['no match'],
        },
        totalTimeMs: totalTime / contexts.length, // Average time per field
      }
      logParseField(parseLog)
    }
  }

  return results
}

/**
 * Get the LLM parser instance for direct access (e.g., cache clearing)
 */
export function getLLMParser(): LLMParser {
  return llmParser
}

export { AutocompleteParser, TypeAttributeParser, NameIdParser, LabelParser }
export { LLMParser, configureLLM, getLLMConfig } from './LLMParser'
