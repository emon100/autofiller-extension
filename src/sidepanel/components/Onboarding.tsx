import { useState, useEffect } from 'react'
import { Zap, Linkedin, FileText, FormInput, Sparkles, ArrowRight, ArrowLeft, Check, ExternalLink, Database, Shield, Brain, Lock, HardDrive, LogIn, Loader2, Settings, MousePointerClick, AlertTriangle, type LucideIcon } from 'lucide-react'
import { Taxonomy } from '@/types'
import { storage } from '@/storage'
import { t } from '@/i18n'
import { isLLMEnabled } from '@/profileParser/llmHelpers'
import { launchLogin } from '@/utils/authLogin'
import OnboardingHeroDemo from './OnboardingHeroDemo'

// --- Shared helpers ---

/** Save an answer to storage if no duplicate exists */
async function saveAnswerIfNew(type: Taxonomy, value: string, idPrefix: string) {
  const trimmed = value.trim()
  if (!trimmed) return
  const existing = await storage.answers.getByType(type)
  if (existing.some(e => e.value.toLowerCase() === trimmed.toLowerCase())) return
  await storage.answers.save({
    id: `${idPrefix}-${Date.now()}-${type}`,
    type,
    value: trimmed,
    display: trimmed,
    aliases: [],
    sensitivity: 'normal',
    autofillAllowed: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
}

/** Reusable step header with icon + title + subtitle */
function StepHeader({ icon: Icon, iconBg, iconColor, title, subtitle }: {
  icon: LucideIcon; iconBg: string; iconColor: string; title: string; subtitle?: string
}) {
  return (
    <div className="text-center">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
  )
}

/** Reusable navigation buttons */
function StepNav({ onBack, onNext, done, nextLabel }: {
  onBack: () => void; onNext: () => void; done?: boolean; nextLabel?: string
}) {
  return (
    <div className="flex gap-2">
      <button onClick={onBack} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1">
        <ArrowLeft className="w-4 h-4" /> {t('onboarding.back')}
      </button>
      <button onClick={onNext} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-1">
        {nextLabel || (done ? t('onboarding.continue') : t('onboarding.skipStep'))} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function PrivacyBadge({ variant = 'local' }: { variant?: 'local' | 'ai-optional' | 'ai-required' }) {
  const isAI = variant !== 'local'
  const isRequired = variant === 'ai-required'
  const labelKey = isRequired ? 'onboarding.privacy.aiRequiredLabel' : isAI ? 'onboarding.privacy.aiOptionalLabel' : 'onboarding.privacy.localLabel'
  const descKey = isRequired ? 'onboarding.privacy.aiRequired' : isAI ? 'onboarding.privacy.aiOptional' : 'onboarding.privacy.local'
  const IconComp = isAI ? Shield : Lock

  if (isRequired) {
    return (
      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg mt-3">
        <IconComp className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          <strong>{t(labelKey)}</strong> {t(descKey)}
        </p>
      </div>
    )
  }
  if (isAI) {
    return (
      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg mt-3">
        <IconComp className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          <strong>{t(labelKey)}</strong> {t(descKey)}
        </p>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg mt-3">
      <IconComp className="w-4 h-4 text-green-600 flex-shrink-0" />
      <p className="text-xs text-green-700">
        <strong>{t(labelKey)}</strong> {t(descKey)}
      </p>
    </div>
  )
}

interface OnboardingProps {
  onComplete: () => void
  onSkip: () => void
}

type Step = 'welcome' | 'linkedin' | 'resume' | 'practice' | 'features'

export default function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [linkedinDone, setLinkedinDone] = useState(false)
  const [resumeDone, setResumeDone] = useState(false)
  const [practiceDone, setPracticeDone] = useState(false)

  const steps: Step[] = ['welcome', 'linkedin', 'resume', 'practice', 'features']
  const currentIndex = steps.indexOf(step)
  const progress = ((currentIndex) / (steps.length - 1)) * 100

  // If user has imported data, skip practice step
  const shouldSkipPractice = linkedinDone || resumeDone

  function nextStep() {
    let nextIndex = currentIndex + 1
    // Skip practice step if user has already imported data
    if (steps[nextIndex] === 'practice' && shouldSkipPractice) {
      nextIndex++
    }
    const next = steps[nextIndex]
    if (next) setStep(next)
    else onComplete()
  }

  function prevStep() {
    let prevIndex = currentIndex - 1
    // Skip practice step when going back if it was skipped
    if (steps[prevIndex] === 'practice' && shouldSkipPractice) {
      prevIndex--
    }
    const prev = steps[prevIndex]
    if (prev) setStep(prev)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500">{t('onboarding.progress')}</span>
          <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600">
            {t('onboarding.skip')}
          </button>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      {step === 'welcome' && (
        <WelcomeStep onNext={nextStep} />
      )}

      {step === 'linkedin' && (
        <LinkedInStep
          done={linkedinDone}
          onDone={() => setLinkedinDone(true)}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}

      {step === 'resume' && (
        <ResumeStep
          done={resumeDone}
          onDone={() => setResumeDone(true)}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}

      {step === 'practice' && (
        <PracticeStep
          done={practiceDone}
          onDone={() => setPracticeDone(true)}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}

      {step === 'features' && (
        <FeaturesStep onComplete={onComplete} onBack={prevStep} />
      )}
    </div>
  )
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-4">
      <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
        <Zap className="w-7 h-7 text-blue-600" />
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('onboarding.welcome.title')}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {t('onboarding.welcome.subtitle')}
        </p>
      </div>

      {/* Demo Animation */}
      <div className="text-left">
        <p className="text-xs text-gray-500 mb-2 text-center">{t('onboarding.welcome.demo')}</p>
        <OnboardingHeroDemo />
      </div>

      {/* Privacy notice */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-left">
        <div className="flex items-start gap-2">
          <Lock className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-green-800">{t('onboarding.welcome.privacyTitle')}</p>
            <p className="text-[11px] text-green-700 mt-0.5">
              {t('onboarding.welcome.privacyDesc')}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        {t('onboarding.welcome.getStarted')} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function LinkedInStep({ done, onDone, onNext, onBack }: {
  done: boolean; onDone: () => void; onNext: () => void; onBack: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'choosing' | 'parsing' | 'done' | 'error' | 'detecting'>('idle')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [activeTabLinkedIn, setActiveTabLinkedIn] = useState<string | null>(null)

  useEffect(() => {
    storage.auth.getAuthState().then(authState => {
      setIsLoggedIn(!!(authState && authState.expiresAt > Date.now()))
    })
    checkActiveTab()
  }, [])

  async function checkActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.url && /linkedin\.com\/in\//.test(tab.url)) {
        setActiveTabLinkedIn(tab.url)
      } else {
        setActiveTabLinkedIn(null)
      }
    } catch {
      setActiveTabLinkedIn(null)
    }
  }

  function openLinkedInAndDetect() {
    chrome.tabs.create({ url: 'https://www.linkedin.com/in/me/', active: true })
    setStatus('detecting')

    let cancelled = false
    let attempts = 0
    const maxAttempts = 30

    const poll = async () => {
      if (cancelled) return
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.url && /linkedin\.com\/in\//.test(tab.url)) {
          setActiveTabLinkedIn(tab.url)
          setStatus('idle')
          return
        }
      } catch { /* ignore */ }
      attempts++
      if (attempts < maxAttempts && !cancelled) {
        setTimeout(poll, 1000)
      } else if (!cancelled) {
        setStatus('idle')
      }
    }

    setTimeout(poll, 2000)

    // cleanup on unmount is not critical here since it's a one-time action
  }

  async function handleLogin() {
    setLoggingIn(true)
    const result = await launchLogin()
    if (result.success) {
      setIsLoggedIn(true)
    } else if (result.error) {
      console.error('LinkedIn login error:', result.error)
    }
    setLoggingIn(false)
  }

  async function parseProfile(withAI: boolean) {
    setStatus('parsing')
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error('No active tab')

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'parseLinkedInProfile',
        useLLMCleaning: withAI
      })
      if (!response?.success) throw new Error(response?.error || 'Failed')

      for (const a of response.profile.singleAnswers) {
        await saveAnswerIfNew(a.type, a.display || a.value, 'onboarding')
      }
      await storage.experiences.saveBatch(response.profile.experiences)
      setStatus('done')
      onDone()
    } catch (err) {
      console.error('LinkedIn parse error:', err)
      setStatus('error')
    }
  }

  return (
    <div className="space-y-4">
      <StepHeader icon={Linkedin} iconBg="bg-blue-100" iconColor="text-blue-600"
        title={t('onboarding.linkedin.title')} subtitle={t('onboarding.linkedin.subtitle')} />

      <div className="bg-white rounded-xl p-4 space-y-3">
        {status === 'choosing' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 text-center font-medium">{t('onboarding.linkedin.chooseMethod')}</p>

            {/* Local Processing Option */}
            <button
              onClick={() => parseProfile(false)}
              className="w-full p-3 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50/50 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <HardDrive className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{t('onboarding.linkedin.localOption')}</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {t('onboarding.linkedin.localDesc')}
                  </p>
                </div>
              </div>
            </button>

            {/* AI Processing Option */}
            {isLoggedIn ? (
              <button
                onClick={() => parseProfile(true)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{t('onboarding.linkedin.aiOption')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('onboarding.linkedin.aiDesc')}
                    </p>
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {t('onboarding.linkedin.aiWarning')}
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50/50 text-left">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{t('onboarding.linkedin.aiOption')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('onboarding.linkedin.aiDesc')}
                    </p>
                    <button
                      onClick={handleLogin}
                      disabled={loggingIn}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loggingIn ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> {t('onboarding.resume.loggingIn')}</>
                      ) : (
                        <><LogIn className="w-3 h-3" /> {t('onboarding.linkedin.loginForAi')}</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setStatus('idle')}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              {t('onboarding.linkedin.cancel')}
            </button>
          </div>
        ) : !done && status !== 'done' ? (
          <>
            {activeTabLinkedIn ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-700">{t('onboarding.linkedin.step1')}</p>
                  <p className="text-xs text-green-600 truncate mt-0.5">{activeTabLinkedIn}</p>
                </div>
              </div>
            ) : status === 'detecting' ? (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-700">{t('onboarding.linkedin.detecting')}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</div>
                <p className="text-sm text-gray-700 flex-1">{t('onboarding.linkedin.step1')}</p>
                <button onClick={openLinkedInAndDetect} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  {t('onboarding.linkedin.open')} <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className={`flex items-center gap-3 p-3 rounded-lg ${activeTabLinkedIn ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activeTabLinkedIn ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>2</div>
              <p className={`text-sm flex-1 ${activeTabLinkedIn ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{t('onboarding.linkedin.step2')}</p>
              <button
                onClick={() => setStatus('choosing')}
                disabled={status === 'parsing'}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {status === 'parsing' ? t('onboarding.linkedin.parsing') : t('onboarding.linkedin.parse')}
              </button>
            </div>
            {status === 'error' && (
              <p className="text-xs text-red-600 text-center">
                {t('onboarding.linkedin.error')}
              </p>
            )}
            <PrivacyBadge variant="ai-optional" />
          </>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">{t('onboarding.linkedin.done')}</p>
          </div>
        )}
      </div>

      <StepNav onBack={onBack} onNext={onNext} done={done} />
    </div>
  )
}

function ResumeStep({ done, onDone, onNext, onBack }: {
  done: boolean; onDone: () => void; onNext: () => void; onBack: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [llmReady, setLlmReady] = useState<boolean | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    checkAvailability()
  }, [])

  async function checkAvailability() {
    const authState = await storage.auth.getAuthState()
    const loggedIn = !!(authState && authState.expiresAt > Date.now())
    setIsLoggedIn(loggedIn)

    const enabled = await isLLMEnabled()
    setLlmReady(enabled)
  }

  async function handleLogin() {
    setLoggingIn(true)
    setLoginError('')

    const result = await launchLogin()
    if (result.success) {
      setIsLoggedIn(true)
      const enabled = await isLLMEnabled()
      setLlmReady(enabled)
    } else if (result.error) {
      setLoginError(result.error)
    }

    setLoggingIn(false)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('parsing')
    setErrorMsg('')

    try {
      const { resumeParser } = await import('@/profileParser')
      const profile = await resumeParser.parse(file)

      for (const a of profile.singleAnswers) {
        await saveAnswerIfNew(a.type, a.display || a.value, 'onboarding-resume')
      }
      await storage.experiences.saveBatch(profile.experiences)

      setStatus('done')
      onDone()
    } catch (err) {
      console.error('Resume parse error:', err)
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Failed to parse resume')
    }
  }

  // Loading state
  if (isLoggedIn === null || llmReady === null) {
    return (
      <div className="space-y-4">
        <StepHeader icon={FileText} iconBg="bg-green-100" iconColor="text-green-600" title={t('onboarding.resume.title')} />
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
        <StepNav onBack={onBack} onNext={onNext} />
      </div>
    )
  }

  // Not logged in and LLM not ready - show login prompt
  const showLoginPrompt = !isLoggedIn && !llmReady

  return (
    <div className="space-y-4">
      <StepHeader icon={FileText} iconBg="bg-green-100" iconColor="text-green-600"
        title={t('onboarding.resume.title')} subtitle={t('onboarding.resume.subtitle')} />

      <div className="bg-white rounded-xl p-4">
        {showLoginPrompt ? (
          /* Login required prompt */
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto">
              <LogIn className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{t('onboarding.resume.loginRequired')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('onboarding.resume.loginDesc')}</p>
            </div>
            <button
              onClick={handleLogin}
              disabled={loggingIn}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('onboarding.resume.loggingIn')}
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {t('onboarding.resume.loginButton')}
                </>
              )}
            </button>
            {loginError && (
              <p className="text-xs text-red-600">{loginError}</p>
            )}
          </div>
        ) : !llmReady && isLoggedIn ? (
          /* Logged in but LLM not configured */
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto">
              <Settings className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{t('onboarding.resume.configRequired')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('onboarding.resume.configDesc')}</p>
            </div>
          </div>
        ) : !done && status !== 'done' ? (
          /* Upload area */
          <>
            {/* LLM API Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-800">{t('onboarding.resume.llmWarningTitle')}</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    {t('onboarding.resume.llmWarningDesc')}
                  </p>
                </div>
              </div>
            </div>

            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-green-400 hover:bg-green-50/50 transition-colors">
                <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  {status === 'parsing' ? t('onboarding.resume.processing') : t('onboarding.resume.clickUpload')}
                </p>
                <p className="text-xs text-gray-500 mt-1">{t('onboarding.resume.fileTypes')}</p>
              </div>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
                onChange={handleFile}
                className="hidden"
                disabled={status === 'parsing'}
              />
            </label>
          </>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">{t('onboarding.resume.done')}</p>
          </div>
        )}
        {status === 'error' && (
          <p className="text-xs text-red-600 text-center mt-2">{errorMsg}</p>
        )}
      </div>

      <StepNav onBack={onBack} onNext={onNext} done={done} />
    </div>
  )
}

function PracticeStep({ done, onDone, onNext, onBack }: {
  done: boolean; onDone: () => void; onNext: () => void; onBack: () => void
}) {
  const [fields, setFields] = useState({
    fullName: '', email: '', phone: '', city: '',
    linkedin: '', school: '', degree: '', major: '',
  })
  const [saved, setSaved] = useState(false)
  const [showHint, setShowHint] = useState(true)

  function handleFocus() {
    setTimeout(() => setShowHint(false), 2000)
  }

  const FIELD_MAPPINGS: Array<[keyof typeof fields, Taxonomy]> = [
    ['fullName', Taxonomy.FULL_NAME], ['email', Taxonomy.EMAIL],
    ['phone', Taxonomy.PHONE], ['city', Taxonomy.CITY],
    ['linkedin', Taxonomy.LINKEDIN], ['school', Taxonomy.SCHOOL],
    ['degree', Taxonomy.DEGREE], ['major', Taxonomy.MAJOR],
  ]

  async function handleSave() {
    for (const [field, type] of FIELD_MAPPINGS) {
      await saveAnswerIfNew(type, fields[field], 'onboarding-practice')
    }
    setSaved(true)
    onDone()
  }

  const hasInput = Object.values(fields).some(v => v.trim())
  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"

  function Field({ id, label, field, ...props }: { id: string; label: string; field: keyof typeof fields } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
      <div>
        <label htmlFor={id} className="text-xs text-gray-500 mb-1 block">{label}</label>
        <input id={id} value={fields[field]} onFocus={handleFocus}
          onChange={e => setFields(f => ({ ...f, [field]: e.target.value }))}
          className={inputClass} {...props}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <StepHeader icon={FormInput} iconBg="bg-purple-100" iconColor="text-purple-600"
        title={t('onboarding.practice.title')} subtitle={t('onboarding.practice.subtitle')} />

      {!done && !saved && showHint && (
        <div className="flex items-center gap-2 p-2.5 bg-purple-50 border border-purple-200 rounded-xl animate-pulse">
          <MousePointerClick className="w-4 h-4 text-purple-600" />
          <p className="text-xs text-purple-700 font-medium">{t('onboarding.practice.animHint')}</p>
        </div>
      )}

      <div className="bg-white rounded-xl p-4">
        {!done && !saved ? (
          <form autoComplete="on" onSubmit={e => { e.preventDefault(); handleSave() }} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <Field id="ob-name" field="fullName" label={t('onboarding.practice.fullName')} type="text" name="name" autoComplete="name" placeholder={t('onboarding.practice.placeholder')} />
              <Field id="ob-email" field="email" label={t('onboarding.practice.email')} type="email" name="email" autoComplete="email" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field id="ob-tel" field="phone" label={t('onboarding.practice.phone')} type="tel" name="phone" autoComplete="tel" />
              <Field id="ob-city" field="city" label={t('onboarding.practice.city')} type="text" name="city" autoComplete="address-level2" />
            </div>
            <Field id="ob-linkedin" field="linkedin" label={t('onboarding.practice.linkedin')} type="url" name="linkedin" autoComplete="url" placeholder="https://linkedin.com/in/..." />
            <div className="grid grid-cols-2 gap-2">
              <Field id="ob-school" field="school" label={t('onboarding.practice.school')} type="text" name="school" autoComplete="organization" />
              <Field id="ob-degree" field="degree" label={t('onboarding.practice.degree')} type="text" name="degree" placeholder="Bachelor's" />
            </div>
            <Field id="ob-major" field="major" label={t('onboarding.practice.major')} type="text" name="major" placeholder="Computer Science" />
            {hasInput && (
              <button type="submit"
                className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                {t('onboarding.practice.save')}
              </button>
            )}
          </form>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">{t('onboarding.practice.saved')}</p>
          </div>
        )}
      </div>

      <PrivacyBadge />
      <StepNav onBack={onBack} onNext={onNext} done={done} />
    </div>
  )
}

function FeaturesStep({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const features = [
    { icon: Database, color: 'blue', title: t('onboarding.features.localKnowledge'), desc: t('onboarding.features.localKnowledgeDesc') },
    { icon: Sparkles, color: 'purple', title: t('onboarding.features.smartFill'), desc: t('onboarding.features.smartFillDesc') },
    { icon: Brain, color: 'green', title: t('onboarding.features.autoLearn'), desc: t('onboarding.features.autoLearnDesc') },
    { icon: Shield, color: 'amber', title: t('onboarding.features.privacyFirst'), desc: t('onboarding.features.privacyFirstDesc') },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600', amber: 'bg-amber-50 text-amber-600',
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">{t('onboarding.features.title')}</h2>
        <p className="text-sm text-gray-600 mt-1">{t('onboarding.features.subtitle')}</p>
      </div>

      <div className="space-y-2">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[f.color]}`}>
              <f.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{f.title}</p>
              <p className="text-xs text-gray-500">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1">
          <ArrowLeft className="w-4 h-4" /> {t('onboarding.back')}
        </button>
        <button onClick={onComplete} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:opacity-90 flex items-center justify-center gap-1">
          {t('onboarding.features.startUsing')} <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
