import { FieldContext, QuestionKey, Observation, Taxonomy } from '@/types'
import { scanFields, extractFieldContext } from '@/scanner'
import { classify } from '@/classifier'

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function getSiteKey(): string {
  try {
    const url = new URL(window.location.href)
    return url.hostname
  } catch {
    return 'unknown'
  }
}

export function hashOptions(options: string[]): string {
  const normalized = options.map(o => o.toLowerCase().trim()).sort().join('|')
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

export function createQuestionKey(context: FieldContext, type: Taxonomy): QuestionKey {
  const phrases: string[] = []

  if (context.labelText) {
    phrases.push(context.labelText.toLowerCase().trim())
  }

  if (context.attributes['name']) {
    phrases.push(context.attributes['name'].toLowerCase())
  }

  if (context.attributes['id']) {
    phrases.push(context.attributes['id'].toLowerCase())
  }

  if (context.attributes['placeholder']) {
    phrases.push(context.attributes['placeholder'].toLowerCase())
  }

  const sectionHints: string[] = []
  if (context.sectionTitle) {
    sectionHints.push(context.sectionTitle.toLowerCase().trim())
  }

  let choiceSetHash: string | undefined
  if (context.optionsText.length > 0) {
    choiceSetHash = hashOptions(context.optionsText)
  }

  return {
    id: generateId(),
    type,
    phrases: [...new Set(phrases)],
    sectionHints,
    choiceSetHash,
  }
}

export function createObservation(
  context: FieldContext,
  questionKey: QuestionKey,
  answerId: string,
  _value: string,
  confidence: number
): Observation {
  return {
    id: generateId(),
    timestamp: Date.now(),
    siteKey: getSiteKey(),
    url: window.location.href,
    questionKeyId: questionKey.id,
    answerId,
    widgetSignature: context.widgetSignature,
    confidence,
  }
}

type ObservationCallback = (observation: Observation, value: string, questionKey: QuestionKey) => void

export class Recorder {
  private _isRecording = false
  private callbacks: ObservationCallback[] = []
  private lastValues = new Map<HTMLElement, string>()
  private boundHandleBlur: (e: Event) => void
  private boundHandleChange: (e: Event) => void

  constructor() {
    this.boundHandleBlur = this.handleBlur.bind(this)
    this.boundHandleChange = this.handleChange.bind(this)
  }

  get isRecording(): boolean {
    return this._isRecording
  }

  onObservation(callback: ObservationCallback): void {
    this.callbacks.push(callback)
  }

  start(): void {
    if (this._isRecording) return

    this._isRecording = true
    document.addEventListener('blur', this.boundHandleBlur, true)
    document.addEventListener('change', this.boundHandleChange, true)
  }

  stop(): void {
    if (!this._isRecording) return

    this._isRecording = false
    document.removeEventListener('blur', this.boundHandleBlur, true)
    document.removeEventListener('change', this.boundHandleChange, true)
    this.lastValues.clear()
  }

  private handleBlur(event: Event): void {
    const target = event.target as HTMLElement
    if (!this.isFormField(target)) return
    
    this.captureField(target)
  }

  private handleChange(event: Event): void {
    const target = event.target as HTMLElement
    if (!this.isFormField(target)) return

    if (target instanceof HTMLSelectElement || 
        (target instanceof HTMLInputElement && 
         (target.type === 'checkbox' || target.type === 'radio'))) {
      this.captureField(target)
    }
  }

  private isFormField(element: HTMLElement): boolean {
    return element instanceof HTMLInputElement ||
           element instanceof HTMLSelectElement ||
           element instanceof HTMLTextAreaElement
  }

  private getFieldValue(element: HTMLElement): string {
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox' || element.type === 'radio') {
        return element.checked ? element.value || 'true' : ''
      }
      return element.value
    }
    if (element instanceof HTMLSelectElement) {
      return element.value
    }
    if (element instanceof HTMLTextAreaElement) {
      return element.value
    }
    return ''
  }

  private captureField(element: HTMLElement): void {
    const value = this.getFieldValue(element)

    if (!value || value.trim() === '') return

    const lastValue = this.lastValues.get(element)
    if (lastValue === value) return

    this.lastValues.set(element, value)

    const context = extractFieldContext(element)
    const candidates = classify(context)
    const bestCandidate = candidates[0]

    const questionKey = createQuestionKey(context, bestCandidate.type)
    const answerId = generateId()

    const observation = createObservation(
      context,
      questionKey,
      answerId,
      value,
      bestCandidate.score
    )

    for (const callback of this.callbacks) {
      callback(observation, value, questionKey)
    }
  }
}
