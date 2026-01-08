import { useState, useEffect } from 'react'
import { ChevronDown, User, GraduationCap, AlertTriangle, Search, Plus, Pencil } from 'lucide-react'
import type { AnswerValue, Taxonomy } from '@/types'

interface CategoryConfig {
  name: string
  icon: typeof User
  iconColor: string
  taxonomies: Taxonomy[]
  isSensitive?: boolean
}

const CATEGORIES: CategoryConfig[] = [
  {
    name: 'Personal',
    icon: User,
    iconColor: 'text-blue-500',
    taxonomies: ['FULL_NAME', 'FIRST_NAME', 'LAST_NAME', 'EMAIL', 'PHONE', 'COUNTRY_CODE', 'LINKEDIN', 'GITHUB', 'PORTFOLIO'] as Taxonomy[],
  },
  {
    name: 'Education',
    icon: GraduationCap,
    iconColor: 'text-green-500',
    taxonomies: ['SCHOOL', 'DEGREE', 'MAJOR', 'GRAD_DATE', 'GRAD_YEAR', 'GRAD_MONTH'] as Taxonomy[],
  },
  {
    name: 'Sensitive',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    taxonomies: ['EEO_GENDER', 'EEO_ETHNICITY', 'EEO_VETERAN', 'EEO_DISABILITY', 'GOV_ID', 'WORK_AUTH', 'NEED_SPONSORSHIP', 'SALARY'] as Taxonomy[],
    isSensitive: true,
  },
]

export default function SavedAnswers() {
  const [answers, setAnswers] = useState<AnswerValue[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Personal']))
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnswers()
  }, [])

  async function loadAnswers() {
    try {
      const result = await chrome.storage.local.get('answers')
      const storedAnswers = result.answers || {}
      setAnswers(Object.values(storedAnswers))
    } catch {
      setAnswers([])
    } finally {
      setLoading(false)
    }
  }

  function toggleCategory(categoryName: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryName)) {
        next.delete(categoryName)
      } else {
        next.add(categoryName)
      }
      return next
    })
  }

  function getAnswersForCategory(taxonomies: Taxonomy[]): AnswerValue[] {
    return answers
      .filter(a => taxonomies.includes(a.type))
      .filter(a => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
          a.type.toLowerCase().includes(query) ||
          a.value.toLowerCase().includes(query)
        )
      })
  }

  async function handleToggleAutofill(id: string, allowed: boolean) {
    const result = await chrome.storage.local.get('answers')
    const storedAnswers = result.answers || {}
    if (storedAnswers[id]) {
      storedAnswers[id].autofillAllowed = allowed
      storedAnswers[id].updatedAt = Date.now()
      await chrome.storage.local.set({ answers: storedAnswers })
      loadAnswers()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Add">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {answers.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <User className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900">No saved answers</h3>
          <p className="mt-1 text-xs text-gray-500">
            Fill out forms to save your answers automatically.
          </p>
        </div>
      ) : (
        CATEGORIES.map((category) => {
          const categoryAnswers = getAnswersForCategory(category.taxonomies)
          if (categoryAnswers.length === 0 && !searchQuery) return null

          const isExpanded = expandedCategories.has(category.name)
          const Icon = category.icon

          return (
            <div
              key={category.name}
              className={`border rounded-xl overflow-hidden ${
                category.isSensitive
                  ? 'border-amber-200 bg-amber-50/30'
                  : 'border-gray-200'
              }`}
            >
              <button
                onClick={() => toggleCategory(category.name)}
                className={`w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors ${
                  category.isSensitive ? 'bg-amber-50 hover:bg-amber-100' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${category.iconColor}`} />
                  <span className="text-sm font-medium text-gray-700">{category.name}</span>
                  {category.isSensitive ? (
                    <span className="text-xs text-amber-600">no auto-fill</span>
                  ) : (
                    <span className="text-xs text-gray-400">{categoryAnswers.length}</span>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    !isExpanded ? '-rotate-90' : ''
                  }`}
                />
              </button>

              {isExpanded && categoryAnswers.length > 0 && (
                <div className={`divide-y ${category.isSensitive ? 'divide-amber-100' : 'divide-gray-100'}`}>
                  {categoryAnswers.map((answer) => (
                    <AnswerItem
                      key={answer.id}
                      answer={answer}
                      isSensitive={category.isSensitive}
                      onToggleAutofill={(allowed) => handleToggleAutofill(answer.id, allowed)}
                    />
                  ))}
                </div>
              )}

              {isExpanded && categoryAnswers.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-gray-400">
                  No items in this category
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

interface AnswerItemProps {
  answer: AnswerValue
  isSensitive?: boolean
  onToggleAutofill: (allowed: boolean) => void
}

function AnswerItem({ answer, isSensitive, onToggleAutofill }: AnswerItemProps) {
  return (
    <div className="px-3 py-2 hover:bg-gray-50 flex items-center justify-between group">
      <div className="min-w-0 flex-1">
        <span className="text-xs text-gray-400">{answer.type}</span>
        <p className="text-sm text-gray-800 truncate">{answer.value}</p>
      </div>
      {isSensitive ? (
        <label className="flex items-center gap-1 cursor-pointer flex-shrink-0">
          <span className="text-xs text-gray-400">Auto</span>
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={answer.autofillAllowed !== false}
              onChange={(e) => onToggleAutofill(e.target.checked)}
            />
            <div className="w-8 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-3 transition-transform"></div>
          </div>
        </label>
      ) : (
        <button className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-all flex-shrink-0">
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
