import { Taxonomy, DemoFieldDef } from './types'

interface ClassifyRule {
  patterns: RegExp[]
  type: Taxonomy
  score: number
}

const CLASSIFY_RULES: ClassifyRule[] = [
  { patterns: [/full.?name/i, /^name$/i], type: Taxonomy.FULL_NAME, score: 0.9 },
  { patterns: [/first.?name|given.?name/i], type: Taxonomy.FIRST_NAME, score: 0.9 },
  { patterns: [/last.?name|family.?name|surname/i], type: Taxonomy.LAST_NAME, score: 0.9 },
  { patterns: [/e.?mail/i], type: Taxonomy.EMAIL, score: 0.9 },
  { patterns: [/phone|mobile|tel/i], type: Taxonomy.PHONE, score: 0.9 },
  { patterns: [/country.?code/i], type: Taxonomy.COUNTRY_CODE, score: 0.85 },
  { patterns: [/city/i], type: Taxonomy.CITY, score: 0.85 },
  { patterns: [/location/i], type: Taxonomy.LOCATION, score: 0.8 },
  { patterns: [/linkedin/i], type: Taxonomy.LINKEDIN, score: 0.95 },
  { patterns: [/github/i], type: Taxonomy.GITHUB, score: 0.95 },
  { patterns: [/portfolio|personal.?website/i], type: Taxonomy.PORTFOLIO, score: 0.9 },
  { patterns: [/school|university|college/i], type: Taxonomy.SCHOOL, score: 0.9 },
  { patterns: [/degree|education.?level/i], type: Taxonomy.DEGREE, score: 0.85 },
  { patterns: [/major|field.?of.?study|concentration|discipline/i], type: Taxonomy.MAJOR, score: 0.85 },
  { patterns: [/grad.*year|end.*date.*year/i], type: Taxonomy.GRAD_YEAR, score: 0.85 },
  { patterns: [/grad.*month|end.*date.*month/i], type: Taxonomy.GRAD_MONTH, score: 0.85 },
  { patterns: [/grad|graduation|completion/i], type: Taxonomy.GRAD_DATE, score: 0.8 },
  { patterns: [/authorized|work.?auth/i], type: Taxonomy.WORK_AUTH, score: 0.9 },
  { patterns: [/sponsor|visa/i], type: Taxonomy.NEED_SPONSORSHIP, score: 0.9 },
  { patterns: [/gender/i], type: Taxonomy.EEO_GENDER, score: 0.9 },
  { patterns: [/ethnic|race/i], type: Taxonomy.EEO_ETHNICITY, score: 0.9 },
]

export interface ClassificationResult {
  type: Taxonomy
  score: number
  reason: string
}

export function classifyField(
  fieldName: string,
  labelText: string,
  fieldDef?: DemoFieldDef
): ClassificationResult {
  // If explicit taxonomy is defined, use it directly
  if (fieldDef?.taxonomy) {
    return {
      type: fieldDef.taxonomy,
      score: 1.0,
      reason: 'explicit taxonomy',
    }
  }

  const combined = `${fieldName} ${labelText}`.toLowerCase()

  for (const rule of CLASSIFY_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(combined)) {
        return {
          type: rule.type,
          score: rule.score,
          reason: `matches "${pattern.source}"`,
        }
      }
    }
  }

  return {
    type: Taxonomy.UNKNOWN,
    score: 0,
    reason: 'no match',
  }
}

/**
 * Get related types that can be transformed to the target type
 */
export function getRelatedTypes(type: Taxonomy): Taxonomy[] {
  const relations: Record<Taxonomy, Taxonomy[]> = {
    [Taxonomy.FULL_NAME]: [Taxonomy.FIRST_NAME, Taxonomy.LAST_NAME],
    [Taxonomy.FIRST_NAME]: [Taxonomy.FULL_NAME],
    [Taxonomy.LAST_NAME]: [Taxonomy.FULL_NAME],
    [Taxonomy.GRAD_DATE]: [Taxonomy.GRAD_YEAR, Taxonomy.GRAD_MONTH],
    [Taxonomy.GRAD_YEAR]: [Taxonomy.GRAD_DATE],
    [Taxonomy.GRAD_MONTH]: [Taxonomy.GRAD_DATE],
    [Taxonomy.PHONE]: [Taxonomy.COUNTRY_CODE],
    [Taxonomy.COUNTRY_CODE]: [Taxonomy.PHONE],
    // Default empty relations
    [Taxonomy.EMAIL]: [],
    [Taxonomy.LOCATION]: [],
    [Taxonomy.CITY]: [],
    [Taxonomy.LINKEDIN]: [],
    [Taxonomy.GITHUB]: [],
    [Taxonomy.PORTFOLIO]: [],
    [Taxonomy.SCHOOL]: [],
    [Taxonomy.DEGREE]: [],
    [Taxonomy.MAJOR]: [],
    [Taxonomy.WORK_AUTH]: [],
    [Taxonomy.NEED_SPONSORSHIP]: [],
    [Taxonomy.EEO_GENDER]: [],
    [Taxonomy.EEO_ETHNICITY]: [],
    [Taxonomy.UNKNOWN]: [],
  }
  return relations[type] || []
}
