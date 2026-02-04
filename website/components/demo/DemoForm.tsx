'use client'

import React, { useRef, useCallback, useState } from 'react'
import { useDemoContext } from './DemoContext'
import { DemoField } from './DemoField'
import { DemoWidget } from './DemoWidget'
import { showDemoToast } from './DemoToast'
import { DemoFieldDef, BadgeType, Taxonomy, FillStats, PendingObservation } from '@/lib/demo/types'
import { classifyField, getRelatedTypes } from '@/lib/demo/classifier'
import { transformValue } from '@/lib/demo/transformer'

export function DemoForm() {
  const {
    currentTemplate,
    answers,
    pendingObservations,
    addPendingObservation,
    commitPendingObservations,
    clearPendingObservations,
    setFillHistory,
    setLastFillStats,
    addActivityLog,
  } = useDemoContext()

  const [fieldBadges, setFieldBadges] = useState<Record<string, BadgeType>>({})
  const [filling, setFilling] = useState(false)
  const [fillProgress, setFillProgress] = useState<{ current: number; total: number; label?: string } | null>(null)

  const fieldRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map())
  const fieldDefs = useRef<Map<string, DemoFieldDef>>(new Map())

  const registerFieldRef = useCallback((name: string, el: HTMLInputElement | HTMLSelectElement | null) => {
    if (el) {
      fieldRefs.current.set(name, el)
    } else {
      fieldRefs.current.delete(name)
    }
  }, [])

  const registerFieldDef = useCallback((def: DemoFieldDef) => {
    fieldDefs.current.set(def.name, def)
  }, [])

  const handleFieldBlur = useCallback((fieldName: string, value: string) => {
    if (!value) return

    const fieldDef = fieldDefs.current.get(fieldName)
    const classification = classifyField(fieldName, fieldDef?.label || '', fieldDef)

    if (classification.type === Taxonomy.UNKNOWN) return

    const obs: PendingObservation = {
      id: Date.now().toString(),
      fieldName,
      type: classification.type,
      value,
      timestamp: Date.now(),
    }

    addPendingObservation(obs)
    setFieldBadges(prev => ({ ...prev, [fieldName]: 'pending' }))
  }, [addPendingObservation])

  const handleSave = useCallback(() => {
    if (pendingObservations.length === 0) {
      showDemoToast('No pending changes to save', 'info')
      return
    }

    commitPendingObservations()
    setFieldBadges({})
    showDemoToast(`Saved ${pendingObservations.length} answers`, 'success')
  }, [pendingObservations, commitPendingObservations])

  const handleFill = useCallback(async () => {
    if (Object.keys(answers).length === 0) {
      showDemoToast('No saved answers. Load a profile first.', 'warning')
      return
    }

    setFilling(true)
    setFieldBadges({})

    const startTime = performance.now()
    const fillHistory: Array<{ fieldName: string; previousValue: string; newValue: string }> = []
    const newBadges: Record<string, BadgeType> = {}

    const elements = Array.from(fieldRefs.current.entries())
    let filledCount = 0
    let transformedCount = 0

    setFillProgress({ current: 0, total: elements.length })

    for (let i = 0; i < elements.length; i++) {
      const [fieldName, element] = elements[i]
      const fieldDef = fieldDefs.current.get(fieldName)

      setFillProgress({ current: i + 1, total: elements.length, label: fieldDef?.label || fieldName })

      const classification = classifyField(fieldName, fieldDef?.label || '', fieldDef)
      if (classification.type === Taxonomy.UNKNOWN) continue

      // Find matching answer
      let answer = answers[classification.type]
      let sourceType: Taxonomy = classification.type

      if (!answer) {
        const relatedTypes = getRelatedTypes(classification.type)
        for (const relatedType of relatedTypes) {
          if (answers[relatedType]) {
            answer = answers[relatedType]
            sourceType = relatedType as Taxonomy
            break
          }
        }
      }

      if (!answer) continue

      // Transform value if needed
      const transformResult = transformValue(
        answer.value,
        sourceType,
        fieldDef || { name: fieldName, label: '', type: element.type as DemoFieldDef['type'], taxonomy: classification.type },
        answers
      )

      const previousValue = element.value || ''

      // Fill the field
      const success = fillElement(element, transformResult.value)

      if (success) {
        filledCount++
        if (transformResult.transformed) {
          transformedCount++
          newBadges[fieldName] = 'transformed'
        } else {
          newBadges[fieldName] = 'filled'
        }

        fillHistory.push({
          fieldName,
          previousValue,
          newValue: transformResult.value,
        })
      }

      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    const elapsed = Math.round(performance.now() - startTime)

    const stats: FillStats = {
      scanned: elements.length,
      filled: filledCount,
      transformed: transformedCount,
      timeMs: elapsed,
    }

    setLastFillStats(stats)
    setFillHistory(fillHistory)
    setFieldBadges(newBadges)
    setFilling(false)
    setFillProgress(null)

    addActivityLog({
      type: 'fill',
      data: {
        filled: filledCount.toString(),
        transformed: transformedCount.toString(),
        time: `${elapsed}ms`,
      },
    })

    showDemoToast(
      `Filled ${filledCount} fields (${transformedCount} transformed)`,
      'success',
      () => handleUndo(fillHistory)
    )
  }, [answers, setLastFillStats, setFillHistory, addActivityLog])

  const handleUndo = useCallback((history: Array<{ fieldName: string; previousValue: string }>) => {
    for (const { fieldName, previousValue } of history) {
      const element = fieldRefs.current.get(fieldName)
      if (element) {
        if (element.type === 'checkbox') {
          (element as HTMLInputElement).checked = previousValue === 'true' || previousValue === 'yes'
        } else {
          element.value = previousValue
        }
        element.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
    setFieldBadges({})
    showDemoToast(`Undone ${history.length} fields`, 'info')
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    handleSave()
  }, [handleSave])

  const handleClearForm = useCallback(() => {
    for (const element of Array.from(fieldRefs.current.values())) {
      if (element.type === 'checkbox' || element.type === 'radio') {
        (element as HTMLInputElement).checked = false
      } else {
        element.value = ''
      }
    }
    clearPendingObservations()
    setFieldBadges({})
  }, [clearPendingObservations])

  if (!currentTemplate) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Select a form template to begin
      </div>
    )
  }

  const allFields = currentTemplate.sections
    ? currentTemplate.sections.flatMap(s => s.fields)
    : currentTemplate.fields || []

  return (
    <div className="max-w-2xl mx-auto">
      {/* Pending notice */}
      {pendingObservations.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Pending:</strong> {pendingObservations.length} field{pendingObservations.length > 1 ? 's' : ''} detected.
          Click <strong>Submit</strong> to save permanently.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{currentTemplate.title}</h2>
            <p className="text-sm text-gray-500">{currentTemplate.subtitle}</p>
          </div>
          <div className="text-sm text-gray-400">{allFields.length} fields</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {currentTemplate.sections ? (
            currentTemplate.sections.map(section => (
              <fieldset key={section.title} className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-600 px-2">{section.title}</legend>
                <div className="space-y-4 mt-2">
                  {section.fields.map(field => {
                    registerFieldDef(field)
                    return (
                      <DemoField
                        key={field.name}
                        field={field}
                        badge={fieldBadges[field.name]}
                        onBlur={value => handleFieldBlur(field.name, value)}
                        inputRef={el => registerFieldRef(field.name, el)}
                      />
                    )
                  })}
                </div>
              </fieldset>
            ))
          ) : (
            <div className="space-y-4">
              {currentTemplate.fields?.map(field => {
                registerFieldDef(field)
                return (
                  <DemoField
                    key={field.name}
                    field={field}
                    badge={fieldBadges[field.name]}
                    onBlur={value => handleFieldBlur(field.name, value)}
                    inputRef={el => registerFieldRef(field.name, el)}
                  />
                )
              })}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between">
            <button
              type="button"
              onClick={handleClearForm}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Clear Form
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Submit (Save Answers)
            </button>
          </div>
        </form>
      </div>

      <DemoWidget
        onSave={handleSave}
        onFill={handleFill}
        filling={filling}
        fillProgress={fillProgress || undefined}
      />
    </div>
  )
}

function fillElement(element: HTMLInputElement | HTMLSelectElement, value: string): boolean {
  try {
    if (element.tagName === 'SELECT') {
      const selectEl = element as HTMLSelectElement
      for (const opt of Array.from(selectEl.options)) {
        if (
          opt.value.toLowerCase() === value.toLowerCase() ||
          opt.textContent?.toLowerCase().includes(value.toLowerCase())
        ) {
          selectEl.value = opt.value
          selectEl.dispatchEvent(new Event('change', { bubbles: true }))
          return true
        }
      }
      return false
    }

    if (element.type === 'radio') {
      const form = element.form || element.closest('form')
      if (!form) return false
      const radios = form.querySelectorAll<HTMLInputElement>(`input[name="${element.name}"]`)
      for (const radio of Array.from(radios)) {
        const radioLabel = radio.closest('label')?.textContent?.toLowerCase() || radio.value.toLowerCase()
        if (radioLabel.includes(value.toLowerCase()) || value.toLowerCase().includes(radioLabel)) {
          radio.checked = true
          radio.dispatchEvent(new Event('change', { bubbles: true }))
          return true
        }
      }
      return false
    }

    if (element.type === 'checkbox') {
      const inputEl = element as HTMLInputElement
      const shouldCheck = ['yes', 'true', '1'].includes(value.toLowerCase())
      if (inputEl.checked !== shouldCheck) {
        inputEl.click()
      }
      return true
    }

    const inputEl = element as HTMLInputElement
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    if (nativeSetter) {
      nativeSetter.call(inputEl, value)
    } else {
      inputEl.value = value
    }
    inputEl.dispatchEvent(new Event('input', { bubbles: true }))
    inputEl.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  } catch {
    return false
  }
}
