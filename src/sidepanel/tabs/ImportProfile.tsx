import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Linkedin, CheckCircle2, AlertCircle, Loader2, ExternalLink, RefreshCw, Shield, Sparkles, HardDrive } from 'lucide-react'
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

function isLinkedInProfileUrl(url: string): boolean {
  return /linkedin\.com\/in\//.test(url)
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export default function ImportProfile(): React.ReactElement {
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

  // Check if the current active tab is a LinkedIn profile page
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

  // Check if the LinkedIn page is fully loaded
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

  // Auto-check LinkedIn page ready status after opening
  useEffect(() => {
    // Only start checking when linkedinOpened becomes true and we're in idle state
    if (!linkedinOpened) return
    // Don't restart if already checking or in another state
    if (status !== 'idle') return
    // Don't restart if already marked as ready
    if (linkedinPageReady) return

    setStatus('checking')

    let cancelled = false
    let attempts = 0
    const maxAttempts = 30 // 30 seconds max

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
        // Timeout - allow user to try anyway
        setStatus('idle')
      }
    }

    // Start polling after a short delay to let the page start loading
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

  // Show consent dialog before parsing
  function handleParseClick(): void {
    setStatus('consent')
    setError(null)
  }

  // Proceed with parsing after consent
  async function parseLinkedInPage(useAI: boolean): Promise<void> {
    setStatus('parsing')
    setError(null)

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error('No active tab found')

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'parseLinkedInProfile',
        useLLMCleaning: useAI
      })
      if (!response?.success) throw new Error(response?.error || 'Failed to parse LinkedIn profile')

      setParsedProfile(response.profile)
      setStatus('previewing')
    } catch (err) {
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
    <div className="space-y-4">
      <div className="text-center pb-2">
        <h2 className="text-lg font-semibold text-gray-800">Import Profile</h2>
        <p className="text-sm text-gray-500">Import from resume or LinkedIn</p>
      </div>

      {(status === 'idle' || status === 'checking') && (
        <div className="space-y-4">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <ModeTab label="Resume" active={mode === 'resume'} onClick={() => setMode('resume')} />
            <ModeTab label="LinkedIn" active={mode === 'linkedin'} onClick={() => setMode('linkedin')} />
          </div>

          {mode === 'resume' && (
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">Upload Resume</p>
              <p className="text-xs text-gray-500 mt-1">PDF, Word, or Image</p>
            </div>
          )}

          {mode === 'linkedin' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
                <Linkedin className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  {activeTabLinkedIn
                    ? 'LinkedIn profile detected! Click Parse to import.'
                    : 'Enter your LinkedIn profile URL, open it, then click "Parse" to import.'}
                </p>
              </div>

              {activeTabLinkedIn && !linkedinOpened ? (
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

      {status === 'consent' && (
        <div className="space-y-4">
          <div className="text-center">
            <Shield className="w-10 h-10 text-blue-500 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-gray-800">Choose Processing Method</h3>
            <p className="text-xs text-gray-500 mt-1">
              How would you like to process your LinkedIn profile?
            </p>
          </div>

          <div className="space-y-3">
            {/* AI Processing Option */}
            <button
              onClick={() => parseLinkedInPage(true)}
              className="w-full p-3 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">AI-Enhanced Processing</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Better accuracy for names, dates, and formatting
                  </p>
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700">
                      <strong>Note:</strong> Your profile data will be sent to our AI service for processing.
                      Data is NOT stored or used for training.
                    </p>
                  </div>
                </div>
              </div>
            </button>

            {/* Local Processing Option */}
            <button
              onClick={() => parseLinkedInPage(false)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50/50 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <HardDrive className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Local Processing Only</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    All processing happens on your device
                  </p>
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700">
                      <strong>Privacy:</strong> No data leaves your browser.
                      Results may be less accurate for complex profiles.
                    </p>
                  </div>
                </div>
              </div>
            </button>
          </div>

          <button
            onClick={() => setStatus('idle')}
            className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>

          <p className="text-xs text-gray-400 text-center">
            By continuing, you agree to our{' '}
            <a href="https://www.onefil.help/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      )}

      {status === 'parsing' && (
        <LoadingState message={mode === 'linkedin' ? 'Parsing LinkedIn profile...' : 'Parsing resume...'} />
      )}

      {status === 'previewing' && parsedProfile && (
        <div className="space-y-4">
          <PreviewSection title="Basic Info" count={parsedProfile.singleAnswers.length}>
            {parsedProfile.singleAnswers.slice(0, 5).map((a, i) => (
              <div key={i} className="flex justify-between text-xs py-1">
                <span className="text-gray-500">{a.type}</span>
                <span className="text-gray-800 truncate ml-2 max-w-[150px]">{a.value}</span>
              </div>
            ))}
            {parsedProfile.singleAnswers.length > 5 && (
              <p className="text-xs text-gray-400 text-center">
                +{parsedProfile.singleAnswers.length - 5} more
              </p>
            )}
          </PreviewSection>

          <PreviewSection title="Work Experience" count={workExperiences.length}>
            {workExperiences.slice(0, 3).map((exp, i) => (
              <ExperienceItem
                key={i}
                title={exp.fields.JOB_TITLE || 'Unknown Title'}
                subtitle={formatWorkSubtitle(exp)}
              />
            ))}
          </PreviewSection>

          <PreviewSection title="Education" count={educationExperiences.length}>
            {educationExperiences.slice(0, 3).map((exp, i) => (
              <ExperienceItem
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
        <div className="text-center py-6">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800">Import Complete!</h3>
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <p>{importResult.answersAdded} answers added</p>
            {importResult.answersSkipped > 0 && (
              <p className="text-gray-400">{importResult.answersSkipped} duplicates skipped</p>
            )}
            <p>{importResult.experiencesAdded} experiences added</p>
          </div>
          <button
            onClick={reset}
            className="mt-4 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800">Import Failed</h3>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <button
            onClick={reset}
            className="mt-4 px-6 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}

// Helper functions
function formatWorkSubtitle(exp: ExperienceEntry): string {
  const company = exp.fields.COMPANY_NAME || 'Unknown Company'
  const dateRange = [exp.startDate, exp.endDate].filter(Boolean).join(' - ')
  return dateRange ? `${company} · ${dateRange}` : company
}

function formatEducationSubtitle(exp: ExperienceEntry): string {
  const parts = [exp.fields.DEGREE, exp.fields.MAJOR ? `in ${exp.fields.MAJOR}` : ''].filter(Boolean)
  return parts.join(' ')
}

// Extracted components
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
    <div className="text-center py-8">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
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

interface ExperienceItemProps {
  title: string
  subtitle: string
}

function ExperienceItem({ title, subtitle }: ExperienceItemProps): React.ReactElement {
  return (
    <div className="py-1 border-b border-gray-100 last:border-0">
      <p className="text-sm font-medium text-gray-800">{title}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  )
}
