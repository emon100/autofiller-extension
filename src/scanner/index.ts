import { FieldContext, WidgetKind, WidgetSignature, InteractionPlan } from '@/types'
import { ScanLog, logScan } from '@/utils/logger'

// Export section detection utilities
export * from './sectionDetector'

// Export add button detection utilities
export * from './addButtonDetector'

const INPUT_SELECTORS = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
  'select',
  'textarea',
  '[role="combobox"] input',
  '[role="listbox"]',
  '[contenteditable="true"]',
].join(', ')

export interface LabelExtractionResult {
  text: string
  source: 'label-for' | 'aria-label' | 'aria-labelledby' | 'parent-label' | 'sibling-label' | 'ancestor-heuristic' | 'placeholder' | 'nearby-text' | 'name-attr' | 'none'
}

export interface AncestorTextCandidate {
  text: string
  depth: number
  element: HTMLElement
  type: 'label' | 'text-node' | 'heading' | 'legend'
}

// Ideal label length range (characters)
const MIN_LABEL_LENGTH = 5
const MAX_LABEL_LENGTH = 200
const IDEAL_LABEL_LENGTH = 50

export function extractLabelTextWithSource(element: HTMLElement): LabelExtractionResult {
  const id = element.getAttribute('id')
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`)
    if (label) return { text: normalizeText(label.textContent), source: 'label-for' }
  }

  // Also check if label[for] matches the name attribute (common pattern)
  const name = element.getAttribute('name')
  if (name) {
    const labelByName = document.querySelector(`label[for="${name}"]`)
    if (labelByName) return { text: normalizeText(labelByName.textContent), source: 'label-for' }
  }

  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) return { text: normalizeText(ariaLabel), source: 'aria-label' }

  const ariaLabelledBy = element.getAttribute('aria-labelledby')
  if (ariaLabelledBy) {
    const labelElement = document.getElementById(ariaLabelledBy)
    if (labelElement) return { text: normalizeText(labelElement.textContent), source: 'aria-labelledby' }
  }

  const parentLabel = element.closest('label')
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true) as HTMLElement
    clone.querySelectorAll('input, select, textarea').forEach(el => el.remove())
    return { text: normalizeText(clone.textContent), source: 'parent-label' }
  }

  const siblingLabel = findSiblingLabel(element)
  if (siblingLabel) return { text: siblingLabel, source: 'sibling-label' }

  // Use heuristic ancestor text search
  const placeholder = element.getAttribute('placeholder')
  const placeholderLength = placeholder ? normalizeText(placeholder).length : 0
  const ancestorText = findBestAncestorText(element, placeholderLength)
  if (ancestorText) return { text: ancestorText, source: 'ancestor-heuristic' }

  if (placeholder) return { text: normalizeText(placeholder), source: 'placeholder' }

  const nearbyText = findNearbyText(element)
  if (nearbyText) return { text: nearbyText, source: 'nearby-text' }

  if (name) return { text: formatName(name), source: 'name-attr' }

  return { text: '', source: 'none' }
}

export function extractLabelText(element: HTMLElement): string {
  return extractLabelTextWithSource(element).text
}

function findSiblingLabel(element: HTMLElement): string {
  const parent = element.parentElement
  if (!parent) return ''

  let sibling = element.previousElementSibling
  while (sibling) {
    if (sibling.tagName.toLowerCase() === 'label') {
      return normalizeText(sibling.textContent)
    }
    sibling = sibling.previousElementSibling
  }

  const labels = parent.querySelectorAll('label')
  for (const label of labels) {
    if (label.querySelector('input, select, textarea')) continue
    const labelRect = label.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    if (labelRect.bottom <= elementRect.top + 50) {
      return normalizeText(label.textContent)
    }
  }

  return ''
}

/**
 * Collect all candidate text from ancestor elements.
 * This provides context for LLM-based parsing or heuristic selection.
 */
export function collectAncestorContext(element: HTMLElement, maxDepth = 6): AncestorTextCandidate[] {
  const candidates: AncestorTextCandidate[] = []
  const seenTexts = new Set<string>()
  let current: HTMLElement | null = element.parentElement
  let depth = 0

  function addCandidate(text: string, el: HTMLElement, type: AncestorTextCandidate['type']): void {
    if (!text || seenTexts.has(text)) return
    seenTexts.add(text)
    candidates.push({ text, depth, element: el, type })
  }

  while (current && depth < maxDepth) {
    const tag = current.tagName.toLowerCase()
    if (tag === 'form' || tag === 'body' || tag === 'html') break

    collectLabelsFromContainer(current, addCandidate)
    collectLegendFromFieldset(current, tag, addCandidate)
    collectHeadingsFromContainer(current, addCandidate)
    collectContainerText(current, addCandidate)

    current = current.parentElement
    depth++
  }

  return candidates
}

function collectLabelsFromContainer(
  container: HTMLElement,
  addCandidate: (text: string, el: HTMLElement, type: AncestorTextCandidate['type']) => void
): void {
  const labels = container.querySelectorAll(':scope > label, :scope > div > label, :scope > span > label')
  for (const label of labels) {
    const labelEl = label as HTMLElement
    if (labelEl.querySelector('input, select, textarea')) continue
    if (labelEl.classList.contains('error') || labelEl.id?.includes('-error')) continue

    const text = normalizeText(labelEl.innerText)
    if (text.length >= MIN_LABEL_LENGTH) {
      addCandidate(text, labelEl, 'label')
    }
  }
}

function collectLegendFromFieldset(
  container: HTMLElement,
  tag: string,
  addCandidate: (text: string, el: HTMLElement, type: AncestorTextCandidate['type']) => void
): void {
  if (tag !== 'fieldset') return
  const legend = container.querySelector(':scope > legend') as HTMLElement | null
  if (legend) {
    addCandidate(normalizeText(legend.innerText), legend, 'legend')
  }
}

function collectHeadingsFromContainer(
  container: HTMLElement,
  addCandidate: (text: string, el: HTMLElement, type: AncestorTextCandidate['type']) => void
): void {
  const headings = container.querySelectorAll(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6')
  for (const heading of headings) {
    const headingEl = heading as HTMLElement
    const text = normalizeText(headingEl.innerText)
    if (text.length >= MIN_LABEL_LENGTH) {
      addCandidate(text, headingEl, 'heading')
    }
  }
}

function collectContainerText(
  container: HTMLElement,
  addCandidate: (text: string, el: HTMLElement, type: AncestorTextCandidate['type']) => void
): void {
  const text = normalizeText(container.innerText)
  if (text.length >= MIN_LABEL_LENGTH && text.length <= MAX_LABEL_LENGTH) {
    addCandidate(text, container, 'text-node')
  }
}

/**
 * Find the best ancestor text using heuristics.
 * Prefers text that is:
 * 1. Longer than placeholder but not too long
 * 2. Closer to the element (lower depth)
 * 3. From a label element (higher priority than generic text)
 */
function findBestAncestorText(element: HTMLElement, placeholderLength: number): string {
  const candidates = collectAncestorContext(element)
  if (candidates.length === 0) return ''

  // Score each candidate
  const scored = candidates.map(c => ({
    ...c,
    score: scoreCandidate(c, placeholderLength)
  }))

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  // Return the best candidate if it has a positive score
  const best = scored[0]
  if (best && best.score > 0) {
    return best.text
  }

  return ''
}

/**
 * Score a candidate text based on heuristics.
 */
function scoreCandidate(candidate: AncestorTextCandidate, placeholderLength: number): number {
  const { text, depth, type } = candidate
  const len = text.length
  let score = 0

  // Must be longer than placeholder (the key insight from user)
  if (placeholderLength > 0 && len <= placeholderLength) {
    return -1  // Disqualify
  }

  // Length scoring: prefer lengths close to IDEAL_LABEL_LENGTH
  if (len < MIN_LABEL_LENGTH) {
    return -1  // Too short
  } else if (len > MAX_LABEL_LENGTH) {
    score -= 50  // Penalty for being too long
  } else {
    // Score based on proximity to ideal length
    const distanceFromIdeal = Math.abs(len - IDEAL_LABEL_LENGTH)
    score += Math.max(0, 100 - distanceFromIdeal)
  }

  // Type scoring: labels are best, then headings, then generic text
  switch (type) {
    case 'label':
      score += 50
      break
    case 'legend':
      score += 40
      break
    case 'heading':
      score += 30
      break
    case 'text-node':
      score += 10
      break
  }

  // Depth scoring: prefer closer elements (lower depth)
  score -= depth * 15

  // Bonus for text containing question indicators
  if (text.includes('?') || text.includes('*')) {
    score += 20
  }

  // Penalty for text that looks like error messages or instructions
  const lowerText = text.toLowerCase()
  if (lowerText.includes('error') || lowerText.includes('invalid') || lowerText.includes('required field')) {
    score -= 30
  }

  return score
}

function formatName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\s+/, '')
    .trim()
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

export interface ScanResult {
  fields: FieldContext[]
  scanLog: ScanLog
}

export function scanFields(root: Element | Document | ShadowRoot, enableLogging = false): FieldContext[] {
  const result = scanFieldsWithLog(root)
  if (enableLogging) {
    logScan(result.scanLog)
  }
  return result.fields
}

export function scanFieldsWithLog(root: Element | Document | ShadowRoot): ScanResult {
  const startTime = performance.now()
  const fields: FieldContext[] = []
  const processedRadioGroups = new Set<string>()
  const excludedTypes = new Set(['hidden', 'submit', 'button', 'reset', 'image'])

  // Logging counters
  let totalElementsFound = 0
  let visibleElements = 0
  let disabledCount = 0
  let excludedCount = 0
  let shadowDomsScanned = 0
  const fieldLogs: ScanLog['fields'] = []

  function scan(node: Element | Document | ShadowRoot) {
    const elements = (node as Element).querySelectorAll
      ? (node as Element).querySelectorAll(INPUT_SELECTORS)
      : []

    totalElementsFound += elements.length

    for (const element of elements) {
      const htmlElement = element as HTMLElement

      if (htmlElement.closest('[data-autofiller-widget]')) continue

      if (!isVisible(htmlElement)) {
        continue
      }
      visibleElements++

      if (htmlElement.hasAttribute('disabled')) {
        disabledCount++
        continue
      }

      const type = htmlElement.getAttribute('type')?.toLowerCase()

      if (type && excludedTypes.has(type)) {
        excludedCount++
        continue
      }

      if (type === 'radio') {
        const name = htmlElement.getAttribute('name')
        if (name && processedRadioGroups.has(name)) continue
        if (name) processedRadioGroups.add(name)
      }

      const labelResult = extractLabelTextWithSource(htmlElement)
      const context = extractFieldContextInternal(htmlElement, labelResult.text)
      fields.push(context)

      fieldLogs.push({
        label: labelResult.text || '(empty)',
        widgetKind: context.widgetSignature.kind,
        labelSource: labelResult.source,
        attributes: context.attributes
      })
    }

    if (node instanceof Element) {
      const shadowRoot = (node as HTMLElement).shadowRoot
      if (shadowRoot) {
        shadowDomsScanned++
        scan(shadowRoot)
      }
    }

    const allElements = node instanceof Document || node instanceof ShadowRoot
      ? node.querySelectorAll('*')
      : (node as Element).querySelectorAll('*')

    for (const el of allElements) {
      const shadowRoot = (el as HTMLElement).shadowRoot
      if (shadowRoot) {
        shadowDomsScanned++
        scan(shadowRoot)
      }
    }
  }

  scan(root)

  const scanLog: ScanLog = {
    totalElementsFound,
    visibleElements,
    disabledElements: disabledCount,
    excludedTypes: excludedCount,
    radioGroupsProcessed: processedRadioGroups.size,
    shadowDomsScanned,
    fields: fieldLogs,
    totalTimeMs: performance.now() - startTime
  }

  return { fields, scanLog }
}

function extractFieldContextInternal(element: HTMLElement, labelText: string): FieldContext {
  const widgetSignature = detectWidgetSignature(element)
  const attributes = extractAttributes(element)
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
