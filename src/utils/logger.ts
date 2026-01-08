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
