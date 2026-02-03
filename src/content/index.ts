import { scanFields, detectFormSections } from '@/scanner'
import { parseField, parseFieldsBatch } from '@/parser'
import { transformValue } from '@/transformer'
import { fillField, createFillSnapshot, restoreSnapshot, FillSnapshot, executeFillPlanAnimated } from '@/executor'
import { Recorder, generateId } from '@/recorder'
import { storage, AnswerStorage, ObservationStorage, SiteSettingsStorage, experienceStorage } from '@/storage'
import { BadgeManager } from '@/ui/BadgeManager'
import { FloatingWidget, DetectedField, FillAnimationState, showToast } from '@/ui'
import { FieldContext, AnswerValue, Taxonomy, SENSITIVE_TYPES, FillResult, FillPlan, CandidateType, PendingObservation, ExperienceGroupType, DEFAULT_FILL_ANIMATION_CONFIG, FillAnimationConfig } from '@/types'
import { FillDebugInfo, createEmptyDebugInfo, saveDebugLog } from '@/utils/logger'

const CONFIDENCE_THRESHOLD = 0.75

interface FillHistoryEntry {
  field: FieldContext
  snapshot: FillSnapshot
  answerId: string
  timestamp: number
}

// 标记属性：区分程序填写和用户修改
const ATTR_FILLED = 'data-autofiller-filled'
const ATTR_USER_MODIFIED = 'data-autofiller-user-modified'

export class AutoFiller {
  private recorder: Recorder
  private answerStorage: AnswerStorage
  private observationStorage: ObservationStorage
  private siteSettingsStorage: SiteSettingsStorage
  private badgeManager: BadgeManager
  private floatingWidget: FloatingWidget
  private fillHistory: FillHistoryEntry[] = []
  private siteKey: string
  private pendingFormSubmit: HTMLFormElement | null = null
  private isSubmittingProgrammatically = false
  private userInputListeners: WeakMap<HTMLElement, () => void> = new WeakMap()

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
      onFill: (animated, onProgress) => this.fillAndReturnCount(animated, onProgress),
      onConfirm: (fields) => this.handleConfirmAndSubmit(fields),
    })

    this.setupRecorderCallbacks()
    this.setupFormSubmitListener()
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

  private setupFormSubmitListener(): void {
    document.addEventListener('submit', async (e) => {
      if (this.isSubmittingProgrammatically) return

      const form = e.target as HTMLFormElement
      if (!form || form.tagName !== 'FORM') return

      const settings = await this.siteSettingsStorage.get(this.siteKey)
      if (!settings?.recordEnabled) return

      e.preventDefault()
      this.pendingFormSubmit = form

      const detectedFields = await this.detectFieldsForWidget()
      if (detectedFields.length > 0) {
        this.floatingWidget.setFields(detectedFields)
        this.floatingWidget.showPhase('learning')
      } else {
        this.submitPendingForm()
      }
    }, true)
  }

  private async handleConfirmAndSubmit(fields: DetectedField[]): Promise<void> {
    await this.confirmWidgetFields(fields)
    this.submitPendingForm()
  }

  private submitPendingForm(): void {
    if (this.pendingFormSubmit) {
      const form = this.pendingFormSubmit
      this.pendingFormSubmit = null
      
      this.isSubmittingProgrammatically = true
      
      const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"], input[type="submit"]')
      if (submitBtn) {
        submitBtn.click()
      } else {
        form.submit()
      }
      
      setTimeout(() => {
        this.isSubmittingProgrammatically = false
      }, 100)
    }
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

    // Filter fields that have values and should be learned
    const fieldsWithValues: Array<{ field: FieldContext; value: string }> = []
    for (const field of fields) {
      const value = this.getFieldValue(field.element)
      if (!value) continue
      if (!this.shouldLearnField(field.element)) continue
      fieldsWithValues.push({ field, value })
    }

    if (fieldsWithValues.length === 0) {
      return []
    }

    // Use batch parsing for all fields
    const parseResults = await parseFieldsBatch(fieldsWithValues.map(f => f.field))

    for (let i = 0; i < fieldsWithValues.length; i++) {
      const { field, value } = fieldsWithValues[i]
      const candidates = parseResults.get(i) || [{ type: Taxonomy.UNKNOWN, score: 0, reasons: ['no match'] }]
      const bestCandidate = candidates[0]
      const detectedType = bestCandidate?.type || Taxonomy.UNKNOWN
      const isSensitive = SENSITIVE_TYPES.has(detectedType)

      const labelText = field.labelText || field.attributes.placeholder || field.attributes.name || 'Field'

      if (detectedType !== Taxonomy.UNKNOWN) {
        const existingAnswers = await this.answerStorage.getByType(detectedType)
        if (existingAnswers.length > 0) {
          const existing = existingAnswers[0]
          if (existing.value === value) {
            continue
          }
          // 防止部分值覆盖完整值（如 2023-09 不覆盖 2023-09-01）
          if (this.isPartialValue(value, existing.value)) {
            continue
          }
          detectedFields.push({
            id: generateId(),
            label: labelText,
            value: value,
            type: detectedType,
            sensitive: isSensitive,
            existingValue: existing.value,
            existingAnswerId: existing.id,
          })
          continue
        }
      }

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

  /**
   * 检查新值是否是现有值的部分值（不应覆盖）
   * 例如：2023-09 是 2023-09-01 的部分值
   */
  private isPartialValue(newValue: string, existingValue: string): boolean {
    // 如果新值更短且是现有值的前缀，视为部分值
    if (newValue.length < existingValue.length && existingValue.startsWith(newValue)) {
      return true
    }
    // 日期特殊处理：2023-09 vs 2023-09-01
    const datePartialPattern = /^\d{4}-\d{2}$/
    const dateFullPattern = /^\d{4}-\d{2}-\d{2}$/
    if (datePartialPattern.test(newValue) && dateFullPattern.test(existingValue)) {
      return existingValue.startsWith(newValue)
    }
    return false
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

  private async fillAndReturnCount(
    animated = false,
    onProgress?: (state: FillAnimationState) => void
  ): Promise<{ count: number; debug: FillDebugInfo }> {
    const { results, debug } = await this.fillWithDebug(animated, onProgress)
    return { count: results.filter(r => r.success).length, debug }
  }

  private async confirmWidgetFields(fields: DetectedField[]): Promise<void> {
    let savedCount = 0
    let replacedCount = 0
    let skippedCount = 0

    for (const field of fields) {
      const type = field.type as Taxonomy || Taxonomy.UNKNOWN
      if (type === Taxonomy.UNKNOWN) {
        skippedCount++
        continue
      }

      if (field.existingAnswerId) {
        await this.answerStorage.delete(field.existingAnswerId)
        const answer = this.createAnswerValue(type, field.value)
        await this.answerStorage.save(answer)
        replacedCount++
      } else {
        const existingAnswer = await this.answerStorage.findByValue(type, field.value)
        if (!existingAnswer) {
          const answer = this.createAnswerValue(type, field.value)
          await this.answerStorage.save(answer)
          savedCount++
        }
      }
    }

    const messages: string[] = []
    if (savedCount > 0) messages.push(`${savedCount} new`)
    if (replacedCount > 0) messages.push(`${replacedCount} replaced`)
    
    if (messages.length > 0) {
      showToast(`Saved: ${messages.join(', ')}`, 'success')
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

  private async fillWithDebug(
    animated = false,
    onProgress?: (state: FillAnimationState) => void
  ): Promise<{ results: FillResult[]; debug: FillDebugInfo }> {
    const debug = createEmptyDebugInfo()
    const settings = await this.siteSettingsStorage.get(this.siteKey)

    debug.autofillEnabled = settings?.autofillEnabled ?? false

    if (!settings?.autofillEnabled) {
      await saveDebugLog('fill', debug)
      return { results: [], debug }
    }

    this.badgeManager.hideAll()

    // Get animation config
    let animConfig: FillAnimationConfig = DEFAULT_FILL_ANIMATION_CONFIG
    try {
      const result = await chrome.storage.local.get('fillAnimationConfig')
      if (result.fillAnimationConfig) {
        animConfig = { ...DEFAULT_FILL_ANIMATION_CONFIG, ...result.fillAnimationConfig }
      }
    } catch {
      // Use defaults
    }

    // Scanning stage
    if (animated && onProgress) {
      onProgress({
        stage: 'scanning',
        currentFieldIndex: 0,
        totalFields: 0,
        currentFieldLabel: '',
        progress: 5
      })
      await new Promise(resolve => setTimeout(resolve, animConfig.stageDelays.scanning))
    }

    const fields = scanFields(document.body)
    debug.fieldsScanned = fields.length

    // Thinking stage
    if (animated && onProgress) {
      onProgress({
        stage: 'thinking',
        currentFieldIndex: 0,
        totalFields: fields.length,
        currentFieldLabel: '',
        progress: 15
      })
      await new Promise(resolve => setTimeout(resolve, animConfig.stageDelays.thinking))
    }

    const { plans, suggestions, sensitiveFields, fieldDebug } = await this.createFillPlansWithDebug(fields)
    debug.fieldsParsed = fieldDebug
    debug.plansCreated = plans.length
    debug.suggestionsCreated = suggestions.length
    debug.sensitiveFieldsFound = sensitiveFields.length

    const results: FillResult[] = []
    this.fillHistory = []

    if (animated && onProgress && plans.length > 0) {
      // Filling stage with animation
      onProgress({
        stage: 'filling',
        currentFieldIndex: 0,
        totalFields: plans.length,
        currentFieldLabel: plans[0]?.field.labelText || 'Field',
        progress: 20
      })

      // Use animated executor
      const animatedPlans = plans.map(p => ({
        context: p.field,
        value: p.answer.value
      }))

      const animResults = await executeFillPlanAnimated(animatedPlans, {
        config: animConfig,
        onProgress: (fieldIndex, totalFields, currentChar, totalChars, fieldLabel) => {
          // Calculate overall progress (20% to 95%)
          const charProgress = totalChars > 0 ? currentChar / totalChars : 0
          const fieldContribution = 75 / totalFields
          const progress = 20 + (fieldIndex * fieldContribution) + (charProgress * fieldContribution)

          onProgress({
            stage: 'filling',
            currentFieldIndex: fieldIndex,
            totalFields,
            currentFieldLabel: fieldLabel,
            progress: Math.min(95, progress)
          })
        }
      })

      // Process results
      for (let i = 0; i < animResults.length; i++) {
        const plan = plans[i]
        const result = animResults[i]

        if (result.success) {
          const snapshot = createFillSnapshot(plan.field.element)
          this.fillHistory.push({
            field: plan.field,
            snapshot,
            answerId: plan.answer.id,
            timestamp: Date.now(),
          })
          this.markAsFilledByProgram(plan.field.element)
          this.badgeManager.showBadge(plan.field, {
            type: 'filled',
            answerId: plan.answer.id,
            canUndo: true,
          })
        }

        results.push(result)
      }
    } else {
      // Non-animated mode (original behavior)
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
          this.markAsFilledByProgram(plan.field.element)
          this.badgeManager.showBadge(plan.field, {
            type: 'filled',
            answerId: plan.answer.id,
            canUndo: true,
          })
        }

        results.push(result)
        await this.yieldToMainThread()
      }
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

    // Use batch parsing for better LLM efficiency
    const parseResults = await parseFieldsBatch(fields)

    // Build field type map for section detection
    const fieldTypeMap = new Map<number, Taxonomy>()
    for (const [index, candidates] of parseResults) {
      if (candidates.length > 0 && candidates[0].type !== Taxonomy.UNKNOWN) {
        fieldTypeMap.set(index, candidates[0].type)
      }
    }

    // Detect form sections for experience-based filling
    const sections = detectFormSections(fields, fieldTypeMap)

    // Create a map from field to its section context
    const fieldSectionMap = new Map<FieldContext, { groupType?: ExperienceGroupType; blockIndex: number }>()
    for (const section of sections) {
      for (const field of section.fields) {
        fieldSectionMap.set(field, {
          groupType: section.groupType,
          blockIndex: section.blockIndex,
        })
      }
    }

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]
      const candidates = parseResults.get(i) || [{ type: Taxonomy.UNKNOWN, score: 0, reasons: ['no match'] }]
      const bestCandidate = candidates[0]
      const label = field.labelText || field.attributes.placeholder || field.attributes.name || 'Unknown'
      const sectionContext = fieldSectionMap.get(field)

      const answers = bestCandidate.type !== Taxonomy.UNKNOWN
        ? await this.findMatchingAnswers(bestCandidate, field, sectionContext)
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

      if (SENSITIVE_TYPES.has(bestCandidate.type) || bestAnswer.answer.autofillAllowed === false) {
        debugEntry.reason = bestAnswer.answer.autofillAllowed === false
          ? 'Autofill disabled for this answer'
          : 'Sensitive field - requires manual selection'
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

      debugEntry.reason = sectionContext?.groupType
        ? `Will auto-fill (${sectionContext.groupType} block ${sectionContext.blockIndex})`
        : 'Will auto-fill'
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
      // 标记为程序填写
      this.markAsFilledByProgram(field.element)
    }
  }

  /**
   * 标记元素为程序填写，并添加用户修改监听器
   */
  private markAsFilledByProgram(element: HTMLElement): void {
    element.setAttribute(ATTR_FILLED, 'true')
    element.removeAttribute(ATTR_USER_MODIFIED)

    // 避免重复添加监听器
    if (this.userInputListeners.has(element)) return

    const handleUserInput = () => {
      // 用户修改了字段，标记为用户修改
      element.setAttribute(ATTR_USER_MODIFIED, 'true')
    }

    element.addEventListener('input', handleUserInput)
    this.userInputListeners.set(element, handleUserInput)
  }

  /**
   * 检查字段是否应该被学习（用户主动填写或修改的）
   */
  private shouldLearnField(element: HTMLElement): boolean {
    const wasFilled = element.hasAttribute(ATTR_FILLED)
    const wasUserModified = element.hasAttribute(ATTR_USER_MODIFIED)

    // 如果是程序填写的，只有用户修改过才学习
    if (wasFilled) {
      return wasUserModified
    }
    // 如果不是程序填写的（用户手动填写），则学习
    return true
  }

  private async findMatchingAnswers(
    candidate: CandidateType,
    field: FieldContext,
    sectionContext?: { groupType?: ExperienceGroupType; blockIndex: number }
  ): Promise<Array<{ answer: AnswerValue; transformedValue: string }>> {
    const results: Array<{ answer: AnswerValue; transformedValue: string; priority: number }> = []

    // First, check if this field type belongs to an experience section
    // and try to get value from ExperienceStorage
    if (sectionContext?.groupType) {
      const experienceValue = await this.getValueFromExperience(
        candidate.type,
        sectionContext.groupType,
        sectionContext.blockIndex
      )
      if (experienceValue) {
        const transformedValue = transformValue(experienceValue.value, candidate.type, field)
        results.push({
          answer: experienceValue,
          transformedValue,
          priority: 3, // Highest priority for experience-based matches
        })
      }
    }

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

  /**
   * Get value from experience storage for a specific field type and block index
   */
  private async getValueFromExperience(
    fieldType: Taxonomy,
    groupType: ExperienceGroupType,
    blockIndex: number
  ): Promise<AnswerValue | null> {
    const experience = await experienceStorage.getByPriority(groupType, blockIndex)
    if (!experience) return null

    const value = experience.fields[fieldType]
    if (!value) return null

    // Create a pseudo-AnswerValue from the experience field
    return {
      id: `exp-${experience.id}-${fieldType}`,
      type: fieldType,
      value,
      display: value,
      aliases: [],
      sensitivity: 'normal',
      autofillAllowed: true,
      createdAt: experience.createdAt,
      updatedAt: experience.updatedAt,
    }
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

  setSidePanelState(isOpen: boolean): void {
    this.floatingWidget.setSidePanelOpen(isOpen)
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
