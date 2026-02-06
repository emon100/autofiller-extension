import { Taxonomy, FieldContext, IValueTransformer } from '@/types'
import { TransformAttemptLog, logTransformAttempt } from '@/utils/logger'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export class NameTransformer implements IValueTransformer {
  name = 'NameTransformer'
  sourceType = Taxonomy.FULL_NAME
  targetTypes = [Taxonomy.FULL_NAME, Taxonomy.FIRST_NAME, Taxonomy.LAST_NAME]

  canTransform(sourceValue: string, _targetContext: FieldContext): boolean {
    return sourceValue.length > 0
  }

  transform(sourceValue: string, targetContext: FieldContext): string {
    const targetType = this.detectTargetType(targetContext)
    const isChinese = /[\u4e00-\u9fa5]/.test(sourceValue)
    
    if (targetType === Taxonomy.FULL_NAME) {
      return sourceValue
    }
    
    if (isChinese) {
      const chars = sourceValue.trim()
      if (targetType === Taxonomy.LAST_NAME) {
        return chars.charAt(0)
      }
      if (targetType === Taxonomy.FIRST_NAME) {
        return chars.slice(1)
      }
    } else {
      const parts = sourceValue.trim().split(/\s+/)
      if (targetType === Taxonomy.FIRST_NAME) {
        return parts[0] || ''
      }
      if (targetType === Taxonomy.LAST_NAME) {
        return parts[parts.length - 1] || ''
      }
    }
    
    return sourceValue
  }

  private detectTargetType(context: FieldContext): Taxonomy {
    const combined = `${context.labelText} ${context.attributes.name || ''} ${context.attributes.id || ''}`.toLowerCase()
    
    if (/first.?name|given.?name|名/.test(combined)) {
      return Taxonomy.FIRST_NAME
    }
    if (/last.?name|family.?name|sur.?name|姓/.test(combined)) {
      return Taxonomy.LAST_NAME
    }
    return Taxonomy.FULL_NAME
  }
}

export class NameMergeTransformer implements IValueTransformer {
  name = 'NameMergeTransformer'
  sourceType = Taxonomy.FIRST_NAME
  targetTypes = [Taxonomy.FULL_NAME]

  canTransform(sourceValue: string, _targetContext: FieldContext): boolean {
    return sourceValue.length > 0
  }

  transform(sourceValue: string, _targetContext: FieldContext, lastName?: string): string {
    if (lastName) {
      const isChinese = /[\u4e00-\u9fa5]/.test(sourceValue) || /[\u4e00-\u9fa5]/.test(lastName)
      if (isChinese) {
        return `${lastName}${sourceValue}`
      }
      return `${sourceValue} ${lastName}`
    }
    return sourceValue
  }
}

export class DateTransformer implements IValueTransformer {
  name = 'DateTransformer'
  sourceType = Taxonomy.GRAD_DATE
  targetTypes = [Taxonomy.GRAD_DATE, Taxonomy.GRAD_YEAR, Taxonomy.GRAD_MONTH]

  canTransform(sourceValue: string, _targetContext: FieldContext): boolean {
    return sourceValue.length > 0
  }

  transform(sourceValue: string, targetContext: FieldContext): string {
    const parsed = this.parseDate(sourceValue)
    if (!parsed) return sourceValue

    const targetFormat = this.detectTargetFormat(targetContext)
    return this.formatDate(parsed, targetFormat, targetContext)
  }

  private parseDate(value: string): { year: number; month?: number; day?: number } | null {
    const isoMatch = value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/)
    if (isoMatch) {
      return {
        year: parseInt(isoMatch[1]),
        month: parseInt(isoMatch[2]),
        day: isoMatch[3] ? parseInt(isoMatch[3]) : undefined
      }
    }

    const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (usMatch) {
      return {
        month: parseInt(usMatch[1]),
        day: parseInt(usMatch[2]),
        year: parseInt(usMatch[3])
      }
    }

    const yearOnly = value.match(/^(\d{4})$/)
    if (yearOnly) {
      return { year: parseInt(yearOnly[1]) }
    }

    return null
  }

  private detectTargetFormat(context: FieldContext): string {
    const type = context.attributes.type?.toLowerCase()
    const name = (context.attributes.name || '').toLowerCase()
    const label = context.labelText.toLowerCase()
    
    if (type === 'date') return 'iso'
    if (type === 'month') return 'month-input'
    
    if (context.widgetSignature.kind === 'select') {
      const options = context.optionsText.join(' ').toLowerCase()
      const allMonthPatterns = [...MONTH_NAMES, ...MONTH_SHORT]
      
      if (allMonthPatterns.some(m => options.includes(m.toLowerCase()))) {
        return 'month-name'
      }
      if (context.optionsText.some(opt => /^(0?[1-9]|1[0-2])$/.test(opt.trim()))) {
        return 'month-number'
      }
      if (/^\d{4}$/.test(context.optionsText[0] || '')) {
        return 'year-only'
      }
    }
    
    if (/year|年/.test(name) || /year|年/.test(label)) return 'year-only'
    if (/month|月/.test(name) || /month|月/.test(label)) return 'month-only'
    
    return 'iso'
  }

  private formatDate(
    date: { year: number; month?: number; day?: number }, 
    format: string,
    context?: FieldContext
  ): string {
    const { year, month, day } = date
    const m = month || 1
    const d = day || 1
    
    switch (format) {
      case 'iso':
        return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      case 'us':
        return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${year}`
      case 'month-input':
        return `${year}-${String(m).padStart(2, '0')}`
      case 'year-only':
        return String(year)
      case 'month-only':
        return String(m)
      case 'month-name':
        return this.matchMonthOption(m, context)
      case 'month-number':
        return this.matchMonthNumber(m, context)
      case 'month-year':
        return `${MONTH_NAMES[m - 1]} ${year}`
      default:
        return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  private matchMonthOption(month: number, context?: FieldContext): string {
    if (!context?.optionsText?.length) {
      return MONTH_NAMES[month - 1] || String(month)
    }

    const opts = context.optionsText
    const optsLower = opts.map(o => o.toLowerCase())
    const fullName = MONTH_NAMES[month - 1]
    const shortName = MONTH_SHORT[month - 1]
    
    const fullMatch = optsLower.findIndex(o => o === fullName.toLowerCase())
    if (fullMatch !== -1) return opts[fullMatch]
    
    const shortMatch = optsLower.findIndex(o => o === shortName.toLowerCase())
    if (shortMatch !== -1) return opts[shortMatch]
    
    const numMatch = opts.findIndex(o => o === String(month) || o === String(month).padStart(2, '0'))
    if (numMatch !== -1) return opts[numMatch]
    
    return fullName
  }

  private matchMonthNumber(month: number, context?: FieldContext): string {
    if (!context?.optionsText?.length) {
      return String(month)
    }

    const opts = context.optionsText
    
    if (opts.includes(String(month))) return String(month)
    if (opts.includes(String(month).padStart(2, '0'))) return String(month).padStart(2, '0')
    
    return String(month)
  }
}

export class PhoneTransformer implements IValueTransformer {
  name = 'PhoneTransformer'
  sourceType = Taxonomy.PHONE
  targetTypes = [Taxonomy.PHONE, Taxonomy.COUNTRY_CODE]

  canTransform(sourceValue: string, _targetContext: FieldContext): boolean {
    return this.parsePhone(sourceValue) !== null
  }

  transform(sourceValue: string, targetContext: FieldContext): string {
    const parsed = this.parsePhone(sourceValue)
    if (!parsed) return sourceValue

    const targetFormat = this.detectTargetFormat(targetContext)
    return this.formatPhone(parsed, targetFormat)
  }

  private parsePhone(value: string): { countryCode?: string; number: string; original: string } | null {
    const cleaned = value.replace(/[\s\-\(\)\.]/g, '')

    // Try known country codes with specific lengths (non-greedy approach)
    // Common country codes: 1 (US/CA), 44 (UK), 86 (CN), 91 (IN), 81 (JP), 82 (KR), 49 (DE), 33 (FR), etc.
    const knownCodes: Record<string, number[]> = {
      '1': [10], '7': [10], '20': [10], '27': [9], '30': [10], '31': [9],
      '32': [8,9], '33': [9], '34': [9], '36': [8,9], '39': [9,10], '40': [9],
      '41': [9], '43': [10], '44': [10], '45': [8], '46': [9], '47': [8],
      '48': [9], '49': [10,11], '51': [9], '52': [10], '53': [8], '54': [10],
      '55': [10,11], '56': [9], '57': [10], '58': [10], '60': [9,10], '61': [9],
      '62': [10,12], '63': [10], '64': [8,9], '65': [8], '66': [9],
      '81': [10,11], '82': [10,11], '84': [9,10], '86': [11], '90': [10],
      '91': [10], '92': [10], '93': [9], '94': [9], '95': [8],
      '212': [9], '213': [9], '216': [8], '218': [9], '220': [7],
      '234': [10], '249': [9], '254': [9], '255': [9], '256': [9],
      '260': [9], '263': [9], '351': [9], '352': [9], '353': [9],
      '354': [7], '355': [8,9], '356': [8], '357': [8], '358': [9,10],
      '370': [8], '371': [8], '372': [7,8], '373': [8], '374': [8],
      '375': [9,10], '380': [9], '381': [8,9], '385': [8,9], '386': [8],
      '420': [9], '421': [9], '852': [8], '853': [8], '855': [8,9],
      '856': [8], '880': [10], '886': [9], '960': [7], '961': [7,8],
      '962': [8,9], '963': [8,9], '964': [10], '965': [8], '966': [9],
      '968': [8], '971': [9], '972': [9], '973': [8], '974': [8],
    }

    if (cleaned.startsWith('+')) {
      const digits = cleaned.slice(1)

      // Try matching known country codes (1-3 digits), longest first
      for (const codeLen of [3, 2, 1]) {
        if (digits.length <= codeLen) continue
        const code = digits.slice(0, codeLen)
        const rest = digits.slice(codeLen)
        if (knownCodes[code]) {
          return { countryCode: code, number: rest, original: cleaned }
        }
      }

      // Fallback: try to split at a reasonable boundary
      // For 1-digit codes, number should be 10+ digits
      // For 2-digit codes, number should be 8+ digits
      // For 3-digit codes, number should be 7+ digits
      for (const [codeLen, minNum] of [[1, 10], [2, 8], [3, 7]] as [number, number][]) {
        if (digits.length > codeLen) {
          const rest = digits.slice(codeLen)
          if (rest.length >= minNum) {
            return { countryCode: digits.slice(0, codeLen), number: rest, original: cleaned }
          }
        }
      }
    }

    const localMatch = cleaned.match(/^(\d{10,11})$/)
    if (localMatch) {
      return { number: localMatch[1], original: cleaned }
    }

    return null
  }

  private detectTargetFormat(context: FieldContext): string {
    const name = (context.attributes.name || '').toLowerCase()
    const label = context.labelText.toLowerCase()
    
    if (/country.?code|国家|区号/.test(name) || /country.?code|国家|区号/.test(label)) {
      return 'country-only'
    }
    
    if (context.attributes.maxlength === '10' || /local|本地/.test(label)) {
      return 'local-only'
    }
    
    const placeholder = context.attributes.placeholder || ''
    if (/\(\d{3}\)/.test(placeholder)) return 'us-format'
    if (/\d{3}-\d{3}-\d{4}/.test(placeholder)) return 'us-dashes'
    
    return 'international'
  }

  private formatPhone(phone: { countryCode?: string; number: string; original: string }, format: string): string {
    const { countryCode, number } = phone
    
    switch (format) {
      case 'e164':
        return countryCode ? `+${countryCode}${number}` : number
      case 'country-only':
        return countryCode ? `+${countryCode}` : '+1'
      case 'local-only':
        return number
      case 'digits-only':
        return number
      case 'us-format':
        if (number.length === 10) {
          return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`
        }
        return number
      case 'us-dashes':
        if (number.length === 10) {
          return `${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`
        }
        return number
      case 'international':
        return countryCode ? `+${countryCode} ${number}` : number
      default:
        return number
    }
  }
}

export class BooleanTransformer implements IValueTransformer {
  name = 'BooleanTransformer'
  sourceType = Taxonomy.WORK_AUTH
  targetTypes = [Taxonomy.WORK_AUTH, Taxonomy.NEED_SPONSORSHIP]

  private readonly trueValues = ['yes', 'true', '1', 'on', '是', 'authorized', 'i agree', 'i confirm']
  private readonly falseValues = ['no', 'false', '0', 'off', '否', 'not authorized', 'i decline']

  canTransform(sourceValue: string, _targetContext: FieldContext): boolean {
    const normalized = sourceValue.toLowerCase().trim()
    return this.trueValues.includes(normalized) || this.falseValues.includes(normalized)
  }

  transform(sourceValue: string, targetContext: FieldContext): string {
    const normalized = sourceValue.toLowerCase().trim()
    const isTrue = this.trueValues.includes(normalized)
    
    if (targetContext.widgetSignature.kind === 'checkbox') {
      return isTrue ? 'true' : 'false'
    }
    
    const options = targetContext.optionsText.map(o => o.toLowerCase())
    
    if (isTrue) {
      for (const trueVal of this.trueValues) {
        const match = options.find(o => o.includes(trueVal))
        if (match) return targetContext.optionsText[options.indexOf(match)]
      }
      return 'Yes'
    } else {
      for (const falseVal of this.falseValues) {
        const match = options.find(o => o.includes(falseVal))
        if (match) return targetContext.optionsText[options.indexOf(match)]
      }
      return 'No'
    }
  }
}

export class DegreeTransformer implements IValueTransformer {
  name = 'DegreeTransformer'
  sourceType = Taxonomy.DEGREE
  targetTypes = [Taxonomy.DEGREE]

  private readonly degreeAliases: Record<string, string[]> = {
    "bachelor's": ['bachelor', 'bs', 'ba', 'bsc', 'undergraduate', '本科', '学士'],
    "master's": ['master', 'ms', 'ma', 'msc', 'graduate', '硕士', '研究生'],
    "ph.d.": ['phd', 'doctorate', 'doctoral', '博士'],
    "associate": ['associate', 'aa', 'as', '专科', '大专'],
    "high school": ['high school', 'hs', '高中'],
  }

  canTransform(sourceValue: string, _targetContext: FieldContext): boolean {
    return sourceValue.length > 0
  }

  transform(sourceValue: string, targetContext: FieldContext): string {
    const normalized = sourceValue.toLowerCase().trim()
    const options = targetContext.optionsText.filter(o => o.trim().length > 0)
    
    if (options.length === 0) return sourceValue
    
    let matchedKey: string | null = null
    for (const [key, aliases] of Object.entries(this.degreeAliases)) {
      if (key === normalized || aliases.some(a => normalized.includes(a) || a.includes(normalized))) {
        matchedKey = key
        break
      }
    }
    
    if (!matchedKey) return sourceValue
    
    const allAliases = [matchedKey, ...(this.degreeAliases[matchedKey] || [])]
    
    for (const option of options) {
      const optLower = option.toLowerCase()
      if (allAliases.some(alias => optLower.includes(alias) || alias.includes(optLower))) {
        return option
      }
    }
    
    return sourceValue
  }
}

const transformers: IValueTransformer[] = [
  new NameTransformer(),
  new DateTransformer(),
  new PhoneTransformer(),
  new BooleanTransformer(),
  new DegreeTransformer(),
]

export interface TransformResult {
  value: string
  transformed: boolean
  logs: TransformAttemptLog[]
}

export function transformValue(
  sourceValue: string,
  sourceType: Taxonomy,
  targetContext: FieldContext,
  enableLogging = false
): string {
  const result = transformValueWithLog(sourceValue, sourceType, targetContext, enableLogging)
  return result.value
}

export function transformValueWithLog(
  sourceValue: string,
  sourceType: Taxonomy,
  targetContext: FieldContext,
  enableLogging = false
): TransformResult {
  const logs: TransformAttemptLog[] = []
  const targetType = detectTargetType(targetContext, sourceType)

  for (const transformer of transformers) {
    if (transformer.sourceType === sourceType || transformer.targetTypes.includes(sourceType)) {
      const canTransform = transformer.canTransform(sourceValue, targetContext)

      const log: TransformAttemptLog = {
        transformerName: transformer.name,
        sourceType: sourceType,
        targetType: targetType,
        sourceValue: sourceValue,
        canTransform,
      }

      if (canTransform) {
        const transformedValue = transformer.transform(sourceValue, targetContext)
        log.transformedValue = transformedValue
        log.detectedFormat = detectFormat(transformer.name, targetContext)
        logs.push(log)

        if (enableLogging) {
          logTransformAttempt(log)
        }

        return { value: transformedValue, transformed: true, logs }
      }

      logs.push(log)
      if (enableLogging) {
        logTransformAttempt(log)
      }
    }
  }

  return { value: sourceValue, transformed: false, logs }
}

function detectTargetType(context: FieldContext, fallback: Taxonomy): string {
  const combined = `${context.labelText} ${context.attributes.name || ''} ${context.attributes.id || ''}`.toLowerCase()

  if (/first.?name|given.?name/.test(combined)) return 'FIRST_NAME'
  if (/last.?name|family.?name/.test(combined)) return 'LAST_NAME'
  if (/year|年/.test(combined)) return 'GRAD_YEAR'
  if (/month|月/.test(combined)) return 'GRAD_MONTH'
  if (/country.?code|区号/.test(combined)) return 'COUNTRY_CODE'

  return fallback
}

function detectFormat(transformerName: string, context: FieldContext): string | undefined {
  if (transformerName === 'DateTransformer') {
    const type = context.attributes.type?.toLowerCase()
    if (type === 'date') return 'ISO date'
    if (type === 'month') return 'month input'
    if (context.widgetSignature.kind === 'select') return 'select dropdown'
    return 'text'
  }
  if (transformerName === 'PhoneTransformer') {
    const placeholder = context.attributes.placeholder || ''
    if (/\(\d{3}\)/.test(placeholder)) return 'US format (xxx) xxx-xxxx'
    if (/\d{3}-\d{3}-\d{4}/.test(placeholder)) return 'US dashes xxx-xxx-xxxx'
    return 'digits only'
  }
  if (transformerName === 'NameTransformer') {
    return 'name split'
  }
  return undefined
}

export function registerTransformer(transformer: IValueTransformer): void {
  transformers.push(transformer)
}
