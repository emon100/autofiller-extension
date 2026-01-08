import { FieldContext, FillResult } from '@/types'

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
  value: string
): Promise<FillResult> {
  const previousValue = element.value
  const normalizedValue = value.toLowerCase().trim()

  try {
    let matched = false

    for (const option of element.options) {
      if (option.value.toLowerCase() === normalizedValue) {
        element.value = option.value
        matched = true
        break
      }
    }

    if (!matched) {
      for (const option of element.options) {
        const optionText = option.textContent?.toLowerCase().trim() || ''
        if (optionText === normalizedValue) {
          element.value = option.value
          matched = true
          break
        }
      }
    }

    if (!matched) {
      for (const option of element.options) {
        const optionText = option.textContent?.toLowerCase().trim() || ''
        if (optionText.includes(normalizedValue) || normalizedValue.includes(optionText)) {
          element.value = option.value
          matched = true
          break
        }
      }
    }

    if (!matched) {
      return {
        success: false,
        element,
        previousValue,
        newValue: value,
        error: `No matching option found for "${value}"`,
      }
    }

    dispatchEvents(element, ['change'])

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
  value: string
): Promise<FillResult> {
  const { element, widgetSignature } = context

  switch (widgetSignature.kind) {
    case 'text':
    case 'textarea':
    case 'date':
      return fillText(element as HTMLInputElement | HTMLTextAreaElement, value)
    
    case 'select':
      return fillSelect(element as HTMLSelectElement, value)
    
    case 'radio':
      return fillRadio(element as HTMLInputElement, value)
    
    case 'checkbox':
      return fillCheckbox(element as HTMLInputElement, value)
    
    case 'combobox':
      return fillCombobox(element as HTMLInputElement, value)
    
    default:
      return {
        success: false,
        element,
        previousValue: '',
        newValue: value,
        error: `Unsupported widget kind: ${widgetSignature.kind}`,
      }
  }
}

export async function executeFillPlan(
  plans: Array<{ context: FieldContext; value: string }>,
  options: { batchSize?: number; delayBetweenBatches?: number } = {}
): Promise<FillResult[]> {
  const { batchSize = 5, delayBetweenBatches = 50 } = options
  const results: FillResult[] = []

  for (let i = 0; i < plans.length; i += batchSize) {
    const batch = plans.slice(i, i + batchSize)
    
    const batchResults = await Promise.all(
      batch.map(({ context, value }) => fillField(context, value))
    )
    
    results.push(...batchResults)

    if (i + batchSize < plans.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
    }
  }

  return results
}
