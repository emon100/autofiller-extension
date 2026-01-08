import { Trash2, Shield, ShieldOff } from 'lucide-react'
import type { AnswerValue } from '@/types'

interface AnswerCardProps {
  answer: AnswerValue
  onDelete: () => void
  onToggleAutofill: (allowed: boolean) => void
}

export default function AnswerCard({ answer, onDelete, onToggleAutofill }: AnswerCardProps) {
  const isSensitive = answer.sensitivity === 'sensitive'
  
  function formatType(type: string): string {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  function truncateValue(value: string, maxLength = 30): string {
    if (value.length <= maxLength) return value
    return value.slice(0, maxLength) + '...'
  }

  return (
    <div className="px-4 py-3 hover:bg-gray-50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
              {formatType(answer.type)}
            </span>
            {isSensitive && (
              <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                Sensitive
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-900 font-medium">
            {answer.display || truncateValue(answer.value)}
          </p>
          {answer.display && answer.display !== answer.value && (
            <p className="text-xs text-gray-500 mt-0.5">
              {truncateValue(answer.value)}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {isSensitive && (
            <button
              onClick={() => onToggleAutofill(!answer.autofillAllowed)}
              className={`p-1.5 rounded hover:bg-gray-100 ${
                answer.autofillAllowed ? 'text-green-600' : 'text-gray-400'
              }`}
              title={answer.autofillAllowed ? 'Autofill enabled' : 'Autofill disabled'}
            >
              {answer.autofillAllowed ? (
                <Shield className="w-4 h-4" />
              ) : (
                <ShieldOff className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
