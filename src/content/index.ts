import { scanFields } from '@/scanner'
import { parseField } from '@/parser'
import { transformValue } from '@/transformer'
import { fillField, createFillSnapshot, restoreSnapshot, FillSnapshot } from '@/executor'
import { Recorder, generateId } from '@/recorder'
import { storage, AnswerStorage, ObservationStorage, SiteSettingsStorage } from '@/storage'
import { BadgeManager } from '@/ui/BadgeManager'
import { FloatingWidget, DetectedField, showToast } from '@/ui'
import { FieldContext, AnswerValue, Taxonomy, SENSITIVE_TYPES, FillResult, FillPlan, CandidateType, PendingObservation } from '@/types'
import { FillDebugInfo, createEmptyDebugInfo, saveDebugLog } from '@/utils/logger'

const CONFIDENCE_THRESHOLD = 0.75

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
  private badgeManager: BadgeManager
  private floatingWidget: FloatingWidget
  private fillHistory: FillHistoryEntry[] = []
  private siteKey: string

  constructor() {
    this.recorder = new Recorder()
    this.answerStorage = storage.answers
    this.observationStorage = storage.observations
    this.siteSettingsStorage = storage.siteSettings
    this.siteKey = this.extractSiteKey()
    this.badgeManager = new BadgeManager({
      onCandidateSelect: (field, answer) => this.handleBadgeFill(field, answer),
      onUndo: (field) => this.undoField(field.element),
      onDismiss: () => {},
    })
    this.floatingWidget = new FloatingWidget({
      onSave: () => this.detectFieldsForWidget(),
      onFill: () => this.fillAndReturnCount(),
      onConfirm: (fields) => this.confirmWidgetFields(fields),
    })

    this.setupRecorderCallbacks()
  }

  private extractSiteKey(): string {
    try {
      return new URL(window.location.href).hostname
    } catch {
      return 'unknown'
    }
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

    this.recorder.onPending((pending: PendingObservation) => {
      this.notifyPending(pending.classifiedType, pending.rawValue)
    })

    this.recorder.onCommit((count: number) => {
      this.notifyCommitted(count)
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

    this.floatingWidget.show()
  }

  private async detectFieldsForWidget(): Promise<DetectedField[]> {
    const fields = scanFields(document.body)
    const detectedFields: DetectedField[] = []

    for (const field of fields) {
      const value = this.getFieldValue(field.element)
      if (!value) continue

      const candidates = await parseField(field)
      const bestCandidate = candidates[0]
      const detectedType = bestCandidate?.type || Taxonomy.UNKNOWN
      const isSensitive = SENSITIVE_TYPES.has(detectedType)

      const labelText = field.labelText || field.attributes.placeholder || field.attributes.name || 'Unknown'
      
      detectedFields.push({
        id: generateId(),
        label: labelText,
        value: value,
        type: detectedType,
        sensitive: isSensitive,
      })
    }

    return detectedFields
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

  private async fillAndReturnCount(): Promise<{ count: number; debug: FillDebugInfo }> {
    const { results, debug } = await this.fillWithDebug()
    return { count: results.filter(r => r.success).length, debug }
  }

  private async confirmWidgetFields(fields: DetectedField[]): Promise<void> {
    let savedCount = 0
    let skippedCount = 0

    for (const field of fields) {
      const type = field.type as Taxonomy || Taxonomy.UNKNOWN
      if (type === Taxonomy.UNKNOWN) {
        skippedCount++
        continue
      }

      const existingAnswer = await this.answerStorage.findByValue(type, field.value)
      if (!existingAnswer) {
        const answer = this.createAnswerValue(type, field.value)
        await this.answerStorage.save(answer)
        savedCount++
      }
    }

    if (savedCount > 0) {
      showToast(`Saved ${savedCount} new field(s) to database`, 'success')
    } else if (skippedCount > 0) {
      showToast(`No new fields to save (${skippedCount} skipped as UNKNOWN)`, 'info')
    } else {
      showToast('All fields already in database', 'info')
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
    const { results } = await this.fillWithDebug()
    return results
  }

  private async fillWithDebug(): Promise<{ results: FillResult[]; debug: FillDebugInfo }> {
    const debug = createEmptyDebugInfo()
    const settings = await this.siteSettingsStorage.get(this.siteKey)
    
    debug.autofillEnabled = settings?.autofillEnabled ?? false
    
    if (!settings?.autofillEnabled) {
      await saveDebugLog('fill', debug)
      return { results: [], debug }
    }

    this.badgeManager.hideAll()

    const fields = scanFields(document.body)
    debug.fieldsScanned = fields.length

    const { plans, suggestions, sensitiveFields, fieldDebug } = await this.createFillPlansWithDebug(fields)
    debug.fieldsParsed = fieldDebug
    debug.plansCreated = plans.length
    debug.suggestionsCreated = suggestions.length
    debug.sensitiveFieldsFound = sensitiveFields.length

    const results: FillResult[] = []
    this.fillHistory = []

    for (const plan of plans) {
      const snapshot = createFillSnapshot(plan.field.element)
      const result = await fillField(plan.field, plan.answer.value)

      if (result.success) {
        this.fillHistory.push({
          field: plan.field,
          snapshot,
          answerId: plan.answer.id,
          timestamp: Date.now(),
        })
        this.badgeManager.showBadge(plan.field, {
          type: 'filled',
          answerId: plan.answer.id,
          canUndo: true,
        })
      }

      results.push(result)
      await this.yieldToMainThread()
    }

    for (const { field, candidates } of suggestions) {
      this.badgeManager.showBadge(field, {
        type: 'suggest',
        candidates,
      })
    }

    for (const { field, candidates } of sensitiveFields) {
      this.badgeManager.showBadge(field, {
        type: 'sensitive',
        candidates,
      })
    }

    debug.fillResults = results.filter(r => r.success).length
    this.notifyFilled(debug.fillResults)
    
    await saveDebugLog('fill', debug)
    return { results, debug }
  }

  private async createFillPlansWithDebug(fields: FieldContext[]): Promise<{
    plans: FillPlan[]
    suggestions: Array<{ field: FieldContext; candidates: AnswerValue[] }>
    sensitiveFields: Array<{ field: FieldContext; candidates: AnswerValue[] }>
    fieldDebug: FillDebugInfo['fieldsParsed']
  }> {
    const plans: FillPlan[] = []
    const suggestions: Array<{ field: FieldContext; candidates: AnswerValue[] }> = []
    const sensitiveFields: Array<{ field: FieldContext; candidates: AnswerValue[] }> = []
    const fieldDebug: FillDebugInfo['fieldsParsed'] = []

    const parseResults = await Promise.all(
      fields.map(async (field) => ({
        field,
        candidates: await parseField(field),
      }))
    )

    for (const { field, candidates } of parseResults) {
      const bestCandidate = candidates[0]
      const label = field.labelText || field.attributes.placeholder || field.attributes.name || 'Unknown'
      
      const answers = bestCandidate.type !== Taxonomy.UNKNOWN
        ? await this.findMatchingAnswers(bestCandidate, field)
        : []

      const debugEntry: FillDebugInfo['fieldsParsed'][0] = {
        label,
        type: bestCandidate.type,
        score: bestCandidate.score,
        hasMatchingAnswers: answers.length > 0,
        answersCount: answers.length,
      }

      if (bestCandidate.type === Taxonomy.UNKNOWN) {
        debugEntry.reason = 'UNKNOWN type - skipped'
        fieldDebug.push(debugEntry)
        continue
      }

      if (answers.length === 0) {
        debugEntry.reason = 'No matching answers in database'
        fieldDebug.push(debugEntry)
        continue
      }

      const bestAnswer = answers[0]
      const answerValues = answers.map(a => a.answer)

      if (SENSITIVE_TYPES.has(bestCandidate.type)) {
        debugEntry.reason = 'Sensitive field - requires manual selection'
        fieldDebug.push(debugEntry)
        sensitiveFields.push({ field, candidates: answerValues.slice(0, 3) })
        continue
      }

      if (bestCandidate.score < CONFIDENCE_THRESHOLD) {
        debugEntry.reason = `Low confidence (${bestCandidate.score.toFixed(2)} < ${CONFIDENCE_THRESHOLD}) - suggestion only`
        fieldDebug.push(debugEntry)
        suggestions.push({ field, candidates: answerValues.slice(0, 3) })
        continue
      }

      debugEntry.reason = 'Will auto-fill'
      fieldDebug.push(debugEntry)
      plans.push({
        field,
        answer: { ...bestAnswer.answer, value: bestAnswer.transformedValue },
        confidence: bestCandidate.score,
      })
    }

    return { plans, suggestions, sensitiveFields, fieldDebug }
  }

  private async handleBadgeFill(field: FieldContext, answer: AnswerValue): Promise<void> {
    const transformedValue = transformValue(answer.value, answer.type, field)
    const snapshot = createFillSnapshot(field.element)
    const result = await fillField(field, transformedValue)

    if (result.success) {
      this.fillHistory.push({
        field,
        snapshot,
        answerId: answer.id,
        timestamp: Date.now(),
      })
    }
  }

  private async findMatchingAnswers(
    candidate: CandidateType,
    field: FieldContext
  ): Promise<Array<{ answer: AnswerValue; transformedValue: string }>> {
    const results: Array<{ answer: AnswerValue; transformedValue: string; priority: number }> = []

    const directAnswers = await this.answerStorage.getByType(candidate.type)
    for (const answer of directAnswers) {
      const transformedValue = transformValue(answer.value, answer.type, field)
      results.push({ answer, transformedValue, priority: 2 })
    }

    const relatedTypes = this.getRelatedTypes(candidate.type)
    for (const relatedType of relatedTypes) {
      const relatedAnswers = await this.answerStorage.getByType(relatedType)
      for (const answer of relatedAnswers) {
        const transformedValue = transformValue(answer.value, answer.type, field)
        if (transformedValue !== answer.value || relatedType === candidate.type) {
          results.push({ answer, transformedValue, priority: 1 })
        }
      }
    }

    return results
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority
        return b.answer.updatedAt - a.answer.updatedAt
      })
      .map(({ answer, transformedValue }) => ({ answer, transformedValue }))
  }

  private getRelatedTypes(targetType: Taxonomy): Taxonomy[] {
    const TYPE_RELATIONS: Partial<Record<Taxonomy, Taxonomy[]>> = {
      [Taxonomy.FIRST_NAME]: [Taxonomy.FULL_NAME],
      [Taxonomy.LAST_NAME]: [Taxonomy.FULL_NAME],
      [Taxonomy.FULL_NAME]: [Taxonomy.FIRST_NAME],
      [Taxonomy.GRAD_YEAR]: [Taxonomy.GRAD_DATE],
      [Taxonomy.GRAD_MONTH]: [Taxonomy.GRAD_DATE],
      [Taxonomy.COUNTRY_CODE]: [Taxonomy.PHONE],
    }

    return TYPE_RELATIONS[targetType] || []
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
    const candidates = await parseField(field)
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

  private notifyPending(type: Taxonomy, value: string): void {
    window.dispatchEvent(new CustomEvent('autofiller:pending', {
      detail: { type, value },
    }))
  }

  private notifyCommitted(count: number): void {
    window.dispatchEvent(new CustomEvent('autofiller:committed', {
      detail: { count },
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

  async saveNow(): Promise<number> {
    return this.recorder.commitAllPending()
  }

  getPendingCount(): number {
    return this.recorder.getPendingCount()
  }

  destroy(): void {
    this.recorder.stop()
    this.badgeManager.hideAll()
    this.floatingWidget.hide()
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
