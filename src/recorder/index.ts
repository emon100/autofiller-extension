import { FieldContext, QuestionKey, Observation, Taxonomy, PendingObservation } from '@/types'
import { extractFieldContext } from '@/scanner'
import { parseField } from '@/parser'
import { storage, PendingObservationStorage } from '@/storage'

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

function createPendingObservation(
  context: FieldContext,
  formId: string,
  classifiedType: Taxonomy,
  rawValue: string,
  confidence: number
): PendingObservation {
  const questionKey = createQuestionKey(context, classifiedType)
  return {
    id: generateId(),
    timestamp: Date.now(),
    siteKey: getSiteKey(),
    url: window.location.href,
    formId,
    questionKeyId: questionKey.id,
    fieldLocator: getFieldLocator(context.element),
    widgetSignature: context.widgetSignature,
    confidence,
    rawValue,
    classifiedType,
    status: 'pending',
  }
}

function getFieldLocator(element: HTMLElement): string {
  if (element.id) return `#${element.id}`
  if (element.getAttribute('name')) return `[name="${element.getAttribute('name')}"]`
  return ''
}

function getFormId(element: HTMLElement): string {
  const form = element.closest('form')
  if (form) {
    if (form.id) return `form#${form.id}`
    if (form.getAttribute('name')) return `form[name="${form.getAttribute('name')}"]`
    if (form.action) return `form[action="${form.action}"]`
  }
  return 'default-form'
}

const SUBMIT_BUTTON_PATTERNS = /submit|next|continue|save|apply|下一步|提交|保存|继续/i

type ObservationCallback = (observation: Observation, value: string, questionKey: QuestionKey) => void
type PendingCallback = (pending: PendingObservation) => void
type CommitCallback = (count: number) => void

export class Recorder {
  private _isRecording = false
  private callbacks: ObservationCallback[] = []
  private pendingCallbacks: PendingCallback[] = []
  private commitCallbacks: CommitCallback[] = []
  private lastValues = new Map<HTMLElement, string>()
  private pendingStorage: PendingObservationStorage
  
  private boundHandleBlur: (e: Event) => void
  private boundHandleChange: (e: Event) => void
  private boundHandleSubmit: (e: Event) => void
  private boundHandleClick: (e: Event) => void
  private boundHandleBeforeUnload: (e: Event) => void

  constructor() {
    this.pendingStorage = storage.pendingObservations
    this.boundHandleBlur = this.handleBlur.bind(this)
    this.boundHandleChange = this.handleChange.bind(this)
    this.boundHandleSubmit = this.handleSubmit.bind(this)
    this.boundHandleClick = this.handleClick.bind(this)
    this.boundHandleBeforeUnload = this.handleBeforeUnload.bind(this)
  }

  get isRecording(): boolean {
    return this._isRecording
  }

  onObservation(callback: ObservationCallback): void {
    this.callbacks.push(callback)
  }

  onPending(callback: PendingCallback): void {
    this.pendingCallbacks.push(callback)
  }

  onCommit(callback: CommitCallback): void {
    this.commitCallbacks.push(callback)
  }

  start(): void {
    if (this._isRecording) return

    this._isRecording = true
    document.addEventListener('blur', this.boundHandleBlur, true)
    document.addEventListener('change', this.boundHandleChange, true)
    document.addEventListener('submit', this.boundHandleSubmit, true)
    document.addEventListener('click', this.boundHandleClick, true)
    window.addEventListener('beforeunload', this.boundHandleBeforeUnload)
  }

  stop(): void {
    if (!this._isRecording) return

    this._isRecording = false
    document.removeEventListener('blur', this.boundHandleBlur, true)
    document.removeEventListener('change', this.boundHandleChange, true)
    document.removeEventListener('submit', this.boundHandleSubmit, true)
    document.removeEventListener('click', this.boundHandleClick, true)
    window.removeEventListener('beforeunload', this.boundHandleBeforeUnload)
    this.lastValues.clear()
  }

  async commitAllPending(): Promise<number> {
    const formIds = this.pendingStorage.getFormIds()
    let totalCommitted = 0

    for (const formId of formIds) {
      const count = await this.commitForm(formId)
      totalCommitted += count
    }

    return totalCommitted
  }

  getPendingCount(): number {
    return this.pendingStorage.getPendingCount()
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

  private handleSubmit(event: Event): void {
    const form = event.target as HTMLFormElement
    if (form.tagName !== 'FORM') return

    const formId = getFormId(form.querySelector('input, select, textarea') as HTMLElement || form)
    this.commitForm(formId)
  }

  private handleClick(event: Event): void {
    const target = event.target as HTMLElement
    const button = target.closest('button, [type="submit"], [role="button"]') as HTMLElement
    
    if (!button) return

    const buttonText = button.textContent || ''
    const buttonType = button.getAttribute('type')
    
    if (buttonType === 'submit' || SUBMIT_BUTTON_PATTERNS.test(buttonText)) {
      const formId = getFormId(button)
      setTimeout(() => this.commitForm(formId), 100)
    }
  }

  private handleBeforeUnload(_event: Event): void {
    this.pendingStorage.discardAll()
  }

  private async commitForm(formId: string): Promise<number> {
    const pending = this.pendingStorage.commit(formId)
    if (pending.length === 0) return 0

    for (const p of pending) {
      const questionKey: QuestionKey = {
        id: generateId(),
        type: p.classifiedType,
        phrases: [],
        sectionHints: [],
      }

      const observation = createObservation(
        { 
          element: document.createElement('div'),
          labelText: '',
          sectionTitle: '',
          attributes: {},
          optionsText: [],
          framePath: [],
          shadowPath: [],
          widgetSignature: p.widgetSignature,
        },
        questionKey,
        generateId(),
        p.rawValue,
        p.confidence
      )

      for (const callback of this.callbacks) {
        callback(observation, p.rawValue, questionKey)
      }
    }

    for (const callback of this.commitCallbacks) {
      callback(pending.length)
    }

    return pending.length
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
    const formId = getFormId(element)
    
    parseField(context).then(candidates => {
      const bestCandidate = candidates[0]

      const pending = createPendingObservation(
        context,
        formId,
        bestCandidate.type,
        value,
        bestCandidate.score
      )

      this.pendingStorage.add(formId, pending)

      for (const callback of this.pendingCallbacks) {
        callback(pending)
      }
    })
  }
}
