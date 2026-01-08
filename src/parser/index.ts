import { FieldContext, CandidateType, Taxonomy, IFieldParser } from '@/types'
import { LLMParser } from './LLMParser'

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

const parsers: IFieldParser[] = [
  new AutocompleteParser(),
  new TypeAttributeParser(),
  new NameIdParser(),
  new LabelParser(),
  new LLMParser(),
]

export function getParsers(): IFieldParser[] {
  return [...parsers].sort((a, b) => b.priority - a.priority)
}

export function registerParser(parser: IFieldParser): void {
  parsers.push(parser)
  parsers.sort((a, b) => b.priority - a.priority)
}

export async function parseField(context: FieldContext): Promise<CandidateType[]> {
  const allResults: CandidateType[] = []
  const sortedParsers = getParsers()
  
  for (const parser of sortedParsers) {
    if (parser.canParse(context)) {
      const results = await parser.parse(context)
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
    }
  }
  
  if (allResults.length === 0) {
    allResults.push({
      type: Taxonomy.UNKNOWN,
      score: 0,
      reasons: ['no match found']
    })
  }
  
  return allResults.sort((a, b) => b.score - a.score)
}

export { AutocompleteParser, TypeAttributeParser, NameIdParser, LabelParser }
export { LLMParser, configureLLM, getLLMConfig } from './LLMParser'
