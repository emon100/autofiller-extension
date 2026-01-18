import { FieldContext, FillResult } from '@/types'
import { ExecutorLog, logExecutor } from '@/utils/logger'

export interface FillResultWithLog extends FillResult {
  executorLog?: ExecutorLog
}

export interface FillSnapshot {
  value?: string
  checked?: boolean
  selectedIndex?: number
}

export function createFillSnapshot(element: HTMLElement): FillSnapshot {
  const snapshot: FillSnapshot = {}

  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      snapshot.checked = element.checked
    } else {
      snapshot.value = element.value
    }
  } else if (element instanceof HTMLSelectElement) {
    snapshot.selectedIndex = element.selectedIndex
    snapshot.value = element.value
  } else if (element instanceof HTMLTextAreaElement) {
    snapshot.value = element.value
  }

  return snapshot
}

export function restoreSnapshot(element: HTMLElement, snapshot: FillSnapshot): void {
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      if (snapshot.checked !== undefined) {
        element.checked = snapshot.checked
        dispatchEvents(element, ['change'])
      }
    } else {
      if (snapshot.value !== undefined) {
        setInputValue(element, snapshot.value)
      }
    }
  } else if (element instanceof HTMLSelectElement) {
    if (snapshot.selectedIndex !== undefined) {
      element.selectedIndex = snapshot.selectedIndex
      dispatchEvents(element, ['change'])
    }
  } else if (element instanceof HTMLTextAreaElement) {
    if (snapshot.value !== undefined) {
      setInputValue(element, snapshot.value)
    }
  }
}

function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    'value'
  )?.set

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value)
  } else {
    element.value = value
  }

  dispatchEvents(element, ['input', 'change'])
}

function dispatchEvents(element: HTMLElement, eventTypes: string[]): void {
  for (const type of eventTypes) {
    const event = new Event(type, { bubbles: true, cancelable: true })
    element.dispatchEvent(event)
  }
}

export async function fillText(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): Promise<FillResult> {
  const previousValue = element.value

  try {
    setInputValue(element, value)

    return {
      success: true,
      element,
      previousValue,
      newValue: value,
    }
  } catch (error) {
    return {
      success: false,
      element,
      previousValue,
      newValue: value,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function fillSelect(
  element: HTMLSelectElement,
  value: string,
  label = ''
): Promise<FillResultWithLog> {
  const startTime = performance.now()
  const previousValue = element.value
  const normalizedValue = value.toLowerCase().trim()
  let strategy = 'none'
  let matchedOption: string | undefined

  try {
    let matched = false

    // Strategy 1: Exact value match
    for (const option of element.options) {
      if (option.value.toLowerCase() === normalizedValue) {
        element.value = option.value
        matched = true
        strategy = 'exact-value'
        matchedOption = option.value
        break
      }
    }

    // Strategy 2: Exact text match
    if (!matched) {
      for (const option of element.options) {
        const optionText = option.textContent?.toLowerCase().trim() || ''
        if (optionText === normalizedValue) {
          element.value = option.value
          matched = true
          strategy = 'exact-text'
          matchedOption = option.textContent || option.value
          break
        }
      }
    }

    // Strategy 3: Fuzzy match (contains)
    if (!matched) {
      for (const option of element.options) {
        const optionText = option.textContent?.toLowerCase().trim() || ''
        if (optionText.includes(normalizedValue) || normalizedValue.includes(optionText)) {
          element.value = option.value
          matched = true
          strategy = 'fuzzy-contains'
          matchedOption = option.textContent || option.value
          break
        }
      }
    }

    const executorLog: ExecutorLog = {
      fieldLabel: label,
      widgetKind: 'select',
      strategy,
      targetValue: value,
      matchedOption,
      success: matched,
      error: matched ? undefined : `No matching option found for "${value}"`,
      timeMs: performance.now() - startTime
    }

    if (!matched) {
      return {
        success: false,
        element,
        previousValue,
        newValue: value,
        error: `No matching option found for "${value}"`,
        executorLog
      }
    }

    dispatchEvents(element, ['change'])

    return {
      success: true,
      element,
      previousValue,
      newValue: element.value,
      executorLog
    }
  } catch (error) {
    return {
      success: false,
      element,
      previousValue,
      newValue: value,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function fillRadio(
  element: HTMLInputElement,
  value: string
): Promise<FillResult> {
  const name = element.getAttribute('name')
  const previousValue = element.checked ? element.value : ''
  const normalizedValue = value.toLowerCase().trim()

  try {
    const radios = name
      ? document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`)
      : [element]

    let matched = false

    for (const radio of radios) {
      const radioValue = radio.value.toLowerCase()
      
      const isMatch = 
        radioValue === normalizedValue ||
        (normalizedValue === 'true' && radioValue === 'yes') ||
        (normalizedValue === 'false' && radioValue === 'no') ||
        (normalizedValue === 'yes' && radioValue === 'true') ||
        (normalizedValue === 'no' && radioValue === 'false')

      if (isMatch) {
        radio.checked = true
        radio.click()
        dispatchEvents(radio, ['change'])
        matched = true
        break
      }
    }

    if (!matched) {
      return {
        success: false,
        element,
        previousValue,
        newValue: value,
        error: `No matching radio option found for "${value}"`,
      }
    }

    return {
      success: true,
      element,
      previousValue,
      newValue: value,
    }
  } catch (error) {
    return {
      success: false,
      element,
      previousValue,
      newValue: value,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function fillCheckbox(
  element: HTMLInputElement,
  value: string
): Promise<FillResult> {
  const previousValue = element.checked ? 'true' : 'false'
  const normalizedValue = value.toLowerCase().trim()
  const shouldCheck = ['true', 'yes', '1', 'on', 'checked'].includes(normalizedValue)

  try {
    if (element.checked !== shouldCheck) {
      element.click()
      dispatchEvents(element, ['change'])
    }

    return {
      success: true,
      element,
      previousValue,
      newValue: shouldCheck ? 'true' : 'false',
    }
  } catch (error) {
    return {
      success: false,
      element,
      previousValue,
      newValue: value,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function fillCombobox(
  element: HTMLInputElement,
  value: string
): Promise<FillResult> {
  const previousValue = element.value

  try {
    element.focus()
    
    await new Promise(resolve => setTimeout(resolve, 50))

    setInputValue(element, value)

    await new Promise(resolve => setTimeout(resolve, 100))

    const combobox = element.closest('[role="combobox"]')
    const listboxId = element.getAttribute('aria-controls')
    const listbox = listboxId 
      ? document.getElementById(listboxId)
      : combobox?.querySelector('[role="listbox"]')

    if (listbox) {
      const options = listbox.querySelectorAll('[role="option"]')
      const normalizedValue = value.toLowerCase()

      for (const option of options) {
        const optionText = option.textContent?.toLowerCase() || ''
        if (optionText.includes(normalizedValue) || normalizedValue.includes(optionText)) {
          (option as HTMLElement).click()
          break
        }
      }
    }

    return {
      success: true,
      element,
      previousValue,
      newValue: element.value,
    }
  } catch (error) {
    return {
      success: false,
      element,
      previousValue,
      newValue: value,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function fillField(
  context: FieldContext,
  value: string,
  enableLogging = false
): Promise<FillResultWithLog> {
  const startTime = performance.now()
  const { element, widgetSignature, labelText } = context
  let result: FillResultWithLog

  switch (widgetSignature.kind) {
    case 'text':
    case 'textarea':
    case 'date':
      result = await fillText(element as HTMLInputElement | HTMLTextAreaElement, value)
      result.executorLog = {
        fieldLabel: labelText,
        widgetKind: widgetSignature.kind,
        strategy: 'direct-set',
        targetValue: value,
        success: result.success,
        error: result.error,
        timeMs: performance.now() - startTime
      }
      break

    case 'select':
      result = await fillSelect(element as HTMLSelectElement, value, labelText)
      break

    case 'radio':
      result = await fillRadio(element as HTMLInputElement, value)
      result.executorLog = {
        fieldLabel: labelText,
        widgetKind: 'radio',
        strategy: 'value-match',
        targetValue: value,
        success: result.success,
        error: result.error,
        timeMs: performance.now() - startTime
      }
      break

    case 'checkbox':
      result = await fillCheckbox(element as HTMLInputElement, value)
      result.executorLog = {
        fieldLabel: labelText,
        widgetKind: 'checkbox',
        strategy: 'boolean-check',
        targetValue: value,
        success: result.success,
        error: result.error,
        timeMs: performance.now() - startTime
      }
      break

    case 'combobox':
      result = await fillCombobox(element as HTMLInputElement, value)
      result.executorLog = {
        fieldLabel: labelText,
        widgetKind: 'combobox',
        strategy: 'type-and-select',
        targetValue: value,
        success: result.success,
        error: result.error,
        timeMs: performance.now() - startTime
      }
      break

    default:
      result = {
        success: false,
        element,
        previousValue: '',
        newValue: value,
        error: `Unsupported widget kind: ${widgetSignature.kind}`,
        executorLog: {
          fieldLabel: labelText,
          widgetKind: widgetSignature.kind,
          strategy: 'unsupported',
          targetValue: value,
          success: false,
          error: `Unsupported widget kind: ${widgetSignature.kind}`,
          timeMs: performance.now() - startTime
        }
      }
  }

  if (enableLogging && result.executorLog) {
    logExecutor(result.executorLog)
  }

  return result
}

export async function executeFillPlan(
  plans: Array<{ context: FieldContext; value: string }>,
  options: { batchSize?: number; delayBetweenBatches?: number; enableLogging?: boolean } = {}
): Promise<FillResultWithLog[]> {
  const { batchSize = 5, delayBetweenBatches = 50, enableLogging = false } = options
  const results: FillResultWithLog[] = []

  for (let i = 0; i < plans.length; i += batchSize) {
    const batch = plans.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(({ context, value }) => fillField(context, value, enableLogging))
    )

    results.push(...batchResults)

    if (i + batchSize < plans.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
    }
  }

  return results
}
