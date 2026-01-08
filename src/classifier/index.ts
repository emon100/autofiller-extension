import { FieldContext, CandidateType, Taxonomy } from '@/types'

const AUTOCOMPLETE_MAP: Record<string, Taxonomy> = {
  'name': Taxonomy.FULL_NAME,
  'given-name': Taxonomy.FULL_NAME,
  'family-name': Taxonomy.FULL_NAME,
  'email': Taxonomy.EMAIL,
  'tel': Taxonomy.PHONE,
  'tel-national': Taxonomy.PHONE,
  'address-level2': Taxonomy.CITY,
  'address-level1': Taxonomy.LOCATION,
  'country-name': Taxonomy.LOCATION,
  'url': Taxonomy.PORTFOLIO,
  'organization': Taxonomy.SCHOOL,
  'bday': Taxonomy.GRAD_DATE,
}

const TYPE_MAP: Record<string, Taxonomy> = {
  'email': Taxonomy.EMAIL,
  'tel': Taxonomy.PHONE,
  'url': Taxonomy.PORTFOLIO,
}

interface PatternRule {
  patterns: RegExp[]
  type: Taxonomy
}

const NAME_ID_RULES: PatternRule[] = [
  { patterns: [/full.?name/i, /^name$/i, /your.?name/i], type: Taxonomy.FULL_NAME },
  { patterns: [/e.?mail/i, /email.?address/i], type: Taxonomy.EMAIL },
  { patterns: [/phone/i, /mobile/i, /tel/i, /cell/i], type: Taxonomy.PHONE },
  { patterns: [/city/i, /town/i], type: Taxonomy.CITY },
  { patterns: [/location/i, /address/i, /country/i], type: Taxonomy.LOCATION },
  { patterns: [/linkedin/i], type: Taxonomy.LINKEDIN },
  { patterns: [/github/i], type: Taxonomy.GITHUB },
  { patterns: [/portfolio/i, /website/i, /personal.?site/i], type: Taxonomy.PORTFOLIO },
  { patterns: [/school/i, /university/i, /college/i, /institution/i], type: Taxonomy.SCHOOL },
  { patterns: [/degree/i], type: Taxonomy.DEGREE },
  { patterns: [/major/i, /field.?of.?study/i, /concentration/i], type: Taxonomy.MAJOR },
  { patterns: [/grad.?date/i, /graduation/i, /expected.?grad/i], type: Taxonomy.GRAD_DATE },
  { patterns: [/start.?date/i, /from.?date/i, /begin/i], type: Taxonomy.START_DATE },
  { patterns: [/end.?date/i, /to.?date/i], type: Taxonomy.END_DATE },
  { patterns: [/work.?auth/i, /authorized/i, /eligible.?to.?work/i], type: Taxonomy.WORK_AUTH },
  { patterns: [/sponsor/i, /visa/i], type: Taxonomy.NEED_SPONSORSHIP },
  { patterns: [/resume/i, /cv/i, /cover.?letter/i], type: Taxonomy.RESUME_TEXT },
  { patterns: [/salary/i, /compensation/i, /pay/i, /wage/i], type: Taxonomy.SALARY },
  { patterns: [/gender/i, /sex/i], type: Taxonomy.EEO_GENDER },
  { patterns: [/ethnic/i, /race/i], type: Taxonomy.EEO_ETHNICITY },
  { patterns: [/veteran/i, /military/i], type: Taxonomy.EEO_VETERAN },
  { patterns: [/disab/i, /handicap/i], type: Taxonomy.EEO_DISABILITY },
  { patterns: [/ssn/i, /social.?security/i, /gov.?id/i, /national.?id/i], type: Taxonomy.GOV_ID },
]

const LABEL_RULES: PatternRule[] = [
  { patterns: [/authorized\s*to\s*work/i, /work\s*authorization/i, /legally\s*work/i, /eligible\s*to\s*work/i], type: Taxonomy.WORK_AUTH },
  { patterns: [/full\s*name/i, /^name$/i, /your\s+name/i, /legal\s+name/i], type: Taxonomy.FULL_NAME },
  { patterns: [/e-?mail/i, /email\s*address/i], type: Taxonomy.EMAIL },
  { patterns: [/phone/i, /mobile/i, /telephone/i, /contact\s*number/i], type: Taxonomy.PHONE },
  { patterns: [/^city$/i, /city\s*\/?\s*town/i], type: Taxonomy.CITY },
  { patterns: [/^location$/i, /^country$/i, /^state$/i, /^province$/i], type: Taxonomy.LOCATION },
  { patterns: [/linkedin/i], type: Taxonomy.LINKEDIN },
  { patterns: [/github/i], type: Taxonomy.GITHUB },
  { patterns: [/portfolio/i, /website/i, /personal\s*site/i, /web\s*page/i], type: Taxonomy.PORTFOLIO },
  { patterns: [/school/i, /university/i, /college/i, /institution/i, /alma\s*mater/i], type: Taxonomy.SCHOOL },
  { patterns: [/degree/i, /qualification/i], type: Taxonomy.DEGREE },
  { patterns: [/major/i, /field\s*of\s*study/i, /specialization/i, /concentration/i], type: Taxonomy.MAJOR },
  { patterns: [/graduation/i, /grad\s*date/i, /expected\s*grad/i, /completion\s*date/i], type: Taxonomy.GRAD_DATE },
  { patterns: [/start\s*date/i, /from\s*date/i, /began/i, /started/i], type: Taxonomy.START_DATE },
  { patterns: [/end\s*date/i, /to\s*date/i, /ended/i, /finished/i], type: Taxonomy.END_DATE },
  { patterns: [/sponsor/i, /visa/i, /immigration/i], type: Taxonomy.NEED_SPONSORSHIP },
  { patterns: [/resume/i, /cv/i, /cover\s*letter/i, /summary/i], type: Taxonomy.RESUME_TEXT },
  { patterns: [/salary/i, /compensation/i, /expected\s*pay/i, /desired\s*salary/i], type: Taxonomy.SALARY },
  { patterns: [/gender/i, /sex/i], type: Taxonomy.EEO_GENDER },
  { patterns: [/ethnic/i, /race/i, /racial/i], type: Taxonomy.EEO_ETHNICITY },
  { patterns: [/veteran/i, /military\s*service/i, /served/i], type: Taxonomy.EEO_VETERAN },
  { patterns: [/disability/i, /handicap/i, /impairment/i], type: Taxonomy.EEO_DISABILITY },
  { patterns: [/ssn/i, /social\s*security/i, /national\s*id/i], type: Taxonomy.GOV_ID },
]

export function classifyByAutocomplete(field: FieldContext): CandidateType | null {
  const autocomplete = field.attributes['autocomplete']
  if (!autocomplete) return null

  const normalized = autocomplete.toLowerCase().trim()
  const type = AUTOCOMPLETE_MAP[normalized]
  
  if (type) {
    return {
      type,
      score: 0.95,
      reasons: [`autocomplete="${autocomplete}"`],
    }
  }
  
  return null
}

export function classifyByType(field: FieldContext): CandidateType | null {
  const inputType = field.attributes['type']
  if (!inputType) return null

  const type = TYPE_MAP[inputType.toLowerCase()]
  
  if (type) {
    return {
      type,
      score: 0.85,
      reasons: [`type="${inputType}"`],
    }
  }

  if (field.widgetSignature.kind === 'date') {
    return {
      type: Taxonomy.GRAD_DATE,
      score: 0.5,
      reasons: ['date input type'],
    }
  }
  
  return null
}

export function classifyByNameId(field: FieldContext): CandidateType | null {
  const name = field.attributes['name'] || ''
  const id = field.attributes['id'] || ''
  const combined = `${name} ${id}`.toLowerCase()

  for (const rule of NAME_ID_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(combined)) {
        return {
          type: rule.type,
          score: 0.75,
          reasons: [`name/id matches "${pattern.source}"`],
        }
      }
    }
  }
  
  return null
}

export function classifyByLabel(field: FieldContext): CandidateType | null {
  const label = field.labelText.toLowerCase()
  if (!label) return null

  for (const rule of LABEL_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(label)) {
        let score = 0.65
        
        if (field.sectionTitle) {
          const section = field.sectionTitle.toLowerCase()
          if (
            (rule.type === Taxonomy.SCHOOL && section.includes('education')) ||
            (rule.type === Taxonomy.DEGREE && section.includes('education')) ||
            (rule.type === Taxonomy.MAJOR && section.includes('education')) ||
            (rule.type === Taxonomy.START_DATE && section.includes('education')) ||
            (rule.type === Taxonomy.END_DATE && section.includes('education')) ||
            (rule.type === Taxonomy.GRAD_DATE && section.includes('education')) ||
            (rule.type === Taxonomy.EEO_GENDER && section.includes('equal')) ||
            (rule.type === Taxonomy.EEO_ETHNICITY && section.includes('equal')) ||
            (rule.type === Taxonomy.EEO_VETERAN && section.includes('equal')) ||
            (rule.type === Taxonomy.EEO_DISABILITY && section.includes('equal'))
          ) {
            score += 0.15
          }
        }

        return {
          type: rule.type,
          score,
          reasons: [`label matches "${pattern.source}"`],
        }
      }
    }
  }
  
  return null
}

export function classify(field: FieldContext): CandidateType[] {
  const candidates: CandidateType[] = []
  const seenTypes = new Set<Taxonomy>()

  const autocompleteResult = classifyByAutocomplete(field)
  if (autocompleteResult) {
    candidates.push(autocompleteResult)
    seenTypes.add(autocompleteResult.type)
  }

  const typeResult = classifyByType(field)
  if (typeResult && !seenTypes.has(typeResult.type)) {
    candidates.push(typeResult)
    seenTypes.add(typeResult.type)
  }

  const nameIdResult = classifyByNameId(field)
  if (nameIdResult) {
    const existing = candidates.find(c => c.type === nameIdResult.type)
    if (existing) {
      existing.score = Math.min(1, existing.score + 0.1)
      existing.reasons.push(...nameIdResult.reasons)
    } else {
      candidates.push(nameIdResult)
      seenTypes.add(nameIdResult.type)
    }
  }

  const labelResult = classifyByLabel(field)
  if (labelResult) {
    const existing = candidates.find(c => c.type === labelResult.type)
    if (existing) {
      existing.score = Math.min(1, existing.score + 0.1)
      existing.reasons.push(...labelResult.reasons)
    } else {
      candidates.push(labelResult)
      seenTypes.add(labelResult.type)
    }
  }

  if (candidates.length === 0) {
    candidates.push({
      type: Taxonomy.UNKNOWN,
      score: 0,
      reasons: ['no matching patterns'],
    })
  }

  return candidates.sort((a, b) => b.score - a.score)
}
