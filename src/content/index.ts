import { scanFields, detectFormSections, findAddButtonForSection, clickAddButtonAndWait } from '@/scanner'
import { parseField, parseFieldsBatch } from '@/parser'
import { transformValue, stripCountryCode } from '@/transformer'
import { fillField, createFillSnapshot, restoreSnapshot, FillSnapshot, executeFillPlanAnimated } from '@/executor'
import { Recorder, generateId } from '@/recorder'
import { storage, AnswerStorage, ObservationStorage, SiteSettingsStorage, experienceStorage } from '@/storage'
import { BadgeManager } from '@/ui/BadgeManager'
import { FloatingWidget, DetectedField, FillAnimationState, showToast } from '@/ui'
import { visibilityController } from '@/ui/WidgetVisibility'
import { aiPromotionBubble } from '@/ui/AIPromotionBubble'
import { FieldContext, AnswerValue, Taxonomy, SENSITIVE_TYPES, FillResult, FillPlan, CandidateType, PendingObservation, ExperienceGroupType, DEFAULT_FILL_ANIMATION_CONFIG, FillAnimationConfig } from '@/types'
import { FillDebugInfo, createEmptyDebugInfo, saveDebugLog } from '@/utils/logger'
import { llmService } from '@/services/LLMService'
import { isLLMAvailable } from '@/utils/llmProvider'

const CONFIDENCE_THRESHOLD = 0.75

// Debounce delay for mutation observer (ms)
const MUTATION_DEBOUNCE_DELAY = 300

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

  // Dynamic form monitoring
  private mutationObserver: MutationObserver | null = null
  private processedFields: WeakSet<HTMLElement> = new WeakSet()
  private mutationDebounceTimer: ReturnType<typeof setTimeout> | null = null
  private pendingMutationNodes: Set<Node> = new Set()
  private dynamicFillEnabled = true

  // Auto-add configuration
  private autoAddEnabled = true
  private maxAutoAddClicks = 5  // Prevent infinite loops

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
      onAIFill: () => this.aiSuperFill(),
      getSiteKey: () => this.siteKey,
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
      const global = await this.getGlobalSettings()
      if (!global.recordEnabled || !settings?.recordEnabled) return

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
    const global = await this.getGlobalSettings()

    if (global.recordEnabled && settings.recordEnabled) {
      this.recorder.start()
    }

    // Start dynamic form monitoring if autofill is enabled (both global and per-site)
    if (global.autofillEnabled && settings.autofillEnabled) {
      this.startDynamicFormMonitoring()
    }

    // Smart widget visibility - only show when relevant
    await this.initializeWidgetVisibility()
  }

  /**
   * Initialize widget visibility with smart detection
   * Only shows the widget when the page appears to be a job application
   */
  private async initializeWidgetVisibility(): Promise<void> {
    // Small delay to let page content load
    await new Promise(resolve => setTimeout(resolve, 300))

    const decision = await visibilityController.shouldShowWidget()

    console.log(`[AutoFiller] Widget visibility: ${decision.shouldShow ? 'SHOW' : 'HIDE'}`)
    console.log(`[AutoFiller]   Reason: ${decision.reason}`)
    console.log(`[AutoFiller]   Form fields: ${decision.formFieldCount}`)
    console.log(`[AutoFiller]   Confidence: ${(decision.confidence * 100).toFixed(0)}%`)
    console.log(`[AutoFiller]   Mode: ${decision.suggestedMode}`)

    if (decision.shouldShow) {
      this.floatingWidget.show()

      // If minimal mode, we could show a smaller indicator
      // For now, full widget is shown in both cases
      if (decision.suggestedMode === 'minimal') {
        // Future: could show a smaller, less intrusive indicator
        console.log('[AutoFiller] Using minimal mode (future: smaller indicator)')
      }
    } else {
      // Widget not shown, but we can still listen for form focus events
      this.setupLazyWidgetActivation()
    }
  }

  /**
   * Setup lazy activation - show widget when user interacts with a form field
   */
  private setupLazyWidgetActivation(): void {
    const handleFormFocus = async (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (!target) return

      // Check if the focused element is a form field
      const isFormField = (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      )

      if (!isFormField) return

      // Re-evaluate visibility
      visibilityController.invalidateCache()
      const decision = await visibilityController.shouldShowWidget()

      if (decision.shouldShow && decision.formFieldCount >= 3) {
        console.log('[AutoFiller] Form interaction detected, showing widget')
        this.floatingWidget.show()
        // Remove listener after showing
        document.removeEventListener('focusin', handleFormFocus)
      }
    }

    document.addEventListener('focusin', handleFormFocus)

    // Also listen for significant DOM changes that might add forms
    const observer = new MutationObserver(async () => {
      visibilityController.invalidateCache()
      const decision = await visibilityController.shouldShowWidget()

      if (decision.shouldShow && decision.formFieldCount >= 5) {
        console.log('[AutoFiller] Form detected via DOM change, showing widget')
        this.floatingWidget.show()
        observer.disconnect()
        document.removeEventListener('focusin', handleFormFocus)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // Cleanup after 30 seconds to avoid memory leaks
    setTimeout(() => {
      observer.disconnect()
      document.removeEventListener('focusin', handleFormFocus)
    }, 30000)
  }

  /**
   * Start monitoring DOM for dynamically added form fields
   * Uses MutationObserver with debouncing to efficiently detect new fields
   */
  private startDynamicFormMonitoring(): void {
    if (this.mutationObserver) return

    this.mutationObserver = new MutationObserver((mutations) => {
      // Collect all added nodes that might contain form fields
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.pendingMutationNodes.add(node)
          }
        }
      }

      // Debounce the processing
      if (this.pendingMutationNodes.size > 0) {
        this.scheduleMutationProcessing()
      }
    })

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })

    console.log('[AutoFiller] Dynamic form monitoring started')
  }

  /**
   * Stop monitoring DOM for dynamic form changes
   */
  private stopDynamicFormMonitoring(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
      this.mutationObserver = null
    }
    if (this.mutationDebounceTimer) {
      clearTimeout(this.mutationDebounceTimer)
      this.mutationDebounceTimer = null
    }
    this.pendingMutationNodes.clear()
    console.log('[AutoFiller] Dynamic form monitoring stopped')
  }

  /**
   * Schedule debounced processing of mutation nodes
   */
  private scheduleMutationProcessing(): void {
    if (this.mutationDebounceTimer) {
      clearTimeout(this.mutationDebounceTimer)
    }

    this.mutationDebounceTimer = setTimeout(() => {
      this.processPendingMutations()
    }, MUTATION_DEBOUNCE_DELAY)
  }

  /**
   * Process accumulated mutation nodes and fill any new form fields
   */
  private async processPendingMutations(): Promise<void> {
    if (!this.dynamicFillEnabled) {
      this.pendingMutationNodes.clear()
      return
    }

    const settings = await this.siteSettingsStorage.get(this.siteKey)
    const global = await this.getGlobalSettings()
    if (!global.autofillEnabled || !settings?.autofillEnabled) {
      this.pendingMutationNodes.clear()
      return
    }

    const nodesToProcess = Array.from(this.pendingMutationNodes)
    this.pendingMutationNodes.clear()

    // Collect all new form fields from added nodes
    const newFields: FieldContext[] = []

    for (const node of nodesToProcess) {
      if (!(node instanceof HTMLElement)) continue

      // Scan for form fields within the added node
      const fields = scanFields(node)

      for (const field of fields) {
        // Skip already processed fields
        if (this.processedFields.has(field.element)) continue

        // Skip fields that already have values (user might have filled them)
        const currentValue = this.getFieldValue(field.element)
        if (currentValue) continue

        newFields.push(field)
        this.processedFields.add(field.element)
      }
    }

    if (newFields.length === 0) return

    console.log(`[AutoFiller] Detected ${newFields.length} new form fields, processing...`)

    // Fill the new fields
    await this.fillNewFields(newFields)
  }

  /**
   * Fill newly detected form fields
   */
  private async fillNewFields(fields: FieldContext[]): Promise<void> {
    const { plans, suggestions, sensitiveFields } = await this.createFillPlansWithDebug(fields)

    // Fill high-confidence fields
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

      await this.yieldToMainThread()
    }

    // Show suggestions for low-confidence fields
    for (const { field, candidates } of suggestions) {
      this.badgeManager.showBadge(field, {
        type: 'suggest',
        candidates,
      })
    }

    // Show sensitive field badges
    for (const { field, candidates } of sensitiveFields) {
      this.badgeManager.showBadge(field, {
        type: 'sensitive',
        candidates,
      })
    }

    if (plans.length > 0) {
      console.log(`[AutoFiller] Filled ${plans.length} new fields dynamically`)
      showToast(`Auto-filled ${plans.length} new field(s)`, 'success')
    }
  }

  /**
   * Enable or disable dynamic form filling
   */
  setDynamicFillEnabled(enabled: boolean): void {
    this.dynamicFillEnabled = enabled
    console.log(`[AutoFiller] Dynamic fill ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Clear the processed fields cache (useful for re-scanning)
   */
  clearProcessedFieldsCache(): void {
    this.processedFields = new WeakSet()
    console.log('[AutoFiller] Processed fields cache cleared')
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
    const { results, debug } = await this.fillWithDebug(animated, onProgress, true)
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
    this.startDynamicFormMonitoring()
  }

  async disableAutofill(): Promise<void> {
    await this.siteSettingsStorage.update(this.siteKey, { autofillEnabled: false })
    this.stopDynamicFormMonitoring()
  }

  private async getGlobalSettings(): Promise<{ recordEnabled: boolean; autofillEnabled: boolean }> {
    try {
      const result = await chrome.storage.local.get('globalSettings')
      return {
        recordEnabled: result.globalSettings?.recordEnabled ?? true,
        autofillEnabled: result.globalSettings?.autofillEnabled ?? false,
      }
    } catch {
      return { recordEnabled: true, autofillEnabled: false }
    }
  }

  async fill(): Promise<FillResult[]> {
    const { results } = await this.fillWithDebug(false, undefined, true)
    return results
  }

  private async fillWithDebug(
    animated = false,
    onProgress?: (state: FillAnimationState) => void,
    manual = false
  ): Promise<{ results: FillResult[]; debug: FillDebugInfo }> {
    const debug = createEmptyDebugInfo()
    const settings = await this.siteSettingsStorage.get(this.siteKey)
    const global = await this.getGlobalSettings()

    debug.autofillEnabled = (global.autofillEnabled && (settings?.autofillEnabled ?? false))

    if (!manual && !debug.autofillEnabled) {
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

    // Mark all scanned fields as processed for dynamic monitoring
    for (const field of fields) {
      this.processedFields.add(field.element)
    }

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

    // Show AI promotion bubble if appropriate
    await this.maybeShowAIPromotion(debug)

    // Check if we should auto-add more entries
    if (this.autoAddEnabled && !animated) {
      await this.tryAutoAddAndFill()
    }

    return { results, debug }
  }

  /**
   * Show AI promotion bubble if appropriate
   * Shows when LLM is disabled and there are unrecognized fields
   */
  private async maybeShowAIPromotion(debug: FillDebugInfo): Promise<void> {
    try {
      const llmEnabled = await isLLMAvailable()

      // Count unrecognized fields
      const unrecognizedCount = debug.fieldsParsed.filter(
        f => f.type === Taxonomy.UNKNOWN || !f.hasMatchingAnswers
      ).length
      const totalFields = debug.fieldsScanned
      const filledCount = debug.fillResults

      const shouldShow = await aiPromotionBubble.shouldShow(llmEnabled, unrecognizedCount, totalFields)

      if (shouldShow) {
        // Small delay to not interfere with fill completion feedback
        setTimeout(() => {
          aiPromotionBubble.show(filledCount, totalFields, () => {
            // Open side panel to settings when user clicks "Try AI"
            if (chrome.runtime?.sendMessage) {
              chrome.runtime.sendMessage({ action: 'openSidePanel' })
            }
          })
        }, 2000)
      }
    } catch (error) {
      console.error('[AutoFiller] Error checking AI promotion:', error)
    }
  }

  /**
   * Check if more experience entries are available and auto-click add buttons to fill them
   */
  private async tryAutoAddAndFill(): Promise<void> {
    const sectionTypes: ExperienceGroupType[] = ['WORK', 'EDUCATION', 'PROJECT']

    for (const sectionType of sectionTypes) {
      let clickCount = 0

      while (clickCount < this.maxAutoAddClicks) {
        const shouldAdd = await this.shouldAddMoreEntries(sectionType)
        if (!shouldAdd) break

        const addButton = findAddButtonForSection(sectionType)
        if (!addButton) {
          console.log(`[AutoFiller] No add button found for ${sectionType}`)
          break
        }

        console.log(`[AutoFiller] Clicking add button for ${sectionType}: "${addButton.context}"`)

        const success = await clickAddButtonAndWait(addButton)
        if (!success) {
          console.log(`[AutoFiller] Add button click did not produce new fields`)
          break
        }

        clickCount++

        // Small delay to let DOM settle
        await new Promise(resolve => setTimeout(resolve, 200))

        // Fill the newly added fields
        await this.fillNewlyAddedSection(sectionType)
      }

      if (clickCount > 0) {
        console.log(`[AutoFiller] Added and filled ${clickCount} ${sectionType} entries`)
      }
    }
  }

  /**
   * Check if we should add more entries for a section type using LLM
   */
  private async shouldAddMoreEntries(sectionType: ExperienceGroupType): Promise<boolean> {
    // Get count of user's stored experiences
    const storedCount = await experienceStorage.getCountByGroupType(sectionType)
    if (storedCount === 0) return false

    // Count current form sections of this type
    const currentSectionCount = this.countFormSections(sectionType)

    // Find the add button to get its context
    const addButton = findAddButtonForSection(sectionType)
    if (!addButton) return false

    // Get field labels for context
    const fields = scanFields(document.body)
    const fieldLabels = fields
      .filter(f => this.isSectionRelevant(f, sectionType))
      .map(f => f.labelText)
      .filter(Boolean)
      .slice(0, 10)

    // Get surrounding section context
    const sectionContext = addButton.element.closest('section, fieldset, [class*="section"]')?.textContent?.slice(0, 200) || ''

    // Ask LLM for decision
    const decision = await llmService.shouldAddMoreEntries({
      sectionType,
      currentFormCount: currentSectionCount,
      storedExperienceCount: storedCount,
      buttonText: addButton.context,
      sectionContext: sectionContext.replace(/\s+/g, ' ').trim(),
      existingFieldLabels: fieldLabels,
    })

    console.log(`[AutoFiller] LLM decision for ${sectionType}: ${decision.shouldAdd ? 'ADD' : 'SKIP'} (${decision.confidence.toFixed(2)}) - ${decision.reason}`)

    return decision.shouldAdd && decision.confidence >= 0.6
  }

  /**
   * Check if a field is relevant to a section type
   */
  private isSectionRelevant(field: FieldContext, sectionType: ExperienceGroupType): boolean {
    const text = (field.labelText + ' ' + field.sectionTitle).toLowerCase()

    if (sectionType === 'WORK') {
      return /company|employer|job|title|position|work|experience|职位|公司|工作/.test(text)
    } else if (sectionType === 'EDUCATION') {
      return /school|university|college|degree|education|学校|学历|教育/.test(text)
    } else if (sectionType === 'PROJECT') {
      return /project|项目/.test(text)
    }
    return false
  }

  /**
   * Count how many form sections of a given type exist
   */
  private countFormSections(sectionType: ExperienceGroupType): number {
    const fields = scanFields(document.body)

    // Count sections by looking at field names/labels
    let sectionCount = 0
    const seenSections = new Set<string>()

    for (const field of fields) {
      const sectionKey = field.sectionTitle || '_default'
      if (seenSections.has(sectionKey)) continue

      // Check if this section likely contains the relevant type
      const lowerLabel = field.labelText.toLowerCase()
      const lowerSection = field.sectionTitle.toLowerCase()

      let isRelevant = false
      if (sectionType === 'WORK') {
        isRelevant = /company|employer|job|title|position|work|experience|职位|公司|工作/.test(lowerLabel + lowerSection)
      } else if (sectionType === 'EDUCATION') {
        isRelevant = /school|university|college|degree|education|学校|学历|教育/.test(lowerLabel + lowerSection)
      } else if (sectionType === 'PROJECT') {
        isRelevant = /project|项目/.test(lowerLabel + lowerSection)
      }

      if (isRelevant) {
        seenSections.add(sectionKey)
        sectionCount++
      }
    }

    // At minimum return 1 if there are any relevant keywords found
    return Math.max(sectionCount, seenSections.size > 0 ? 1 : 0)
  }

  /**
   * Fill fields in a newly added section
   */
  private async fillNewlyAddedSection(sectionType: ExperienceGroupType): Promise<void> {
    // Re-scan to find new fields
    const allFields = scanFields(document.body)

    // Find fields that haven't been processed yet
    const newFields = allFields.filter(f => !this.processedFields.has(f.element))

    if (newFields.length === 0) {
      console.log(`[AutoFiller] No new fields found after add button click`)
      return
    }

    console.log(`[AutoFiller] Found ${newFields.length} new fields to fill`)

    // Mark them as processed
    for (const field of newFields) {
      this.processedFields.add(field.element)
    }

    // Create fill plans for new fields
    const { plans, suggestions, sensitiveFields } = await this.createFillPlansWithDebug(newFields)

    // Execute fills
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

      await this.yieldToMainThread()
    }

    // Show badges for suggestions and sensitive fields
    for (const { field, candidates } of suggestions) {
      this.badgeManager.showBadge(field, { type: 'suggest', candidates })
    }

    for (const { field, candidates } of sensitiveFields) {
      this.badgeManager.showBadge(field, { type: 'sensitive', candidates })
    }

    if (plans.length > 0) {
      showToast(`Filled ${plans.length} fields in new ${sectionType.toLowerCase()} entry`, 'success')
    }
  }

  /**
   * Enable or disable auto-add functionality
   */
  setAutoAddEnabled(enabled: boolean): void {
    this.autoAddEnabled = enabled
    console.log(`[AutoFiller] Auto-add ${enabled ? 'enabled' : 'disabled'}`)
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

    // If form has both COUNTRY_CODE and PHONE, strip country code from PHONE values
    const hasCountryCode = [...fieldTypeMap.values()].includes(Taxonomy.COUNTRY_CODE)
    if (hasCountryCode) {
      for (const plan of plans) {
        const idx = fields.indexOf(plan.field)
        if (fieldTypeMap.get(idx) === Taxonomy.PHONE) {
          plan.answer = { ...plan.answer, value: stripCountryCode(plan.answer.value) }
        }
      }
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
    if (isOpen) {
      this.floatingWidget.show()
    }
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

  /**
   * AI SuperFill: use LLM to fill remaining empty fields
   */
  async aiSuperFill(): Promise<{ count: number }> {
    const fields = scanFields(document.body)
    const emptyFields: Array<{ field: FieldContext; fieldId: string }> = []

    // Find empty fields
    for (const field of fields) {
      const value = this.getFieldValue(field.element)
      if (!value) {
        emptyFields.push({ field, fieldId: `field-${emptyFields.length}` })
      }
    }

    if (emptyFields.length === 0) {
      return { count: 0 }
    }

    // Build user profile context
    const userProfile = await this.buildUserProfileContext()
    const experiences = await this.buildExperienceContext()

    // Build field descriptions for LLM
    const unfilledFields = emptyFields.map(({ field, fieldId }) => {
      const desc: {
        fieldId: string
        label: string
        fieldType: string
        required?: boolean
        placeholder?: string
        options?: string[]
        sectionTitle?: string
      } = {
        fieldId,
        label: field.labelText || field.attributes.placeholder || field.attributes.name || 'Unknown',
        fieldType: field.element instanceof HTMLTextAreaElement ? 'textarea'
          : field.element instanceof HTMLSelectElement ? 'select'
          : (field.element as HTMLInputElement).type || 'text',
      }

      const isRequired = field.attributes.required !== undefined
        || (field.element as HTMLInputElement).required
        || /\*\s*$/.test(field.labelText)
      if (isRequired) desc.required = true

      if (field.attributes.placeholder) desc.placeholder = field.attributes.placeholder
      if (field.optionsText?.length) desc.options = field.optionsText
      if (field.sectionTitle) desc.sectionTitle = field.sectionTitle

      return desc
    })

    // Call LLM
    let results: Awaited<ReturnType<typeof llmService.superFillFields>>
    try {
      results = await llmService.superFillFields({
        userProfile,
        experiences,
        unfilledFields,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error('[AutoFiller] SuperFill error:', msg)
      showToast(`AI error: ${msg}`, 'warning')
      return { count: 0 }
    }

    // Fill fields with LLM results
    let filledCount = 0
    for (const result of results) {
      if (result.confidence < 0.3) continue

      const entry = emptyFields.find(e => e.fieldId === result.fieldId)
      if (!entry) continue

      const fillResult = await fillField(entry.field, result.value)
      if (fillResult.success) {
        filledCount++
        this.markAsFilledByProgram(entry.field.element)
        this.badgeManager.showBadge(entry.field, {
          type: 'filled',
          answerId: `ai-${result.fieldId}`,
          canUndo: true,
        })
      }

      await this.yieldToMainThread()
    }

    return { count: filledCount }
  }

  /**
   * AI fill a single field (triggered by right-click context menu)
   */
  async aiFillSingleField(element: HTMLElement): Promise<boolean> {
    // Find the field context for this element
    const fields = scanFields(element.closest('form') || document.body)
    const fieldContext = fields.find(f => f.element === element)

    if (!fieldContext) {
      showToast('Could not identify this field', 'info')
      return false
    }

    const userProfile = await this.buildUserProfileContext()
    const experiences = await this.buildExperienceContext()

    // Get surrounding text for context
    const surroundingText = element.closest('div, fieldset, section')?.textContent?.slice(0, 300) || ''

    let value: string | null
    try {
      value = await llmService.fillSingleField({
        userProfile,
        experiences,
        field: {
          label: fieldContext.labelText || fieldContext.attributes.placeholder || fieldContext.attributes.name || 'Unknown',
          fieldType: element instanceof HTMLTextAreaElement ? 'textarea'
            : element instanceof HTMLSelectElement ? 'select'
            : (element as HTMLInputElement).type || 'text',
          placeholder: fieldContext.attributes.placeholder,
          options: fieldContext.optionsText,
          sectionTitle: fieldContext.sectionTitle,
          surroundingText,
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error('[AutoFiller] AI single fill error:', msg)
      showToast(`AI error: ${msg}`, 'warning')
      return false
    }

    if (!value) {
      showToast('AI could not generate a value for this field', 'info')
      return false
    }

    const result = await fillField(fieldContext, value)
    if (result.success) {
      this.markAsFilledByProgram(element)
      showToast('AI filled this field', 'success')
      return true
    }

    showToast('Failed to fill this field', 'warning')
    return false
  }

  /**
   * Build user profile context from stored answers
   */
  private async buildUserProfileContext(): Promise<Record<string, string>> {
    const allAnswers = await this.answerStorage.getAll()
    const profile: Record<string, string> = {}
    for (const answer of allAnswers) {
      // Use type as key, take first value for each type
      if (!profile[answer.type]) {
        profile[answer.type] = answer.value
      }
    }
    return profile
  }

  /**
   * Build experience context from stored experiences
   */
  private async buildExperienceContext(): Promise<Array<{ type: string; fields: Record<string, string> }>> {
    const allExperiences = await experienceStorage.getAll()
    return allExperiences.map(e => ({
      type: e.groupType,
      fields: e.fields,
    }))
  }

  destroy(): void {
    this.recorder.stop()
    this.badgeManager.hideAll()
    this.floatingWidget.hide()
    this.stopDynamicFormMonitoring()
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
