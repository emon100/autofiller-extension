import { ExperienceGroupType } from '@/types'

/**
 * Patterns for detecting "Add" buttons in forms
 */
const ADD_BUTTON_PATTERNS = {
  // English patterns
  text: [
    /^add\s*(another|more|new)?\s*(entry|experience|education|work|position|job|school)?$/i,
    /^\+\s*(add|new)?/i,
    /^add$/i,
    /^new\s*(entry|experience|education|work)?$/i,
  ],
  // Chinese patterns
  textCN: [
    /^添加/,
    /^新增/,
    /^\+\s*添加/,
    /^增加/,
  ],
  // Aria labels
  ariaLabel: [
    /add.*(another|more|entry|experience|education|work|position)/i,
    /添加/,
    /新增/,
  ],
}

/**
 * Section-specific keywords to match add buttons to their sections
 */
const SECTION_KEYWORDS: Record<ExperienceGroupType, RegExp[]> = {
  WORK: [
    /work|experience|employment|job|position|职位|工作|经历/i,
  ],
  EDUCATION: [
    /education|school|university|degree|学历|教育|学校/i,
  ],
  PROJECT: [
    /project|项目/i,
  ],
}

export interface DetectedAddButton {
  element: HTMLButtonElement | HTMLAnchorElement | HTMLElement
  sectionType?: ExperienceGroupType
  confidence: number
  context: string  // Text that helped identify the button
}

/**
 * Find all "Add" buttons in a container
 */
export function findAddButtons(root: Element | Document = document): DetectedAddButton[] {
  const buttons: DetectedAddButton[] = []

  // Selectors for potential add buttons
  const selectors = [
    'button',
    'a[role="button"]',
    '[role="button"]',
    'input[type="button"]',
    '.btn',
    '[class*="add-"]',
    '[class*="Add"]',
  ].join(', ')

  const candidates = root.querySelectorAll(selectors)

  for (const element of candidates) {
    const htmlElement = element as HTMLElement

    // Skip if not visible or disabled
    if (!isClickable(htmlElement)) continue

    const result = matchAddButton(htmlElement)
    if (result) {
      buttons.push(result)
    }
  }

  // Sort by confidence
  buttons.sort((a, b) => b.confidence - a.confidence)

  return buttons
}

/**
 * Check if an element matches "Add" button patterns
 */
function matchAddButton(element: HTMLElement): DetectedAddButton | null {
  const buttonText = getButtonText(element).trim()
  const ariaLabel = element.getAttribute('aria-label') || ''
  const title = element.getAttribute('title') || ''

  let confidence = 0
  let context = ''
  let sectionType: ExperienceGroupType | undefined

  // Check text patterns
  for (const pattern of ADD_BUTTON_PATTERNS.text) {
    if (pattern.test(buttonText)) {
      confidence += 0.4
      context = buttonText
      break
    }
  }

  // Check Chinese patterns
  for (const pattern of ADD_BUTTON_PATTERNS.textCN) {
    if (pattern.test(buttonText)) {
      confidence += 0.4
      context = buttonText
      break
    }
  }

  // Check aria-label patterns
  for (const pattern of ADD_BUTTON_PATTERNS.ariaLabel) {
    if (pattern.test(ariaLabel) || pattern.test(title)) {
      confidence += 0.3
      context = ariaLabel || title
      break
    }
  }

  // Check for "+" icon indicators
  if (element.querySelector('svg[class*="plus"], [class*="plus"], [class*="add"]')) {
    confidence += 0.2
  }

  // Check if button has only "+" text
  if (buttonText === '+' || buttonText === '＋') {
    confidence += 0.3
    context = '+'
  }

  // No match
  if (confidence === 0) return null

  // Determine section type from surrounding context
  sectionType = detectSectionType(element, buttonText + ' ' + ariaLabel)

  // Boost confidence if section type is detected
  if (sectionType) {
    confidence += 0.2
  }

  return {
    element: element as HTMLButtonElement | HTMLAnchorElement,
    sectionType,
    confidence: Math.min(confidence, 1),
    context,
  }
}

/**
 * Get the visible text content of a button
 */
function getButtonText(element: HTMLElement): string {
  // Try innerText first (excludes hidden elements)
  const innerText = element.innerText?.trim()
  if (innerText) return innerText

  // Fallback to textContent
  return element.textContent?.trim() || ''
}

/**
 * Detect which section type an add button belongs to
 */
function detectSectionType(element: HTMLElement, buttonContext: string): ExperienceGroupType | undefined {
  // Check button's own context
  for (const [type, patterns] of Object.entries(SECTION_KEYWORDS) as [ExperienceGroupType, RegExp[]][]) {
    for (const pattern of patterns) {
      if (pattern.test(buttonContext)) {
        return type
      }
    }
  }

  // Check parent elements for section context
  let current: HTMLElement | null = element.parentElement
  let depth = 0
  const maxDepth = 5

  while (current && depth < maxDepth) {
    // Check section title/heading
    const heading = current.querySelector('h1, h2, h3, h4, h5, h6, legend, [class*="title"], [class*="header"]')
    if (heading) {
      const headingText = heading.textContent?.toLowerCase() || ''
      for (const [type, patterns] of Object.entries(SECTION_KEYWORDS) as [ExperienceGroupType, RegExp[]][]) {
        for (const pattern of patterns) {
          if (pattern.test(headingText)) {
            return type
          }
        }
      }
    }

    // Check class/id for hints
    const classAndId = (current.className + ' ' + current.id).toLowerCase()
    for (const [type, patterns] of Object.entries(SECTION_KEYWORDS) as [ExperienceGroupType, RegExp[]][]) {
      for (const pattern of patterns) {
        if (pattern.test(classAndId)) {
          return type
        }
      }
    }

    current = current.parentElement
    depth++
  }

  return undefined
}

/**
 * Check if an element is clickable
 */
function isClickable(element: HTMLElement): boolean {
  const style = getComputedStyle(element)

  if (style.display === 'none' || style.visibility === 'hidden') {
    return false
  }

  if (element.hasAttribute('disabled')) {
    return false
  }

  // Check if element is in viewport (approximately)
  const rect = element.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    return false
  }

  return true
}

/**
 * Find the most relevant add button for a specific section type
 */
export function findAddButtonForSection(
  sectionType: ExperienceGroupType,
  root: Element | Document = document
): DetectedAddButton | null {
  const buttons = findAddButtons(root)

  // First, look for exact section type match
  const exactMatch = buttons.find(b => b.sectionType === sectionType)
  if (exactMatch) return exactMatch

  // Then, look for any add button in the same section
  // This requires DOM traversal to find buttons near the section
  const sections = root.querySelectorAll('[class*="section"], [class*="block"], fieldset, [role="group"]')

  for (const section of sections) {
    const sectionText = (section.textContent || '').toLowerCase()

    // Check if this section matches the type
    let isMatchingSection = false
    for (const pattern of SECTION_KEYWORDS[sectionType]) {
      if (pattern.test(sectionText)) {
        isMatchingSection = true
        break
      }
    }

    if (isMatchingSection) {
      // Find add button within this section
      const sectionButtons = findAddButtons(section as Element)
      if (sectionButtons.length > 0) {
        return { ...sectionButtons[0], sectionType }
      }
    }
  }

  // Fallback: return any add button without specific section
  const genericButton = buttons.find(b => !b.sectionType)
  return genericButton || null
}

/**
 * Click an add button and wait for new content to appear
 */
export async function clickAddButtonAndWait(
  button: DetectedAddButton,
  timeout = 3000
): Promise<boolean> {
  return new Promise((resolve) => {
    const startFieldCount = document.querySelectorAll('input, select, textarea').length

    // Set up mutation observer to detect new content
    const observer = new MutationObserver(() => {
      const newFieldCount = document.querySelectorAll('input, select, textarea').length
      if (newFieldCount > startFieldCount) {
        observer.disconnect()
        // Small delay to let the DOM settle
        setTimeout(() => resolve(true), 100)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // Click the button
    button.element.click()

    // Timeout fallback
    setTimeout(() => {
      observer.disconnect()
      const newFieldCount = document.querySelectorAll('input, select, textarea').length
      resolve(newFieldCount > startFieldCount)
    }, timeout)
  })
}
