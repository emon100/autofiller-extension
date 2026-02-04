'use client'

import React, { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Sparkles, Check, ArrowRight, Zap } from 'lucide-react'
import { US_PROFILE } from '@/lib/demo/profiles'
import { MINI_DEMO_TEMPLATE } from '@/lib/demo/templates'
import { transformValue } from '@/lib/demo/transformer'
import { BadgeType, DemoFieldDef, Taxonomy } from '@/lib/demo/types'
import { DemoBadge } from '../demo/DemoBadge'

const FIXED_ANSWERS = US_PROFILE.answers

export default function MiniDemo() {
  const [fieldBadges, setFieldBadges] = useState<Record<string, BadgeType>>({})
  const [filling, setFilling] = useState(false)
  const [filled, setFilled] = useState(false)
  const fieldRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const handleFill = useCallback(async () => {
    if (filling) return

    setFilling(true)
    setFieldBadges({})

    const fields = MINI_DEMO_TEMPLATE.fields || []
    const newBadges: Record<string, BadgeType> = {}

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]
      const element = fieldRefs.current.get(field.name)
      if (!element) continue

      const answer = FIXED_ANSWERS[field.taxonomy]
      if (!answer) continue

      const transformResult = transformValue(answer.value, field.taxonomy, field, FIXED_ANSWERS)

      // Animate fill with slight delay
      await new Promise(resolve => setTimeout(resolve, 100))

      fillElement(element, transformResult.value)
      newBadges[field.name] = transformResult.transformed ? 'transformed' : 'filled'
      setFieldBadges({ ...newBadges })

      await new Promise(resolve => setTimeout(resolve, 80))
    }

    setFilling(false)
    setFilled(true)
  }, [filling])

  const handleReset = useCallback(() => {
    for (const element of Array.from(fieldRefs.current.values())) {
      if (element.type === 'checkbox' || element.type === 'radio') {
        element.checked = false
      } else {
        element.value = ''
      }
    }
    setFieldBadges({})
    setFilled(false)
  }, [])

  const fields = MINI_DEMO_TEMPLATE.fields || []

  return (
    <div className="relative">
      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-md mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="font-semibold">Job Application</span>
          </div>
          <p className="text-blue-100 text-sm mt-1">See AutoFiller in action</p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {fields.map(field => (
            <MiniDemoField
              key={field.name}
              field={field}
              badge={fieldBadges[field.name]}
              inputRef={el => {
                if (el) fieldRefs.current.set(field.name, el)
              }}
            />
          ))}
        </div>

        {/* Action Button */}
        <div className="px-6 pb-6">
          {!filled ? (
            <button
              onClick={handleFill}
              disabled={filling}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-70"
            >
              {filling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Filling...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Try AutoFill
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-green-600 py-2">
                <Check className="w-5 h-5" />
                <span className="font-medium">5 fields filled in 0.5 seconds!</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Reset
                </button>
                <Link
                  href="/demo"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1"
                >
                  Full Demo
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Using sample US profile data
      </div>
    </div>
  )
}

interface MiniDemoFieldProps {
  field: DemoFieldDef
  badge?: BadgeType | null
  inputRef: (el: HTMLInputElement | null) => void
}

function MiniDemoField({ field, badge, inputRef }: MiniDemoFieldProps) {
  if (field.type === 'radio') {
    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {field.label}
        </label>
        <div className="flex gap-4">
          {field.options?.map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                ref={inputRef}
                type="radio"
                name={field.name}
                value={opt.toLowerCase()}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
        {badge && (
          <div className="absolute right-0 top-0">
            <DemoBadge type={badge} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type={field.type}
          name={field.name}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        {badge && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-2">
            <DemoBadge type={badge} />
          </div>
        )}
      </div>
    </div>
  )
}

function fillElement(element: HTMLInputElement, value: string): boolean {
  try {
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

    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    if (nativeSetter) {
      nativeSetter.call(element, value)
    } else {
      element.value = value
    }
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  } catch {
    return false
  }
}
