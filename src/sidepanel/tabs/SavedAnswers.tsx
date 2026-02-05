import { useState, useEffect } from 'react'
import { ChevronDown, User, GraduationCap, AlertTriangle, Search, Pencil, Trash2, X, Check, Briefcase, AlertCircle, CheckCircle2, Copy } from 'lucide-react'
import { getTypeLabel } from '@/utils/typeLabels'
import { t } from '@/i18n'
import type { AnswerValue, Taxonomy, ExperienceEntry, ExperienceGroupType } from '@/types'

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
    taxonomies: ['FULL_NAME', 'FIRST_NAME', 'LAST_NAME', 'EMAIL', 'PHONE', 'COUNTRY_CODE', 'LINKEDIN', 'GITHUB', 'PORTFOLIO', 'SUMMARY', 'SKILLS', 'LOCATION', 'CITY'] as Taxonomy[],
  },
  {
    name: 'Education',
    icon: GraduationCap,
    iconColor: 'text-green-500',
    taxonomies: ['SCHOOL', 'DEGREE', 'MAJOR', 'GPA', 'GRAD_DATE', 'GRAD_YEAR', 'GRAD_MONTH'] as Taxonomy[],
  },
  {
    name: 'Sensitive',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    taxonomies: ['EEO_GENDER', 'EEO_ETHNICITY', 'EEO_VETERAN', 'EEO_DISABILITY', 'GOV_ID', 'WORK_AUTH', 'NEED_SPONSORSHIP', 'SALARY'] as Taxonomy[],
    isSensitive: true,
  },
]

const CORE_FIELDS = ['FULL_NAME', 'EMAIL', 'PHONE', 'CITY', 'SCHOOL', 'DEGREE'] as Taxonomy[]

function ProfileCompleteness({ answers }: { answers: AnswerValue[] }) {
  const filledTypes = new Set(answers.map(a => a.type))
  const missing = CORE_FIELDS.filter(f => !filledTypes.has(f))
  const filled = CORE_FIELDS.length - missing.length
  const percentage = Math.round((filled / CORE_FIELDS.length) * 100)

  // Detect duplicates: types with more than one answer
  const typeCounts = new Map<string, number>()
  for (const a of answers) {
    typeCounts.set(a.type, (typeCounts.get(a.type) || 0) + 1)
  }
  const duplicates = Array.from(typeCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([type, count]) => ({ type, count }))

  const isComplete = missing.length === 0
  const hasDuplicates = duplicates.length > 0

  if (isComplete && !hasDuplicates) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-3">
        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
        <p className="text-xs text-green-700 font-medium">{t('profile.complete')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 mb-3">
      {/* Completeness card */}
      {!isComplete && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs font-medium text-blue-800">{t('profile.completeness')}</span>
            </div>
            <span className="text-xs font-bold text-blue-700">{percentage}%</span>
          </div>
          <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-[11px] text-blue-600 mb-1">{t('profile.missing')}</p>
          <div className="flex flex-wrap gap-1">
            {missing.map(type => (
              <span key={type} className="text-[11px] px-1.5 py-0.5 bg-white/70 text-blue-700 rounded">
                {getTypeLabel(type)}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-blue-500 mt-1.5">{t('profile.addInfo')}</p>
        </div>
      )}

      {/* Duplicates warning */}
      {hasDuplicates && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Copy className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-800">{t('profile.duplicates')}</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {duplicates.map(d => (
              <span key={d.type} className="text-[11px] px-1.5 py-0.5 bg-white/70 text-amber-700 rounded">
                {getTypeLabel(d.type)} ({t('profile.values', { count: d.count })})
              </span>
            ))}
          </div>
          <p className="text-[11px] text-amber-600">{t('profile.duplicatesHint')}</p>
        </div>
      )}
    </div>
  )
}

export default function SavedAnswers() {
  const [answers, setAnswers] = useState<AnswerValue[]>([])
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Personal']))
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingAnswer, setEditingAnswer] = useState<AnswerValue | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [answersResult, experiencesResult] = await Promise.all([
        chrome.storage.local.get('answers'),
        chrome.storage.local.get('experiences'),
      ])
      setAnswers(Object.values(answersResult.answers || {}))
      setExperiences(Object.values(experiencesResult.experiences || {}))
    } catch {
      setAnswers([])
      setExperiences([])
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
      loadData()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this answer?')) return
    const result = await chrome.storage.local.get('answers')
    const storedAnswers = result.answers || {}
    delete storedAnswers[id]
    await chrome.storage.local.set({ answers: storedAnswers })
    loadData()
  }

  async function handleDeleteExperience(id: string) {
    if (!confirm('Delete this experience?')) return
    const result = await chrome.storage.local.get('experiences')
    const storedExperiences = result.experiences || {}
    delete storedExperiences[id]
    await chrome.storage.local.set({ experiences: storedExperiences })
    loadData()
  }

  async function handleSaveEdit(id: string, newValue: string) {
    const result = await chrome.storage.local.get('answers')
    const storedAnswers = result.answers || {}
    if (storedAnswers[id]) {
      storedAnswers[id].value = newValue
      storedAnswers[id].display = newValue
      storedAnswers[id].updatedAt = Date.now()
      await chrome.storage.local.set({ answers: storedAnswers })
      loadData()
    }
    setEditingAnswer(null)
  }

  function getExperiencesByType(type: ExperienceGroupType): ExperienceEntry[] {
    return experiences
      .filter(e => e.groupType === type)
      .sort((a, b) => a.priority - b.priority)
      .filter(e => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return Object.values(e.fields).some(v => v?.toLowerCase().includes(query))
      })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    )
  }

  const workExperiences = getExperiencesByType('WORK')
  const educationExperiences = getExperiencesByType('EDUCATION')
  const hasAnyData = answers.length > 0 || experiences.length > 0

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
      </div>

      <ProfileCompleteness answers={answers} />

      {!hasAnyData ? (
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
        <>
          {/* Work Experience Section */}
          {(workExperiences.length > 0 || searchQuery) && (
            <div className="border border-purple-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCategory('Work Experience')}
                className="w-full px-3 py-2 flex items-center justify-between bg-purple-50 hover:bg-purple-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">Work Experience</span>
                  <span className="text-xs text-gray-400">{workExperiences.length}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    !expandedCategories.has('Work Experience') ? '-rotate-90' : ''
                  }`}
                />
              </button>
              {expandedCategories.has('Work Experience') && (
                <div className="divide-y divide-purple-100">
                  {workExperiences.map((exp, index) => (
                    <ExperienceItem
                      key={exp.id}
                      experience={exp}
                      index={index}
                      onDelete={() => handleDeleteExperience(exp.id)}
                    />
                  ))}
                  {workExperiences.length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-gray-400">
                      No work experiences
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Education Experience Section */}
          {(educationExperiences.length > 0 || searchQuery) && (
            <div className="border border-green-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCategory('Education Experience')}
                className="w-full px-3 py-2 flex items-center justify-between bg-green-50 hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700">Education Experience</span>
                  <span className="text-xs text-gray-400">{educationExperiences.length}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    !expandedCategories.has('Education Experience') ? '-rotate-90' : ''
                  }`}
                />
              </button>
              {expandedCategories.has('Education Experience') && (
                <div className="divide-y divide-green-100">
                  {educationExperiences.map((exp, index) => (
                    <ExperienceItem
                      key={exp.id}
                      experience={exp}
                      index={index}
                      onDelete={() => handleDeleteExperience(exp.id)}
                    />
                  ))}
                  {educationExperiences.length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-gray-400">
                      No education experiences
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Answer Categories */}
          {CATEGORIES.map((category) => {
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
                        isEditing={editingAnswer?.id === answer.id}
                        onToggleAutofill={(allowed) => handleToggleAutofill(answer.id, allowed)}
                        onEdit={() => setEditingAnswer(answer)}
                        onDelete={() => handleDelete(answer.id)}
                        onSaveEdit={(newValue) => handleSaveEdit(answer.id, newValue)}
                        onCancelEdit={() => setEditingAnswer(null)}
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
          })}
        </>
      )}
    </div>
  )
}

interface AnswerItemProps {
  answer: AnswerValue
  isSensitive?: boolean
  isEditing: boolean
  onToggleAutofill: (allowed: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onSaveEdit: (newValue: string) => void
  onCancelEdit: () => void
}

function AnswerItem({ answer, isSensitive, isEditing, onToggleAutofill, onEdit, onDelete, onSaveEdit, onCancelEdit }: AnswerItemProps) {
  const [editValue, setEditValue] = useState(answer.value)

  useEffect(() => {
    setEditValue(answer.value)
  }, [answer.value, isEditing])

  if (isEditing) {
    return (
      <div className="px-3 py-2 bg-blue-50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit(editValue)
              if (e.key === 'Escape') onCancelEdit()
            }}
          />
          <button
            onClick={() => onSaveEdit(editValue)}
            className="p-1 text-green-600 hover:bg-green-100 rounded"
            title="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onCancelEdit}
            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <span className="text-xs text-gray-400 mt-1 block">{getTypeLabel(answer.type)}</span>
      </div>
    )
  }

  return (
    <div className="px-3 py-2 hover:bg-gray-50 flex items-center justify-between group">
      <div className="min-w-0 flex-1">
        <span className="text-xs text-gray-400">{getTypeLabel(answer.type)}</span>
        <p className="text-sm text-gray-800 truncate">{answer.value}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isSensitive && (
          <label className="flex items-center gap-1 cursor-pointer mr-2">
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
        )}
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-all"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

interface ExperienceItemProps {
  experience: ExperienceEntry
  index: number
  onDelete: () => void
}

function ExperienceItem({ experience, index, onDelete }: ExperienceItemProps) {
  const isWork = experience.groupType === 'WORK'
  const title = isWork
    ? experience.fields.JOB_TITLE || 'Untitled Position'
    : experience.fields.SCHOOL || 'Untitled Education'
  const subtitle = isWork
    ? experience.fields.COMPANY_NAME || ''
    : [experience.fields.DEGREE, experience.fields.MAJOR].filter(Boolean).join(' in ')

  const dateRange = [
    experience.startDate,
    experience.endDate === 'present' ? 'Present' : experience.endDate,
  ]
    .filter(Boolean)
    .join(' - ')

  return (
    <div className="px-3 py-2 hover:bg-gray-50 group">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              #{index + 1}
            </span>
            <p className="text-sm font-medium text-gray-800 truncate">{title}</p>
          </div>
          {subtitle && (
            <p className="text-xs text-gray-600 mt-0.5 truncate">{subtitle}</p>
          )}
          {dateRange && (
            <p className="text-xs text-gray-400 mt-0.5">{dateRange}</p>
          )}
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all flex-shrink-0"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
