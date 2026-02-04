'use client'

import React from 'react'
import { Save, Sparkles, Loader2 } from 'lucide-react'

interface DemoWidgetProps {
  onSave?: () => void
  onFill?: () => void
  filling?: boolean
  fillProgress?: {
    current: number
    total: number
    label?: string
  }
}

export function DemoWidget({ onSave, onFill, filling = false, fillProgress }: DemoWidgetProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {filling && fillProgress ? (
          <div className="px-4 py-3 min-w-[200px]">
            <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Filling {fillProgress.current}/{fillProgress.total}</span>
            </div>
            {fillProgress.label && (
              <p className="text-xs text-gray-500 truncate">{fillProgress.label}</p>
            )}
            <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${(fillProgress.current / fillProgress.total) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center">
            {onSave && (
              <button
                onClick={onSave}
                className="px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-r border-gray-100"
              >
                <Save className="w-4 h-4 text-amber-500" />
                Save Now
              </button>
            )}
            {onFill && (
              <button
                onClick={onFill}
                className="px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Fill
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
