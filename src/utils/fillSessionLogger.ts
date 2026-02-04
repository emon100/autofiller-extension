/**
 * FillSession Logger - Tracks the entire fill process with unique session ID
 *
 * This logger provides detailed visibility into:
 * - Form scanning and field detection
 * - Field parsing and classification
 * - Knowledge base lookups and normalization
 * - Value transformation
 * - Fill execution results
 *
 * Each fill operation gets a unique session ID for easy tracing in console logs.
 */

import { Taxonomy } from '@/types'

export interface FieldProcessLog {
  index: number
  label: string
  element: {
    tagName: string
    type?: string
    name?: string
    id?: string
  }
  parsing: {
    method: string  // 'rule' | 'llm' | 'combined'
    candidates: Array<{
      type: Taxonomy
      score: number
      source: string  // Which parser produced this
    }>
    finalType: Taxonomy
    finalScore: number
    durationMs: number
  }
  knowledgeBase: {
    lookupType: Taxonomy
    matchFound: boolean
    matchSource?: 'answer_storage' | 'experience_storage' | 'transformed'
    answerId?: string
    originalValue?: string
    normalizedValue?: string
    normalizationMethod?: 'llm' | 'rule' | 'passthrough'
  }
  transformation?: {
    needed: boolean
    sourceType?: Taxonomy
    targetType?: Taxonomy
    originalValue?: string
    transformedValue?: string
    transformer?: string
  }
  decision: {
    action: 'fill' | 'suggest' | 'sensitive' | 'skip'
    reason: string
    confidence: number
  }
  execution?: {
    success: boolean
    strategy: string
    durationMs: number
    error?: string
  }
}

export interface FillSessionLog {
  sessionId: string
  timestamp: number
  url: string
  siteKey: string
  phases: {
    scan: {
      startTime: number
      endTime: number
      totalElements: number
      formFields: number
      durationMs: number
    }
    parse: {
      startTime: number
      endTime: number
      llmCalls: number
      durationMs: number
    }
    fill: {
      startTime: number
      endTime: number
      durationMs: number
    }
  }
  summary: {
    fieldsScanned: number
    fieldsFilled: number
    fieldsSuggested: number
    fieldsSensitive: number
    fieldsSkipped: number
    llmCallsTotal: number
    normalizationsPerformed: number
    transformationsPerformed: number
  }
  fields: FieldProcessLog[]
}

// Generate unique session ID
function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 6)
  return `fill-${timestamp}-${random}`
}

// Current active session
let currentSession: FillSessionLog | null = null
let sessionFieldIndex = 0

const LOG_PREFIX = '[FillSession]'
const COLORS = {
  session: 'color: #2196F3; font-weight: bold',
  phase: 'color: #9C27B0; font-weight: bold',
  field: 'color: #4CAF50',
  llm: 'color: #FF9800; font-weight: bold',
  kb: 'color: #00BCD4',
  transform: 'color: #E91E63',
  decision: 'color: #607D8B; font-weight: bold',
  success: 'color: #4CAF50; font-weight: bold',
  error: 'color: #F44336; font-weight: bold',
  skip: 'color: #9E9E9E',
}

/**
 * Start a new fill session
 */
export function startFillSession(siteKey: string): string {
  const sessionId = generateSessionId()

  currentSession = {
    sessionId,
    timestamp: Date.now(),
    url: window.location.href,
    siteKey,
    phases: {
      scan: { startTime: 0, endTime: 0, totalElements: 0, formFields: 0, durationMs: 0 },
      parse: { startTime: 0, endTime: 0, llmCalls: 0, durationMs: 0 },
      fill: { startTime: 0, endTime: 0, durationMs: 0 },
    },
    summary: {
      fieldsScanned: 0,
      fieldsFilled: 0,
      fieldsSuggested: 0,
      fieldsSensitive: 0,
      fieldsSkipped: 0,
      llmCallsTotal: 0,
      normalizationsPerformed: 0,
      transformationsPerformed: 0,
    },
    fields: [],
  }
  sessionFieldIndex = 0

  console.log(
    `%c${LOG_PREFIX} ═══════════════════════════════════════════════════════════`,
    COLORS.session
  )
  console.log(
    `%c${LOG_PREFIX} 🚀 FILL SESSION STARTED: ${sessionId}`,
    COLORS.session
  )
  console.log(`${LOG_PREFIX}    URL: ${window.location.href}`)
  console.log(`${LOG_PREFIX}    Site: ${siteKey}`)
  console.log(`${LOG_PREFIX}    Time: ${new Date().toLocaleTimeString()}`)
  console.log(
    `%c${LOG_PREFIX} ═══════════════════════════════════════════════════════════`,
    COLORS.session
  )

  return sessionId
}

/**
 * Log scan phase start
 */
export function logScanStart(): void {
  if (!currentSession) return
  currentSession.phases.scan.startTime = performance.now()
  console.log(`%c${LOG_PREFIX} 📋 SCAN PHASE STARTED`, COLORS.phase)
}

/**
 * Log scan phase complete
 */
export function logScanComplete(totalElements: number, formFields: number): void {
  if (!currentSession) return
  currentSession.phases.scan.endTime = performance.now()
  currentSession.phases.scan.durationMs =
    currentSession.phases.scan.endTime - currentSession.phases.scan.startTime
  currentSession.phases.scan.totalElements = totalElements
  currentSession.phases.scan.formFields = formFields
  currentSession.summary.fieldsScanned = formFields

  console.log(`%c${LOG_PREFIX} 📋 SCAN COMPLETE`, COLORS.phase)
  console.log(`${LOG_PREFIX}    Total DOM elements checked: ${totalElements}`)
  console.log(`${LOG_PREFIX}    Form fields found: ${formFields}`)
  console.log(`${LOG_PREFIX}    Duration: ${currentSession.phases.scan.durationMs.toFixed(1)}ms`)
}

/**
 * Log parse phase start
 */
export function logParseStart(): void {
  if (!currentSession) return
  currentSession.phases.parse.startTime = performance.now()
  console.log(`%c${LOG_PREFIX} 🔍 PARSE PHASE STARTED`, COLORS.phase)
}

/**
 * Log parse phase complete
 */
export function logParseComplete(): void {
  if (!currentSession) return
  currentSession.phases.parse.endTime = performance.now()
  currentSession.phases.parse.durationMs =
    currentSession.phases.parse.endTime - currentSession.phases.parse.startTime

  console.log(`%c${LOG_PREFIX} 🔍 PARSE COMPLETE`, COLORS.phase)
  console.log(`${LOG_PREFIX}    LLM calls: ${currentSession.phases.parse.llmCalls}`)
  console.log(`${LOG_PREFIX}    Duration: ${currentSession.phases.parse.durationMs.toFixed(1)}ms`)
}

/**
 * Log individual field processing
 */
export function logFieldProcess(log: FieldProcessLog): void {
  if (!currentSession) return
  currentSession.fields.push(log)

  const icons = {
    fill: '✅',
    suggest: '💡',
    sensitive: '🔒',
    skip: '⏭️',
  }

  console.group(
    `%c${LOG_PREFIX} [${log.index}] "${log.label}"`,
    log.decision.action === 'fill' ? COLORS.success :
    log.decision.action === 'skip' ? COLORS.skip : COLORS.field
  )

  // Element info
  console.log(`Element: <${log.element.tagName.toLowerCase()}${log.element.type ? ` type="${log.element.type}"` : ''}${log.element.name ? ` name="${log.element.name}"` : ''}>`)

  // Parsing info
  console.group('Parsing:')
  console.log(`Method: ${log.parsing.method}`)
  if (log.parsing.candidates.length > 0) {
    console.log('Candidates:', log.parsing.candidates.map(c =>
      `${c.type}@${c.score.toFixed(2)} (${c.source})`
    ).join(', '))
  }
  console.log(`%cFinal: ${log.parsing.finalType}@${log.parsing.finalScore.toFixed(2)}`,
    log.parsing.finalScore >= 0.75 ? COLORS.success : COLORS.skip)
  console.log(`Duration: ${log.parsing.durationMs.toFixed(1)}ms`)
  console.groupEnd()

  // Knowledge base lookup
  console.group(`%cKnowledge Base:`, COLORS.kb)
  console.log(`Lookup type: ${log.knowledgeBase.lookupType}`)
  if (log.knowledgeBase.matchFound) {
    console.log(`%c✓ Match found from: ${log.knowledgeBase.matchSource}`, COLORS.success)
    if (log.knowledgeBase.answerId) {
      console.log(`Answer ID: ${log.knowledgeBase.answerId}`)
    }
    if (log.knowledgeBase.originalValue !== log.knowledgeBase.normalizedValue) {
      console.log(`%cNormalized: "${log.knowledgeBase.originalValue}" → "${log.knowledgeBase.normalizedValue}" (${log.knowledgeBase.normalizationMethod})`,
        COLORS.transform)
    }
  } else {
    console.log(`%c✗ No match found`, COLORS.skip)
  }
  console.groupEnd()

  // Transformation
  if (log.transformation?.needed) {
    console.group(`%cTransformation:`, COLORS.transform)
    console.log(`${log.transformation.sourceType} → ${log.transformation.targetType}`)
    console.log(`"${log.transformation.originalValue}" → "${log.transformation.transformedValue}"`)
    console.log(`Transformer: ${log.transformation.transformer}`)
    console.groupEnd()
  }

  // Decision
  console.log(
    `%c${icons[log.decision.action]} Decision: ${log.decision.action.toUpperCase()} (${log.decision.confidence.toFixed(2)}) - ${log.decision.reason}`,
    COLORS.decision
  )

  // Execution result
  if (log.execution) {
    if (log.execution.success) {
      console.log(`%c✅ Executed: ${log.execution.strategy} (${log.execution.durationMs.toFixed(1)}ms)`, COLORS.success)
    } else {
      console.log(`%c❌ Failed: ${log.execution.error}`, COLORS.error)
    }
  }

  console.groupEnd()
}

/**
 * Log LLM call
 */
export function logLLMCall(purpose: string, provider: string, durationMs?: number): void {
  if (!currentSession) return
  currentSession.phases.parse.llmCalls++
  currentSession.summary.llmCallsTotal++

  if (durationMs !== undefined) {
    console.log(
      `%c${LOG_PREFIX} 🤖 LLM: ${purpose} (${provider}) - ${durationMs.toFixed(0)}ms`,
      COLORS.llm
    )
  } else {
    console.log(
      `%c${LOG_PREFIX} 🤖 LLM: ${purpose} (${provider})`,
      COLORS.llm
    )
  }
}

/**
 * Log normalization
 */
export function logNormalization(
  type: string,
  original: string,
  normalized: string,
  method: 'llm' | 'rule' | 'passthrough'
): void {
  if (!currentSession) return
  currentSession.summary.normalizationsPerformed++

  const methodIcon = method === 'llm' ? '🤖' : method === 'rule' ? '📐' : '➡️'
  console.log(
    `%c${LOG_PREFIX} ${methodIcon} Normalize ${type}: "${original}" → "${normalized}" (${method})`,
    COLORS.kb
  )
}

/**
 * Log fill phase start
 */
export function logFillStart(): void {
  if (!currentSession) return
  currentSession.phases.fill.startTime = performance.now()
  console.log(`%c${LOG_PREFIX} ✏️ FILL PHASE STARTED`, COLORS.phase)
}

/**
 * Log fill phase complete
 */
export function logFillComplete(): void {
  if (!currentSession) return
  currentSession.phases.fill.endTime = performance.now()
  currentSession.phases.fill.durationMs =
    currentSession.phases.fill.endTime - currentSession.phases.fill.startTime

  console.log(`%c${LOG_PREFIX} ✏️ FILL COMPLETE`, COLORS.phase)
  console.log(`${LOG_PREFIX}    Duration: ${currentSession.phases.fill.durationMs.toFixed(1)}ms`)
}

/**
 * Update summary counts
 */
export function updateSummary(
  filled: number,
  suggested: number,
  sensitive: number,
  skipped: number
): void {
  if (!currentSession) return
  currentSession.summary.fieldsFilled = filled
  currentSession.summary.fieldsSuggested = suggested
  currentSession.summary.fieldsSensitive = sensitive
  currentSession.summary.fieldsSkipped = skipped
}

/**
 * End the current fill session and print summary
 */
export function endFillSession(): FillSessionLog | null {
  if (!currentSession) return null

  const session = currentSession
  const totalDuration =
    session.phases.scan.durationMs +
    session.phases.parse.durationMs +
    session.phases.fill.durationMs

  console.log(
    `%c${LOG_PREFIX} ═══════════════════════════════════════════════════════════`,
    COLORS.session
  )
  console.log(
    `%c${LOG_PREFIX} 🏁 FILL SESSION COMPLETE: ${session.sessionId}`,
    COLORS.session
  )
  console.log(`${LOG_PREFIX}`)
  console.log(`${LOG_PREFIX}    📊 SUMMARY`)
  console.log(`${LOG_PREFIX}    ─────────────────────────────────`)
  console.log(`${LOG_PREFIX}    Fields scanned:    ${session.summary.fieldsScanned}`)
  console.log(`${LOG_PREFIX}    Fields filled:     ${session.summary.fieldsFilled} ✅`)
  console.log(`${LOG_PREFIX}    Fields suggested:  ${session.summary.fieldsSuggested} 💡`)
  console.log(`${LOG_PREFIX}    Fields sensitive:  ${session.summary.fieldsSensitive} 🔒`)
  console.log(`${LOG_PREFIX}    Fields skipped:    ${session.summary.fieldsSkipped} ⏭️`)
  console.log(`${LOG_PREFIX}`)
  console.log(`${LOG_PREFIX}    🤖 LLM calls:       ${session.summary.llmCallsTotal}`)
  console.log(`${LOG_PREFIX}    📐 Normalizations:  ${session.summary.normalizationsPerformed}`)
  console.log(`${LOG_PREFIX}    🔄 Transformations: ${session.summary.transformationsPerformed}`)
  console.log(`${LOG_PREFIX}`)
  console.log(`${LOG_PREFIX}    ⏱️ TIMING`)
  console.log(`${LOG_PREFIX}    ─────────────────────────────────`)
  console.log(`${LOG_PREFIX}    Scan:   ${session.phases.scan.durationMs.toFixed(1)}ms`)
  console.log(`${LOG_PREFIX}    Parse:  ${session.phases.parse.durationMs.toFixed(1)}ms`)
  console.log(`${LOG_PREFIX}    Fill:   ${session.phases.fill.durationMs.toFixed(1)}ms`)
  console.log(`${LOG_PREFIX}    Total:  ${totalDuration.toFixed(1)}ms`)
  console.log(
    `%c${LOG_PREFIX} ═══════════════════════════════════════════════════════════`,
    COLORS.session
  )

  currentSession = null
  return session
}

/**
 * Get the next field index for the current session
 */
export function getNextFieldIndex(): number {
  return sessionFieldIndex++
}

/**
 * Get current session (for reading state)
 */
export function getCurrentSession(): FillSessionLog | null {
  return currentSession
}

/**
 * Check if a session is active
 */
export function isSessionActive(): boolean {
  return currentSession !== null
}
