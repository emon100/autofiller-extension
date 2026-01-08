import { Taxonomy, FieldContext, IValueTransformer } from '@/types'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export class NameTransformer implements IValueTransformer {
  name = 'NameTransformer'
  sourceType = Taxonomy.FULL_NAME
  targetTypes = [Taxonomy.FULL_NAME, Taxonomy.FIRST_NAME, Taxonomy.LAST_NAME]

  canTransform(sourceValue: string, targetContext: FieldContext): boolean {
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

  canTransform(sourceValue: string, targetContext: FieldContext): boolean {
    return sourceValue.length > 0
  }

  transform(sourceValue: string, targetContext: FieldContext, lastName?: string): string {
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

  canTransform(sourceValue: string, targetContext: FieldContext): boolean {
    return this.parseDate(sourceValue) !== null
  }

  transform(sourceValue: string, targetContext: FieldContext): string {
    const parsed = this.parseDate(sourceValue)
    if (!parsed) return sourceValue

    const targetFormat = this.detectTargetFormat(targetContext)
    return this.formatDate(parsed, targetFormat)
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
      if (MONTH_NAMES.some(m => options.includes(m.toLowerCase()))) {
        return 'month-name'
      }
      if (/^\d{4}$/.test(context.optionsText[0] || '')) {
        return 'year-only'
      }
    }
    
    if (/year|年/.test(name) || /year|年/.test(label)) return 'year-only'
    if (/month|月/.test(name) || /month|月/.test(label)) return 'month-only'
    
    return 'iso'
  }

  private formatDate(date: { year: number; month?: number; day?: number }, format: string): string {
    const { year, month, day } = date
    const m = month || 1
    const d = day || 1
    
    switch (format) {
      case 'iso':
        return day ? `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` 
                   : `${year}-${String(m).padStart(2, '0')}`
      case 'us':
        return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${year}`
      case 'month-input':
        return `${year}-${String(m).padStart(2, '0')}`
      case 'year-only':
        return String(year)
      case 'month-only':
        return String(m)
      case 'month-name':
        return MONTH_NAMES[m - 1] || String(m)
      case 'month-year':
        return `${MONTH_NAMES[m - 1]} ${year}`
      default:
        return `${year}-${String(m).padStart(2, '0')}`
    }
  }
}

export class PhoneTransformer implements IValueTransformer {
  name = 'PhoneTransformer'
  sourceType = Taxonomy.PHONE
  targetTypes = [Taxonomy.PHONE, Taxonomy.COUNTRY_CODE]

  canTransform(sourceValue: string, targetContext: FieldContext): boolean {
    return this.parsePhone(sourceValue) !== null
  }

  transform(sourceValue: string, targetContext: FieldContext): string {
    const parsed = this.parsePhone(sourceValue)
    if (!parsed) return sourceValue

    const targetFormat = this.detectTargetFormat(targetContext)
    return this.formatPhone(parsed, targetFormat)
  }

  private parsePhone(value: string): { countryCode?: string; number: string } | null {
    const cleaned = value.replace(/[\s\-\(\)\.]/g, '')
    
    const e164Match = cleaned.match(/^\+(\d{1,3})(\d{10})$/)
    if (e164Match) {
      return { countryCode: e164Match[1], number: e164Match[2] }
    }

    const withCountry = cleaned.match(/^\+(\d{1,3})(\d{7,15})$/)
    if (withCountry) {
      return { countryCode: withCountry[1], number: withCountry[2] }
    }

    const localMatch = cleaned.match(/^(\d{10,11})$/)
    if (localMatch) {
      return { number: localMatch[1] }
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
    
    return 'digits-only'
  }

  private formatPhone(phone: { countryCode?: string; number: string }, format: string): string {
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

  canTransform(sourceValue: string, targetContext: FieldContext): boolean {
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

  canTransform(sourceValue: string, targetContext: FieldContext): boolean {
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

export function transformValue(
  sourceValue: string, 
  sourceType: Taxonomy, 
  targetContext: FieldContext
): string {
  for (const transformer of transformers) {
    if (transformer.sourceType === sourceType || transformer.targetTypes.includes(sourceType)) {
      if (transformer.canTransform(sourceValue, targetContext)) {
        return transformer.transform(sourceValue, targetContext)
      }
    }
  }
  return sourceValue
}

export function registerTransformer(transformer: IValueTransformer): void {
  transformers.push(transformer)
}
