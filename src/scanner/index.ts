import { FieldContext, WidgetKind, WidgetSignature, InteractionPlan } from '@/types'

const INPUT_SELECTORS = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
  'select',
  'textarea',
  '[role="combobox"] input',
  '[role="listbox"]',
  '[contenteditable="true"]',
].join(', ')

export function extractLabelText(element: HTMLElement): string {
  const id = element.getAttribute('id')
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`)
    if (label) return normalizeText(label.textContent)
  }

  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) return normalizeText(ariaLabel)

  const ariaLabelledBy = element.getAttribute('aria-labelledby')
  if (ariaLabelledBy) {
    const labelElement = document.getElementById(ariaLabelledBy)
    if (labelElement) return normalizeText(labelElement.textContent)
  }

  const parentLabel = element.closest('label')
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true) as HTMLElement
    clone.querySelectorAll('input, select, textarea').forEach(el => el.remove())
    return normalizeText(clone.textContent)
  }

  const placeholder = element.getAttribute('placeholder')
  if (placeholder) return normalizeText(placeholder)

  const nearbyText = findNearbyText(element)
  if (nearbyText) return nearbyText

  return ''
}

function findNearbyText(element: HTMLElement): string {
  const parent = element.parentElement
  if (!parent) return ''

  const prevSibling = element.previousElementSibling
  if (prevSibling && isTextElement(prevSibling)) {
    return normalizeText(prevSibling.textContent)
  }

  for (const child of parent.children) {
    if (child === element) continue
    if (isTextElement(child) && child.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) {
      return normalizeText(child.textContent)
    }
  }

  return ''
}

function isTextElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase()
  return ['span', 'label', 'p', 'div', 'strong', 'b', 'em', 'i'].includes(tag) &&
    el.children.length === 0
}

function normalizeText(text: string | null): string {
  if (!text) return ''
  return text.replace(/\s+/g, ' ').trim()
}

export function extractFieldContext(element: HTMLElement): FieldContext {
  const widgetSignature = detectWidgetSignature(element)
  const attributes = extractAttributes(element)
  const labelText = extractLabelText(element)
  const sectionTitle = extractSectionTitle(element)
  const optionsText = extractOptions(element, widgetSignature.kind)
  const { framePath, shadowPath } = extractPaths(element)

  return {
    element,
    labelText,
    sectionTitle,
    attributes,
    optionsText,
    framePath,
    shadowPath,
    widgetSignature,
  }
}

function detectWidgetSignature(element: HTMLElement): WidgetSignature {
  const tagName = element.tagName.toLowerCase()
  const type = element.getAttribute('type')?.toLowerCase() || ''
  const role = element.getAttribute('role')?.toLowerCase() || ''

  let kind: WidgetKind = 'text'
  let interactionPlan: InteractionPlan = 'nativeSetterWithEvents'

  if (tagName === 'select') {
    kind = 'select'
    interactionPlan = 'directSet'
  } else if (tagName === 'textarea') {
    kind = 'textarea'
  } else if (tagName === 'input') {
    switch (type) {
      case 'checkbox':
        kind = 'checkbox'
        interactionPlan = 'directSet'
        break
      case 'radio':
        kind = 'radio'
        interactionPlan = 'directSet'
        break
      case 'date':
      case 'datetime-local':
      case 'month':
      case 'week':
      case 'time':
        kind = 'date'
        break
      default:
        kind = 'text'
    }
  }

  const comboboxParent = element.closest('[role="combobox"]')
  if (comboboxParent || role === 'combobox') {
    kind = 'combobox'
    interactionPlan = 'openDropdownClickOption'
  }

  const attributes: Record<string, string> = {}
  if (role) attributes['role'] = role

  return {
    kind,
    role: role || undefined,
    attributes,
    interactionPlan,
    optionLocator: kind === 'combobox' ? '[role="option"]' : undefined,
  }
}

function extractAttributes(element: HTMLElement): Record<string, string> {
  const attrs: Record<string, string> = {}
  const relevantAttrs = ['id', 'name', 'type', 'autocomplete', 'role', 'placeholder', 'required', 'pattern']
  
  for (const attr of relevantAttrs) {
    const value = element.getAttribute(attr)
    if (value !== null) {
      attrs[attr] = value
    }
  }
  
  return attrs
}

function extractSectionTitle(element: HTMLElement): string {
  const fieldset = element.closest('fieldset')
  if (fieldset) {
    const legend = fieldset.querySelector('legend')
    if (legend) return normalizeText(legend.textContent)
  }

  let current: HTMLElement | null = element
  while (current) {
    const heading = findPreviousHeading(current)
    if (heading) return normalizeText(heading.textContent)
    current = current.parentElement
  }

  return ''
}

function findPreviousHeading(element: HTMLElement): HTMLElement | null {
  const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
  let sibling = element.previousElementSibling
  
  while (sibling) {
    if (headings.includes(sibling.tagName.toLowerCase())) {
      return sibling as HTMLElement
    }
    const nestedHeading = sibling.querySelector(headings.join(', '))
    if (nestedHeading) return nestedHeading as HTMLElement
    sibling = sibling.previousElementSibling
  }

  const parent = element.parentElement
  if (parent && parent !== document.body) {
    return findPreviousHeading(parent)
  }
  
  return null
}

function extractOptions(element: HTMLElement, kind: WidgetKind): string[] {
  const options: string[] = []

  if (kind === 'select' && element instanceof HTMLSelectElement) {
    for (const option of element.options) {
      if (option.value) {
        options.push(normalizeText(option.textContent))
      }
    }
  }

  if (kind === 'combobox') {
    const combobox = element.closest('[role="combobox"]') || element
    const listbox = combobox.querySelector('[role="listbox"]') || 
                   document.getElementById(element.getAttribute('aria-controls') || '')
    
    if (listbox) {
      listbox.querySelectorAll('[role="option"]').forEach(opt => {
        options.push(normalizeText(opt.textContent))
      })
    }
  }

  return options
}

function extractPaths(element: HTMLElement): { framePath: string[], shadowPath: string[] } {
  const framePath: string[] = []
  const shadowPath: string[] = []

  let root = element.getRootNode()
  while (root instanceof ShadowRoot) {
    const host = root.host as HTMLElement
    shadowPath.unshift(getElementSelector(host))
    root = host.getRootNode()
  }

  return { framePath, shadowPath }
}

function getElementSelector(element: HTMLElement): string {
  if (element.id) return `#${element.id}`
  
  const tag = element.tagName.toLowerCase()
  const classes = Array.from(element.classList).slice(0, 2).join('.')
  
  if (classes) return `${tag}.${classes}`
  return tag
}

export function scanFields(root: Element | Document | ShadowRoot): FieldContext[] {
  const fields: FieldContext[] = []
  const processedRadioGroups = new Set<string>()
  const excludedTypes = new Set(['hidden', 'submit', 'button', 'reset', 'image'])

  function scan(node: Element | Document | ShadowRoot) {
    const elements = (node as Element).querySelectorAll 
      ? (node as Element).querySelectorAll(INPUT_SELECTORS)
      : []

    for (const element of elements) {
      const htmlElement = element as HTMLElement

      if (!isVisible(htmlElement)) continue
      if (htmlElement.hasAttribute('disabled')) continue

      const type = htmlElement.getAttribute('type')?.toLowerCase()
      
      if (type && excludedTypes.has(type)) continue
      
      if (type === 'radio') {
        const name = htmlElement.getAttribute('name')
        if (name && processedRadioGroups.has(name)) continue
        if (name) processedRadioGroups.add(name)
      }

      fields.push(extractFieldContext(htmlElement))
    }

    if (node instanceof Element) {
      const shadowRoot = (node as HTMLElement).shadowRoot
      if (shadowRoot) {
        scan(shadowRoot)
      }
    }

    const allElements = node instanceof Document || node instanceof ShadowRoot
      ? node.querySelectorAll('*')
      : (node as Element).querySelectorAll('*')

    for (const el of allElements) {
      const shadowRoot = (el as HTMLElement).shadowRoot
      if (shadowRoot) {
        scan(shadowRoot)
      }
    }
  }

  scan(root)
  return fields
}

function isVisible(element: HTMLElement): boolean {
  const style = getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false
  }

  if (element.hasAttribute('hidden')) {
    return false
  }
  
  return true
}
