import { Taxonomy, DemoFieldDef, DemoAnswerValue } from './types'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export interface TransformResult {
  value: string
  transformed: boolean
  reason?: string
}

/**
 * Transform a value from source type to target field type
 */
export function transformValue(
  sourceValue: string,
  sourceType: Taxonomy,
  targetField: DemoFieldDef,
  allAnswers: Record<string, DemoAnswerValue>
): TransformResult {
  if (!sourceValue) {
    return { value: sourceValue, transformed: false }
  }

  const targetType = targetField.taxonomy

  // Name transformations
  if (sourceType === Taxonomy.FULL_NAME) {
    const isChinese = /[\u4e00-\u9fa5]/.test(sourceValue)

    if (targetType === Taxonomy.FIRST_NAME) {
      const result = isChinese ? sourceValue.slice(1) : sourceValue.split(/\s+/)[0]
      return { value: result, transformed: true, reason: 'split full name to first' }
    }

    if (targetType === Taxonomy.LAST_NAME) {
      const result = isChinese ? sourceValue.charAt(0) : sourceValue.split(/\s+/).pop() || ''
      return { value: result, transformed: true, reason: 'split full name to last' }
    }
  }

  // Merge first+last to full name
  if ((sourceType === Taxonomy.FIRST_NAME || sourceType === Taxonomy.LAST_NAME) &&
      targetType === Taxonomy.FULL_NAME) {
    const first = allAnswers[Taxonomy.FIRST_NAME]?.value || ''
    const last = allAnswers[Taxonomy.LAST_NAME]?.value || ''
    const isChinese = /[\u4e00-\u9fa5]/.test(first) || /[\u4e00-\u9fa5]/.test(last)
    const result = isChinese ? `${last}${first}` : `${first} ${last}`.trim()
    return { value: result, transformed: true, reason: 'merged first+last to full' }
  }

  // Date transformations
  if ([Taxonomy.GRAD_DATE, Taxonomy.GRAD_YEAR, Taxonomy.GRAD_MONTH].includes(sourceType)) {
    const dateMatch = sourceValue.match(/(\d{4})[-/]?(\d{2})?[-/]?(\d{2})?/)
    if (dateMatch) {
      const [, year, month, day] = dateMatch

      if (targetType === Taxonomy.GRAD_YEAR || (targetField.type === 'select' && /year/i.test(targetField.label))) {
        return { value: year, transformed: true, reason: 'extracted year' }
      }

      if (targetType === Taxonomy.GRAD_MONTH) {
        if (targetField.type === 'select' && targetField.options?.some(o => MONTH_NAMES.includes(o))) {
          const monthNum = parseInt(month || '1')
          return { value: MONTH_NAMES[monthNum - 1] || month, transformed: true, reason: 'converted to month name' }
        }
        return { value: month || '01', transformed: true, reason: 'extracted month' }
      }

      if (targetField.type === 'date') {
        return { value: `${year}-${month || '01'}-${day || '01'}`, transformed: true, reason: 'formatted as date' }
      }

      if (targetField.type === 'month') {
        return { value: `${year}-${month || '01'}`, transformed: true, reason: 'formatted as month' }
      }
    }
  }

  // Phone transformations
  if (sourceType === Taxonomy.PHONE || sourceType === Taxonomy.COUNTRY_CODE) {
    const cleaned = sourceValue.replace(/[\s\-().]/g, '')
    const match = cleaned.match(/^\+?(\d{1,3})?(\d{10,11})$/)

    if (match) {
      const [, countryCode, number] = match

      if (targetType === Taxonomy.COUNTRY_CODE) {
        return { value: countryCode ? `+${countryCode}` : '+1', transformed: true, reason: 'extracted country code' }
      }

      if (targetField.maxlength === '10') {
        return { value: number.slice(-10), transformed: true, reason: 'truncated to local format' }
      }

      if (targetField.placeholder?.includes('(')) {
        const n = number.slice(-10)
        return { value: `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`, transformed: true, reason: 'formatted US phone' }
      }
    }
  }

  // Boolean transformations
  if ([Taxonomy.WORK_AUTH, Taxonomy.NEED_SPONSORSHIP].includes(sourceType)) {
    const normalized = sourceValue.toLowerCase()
    const isTrue = ['yes', 'true', '1', '是'].includes(normalized)

    if (targetField.type === 'checkbox') {
      return { value: isTrue ? 'true' : 'false', transformed: false }
    }

    if (targetField.options) {
      for (const opt of targetField.options) {
        const optLower = opt.toLowerCase()
        if (isTrue && (optLower.includes('yes') || optLower.includes('authorized') || optLower === '是')) {
          return { value: opt, transformed: optLower !== normalized, reason: 'matched yes option' }
        }
        if (!isTrue && (optLower.includes('no') || optLower.includes('not') || optLower === '否')) {
          return { value: opt, transformed: optLower !== normalized, reason: 'matched no option' }
        }
      }
    }

    return { value: isTrue ? 'Yes' : 'No', transformed: false }
  }

  // Degree transformations
  if (sourceType === Taxonomy.DEGREE && targetField.options) {
    const degreeMap: Record<string, string[]> = {
      "bachelor's": ['bachelor', 'bs', 'ba', '本科', 'undergraduate'],
      "master's": ['master', 'ms', 'ma', '硕士', 'graduate'],
      'ph.d.': ['phd', 'doctorate', '博士', 'doctoral'],
      'associate': ['associate', 'aa', 'as'],
      'high school': ['high school', '高中', 'secondary'],
    }

    const normalized = sourceValue.toLowerCase()
    for (const [key, aliases] of Object.entries(degreeMap)) {
      if (key === normalized || aliases.some(a => normalized.includes(a))) {
        for (const opt of targetField.options) {
          const optLower = opt.toLowerCase()
          if (optLower.includes(key) || aliases.some(a => optLower.includes(a))) {
            if (opt !== sourceValue) {
              return { value: opt, transformed: true, reason: 'matched degree alias' }
            }
          }
        }
      }
    }
  }

  return { value: sourceValue, transformed: false }
}
