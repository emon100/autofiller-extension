// Demo module main entry point
export * from './types'
export * from './profiles'
export * from './templates'
export * from './classifier'
export * from './transformer'
export * from './storage'

import { DemoAnswerValue, DemoFieldDef, FillStats, SENSITIVE_TYPES, Taxonomy } from './types'
import { classifyField, getRelatedTypes } from './classifier'
import { transformValue } from './transformer'

const CONFIDENCE_THRESHOLD = 0.75

export interface FillFieldResult {
  success: boolean
  transformed: boolean
  transformReason?: string
  previousValue: string
  newValue: string
}

/**
 * Fill a single form field with the appropriate value
 */
export function fillFormField(
  element: HTMLInputElement | HTMLSelectElement,
  value: string
): boolean {
  try {
    if (element.tagName === 'SELECT') {
      const selectEl = element as HTMLSelectElement
      for (const opt of Array.from(selectEl.options)) {
        if (
          opt.value.toLowerCase() === value.toLowerCase() ||
          opt.textContent?.toLowerCase().includes(value.toLowerCase())
        ) {
          selectEl.value = opt.value
          selectEl.dispatchEvent(new Event('change', { bubbles: true }))
          return true
        }
      }
      return false
    }

    if (element.type === 'radio') {
      const form = element.form || element.closest('form')
      if (!form) return false
      const radios = form.querySelectorAll<HTMLInputElement>(`input[name="${element.name}"]`)
      for (const radio of Array.from(radios)) {
        const radioLabel = radio.closest('label')?.textContent?.toLowerCase() || radio.value.toLowerCase()
        if (radioLabel.includes(value.toLowerCase()) || value.toLowerCase().includes(radioLabel)) {
          radio.checked = true
          radio.dispatchEvent(new Event('change', { bubbles: true }))
          return true
        }
      }
      return false
    }

    if (element.type === 'checkbox') {
      const inputEl = element as HTMLInputElement
      const shouldCheck = ['yes', 'true', '1'].includes(value.toLowerCase())
      if (inputEl.checked !== shouldCheck) {
        inputEl.click()
      }
      return true
    }

    // Text-like inputs
    const inputEl = element as HTMLInputElement
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    if (nativeSetter) {
      nativeSetter.call(inputEl, value)
    } else {
      inputEl.value = value
    }
    inputEl.dispatchEvent(new Event('input', { bubbles: true }))
    inputEl.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  } catch {
    return false
  }
}

/**
 * Execute fill plan for a form
 */
export interface FillPlanItem {
  element: HTMLInputElement | HTMLSelectElement
  fieldDef: DemoFieldDef
  value: string
  transformed: boolean
  transformReason?: string
}

export function createFillPlan(
  elements: Array<HTMLInputElement | HTMLSelectElement>,
  fieldDefs: Map<string, DemoFieldDef>,
  answers: Record<string, DemoAnswerValue>
): { plan: FillPlanItem[]; stats: Partial<FillStats> } {
  const plan: FillPlanItem[] = []
  let transformedCount = 0

  for (const element of elements) {
    const fieldDef = fieldDefs.get(element.name)
    const classification = classifyField(element.name, '', fieldDef)

    if (classification.type === Taxonomy.UNKNOWN) continue

    // Find matching answer
    let answer = answers[classification.type]
    let sourceType: Taxonomy = classification.type

    if (!answer) {
      // Try related types for transformation
      const relatedTypes = getRelatedTypes(classification.type)
      for (const relatedType of relatedTypes) {
        if (answers[relatedType]) {
          answer = answers[relatedType]
          sourceType = relatedType as Taxonomy
          break
        }
      }
    }

    if (!answer) continue

    // Skip sensitive fields that are not allowed
    if (SENSITIVE_TYPES.has(classification.type) && !answer.autofillAllowed) {
      continue
    }

    // Skip low confidence
    if (classification.score < CONFIDENCE_THRESHOLD) {
      continue
    }

    // Transform value if needed
    const transformResult = transformValue(answer.value, sourceType, fieldDef || {
      name: element.name,
      label: '',
      type: element.type as DemoFieldDef['type'],
      taxonomy: classification.type,
    }, answers)

    plan.push({
      element,
      fieldDef: fieldDef || {
        name: element.name,
        label: '',
        type: element.type as DemoFieldDef['type'],
        taxonomy: classification.type,
      },
      value: transformResult.value,
      transformed: transformResult.transformed,
      transformReason: transformResult.reason,
    })

    if (transformResult.transformed) {
      transformedCount++
    }
  }

  return {
    plan,
    stats: { transformed: transformedCount },
  }
}

/**
 * Execute a fill plan with optional animation delay
 */
export async function executeFillPlan(
  plan: FillPlanItem[],
  options: {
    delayMs?: number
    onProgress?: (index: number, item: FillPlanItem) => void
  } = {}
): Promise<FillStats> {
  const { delayMs = 0, onProgress } = options
  const startTime = performance.now()
  let filledCount = 0
  let transformedCount = 0

  for (let i = 0; i < plan.length; i++) {
    const item = plan[i]
    onProgress?.(i, item)

    const success = fillFormField(item.element, item.value)
    if (success) {
      filledCount++
      if (item.transformed) {
        transformedCount++
      }
    }

    if (delayMs > 0 && i < plan.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return {
    scanned: plan.length,
    filled: filledCount,
    transformed: transformedCount,
    timeMs: Math.round(performance.now() - startTime),
  }
}
