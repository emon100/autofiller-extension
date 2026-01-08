import { scanFields } from '@/scanner'
import { classify } from '@/classifier'
import { fillField, executeFillPlan, createFillSnapshot, restoreSnapshot, FillSnapshot } from '@/executor'
import { Recorder, createQuestionKey, createObservation, generateId } from '@/recorder'
import { storage, AnswerStorage, ObservationStorage, SiteSettingsStorage } from '@/storage'
import { FieldContext, AnswerValue, Taxonomy, SENSITIVE_TYPES, FillResult, FillPlan } from '@/types'

const CONFIDENCE_THRESHOLD = 0.75
const USER_ACTIVITY_TIMEOUT = 800

interface FillHistoryEntry {
  field: FieldContext
  snapshot: FillSnapshot
  answerId: string
  timestamp: number
}

export class AutoFiller {
  private recorder: Recorder
  private answerStorage: AnswerStorage
  private observationStorage: ObservationStorage
  private siteSettingsStorage: SiteSettingsStorage
  private fillHistory: FillHistoryEntry[] = []
  private lastUserActivity = 0
  private siteKey: string

  constructor() {
    this.recorder = new Recorder()
    this.answerStorage = storage.answers
    this.observationStorage = storage.observations
    this.siteSettingsStorage = storage.siteSettings
    this.siteKey = this.extractSiteKey()

    this.setupActivityTracking()
    this.setupRecorderCallbacks()
  }

  private extractSiteKey(): string {
    try {
      return new URL(window.location.href).hostname
    } catch {
      return 'unknown'
    }
  }

  private setupActivityTracking(): void {
    const updateActivity = () => {
      this.lastUserActivity = Date.now()
    }

    document.addEventListener('keydown', updateActivity, { passive: true })
    document.addEventListener('mousedown', updateActivity, { passive: true })
    document.addEventListener('touchstart', updateActivity, { passive: true })
  }

  private setupRecorderCallbacks(): void {
    this.recorder.onObservation(async (observation, value, questionKey) => {
      const existingAnswer = await this.answerStorage.findByValue(questionKey.type, value)
      
      let answer: AnswerValue
      if (existingAnswer) {
        answer = existingAnswer
        observation.answerId = existingAnswer.id
      } else {
        answer = this.createAnswerValue(questionKey.type, value)
        await this.answerStorage.save(answer)
        observation.answerId = answer.id
      }

      await this.observationStorage.save(observation)

      this.notifyRecorded(questionKey.type, value)
    })
  }

  private createAnswerValue(type: Taxonomy, value: string): AnswerValue {
    const isSensitive = SENSITIVE_TYPES.has(type)
    const now = Date.now()

    return {
      id: generateId(),
      type,
      value,
      display: value,
      aliases: [],
      sensitivity: isSensitive ? 'sensitive' : 'normal',
      autofillAllowed: !isSensitive,
      createdAt: now,
      updatedAt: now,
    }
  }

  async initialize(): Promise<void> {
    const settings = await this.siteSettingsStorage.getOrCreate(this.siteKey)

    if (settings.recordEnabled) {
      this.recorder.start()
    }
  }

  async enableRecording(): Promise<void> {
    await this.siteSettingsStorage.update(this.siteKey, { recordEnabled: true })
    this.recorder.start()
  }

  async disableRecording(): Promise<void> {
    await this.siteSettingsStorage.update(this.siteKey, { recordEnabled: false })
    this.recorder.stop()
  }

  async enableAutofill(): Promise<void> {
    await this.siteSettingsStorage.update(this.siteKey, { autofillEnabled: true })
  }

  async disableAutofill(): Promise<void> {
    await this.siteSettingsStorage.update(this.siteKey, { autofillEnabled: false })
  }

  async fill(): Promise<FillResult[]> {
    const settings = await this.siteSettingsStorage.get(this.siteKey)
    if (!settings?.autofillEnabled) {
      return []
    }

    const fields = scanFields(document.body)
    const plans = await this.createFillPlans(fields)
    const results: FillResult[] = []

    this.fillHistory = []

    for (const plan of plans) {
      if (this.isUserActive()) {
        continue
      }

      const snapshot = createFillSnapshot(plan.field.element)
      const result = await fillField(plan.field, plan.answer.value)

      if (result.success) {
        this.fillHistory.push({
          field: plan.field,
          snapshot,
          answerId: plan.answer.id,
          timestamp: Date.now(),
        })
      }

      results.push(result)

      await this.yieldToMainThread()
    }

    this.notifyFilled(results.filter(r => r.success).length)

    return results
  }

  private async createFillPlans(fields: FieldContext[]): Promise<FillPlan[]> {
    const plans: FillPlan[] = []

    for (const field of fields) {
      const candidates = classify(field)
      const bestCandidate = candidates[0]

      if (bestCandidate.type === Taxonomy.UNKNOWN) continue

      const answers = await this.answerStorage.getByType(bestCandidate.type)
      if (answers.length === 0) continue

      const bestAnswer = answers.sort((a, b) => b.updatedAt - a.updatedAt)[0]

      if (SENSITIVE_TYPES.has(bestCandidate.type) && !bestAnswer.autofillAllowed) {
        continue
      }

      if (bestCandidate.score < CONFIDENCE_THRESHOLD) {
        continue
      }

      plans.push({
        field,
        answer: bestAnswer,
        confidence: bestCandidate.score,
      })
    }

    return plans
  }

  private isUserActive(): boolean {
    return Date.now() - this.lastUserActivity < USER_ACTIVITY_TIMEOUT
  }

  private async yieldToMainThread(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0))
  }

  async undo(): Promise<void> {
    for (const entry of this.fillHistory.reverse()) {
      restoreSnapshot(entry.field.element, entry.snapshot)
    }
    
    this.fillHistory = []
    this.notifyUndone()
  }

  async undoField(element: HTMLElement): Promise<void> {
    const entryIndex = this.fillHistory.findIndex(e => e.field.element === element)
    if (entryIndex >= 0) {
      const entry = this.fillHistory[entryIndex]
      restoreSnapshot(element, entry.snapshot)
      this.fillHistory.splice(entryIndex, 1)
    }
  }

  async getSuggestions(field: FieldContext): Promise<AnswerValue[]> {
    const candidates = classify(field)
    const suggestions: AnswerValue[] = []

    for (const candidate of candidates.slice(0, 2)) {
      if (candidate.type === Taxonomy.UNKNOWN) continue
      
      const answers = await this.answerStorage.getByType(candidate.type)
      for (const answer of answers.slice(0, 2)) {
        if (!suggestions.find(s => s.id === answer.id)) {
          suggestions.push(answer)
        }
      }
    }

    return suggestions.slice(0, 3)
  }

  private notifyRecorded(type: Taxonomy, value: string): void {
    window.dispatchEvent(new CustomEvent('autofiller:recorded', {
      detail: { type, value },
    }))
  }

  private notifyFilled(count: number): void {
    window.dispatchEvent(new CustomEvent('autofiller:filled', {
      detail: { count },
    }))
  }

  private notifyUndone(): void {
    window.dispatchEvent(new CustomEvent('autofiller:undone'))
  }

  destroy(): void {
    this.recorder.stop()
  }
}

let autoFiller: AutoFiller | null = null

export function initAutoFiller(): AutoFiller {
  if (!autoFiller) {
    autoFiller = new AutoFiller()
    autoFiller.initialize()
  }
  return autoFiller
}

export function getAutoFiller(): AutoFiller | null {
  return autoFiller
}
