import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Linkedin, CheckCircle2, AlertCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import { ResumeParser, resumeParser } from '@/profileParser'
import { storage } from '@/storage'
import type { ParsedProfile, AnswerValue, ExperienceEntry } from '@/types'

type ImportStatus = 'idle' | 'checking' | 'parsing' | 'previewing' | 'importing' | 'success' | 'error' | 'consent'
type ImportMode = 'resume' | 'linkedin'

interface ImportResult {
  answersAdded: number
  answersSkipped: number
  experiencesAdded: number
}

interface ProfileImportProps {
  onImportComplete?: () => void
}

function isLinkedInProfileUrl(url: string): boolean {
  return /linkedin\.com\/in\//.test(url)
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export default function ProfileImport({ onImportComplete }: ProfileImportProps): React.ReactElement {
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [mode, setMode] = useState<ImportMode>('resume')
  const [error, setError] = useState<string | null>(null)
  const [parsedProfile, setParsedProfile] = useState<ParsedProfile | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [linkedinOpened, setLinkedinOpened] = useState(false)
  const [linkedinPageReady, setLinkedinPageReady] = useState(false)
  const [activeTabLinkedIn, setActiveTabLinkedIn] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const checkActiveTab = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.url && isLinkedInProfileUrl(tab.url)) {
        setActiveTabLinkedIn(tab.url)
        if (!linkedinUrl) {
          setLinkedinUrl(tab.url)
        }
      } else {
        setActiveTabLinkedIn(null)
        setLinkedinPageReady(false)
      }
    } catch {
      setActiveTabLinkedIn(null)
    }
  }, [linkedinUrl])

  const checkLinkedInPageReady = useCallback(async (): Promise<boolean> => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id || !tab.url || !isLinkedInProfileUrl(tab.url)) {
        return false
      }
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkLinkedInReady' })
      return response?.ready === true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (mode === 'linkedin' && status === 'idle') {
      checkActiveTab()
    }
  }, [mode, status, checkActiveTab])

  useEffect(() => {
    if (!linkedinOpened) return
    if (status !== 'idle') return
    if (linkedinPageReady) return

    setStatus('checking')

    let cancelled = false
    let attempts = 0
    const maxAttempts = 30

    const pollPageReady = async () => {
      if (cancelled) return

      const ready = await checkLinkedInPageReady()
      if (cancelled) return

      if (ready) {
        setLinkedinPageReady(true)
        setStatus('idle')
        return
      }

      attempts++
      if (attempts < maxAttempts) {
        setTimeout(pollPageReady, 1000)
      } else {
        setStatus('idle')
      }
    }

    const timer = setTimeout(pollPageReady, 1500)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedinOpened, checkLinkedInPageReady])

  function showError(message: string): void {
    setError(message)
    setStatus('error')
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ResumeParser.isSupported(file)) {
      showError(`Unsupported file type. Supported: ${ResumeParser.SUPPORTED_TYPES.join(', ')}`)
      return
    }

    setStatus('parsing')
    setError(null)

    try {
      const profile = await resumeParser.parse(file)
      setParsedProfile(profile)
      setStatus('previewing')
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to parse resume'))
    }
  }

  function openLinkedInProfile(): void {
    const trimmed = linkedinUrl.trim()
    if (!trimmed) {
      setError('Please enter your LinkedIn profile URL')
      return
    }

    const url = trimmed.startsWith('http') ? trimmed : 'https://' + trimmed

    if (!url.includes('linkedin.com/in/')) {
      setError('Please enter a valid LinkedIn profile URL (e.g., linkedin.com/in/yourname)')
      return
    }

    chrome.tabs.create({ url, active: true })
    setLinkedinOpened(true)
    setError(null)
  }

  const [parseProgress, setParseProgress] = useState<string>('')
  const [, setPendingShowAllLinks] = useState<{ experience?: string; education?: string } | null>(null)

  function handleParseClick(): void {
    // Always use AI for best results
    parseLinkedInPage(true)
  }

  async function waitForDetailPageLoad(tabId: number, detailType: 'experience' | 'education', maxAttempts = 20): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 1500))
      try {
        const resp = await chrome.tabs.sendMessage(tabId, {
          action: 'parseLinkedInDetailPage',
          detailType,
        })
        if (resp?.success && resp.entries) {
          return true
        }
      } catch {
        // Content script not ready yet, keep waiting
      }
    }
    return false
  }

  async function parseLinkedInPage(useAI: boolean): Promise<void> {
    setStatus('parsing')
    setError(null)
    setParseProgress('Parsing main profile page...')

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error('No active tab found')
      const tabId = tab.id
      const originalUrl = tab.url || ''

      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'parseLinkedInProfile',
        useLLMCleaning: useAI
      })
      if (!response?.success) throw new Error(response?.error || 'Failed to parse LinkedIn profile')

      let finalProfile = response.profile

      // Check if there are "Show all" links for more entries
      const showAllLinks = response.showAllLinks as { experience?: string; education?: string } | undefined

      if (showAllLinks?.experience || showAllLinks?.education) {
        // Try to auto-navigate to detail pages
        try {
          // Parse work experience detail page
          if (showAllLinks.experience) {
            setParseProgress('Loading full work history...')
            await chrome.tabs.sendMessage(tabId, {
              action: 'navigateForLinkedInDetails',
              url: showAllLinks.experience,
            })

            // Wait for the new page to load and parse
            const loaded = await waitForDetailPageLoad(tabId, 'experience')
            if (loaded) {
              const detailResp = await chrome.tabs.sendMessage(tabId, {
                action: 'parseLinkedInDetailPage',
                detailType: 'experience',
              })
              if (detailResp?.success && detailResp.entries?.length > 0) {
                const detailExperiences = detailResp.entries

                // Re-convert to experience entries using the parser
                const workEntries = detailExperiences.map((w: Record<string, string>, i: number) => {
                  const now = Date.now()
                  return {
                    id: `linkedin-work-${now}-${i}`,
                    groupType: 'WORK' as const,
                    priority: i,
                    startDate: w.startDate,
                    endDate: w.endDate,
                    fields: Object.fromEntries(
                      Object.entries({
                        COMPANY_NAME: w.company,
                        JOB_TITLE: w.title,
                        LOCATION: w.location,
                        START_DATE: w.startDate,
                        END_DATE: w.endDate,
                        JOB_DESCRIPTION: w.description,
                      }).filter(([, v]) => v)
                    ),
                    createdAt: now,
                    updatedAt: now,
                  }
                })

                // Replace work experiences in final profile
                finalProfile = {
                  ...finalProfile,
                  experiences: [
                    ...workEntries,
                    ...finalProfile.experiences.filter((e: { groupType: string }) => e.groupType !== 'WORK'),
                  ],
                }
                console.log(`[ProfileImport] Got ${workEntries.length} work entries from detail page`)
              }
            }
          }

          // Parse education detail page
          if (showAllLinks.education) {
            setParseProgress('Loading full education history...')
            await chrome.tabs.sendMessage(tabId, {
              action: 'navigateForLinkedInDetails',
              url: showAllLinks.education,
            })

            const loaded = await waitForDetailPageLoad(tabId, 'education')
            if (loaded) {
              const detailResp = await chrome.tabs.sendMessage(tabId, {
                action: 'parseLinkedInDetailPage',
                detailType: 'education',
              })
              if (detailResp?.success && detailResp.entries?.length > 0) {
                const detailEducations = detailResp.entries

                const eduEntries = detailEducations.map((e: Record<string, string>, i: number) => {
                  const now = Date.now()
                  return {
                    id: `linkedin-edu-${now}-${i}`,
                    groupType: 'EDUCATION' as const,
                    priority: i,
                    startDate: e.startDate,
                    endDate: e.endDate,
                    fields: Object.fromEntries(
                      Object.entries({
                        SCHOOL: e.school,
                        DEGREE: e.degree,
                        MAJOR: e.field || e.major,
                        START_DATE: e.startDate,
                        END_DATE: e.endDate,
                        GRAD_DATE: e.endDate !== 'present' ? e.endDate : undefined,
                      }).filter(([, v]) => v)
                    ),
                    createdAt: now,
                    updatedAt: now,
                  }
                })

                finalProfile = {
                  ...finalProfile,
                  experiences: [
                    ...finalProfile.experiences.filter((e: { groupType: string }) => e.groupType !== 'EDUCATION'),
                    ...eduEntries,
                  ],
                }
                console.log(`[ProfileImport] Got ${eduEntries.length} education entries from detail page`)
              }
            }
          }

          // Navigate back to original profile page
          setParseProgress('Returning to profile page...')
          try {
            await chrome.tabs.sendMessage(tabId, {
              action: 'navigateForLinkedInDetails',
              url: originalUrl,
            })
          } catch {
            // Navigation may cause content script to unload, that's ok
          }
        } catch (navError) {
          console.warn('[ProfileImport] Auto-navigation failed, results may be incomplete:', navError)
          // Store showAllLinks so user can manually navigate
          setPendingShowAllLinks(showAllLinks)
        }
      }

      setParsedProfile(finalProfile)
      setParseProgress('')
      setStatus('previewing')
    } catch (err) {
      setParseProgress('')
      showError(getErrorMessage(err, 'Failed to parse LinkedIn profile'))
    }
  }

  async function handleImport(): Promise<void> {
    if (!parsedProfile) return

    setStatus('importing')

    try {
      let answersAdded = 0
      let answersSkipped = 0

      for (const extracted of parsedProfile.singleAnswers) {
        const existing = await storage.answers.getByType(extracted.type)
        const isDuplicate = existing.some(e => e.value.toLowerCase() === extracted.value.toLowerCase())

        if (isDuplicate) {
          answersSkipped++
          continue
        }

        const now = Date.now()
        const answer: AnswerValue = {
          id: `import-${now}-${extracted.type}`,
          type: extracted.type,
          value: extracted.value,
          display: extracted.display || extracted.value,
          aliases: [],
          sensitivity: 'normal',
          autofillAllowed: true,
          createdAt: now,
          updatedAt: now,
        }

        await storage.answers.save(answer)
        answersAdded++
      }

      await storage.experiences.saveBatch(parsedProfile.experiences)

      setImportResult({
        answersAdded,
        answersSkipped,
        experiencesAdded: parsedProfile.experiences.length,
      })
      setStatus('success')
      onImportComplete?.()
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to import profile'))
    }
  }

  function reset(): void {
    setStatus('idle')
    setError(null)
    setParsedProfile(null)
    setImportResult(null)
    setLinkedinOpened(false)
    setLinkedinPageReady(false)
    setActiveTabLinkedIn(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const workExperiences = parsedProfile?.experiences.filter(e => e.groupType === 'WORK') ?? []
  const educationExperiences = parsedProfile?.experiences.filter(e => e.groupType === 'EDUCATION') ?? []

  return (
    <div className="space-y-3">
      {(status === 'idle' || status === 'checking') && (
        <div className="space-y-3">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <ModeTab label="Resume/CV" active={mode === 'resume'} onClick={() => setMode('resume')} />
            <ModeTab label="LinkedIn" active={mode === 'linkedin'} onClick={() => setMode('linkedin')} />
          </div>

          {mode === 'resume' && (
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Upload Resume/CV</p>
              <p className="text-xs text-gray-500 mt-1">PDF, Word, or Image</p>
            </div>
          )}

          {mode === 'linkedin' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
                <Linkedin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  {activeTabLinkedIn
                    ? 'LinkedIn profile detected! Click Parse to import.'
                    : 'Enter your LinkedIn URL, open it, then click "Parse".'}
                </p>
              </div>

              {activeTabLinkedIn ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700 truncate">
                      {activeTabLinkedIn}
                    </p>
                  </div>
                  <ActionButton color="green" icon={RefreshCw} onClick={handleParseClick}>
                    Parse LinkedIn Profile
                  </ActionButton>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="linkedin.com/in/yourname"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  {error && <p className="text-xs text-red-600">{error}</p>}

                  {!linkedinOpened ? (
                    <ActionButton color="blue" icon={ExternalLink} onClick={openLinkedInProfile}>
                      Open LinkedIn Profile
                    </ActionButton>
                  ) : (
                    <div className="space-y-2">
                      {status === 'checking' ? (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                          <p className="text-xs text-blue-700">
                            Waiting for LinkedIn page to load...
                          </p>
                        </div>
                      ) : linkedinPageReady ? (
                        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <p className="text-xs text-green-700">
                            LinkedIn page loaded. Ready to parse!
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-600 text-center">
                          Make sure you're on a LinkedIn profile page.
                        </p>
                      )}
                      <ActionButton color="green" icon={RefreshCw} onClick={handleParseClick}>
                        Parse LinkedIn Profile
                      </ActionButton>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}



      {status === 'parsing' && (
        <LoadingState message={parseProgress || (mode === 'linkedin' ? 'Parsing LinkedIn profile...' : 'Parsing resume/CV...')} />
      )}

      {status === 'previewing' && parsedProfile && (
        <div className="space-y-3">
          <PreviewSection title="Basic Info" count={parsedProfile.singleAnswers.length}>
            {parsedProfile.singleAnswers.map((a, i) => (
              <div key={i} className="flex justify-between text-xs py-1">
                <span className="text-gray-500">{a.type}</span>
                <span className="text-gray-800 truncate ml-2 max-w-[150px]">{a.value}</span>
              </div>
            ))}
          </PreviewSection>

          <PreviewSection title="Work Experience" count={workExperiences.length}>
            {workExperiences.map((exp, i) => (
              <ImportExperienceItem
                key={i}
                title={exp.fields.JOB_TITLE || 'Unknown Title'}
                subtitle={formatWorkSubtitle(exp)}
              />
            ))}
          </PreviewSection>

          <PreviewSection title="Education" count={educationExperiences.length}>
            {educationExperiences.map((exp, i) => (
              <ImportExperienceItem
                key={i}
                title={exp.fields.SCHOOL || 'Unknown School'}
                subtitle={formatEducationSubtitle(exp)}
              />
            ))}
          </PreviewSection>

          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Import All
            </button>
          </div>
        </div>
      )}

      {status === 'importing' && <LoadingState message="Importing profile..." />}

      {status === 'success' && importResult && (
        <div className="text-center py-4">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-800">Import Complete!</h3>
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            <p>{importResult.answersAdded} answers added</p>
            {importResult.answersSkipped > 0 && (
              <p className="text-gray-400">{importResult.answersSkipped} duplicates skipped</p>
            )}
            <p>{importResult.experiencesAdded} experiences added</p>
          </div>
          <button
            onClick={reset}
            className="mt-3 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-800">Import Failed</h3>
          <p className="mt-1 text-xs text-red-600">{error}</p>
          <button
            onClick={reset}
            className="mt-3 px-6 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}

function formatWorkSubtitle(exp: ExperienceEntry): string {
  const company = exp.fields.COMPANY_NAME || 'Unknown Company'
  const dateRange = [exp.startDate, exp.endDate].filter(Boolean).join(' - ')
  return dateRange ? `${company} · ${dateRange}` : company
}

function formatEducationSubtitle(exp: ExperienceEntry): string {
  const parts = [exp.fields.DEGREE, exp.fields.MAJOR ? `in ${exp.fields.MAJOR}` : ''].filter(Boolean)
  return parts.join(' ')
}

interface ModeTabProps {
  label: string
  active: boolean
  onClick: () => void
}

function ModeTab({ label, active, onClick }: ModeTabProps): React.ReactElement {
  const className = active
    ? 'bg-white shadow text-gray-900'
    : 'text-gray-500 hover:text-gray-700'
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${className}`}
    >
      {label}
    </button>
  )
}

interface ActionButtonProps {
  color: 'blue' | 'green'
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  children: React.ReactNode
}

function ActionButton({ color, icon: Icon, onClick, children }: ActionButtonProps): React.ReactElement {
  const colorClass = color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg ${colorClass}`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  )
}

interface LoadingStateProps {
  message: string
}

function LoadingState({ message }: LoadingStateProps): React.ReactElement {
  return (
    <div className="text-center py-6">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
      <p className="text-sm text-gray-600">{message}</p>
      <p className="text-xs text-gray-400 mt-1">This may take a moment</p>
    </div>
  )
}

interface PreviewSectionProps {
  title: string
  count: number
  children: React.ReactNode
}

function PreviewSection({ title, count, children }: PreviewSectionProps): React.ReactElement {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="text-xs text-gray-400">{count} items</span>
      </div>
      <div className="px-3 py-2">{children}</div>
    </div>
  )
}

interface ImportExperienceItemProps {
  title: string
  subtitle: string
}

function ImportExperienceItem({ title, subtitle }: ImportExperienceItemProps): React.ReactElement {
  return (
    <div className="py-1 border-b border-gray-100 last:border-0">
      <p className="text-sm font-medium text-gray-800">{title}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  )
}
