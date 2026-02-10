import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, User, GraduationCap, AlertTriangle, Search, Pencil, Trash2, X, Check, Briefcase, AlertCircle, CheckCircle2, Copy, ArrowRight, UserCircle, Plus, Upload } from 'lucide-react'
import ProfileImport from '../components/ProfileImport'
import { getTypeLabel } from '@/utils/typeLabels'
import { t } from '@/i18n'
import { profileStorage } from '@/storage'
import type { Profile } from '@/storage'
import type { AnswerValue, Taxonomy, ExperienceEntry, ExperienceGroupType } from '@/types'

// Color palette for duplicate groups
const DUPLICATE_COLORS = [
  { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', ring: 'ring-red-300' },
  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', ring: 'ring-orange-300' },
  { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', ring: 'ring-yellow-300' },
  { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700', ring: 'ring-lime-300' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', ring: 'ring-cyan-300' },
  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', ring: 'ring-violet-300' },
  { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', ring: 'ring-pink-300' },
]

// Detect overlapping date ranges within a list of experiences
function findOverlaps(experiences: ExperienceEntry[]): Map<string, string> {
  const overlaps = new Map<string, string>()

  function parseDate(d?: string): number | null {
    if (!d) return null
    if (d === 'present') return Date.now()
    const [y, m] = d.split('-').map(Number)
    return y && m ? new Date(y, m - 1).getTime() : null
  }

  for (let i = 0; i < experiences.length; i++) {
    const a = experiences[i]
    const aStart = parseDate(a.startDate)
    const aEnd = parseDate(a.endDate) ?? aStart
    if (aStart === null) continue

    for (let j = i + 1; j < experiences.length; j++) {
      const b = experiences[j]
      const bStart = parseDate(b.startDate)
      const bEnd = parseDate(b.endDate) ?? bStart
      if (bStart === null) continue

      // Overlap only if one truly starts before the other ends (adjacent dates are OK)
      if (aStart < bEnd! && bStart < aEnd!) {
        const isWork = a.groupType === 'WORK'
        const aName = isWork ? (a.fields.JOB_TITLE || a.fields.COMPANY_NAME || `#${i + 1}`) : (a.fields.SCHOOL || `#${i + 1}`)
        const bName = isWork ? (b.fields.JOB_TITLE || b.fields.COMPANY_NAME || `#${j + 1}`) : (b.fields.SCHOOL || `#${j + 1}`)
        if (!overlaps.has(a.id)) overlaps.set(a.id, bName)
        if (!overlaps.has(b.id)) overlaps.set(b.id, aName)
      }
    }
  }
  return overlaps
}

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

interface ProfileCompletenessProps {
  answers: AnswerValue[]
  onSelectAnswer?: (keepId: string, deleteIds: string[]) => Promise<void>
  onEditAnswer?: (id: string, newValue: string) => Promise<void>
}

function ProfileCompleteness({ answers, onSelectAnswer, onEditAnswer }: ProfileCompletenessProps) {
  const [expandedDuplicate, setExpandedDuplicate] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const filledTypes = new Set(answers.map(a => a.type))
  const missing = CORE_FIELDS.filter(f => !filledTypes.has(f))

  // Detect duplicates: types with more than one answer
  const duplicatesWithAnswers = useMemo(() => {
    const typeGroups = new Map<string, AnswerValue[]>()
    for (const a of answers) {
      const group = typeGroups.get(a.type) || []
      group.push(a)
      typeGroups.set(a.type, group)
    }
    return Array.from(typeGroups.entries())
      .filter(([, group]) => group.length > 1)
      .map(([type, group], index) => ({
        type,
        count: group.length,
        answers: group,
        colorIndex: index % DUPLICATE_COLORS.length,
      }))
  }, [answers])

  const isComplete = missing.length === 0
  const hasDuplicates = duplicatesWithAnswers.length > 0

  async function handleSelectAnswer(keepId: string, duplicateType: string) {
    if (!onSelectAnswer) return
    const duplicateInfo = duplicatesWithAnswers.find(d => d.type === duplicateType)
    if (!duplicateInfo) return
    const deleteIds = duplicateInfo.answers.filter(a => a.id !== keepId).map(a => a.id)
    await onSelectAnswer(keepId, deleteIds)
    setExpandedDuplicate(null)
  }

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
      {/* Completeness card - soft auto-learn message */}
      {!isComplete && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-xs font-medium text-blue-800">{t('profile.autoLearn')}</span>
          </div>
          <p className="text-[11px] text-blue-600 mt-1.5">{t('profile.autoLearnDesc')}</p>
        </div>
      )}

      {/* Duplicates warning with quick fix */}
      {hasDuplicates && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Copy className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-800">{t('profile.duplicates')}</span>
          </div>

          <div className="space-y-2">
            {duplicatesWithAnswers.map((d) => {
              const color = DUPLICATE_COLORS[d.colorIndex]
              const isExpanded = expandedDuplicate === d.type

              return (
                <div key={d.type} className={`rounded-lg border ${color.border} ${color.bg} overflow-hidden`}>
                  <button
                    onClick={() => setExpandedDuplicate(isExpanded ? null : d.type)}
                    className="w-full px-2.5 py-1.5 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-medium ${color.text}`}>
                        {getTypeLabel(d.type)}
                      </span>
                      <span className={`text-[10px] ${color.text} opacity-70`}>
                        ({t('profile.values', { count: d.count })})
                      </span>
                    </div>
                    <ArrowRight className={`w-3 h-3 ${color.text} transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 space-y-1.5">
                      <p className="text-[10px] text-gray-600 mb-1">{t('profile.selectOne')}</p>
                      {d.answers.map((answer) => (
                        <div key={answer.id}>
                          {editingId === answer.id ? (
                            <div className="flex items-center gap-1.5 p-2 bg-white rounded border border-blue-300">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="flex-1 min-w-0 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && onEditAnswer) {
                                    onEditAnswer(answer.id, editValue)
                                    setEditingId(null)
                                  }
                                  if (e.key === 'Escape') setEditingId(null)
                                }}
                              />
                              <button
                                onClick={() => {
                                  if (onEditAnswer) {
                                    onEditAnswer(answer.id, editValue)
                                    setEditingId(null)
                                  }
                                }}
                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:border-blue-300 cursor-pointer group"
                              onClick={() => handleSelectAnswer(answer.id, d.type)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-800 truncate">{answer.value}</p>
                              </div>
                              <button
                                className="text-[10px] px-1.5 py-0.5 text-gray-500 hover:text-blue-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingId(answer.id)
                                  setEditValue(answer.value)
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {t('profile.keep')}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-[11px] text-amber-600 mt-2">{t('profile.duplicatesHint')}</p>
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
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfileId, setActiveProfileId] = useState('default')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [creatingProfile, setCreatingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    loadProfiles()
  }, [])

  useEffect(() => {
    loadData()
  }, [activeProfileId])

  async function loadProfiles() {
    try {
      await profileStorage.migrateIfNeeded()
      const allProfiles = await profileStorage.getAll()
      setProfiles(allProfiles)
      const active = await profileStorage.getActiveId()
      setActiveProfileId(active)
    } catch {
      setProfiles([])
    }
  }

  async function loadData() {
    try {
      const answersKey = profileStorage.getAnswersKey(activeProfileId)
      const experiencesKey = profileStorage.getExperiencesKey(activeProfileId)
      const [answersResult, experiencesResult] = await Promise.all([
        chrome.storage.local.get(answersKey),
        chrome.storage.local.get(experiencesKey),
      ])
      setAnswers(Object.values(answersResult[answersKey] || {}))
      setExperiences(Object.values(experiencesResult[experiencesKey] || {}))
    } catch {
      setAnswers([])
      setExperiences([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSwitchProfile(profileId: string) {
    if (profileId === activeProfileId) {
      setShowProfileMenu(false)
      return
    }
    await profileStorage.setActiveId(profileId)
    setActiveProfileId(profileId)
    setShowProfileMenu(false)
    setLoading(true)
  }

  async function handleCreateProfile() {
    const trimmedName = newProfileName.trim()
    if (!trimmedName) return
    // Prevent duplicate profile names (case-insensitive)
    if (profiles.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setProfileError(t('profile.duplicateName'))
      return
    }
    setProfileError('')
    const profile = await profileStorage.create(trimmedName)
    setProfiles(prev => [...prev, profile])
    setNewProfileName('')
    setCreatingProfile(false)
    await handleSwitchProfile(profile.id)
  }

  async function handleDeleteProfile(profileId: string) {
    if (profileId === 'default') return
    if (!confirm(t('profile.deleteConfirm'))) return
    await profileStorage.delete(profileId)
    setProfiles(prev => prev.filter(p => p.id !== profileId))
    if (activeProfileId === profileId) {
      await handleSwitchProfile('default')
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
      .sort((a, b) => {
        // Sort by type first so same-type fields are grouped together
        if (a.type !== b.type) return a.type.localeCompare(b.type)
        return b.updatedAt - a.updatedAt
      })
  }

  async function handleToggleAutofill(id: string, allowed: boolean) {
    const key = profileStorage.getAnswersKey(activeProfileId)
    const result = await chrome.storage.local.get(key)
    const storedAnswers = result[key] || {}
    if (storedAnswers[id]) {
      storedAnswers[id].autofillAllowed = allowed
      storedAnswers[id].updatedAt = Date.now()
      await chrome.storage.local.set({ [key]: storedAnswers })
      loadData()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this answer?')) return
    const key = profileStorage.getAnswersKey(activeProfileId)
    const result = await chrome.storage.local.get(key)
    const storedAnswers = result[key] || {}
    delete storedAnswers[id]
    await chrome.storage.local.set({ [key]: storedAnswers })
    loadData()
  }

  async function handleDeleteExperience(id: string) {
    if (!confirm('Delete this experience?')) return
    const key = profileStorage.getExperiencesKey(activeProfileId)
    const result = await chrome.storage.local.get(key)
    const storedExperiences = result[key] || {}
    delete storedExperiences[id]
    await chrome.storage.local.set({ [key]: storedExperiences })
    loadData()
  }

  async function handleSaveEdit(id: string, newValue: string) {
    const key = profileStorage.getAnswersKey(activeProfileId)
    const result = await chrome.storage.local.get(key)
    const storedAnswers = result[key] || {}
    if (storedAnswers[id]) {
      storedAnswers[id].value = newValue
      storedAnswers[id].display = newValue
      storedAnswers[id].updatedAt = Date.now()
      await chrome.storage.local.set({ [key]: storedAnswers })
      loadData()
    }
    setEditingAnswer(null)
  }

  async function handleSelectAnswer(_keepId: string, deleteIds: string[]) {
    const key = profileStorage.getAnswersKey(activeProfileId)
    const result = await chrome.storage.local.get(key)
    const storedAnswers = result[key] || {}
    for (const id of deleteIds) {
      delete storedAnswers[id]
    }
    await chrome.storage.local.set({ [key]: storedAnswers })
    loadData()
  }

  // Build duplicate color map for answers
  const duplicateColorMap = useMemo(() => {
    const typeGroups = new Map<string, AnswerValue[]>()
    for (const a of answers) {
      const group = typeGroups.get(a.type) || []
      group.push(a)
      typeGroups.set(a.type, group)
    }

    const colorMap = new Map<string, number>()
    let colorIndex = 0
    for (const [, group] of typeGroups) {
      if (group.length > 1) {
        for (const a of group) {
          colorMap.set(a.id, colorIndex % DUPLICATE_COLORS.length)
        }
        colorIndex++
      }
    }
    return colorMap
  }, [answers])

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

  const workExperiences = useMemo(() => getExperiencesByType('WORK'), [experiences, searchQuery])
  const educationExperiences = useMemo(() => getExperiencesByType('EDUCATION'), [experiences, searchQuery])
  const workOverlaps = useMemo(() => findOverlaps(workExperiences), [workExperiences])
  const eduOverlaps = useMemo(() => findOverlaps(educationExperiences), [educationExperiences])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    )
  }

  const hasAnyData = answers.length > 0 || experiences.length > 0

  return (
    <div className="space-y-2">
      {/* Import Section */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowImport(!showImport)}
          className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">{t('tabs.import')}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${!showImport ? '-rotate-90' : ''}`} />
        </button>
        {showImport && (
          <div className="p-3 border-t border-gray-200">
            <ProfileImport onImportComplete={() => loadData()} />
          </div>
        )}
      </div>

      {/* Profile Selector */}
      <div className="relative">
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">
              {profiles.find(p => p.id === activeProfileId)?.name || 'Default'}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
        </button>

        {showProfileMenu && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-blue-50 ${profile.id === activeProfileId ? 'bg-blue-50' : ''
                  }`}
                onClick={() => handleSwitchProfile(profile.id)}
              >
                <div className="flex items-center gap-2">
                  <UserCircle className={`w-4 h-4 ${profile.id === activeProfileId ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-sm ${profile.id === activeProfileId ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                    {profile.name}
                  </span>
                </div>
                {profile.id !== 'default' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id) }}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {creatingProfile ? (
              <div className="px-3 py-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => { setNewProfileName(e.target.value); setProfileError('') }}
                    placeholder={t('profile.newName')}
                    className={`flex-1 min-w-0 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${profileError ? 'border-red-400' : 'border-gray-300'}`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleCreateProfile()
                      if (e.key === 'Escape') { setCreatingProfile(false); setNewProfileName(''); setProfileError('') }
                    }}
                  />
                  <button onClick={handleCreateProfile} className="p-1 text-green-600 hover:bg-green-100 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setCreatingProfile(false); setNewProfileName(''); setProfileError('') }} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {profileError && (
                  <p className="text-xs text-red-500 mt-1 px-0.5">{profileError}</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setCreatingProfile(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100"
              >
                <Plus className="w-4 h-4" />
                {t('profile.createNew')}
              </button>
            )}
          </div>
        )}
      </div>



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

      <ProfileCompleteness
        answers={answers}
        onSelectAnswer={handleSelectAnswer}
        onEditAnswer={handleSaveEdit}
      />

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
                  className={`w-4 h-4 text-gray-400 transition-transform ${!expandedCategories.has('Work Experience') ? '-rotate-90' : ''
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
                      overlapWith={workOverlaps.get(exp.id)}
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
                  className={`w-4 h-4 text-gray-400 transition-transform ${!expandedCategories.has('Education Experience') ? '-rotate-90' : ''
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
                      overlapWith={eduOverlaps.get(exp.id)}
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
                className={`border rounded-xl overflow-hidden ${category.isSensitive
                  ? 'border-amber-200 bg-amber-50/30'
                  : 'border-gray-200'
                  }`}
              >
                <button
                  onClick={() => toggleCategory(category.name)}
                  className={`w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors ${category.isSensitive ? 'bg-amber-50 hover:bg-amber-100' : 'bg-gray-50'
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
                    className={`w-4 h-4 text-gray-400 transition-transform ${!isExpanded ? '-rotate-90' : ''
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
                        duplicateColorIndex={duplicateColorMap.get(answer.id)}
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
  duplicateColorIndex?: number
  onToggleAutofill: (allowed: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onSaveEdit: (newValue: string) => void
  onCancelEdit: () => void
}

function AnswerItem({ answer, isSensitive, isEditing, duplicateColorIndex, onToggleAutofill, onEdit, onDelete, onSaveEdit, onCancelEdit }: AnswerItemProps) {
  const [editValue, setEditValue] = useState(answer.value)
  const isDuplicate = duplicateColorIndex !== undefined
  const color = isDuplicate ? DUPLICATE_COLORS[duplicateColorIndex] : null

  useEffect(() => {
    setEditValue(answer.value)
  }, [answer.value, isEditing])

  if (isEditing) {
    return (
      <div className="px-3 py-2 bg-blue-50">
        <div className="flex items-start gap-2">
          <textarea
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden min-h-[38px]"
            autoFocus
            rows={1}
            ref={(el) => {
              if (el) {
                el.style.height = 'auto'
                el.style.height = el.scrollHeight + 'px'
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                onSaveEdit(editValue)
              }
              if (e.key === 'Escape') onCancelEdit()
            }}
          />
          <div className="flex flex-col gap-1">
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
        </div>
        <span className="text-xs text-gray-400 mt-1 block">{getTypeLabel(answer.type)}</span>
      </div>
    )
  }

  return (
    <div className={`px-3 py-2 hover:bg-gray-50 flex items-center justify-between group ${isDuplicate ? `${color!.bg} border-l-4 ${color!.border}` : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">{getTypeLabel(answer.type)}</span>
          {isDuplicate && (
            <span className={`text-[9px] px-1 py-0.5 rounded ${color!.bg} ${color!.text} border ${color!.border}`}>
              {t('profile.duplicate')}
            </span>
          )}
        </div>
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
  overlapWith?: string // name of conflicting experience
}

function ExperienceItem({ experience, index, onDelete, overlapWith }: ExperienceItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
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
    <div
      className="px-3 py-2 hover:bg-gray-50 group cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
      title={title + (subtitle ? ` at ${subtitle}` : '')}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
              #{index + 1}
            </span>
            <p className={`text-sm font-medium text-gray-800 ${isExpanded ? '' : 'truncate'}`}>{title}</p>
          </div>
          {subtitle && (
            <p className={`text-xs text-gray-600 mt-0.5 ${isExpanded ? '' : 'truncate'}`}>{subtitle}</p>
          )}
          {dateRange && (
            <p className="text-xs text-gray-400 mt-0.5">{dateRange}</p>
          )}
          {overlapWith && (
            <div className="flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>Overlapping dates with <strong>{overlapWith}</strong></span>
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all flex-shrink-0"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
