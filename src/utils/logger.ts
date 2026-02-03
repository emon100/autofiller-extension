export interface ParserLogEntry {
  parserName: string
  matched: boolean
  candidates: Array<{
    type: string
    score: number
    reasons: string[]
  }>
  timeMs: number
}

export interface FieldParseLog {
  label: string
  elementInfo: {
    tagName: string
    type?: string
    name?: string
    id?: string
    autocomplete?: string
  }
  parsers: ParserLogEntry[]
  finalResult: {
    type: string
    score: number
    reasons: string[]
  }
  totalTimeMs: number
}

export interface TransformLog {
  sourceType: string
  targetType: string
  sourceValue: string
  transformedValue: string
  transformerUsed: string | null
}

export interface FillActionLog {
  label: string
  fieldType: string
  confidence: number
  action: 'filled' | 'suggested' | 'sensitive' | 'skipped'
  reason: string
  answerValue?: string
  transformLog?: TransformLog
}

export interface ScanLog {
  totalElementsFound: number
  visibleElements: number
  disabledElements: number
  excludedTypes: number
  radioGroupsProcessed: number
  shadowDomsScanned: number
  fields: Array<{
    label: string
    widgetKind: string
    labelSource: string
    attributes: Record<string, string>
  }>
  totalTimeMs: number
}

export interface TransformAttemptLog {
  transformerName: string
  sourceType: string
  targetType: string
  sourceValue: string
  canTransform: boolean
  transformedValue?: string
  detectedFormat?: string
}

export interface ExecutorLog {
  fieldLabel: string
  widgetKind: string
  strategy: string
  targetValue: string
  matchedOption?: string
  success: boolean
  error?: string
  timeMs: number
}

export interface FillDebugInfo {
  autofillEnabled: boolean
  fieldsScanned: number
  fieldsParsed: Array<{
    label: string
    type: string
    score: number
    hasMatchingAnswers: boolean
    answersCount: number
    reason?: string
  }>
  plansCreated: number
  suggestionsCreated: number
  sensitiveFieldsFound: number
  fillResults: number
  // Enhanced logging
  parseLogs?: FieldParseLog[]
  fillActionLogs?: FillActionLog[]
  scanLog?: ScanLog
  transformLogs?: TransformAttemptLog[]
  executorLogs?: ExecutorLog[]
}

export function createEmptyDebugInfo(): FillDebugInfo {
  return {
    autofillEnabled: false,
    fieldsScanned: 0,
    fieldsParsed: [],
    plansCreated: 0,
    suggestionsCreated: 0,
    sensitiveFieldsFound: 0,
    fillResults: 0,
  }
}

const DEBUG_KEY = 'autofiller_debug_logs'
const MAX_LOGS = 50

export interface DebugLogEntry {
  timestamp: number
  action: string
  details: FillDebugInfo | Record<string, unknown>
}

export async function saveDebugLog(action: string, details: FillDebugInfo | Record<string, unknown>): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    console.log(`[AutoFiller Debug] ${action}:`, details)
    return
  }

  try {
    const result = await chrome.storage.local.get(DEBUG_KEY)
    const logs: DebugLogEntry[] = result[DEBUG_KEY] || []
    
    logs.unshift({
      timestamp: Date.now(),
      action,
      details,
    })

    if (logs.length > MAX_LOGS) {
      logs.length = MAX_LOGS
    }

    await chrome.storage.local.set({ [DEBUG_KEY]: logs })
  } catch (e) {
    console.error('[AutoFiller] Failed to save debug log:', e)
  }
}

export async function getDebugLogs(): Promise<DebugLogEntry[]> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return []
  }

  try {
    const result = await chrome.storage.local.get(DEBUG_KEY)
    return result[DEBUG_KEY] || []
  } catch {
    return []
  }
}

export async function clearDebugLogs(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return
  }

  try {
    await chrome.storage.local.remove(DEBUG_KEY)
  } catch (e) {
    console.error('[AutoFiller] Failed to clear debug logs:', e)
  }
}

// Console logging for detailed debugging
const LOG_PREFIX = '[AutoFiller]'

export function logParseField(parseLog: FieldParseLog): void {
  const { label, elementInfo, parsers, finalResult, totalTimeMs } = parseLog

  console.group(`${LOG_PREFIX} Parsing field: "${label}"`)
  console.log('Element:', elementInfo)

  console.group('Parser results:')
  for (const parser of parsers) {
    if (parser.matched) {
      console.log(`✓ ${parser.parserName} (${parser.timeMs.toFixed(1)}ms):`,
        parser.candidates.map(c => `${c.type}@${c.score.toFixed(2)} [${c.reasons.join(', ')}]`).join('; '))
    } else {
      console.log(`✗ ${parser.parserName} (${parser.timeMs.toFixed(1)}ms): no match`)
    }
  }
  console.groupEnd()

  console.log(`Final: ${finalResult.type}@${finalResult.score.toFixed(2)} [${finalResult.reasons.join(', ')}] (${totalTimeMs.toFixed(1)}ms total)`)
  console.groupEnd()
}

export function logFillAction(actionLog: FillActionLog): void {
  const { label, fieldType, confidence, action, reason, answerValue, transformLog } = actionLog

  const actionIcon = {
    filled: '✅',
    suggested: '💡',
    sensitive: '🔒',
    skipped: '⏭️',
  }[action]

  console.group(`${LOG_PREFIX} ${actionIcon} ${action.toUpperCase()}: "${label}"`)
  console.log(`Type: ${fieldType}, Confidence: ${confidence.toFixed(2)}`)
  console.log(`Reason: ${reason}`)

  if (answerValue !== undefined) {
    console.log(`Value: "${answerValue}"`)
  }

  if (transformLog) {
    console.log(`Transform: ${transformLog.sourceType} → ${transformLog.targetType}`)
    console.log(`  "${transformLog.sourceValue}" → "${transformLog.transformedValue}"`)
    if (transformLog.transformerUsed) {
      console.log(`  Transformer: ${transformLog.transformerUsed}`)
    }
  }
  console.groupEnd()
}

export function logFillSummary(debug: FillDebugInfo): void {
  console.group(`${LOG_PREFIX} Fill Summary`)
  console.log(`Autofill enabled: ${debug.autofillEnabled}`)
  console.log(`Fields scanned: ${debug.fieldsScanned}`)
  console.log(`Plans created: ${debug.plansCreated}`)
  console.log(`Suggestions: ${debug.suggestionsCreated}`)
  console.log(`Sensitive fields: ${debug.sensitiveFieldsFound}`)
  console.log(`Successfully filled: ${debug.fillResults}`)
  console.groupEnd()
}

export function logScan(scanLog: ScanLog): void {
  console.group(`${LOG_PREFIX} 📋 Scan Results (${scanLog.totalTimeMs.toFixed(1)}ms)`)
  console.log(`Total elements found: ${scanLog.totalElementsFound}`)
  console.log(`Visible: ${scanLog.visibleElements}, Disabled: ${scanLog.disabledElements}, Excluded types: ${scanLog.excludedTypes}`)
  console.log(`Radio groups: ${scanLog.radioGroupsProcessed}, Shadow DOMs: ${scanLog.shadowDomsScanned}`)

  console.group('Fields extracted:')
  for (const field of scanLog.fields) {
    console.log(`• "${field.label}" [${field.widgetKind}] (label via: ${field.labelSource})`)
    if (Object.keys(field.attributes).length > 0) {
      console.log(`  attrs: ${JSON.stringify(field.attributes)}`)
    }
  }
  console.groupEnd()
  console.groupEnd()
}

export function logTransformAttempt(log: TransformAttemptLog): void {
  const statusIcon = log.canTransform ? '✓' : '✗'
  console.group(`${LOG_PREFIX} 🔄 Transform: ${log.transformerName}`)
  console.log(`${statusIcon} ${log.sourceType} → ${log.targetType}`)
  console.log(`Input: "${log.sourceValue}"`)
  if (log.canTransform) {
    console.log(`Output: "${log.transformedValue}"`)
    if (log.detectedFormat) {
      console.log(`Format detected: ${log.detectedFormat}`)
    }
  } else {
    console.log('Cannot transform (no match)')
  }
  console.groupEnd()
}

export function logExecutor(log: ExecutorLog): void {
  const statusIcon = log.success ? '✅' : '❌'
  console.group(`${LOG_PREFIX} ${statusIcon} Execute: "${log.fieldLabel}"`)
  console.log(`Widget: ${log.widgetKind}, Strategy: ${log.strategy}`)
  console.log(`Target value: "${log.targetValue}"`)
  if (log.matchedOption) {
    console.log(`Matched option: "${log.matchedOption}"`)
  }
  if (log.error) {
    console.log(`Error: ${log.error}`)
  }
  console.log(`Time: ${log.timeMs.toFixed(1)}ms`)
  console.groupEnd()
}

export function logDecision(
  fieldLabel: string,
  fieldType: string,
  confidence: number,
  decision: 'auto_fill' | 'suggest' | 'sensitive' | 'skip',
  reason: string,
  matchedAnswers?: number
): void {
  const icons = {
    auto_fill: '✅',
    suggest: '💡',
    sensitive: '🔒',
    skip: '⏭️'
  }
  console.log(
    `${LOG_PREFIX} ${icons[decision]} "${fieldLabel}" → ${fieldType}@${confidence.toFixed(2)} ` +
    `[${decision.toUpperCase()}] ${reason}` +
    (matchedAnswers !== undefined ? ` (${matchedAnswers} answers)` : '')
  )
}

// LLM Logging
export interface LLMLogEntry {
  timestamp: number
  type: 'request' | 'response' | 'error'
  provider: string
  model: string
  prompt?: string
  response?: string
  error?: string
  latencyMs?: number
  endpoint?: string
  tokenUsage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

const LLM_LOG_KEY = 'autofiller_llm_logs'
const MAX_LLM_LOGS = 100

export async function saveLLMLog(entry: Omit<LLMLogEntry, 'timestamp'>): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    console.log(`[AutoFiller LLM] ${entry.type}:`, entry)
    return
  }

  try {
    const result = await chrome.storage.local.get(LLM_LOG_KEY)
    const logs: LLMLogEntry[] = result[LLM_LOG_KEY] || []

    logs.unshift({
      timestamp: Date.now(),
      ...entry,
    })

    if (logs.length > MAX_LLM_LOGS) {
      logs.length = MAX_LLM_LOGS
    }

    await chrome.storage.local.set({ [LLM_LOG_KEY]: logs })
  } catch (e) {
    console.error('[AutoFiller] Failed to save LLM log:', e)
  }
}

export async function getLLMLogs(): Promise<LLMLogEntry[]> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return []
  }

  try {
    const result = await chrome.storage.local.get(LLM_LOG_KEY)
    return result[LLM_LOG_KEY] || []
  } catch {
    return []
  }
}

export async function clearLLMLogs(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return
  }

  try {
    await chrome.storage.local.remove(LLM_LOG_KEY)
  } catch (e) {
    console.error('[AutoFiller] Failed to clear LLM logs:', e)
  }
}

export function logLLMRequest(provider: string, model: string, prompt: string): void {
  console.group(`${LOG_PREFIX} 🤖 LLM Request`)
  console.log(`Provider: ${provider}, Model: ${model}`)
  console.log(`Prompt: ${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}`)
  console.groupEnd()
}

export function logLLMResponse(provider: string, model: string, response: string, latencyMs: number): void {
  console.group(`${LOG_PREFIX} 🤖 LLM Response (${latencyMs.toFixed(0)}ms)`)
  console.log(`Provider: ${provider}, Model: ${model}`)
  console.log(`Response: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`)
  console.groupEnd()
}

export function logLLMError(provider: string, model: string, error: string): void {
  console.group(`${LOG_PREFIX} ❌ LLM Error`)
  console.log(`Provider: ${provider}, Model: ${model}`)
  console.log(`Error: ${error}`)
  console.groupEnd()
}
