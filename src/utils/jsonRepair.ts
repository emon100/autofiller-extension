/**
 * JSON Repair Utility
 *
 * Provides robust JSON parsing for LLM responses which may:
 * - Have incomplete/truncated JSON
 * - Include markdown code fences
 * - Use single quotes instead of double quotes
 * - Have trailing commas
 * - Include explanatory text around JSON
 */

import { loads, repairJson } from 'json-repair-js'

export interface JSONRepairResult<T = unknown> {
  success: boolean
  data: T | null
  original: string
  repaired?: string
  error?: string
  wasRepaired: boolean
}

/**
 * Parse JSON with automatic repair for malformed LLM responses
 *
 * @param text - Raw text from LLM response
 * @param fallback - Default value if parsing fails
 * @returns Parsed object or fallback
 */
export function parseJSONSafe<T = Record<string, unknown>>(
  text: string,
  fallback: T = {} as T
): T {
  if (!text || typeof text !== 'string') {
    return fallback
  }

  // First, try standard JSON parse
  try {
    return JSON.parse(text) as T
  } catch {
    // Continue to repair
  }

  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T
    } catch {
      // Continue to repair
    }
  }

  // Try to find JSON object or array in the text
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]) as T
    } catch {
      // Continue to repair
    }
  }

  // Use json-repair-js for malformed JSON
  try {
    const result = loads(text)
    if (result !== undefined && result !== null) {
      return result as T
    }
  } catch {
    // Continue to advanced repair
  }

  // Try advanced repair with options
  try {
    const repaired = repairJson(text, {
      returnObjects: true,
      ensureAscii: false,
    })
    if (repaired !== undefined && repaired !== null) {
      return repaired as T
    }
  } catch {
    // Repair failed
  }

  console.warn('[JSONRepair] Failed to parse/repair JSON:', text.substring(0, 200))
  return fallback
}

/**
 * Parse JSON with detailed result including repair information
 *
 * @param text - Raw text from LLM response
 * @returns Detailed result object
 */
export function parseJSONWithDetails<T = Record<string, unknown>>(
  text: string
): JSONRepairResult<T> {
  if (!text || typeof text !== 'string') {
    return {
      success: false,
      data: null,
      original: text,
      error: 'Input is empty or not a string',
      wasRepaired: false,
    }
  }

  // First, try standard JSON parse
  try {
    const data = JSON.parse(text) as T
    return {
      success: true,
      data,
      original: text,
      wasRepaired: false,
    }
  } catch {
    // Continue to repair
  }

  // Extract JSON from code blocks if present
  let processedText = text
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    processedText = codeBlockMatch[1].trim()
    try {
      const data = JSON.parse(processedText) as T
      return {
        success: true,
        data,
        original: text,
        repaired: processedText,
        wasRepaired: true,
      }
    } catch {
      // Continue
    }
  }

  // Try to find JSON object/array
  const jsonMatch = processedText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (jsonMatch) {
    processedText = jsonMatch[1]
    try {
      const data = JSON.parse(processedText) as T
      return {
        success: true,
        data,
        original: text,
        repaired: processedText,
        wasRepaired: true,
      }
    } catch {
      // Continue to repair
    }
  }

  // Use json-repair-js
  try {
    const repairedString = repairJson(processedText, {
      returnObjects: false,
      ensureAscii: false,
      logging: false,
    })

    if (typeof repairedString === 'string') {
      const data = JSON.parse(repairedString) as T
      return {
        success: true,
        data,
        original: text,
        repaired: repairedString,
        wasRepaired: repairedString !== text,
      }
    }
  } catch (e) {
    // Last resort: try loads directly
    try {
      const data = loads(text) as T
      if (data !== undefined && data !== null) {
        return {
          success: true,
          data,
          original: text,
          wasRepaired: true,
        }
      }
    } catch {
      // All attempts failed
    }

    return {
      success: false,
      data: null,
      original: text,
      error: e instanceof Error ? e.message : 'Unknown error',
      wasRepaired: false,
    }
  }

  return {
    success: false,
    data: null,
    original: text,
    error: 'All parsing attempts failed',
    wasRepaired: false,
  }
}

/**
 * Extract multiple JSON objects from a text that may contain several
 *
 * @param text - Text potentially containing multiple JSON objects
 * @returns Array of parsed objects
 */
export function extractAllJSON<T = Record<string, unknown>>(text: string): T[] {
  const results: T[] = []

  // Try to find all JSON objects/arrays
  const regex = /(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\])/g
  let match

  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = parseJSONSafe<T>(match[1], undefined as unknown as T)
      if (parsed !== undefined) {
        results.push(parsed)
      }
    } catch {
      // Skip invalid matches
    }
  }

  return results
}

/**
 * Validate that parsed JSON matches an expected structure
 *
 * @param data - Parsed JSON data
 * @param requiredFields - Array of required field names
 * @returns Whether all required fields are present
 */
export function validateJSONStructure(
  data: unknown,
  requiredFields: string[]
): data is Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return false
  }

  for (const field of requiredFields) {
    if (!(field in data)) {
      return false
    }
  }

  return true
}
