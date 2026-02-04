'use client'

import React, { useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { DemoFieldDef, BadgeType } from '@/lib/demo/types'
import { DemoBadge } from './DemoBadge'

interface DemoFieldProps {
  field: DemoFieldDef
  badge?: BadgeType | null
  onBlur?: (value: string) => void
  onChange?: (value: string) => void
  inputRef?: (el: HTMLInputElement | HTMLSelectElement | null) => void
}

export function DemoField({ field, badge, onBlur, onChange, inputRef }: DemoFieldProps) {
  const localRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  const handleRef = (el: HTMLInputElement | HTMLSelectElement | null) => {
    localRef.current = el
    inputRef?.(el)
  }

  const handleClear = () => {
    if (localRef.current) {
      if (localRef.current.type === 'checkbox' || localRef.current.type === 'radio') {
        (localRef.current as HTMLInputElement).checked = false
      } else {
        localRef.current.value = ''
      }
      localRef.current.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  const commonInputClass = `
    w-full px-3 py-2 border border-gray-300 rounded-lg
    focus:ring-2 focus:ring-blue-500 focus:border-transparent
    transition-colors text-sm
  `

  const renderInput = () => {
    switch (field.type) {
      case 'select':
        return (
          <select
            ref={handleRef as React.Ref<HTMLSelectElement>}
            name={field.name}
            className={commonInputClass}
            onBlur={e => onBlur?.(e.target.value)}
            onChange={e => onChange?.(e.target.value)}
          >
            {field.options?.map(opt => (
              <option key={opt} value={opt.toLowerCase()}>
                {opt || 'Select...'}
              </option>
            ))}
          </select>
        )

      case 'radio':
        return (
          <div className="space-y-1.5">
            {field.options?.map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  ref={handleRef as React.Ref<HTMLInputElement>}
                  type="radio"
                  name={field.name}
                  value={opt.toLowerCase()}
                  className="text-blue-600 focus:ring-blue-500"
                  onChange={e => {
                    onBlur?.(e.target.value)
                    onChange?.(e.target.value)
                  }}
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        )

      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              ref={handleRef as React.Ref<HTMLInputElement>}
              type="checkbox"
              name={field.name}
              className="rounded text-blue-600 focus:ring-blue-500"
              onChange={e => {
                const val = e.target.checked ? 'yes' : 'no'
                onBlur?.(val)
                onChange?.(val)
              }}
            />
            <span className="text-sm">{field.label}</span>
          </label>
        )

      default:
        return (
          <input
            ref={handleRef as React.Ref<HTMLInputElement>}
            type={field.type}
            name={field.name}
            placeholder={field.placeholder}
            maxLength={field.maxlength ? parseInt(field.maxlength) : undefined}
            required={field.required}
            className={`${commonInputClass} pr-8`}
            onBlur={e => onBlur?.(e.target.value)}
            onChange={e => onChange?.(e.target.value)}
          />
        )
    }
  }

  // Checkbox has label integrated
  if (field.type === 'checkbox') {
    return (
      <div className="relative group">
        {renderInput()}
        {badge && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-2">
            <DemoBadge type={badge} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative group">
        {renderInput()}

        {/* Clear button - shown on hover */}
        {field.type !== 'radio' && (
          <button
            type="button"
            onClick={handleClear}
            className="
              absolute right-2 top-1/2 -translate-y-1/2
              w-5 h-5 rounded-full bg-gray-200 hover:bg-red-200
              text-gray-500 hover:text-red-600
              flex items-center justify-center
              opacity-0 group-hover:opacity-100 transition-opacity
              z-10
            "
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Badge */}
        {badge && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-2">
            <DemoBadge type={badge} />
          </div>
        )}
      </div>
    </div>
  )
}
