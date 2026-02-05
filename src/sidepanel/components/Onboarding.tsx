import { useState } from 'react'
import { Zap, Linkedin, FileText, FormInput, Sparkles, ArrowRight, ArrowLeft, Check, ExternalLink, Database, Shield, Brain, Lock, HardDrive } from 'lucide-react'
import { Taxonomy } from '@/types'
import FillDemo from './FillDemo'

// Privacy notice component used across steps
function PrivacyBadge({ variant = 'local' }: { variant?: 'local' | 'ai-optional' }) {
  if (variant === 'ai-optional') {
    return (
      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg mt-3">
        <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          <strong>Privacy:</strong> AI processing is optional. You can choose local-only processing.
        </p>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg mt-3">
      <Lock className="w-4 h-4 text-green-600 flex-shrink-0" />
      <p className="text-xs text-green-700">
        <strong>Privacy:</strong> All data is stored locally on your device. Nothing is sent to any server.
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

  function nextStep() {
    const next = steps[currentIndex + 1]
    if (next) setStep(next)
    else onComplete()
  }

  function prevStep() {
    const prev = steps[currentIndex - 1]
    if (prev) setStep(prev)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500">Setup Progress</span>
          <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600">
            Skip for now
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
        <h1 className="text-xl font-bold text-gray-900">Welcome to OneFillr!</h1>
        <p className="text-sm text-gray-600 mt-1">
          Auto-fill job applications in seconds
        </p>
      </div>

      {/* Demo Animation */}
      <div className="text-left">
        <p className="text-xs text-gray-500 mb-2 text-center">See how it works:</p>
        <FillDemo autoPlay compact showControls={false} />
      </div>

      {/* Privacy notice */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-left">
        <div className="flex items-start gap-2">
          <Lock className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-green-800">Your Privacy is Protected</p>
            <p className="text-[11px] text-green-700 mt-0.5">
              All data stored locally. AI features are optional.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        Get Started <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function LinkedInStep({ done, onDone, onNext, onBack }: {
  done: boolean
  onDone: () => void
  onNext: () => void
  onBack: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'choosing' | 'parsing' | 'done' | 'error'>('idle')

  async function openLinkedIn() {
    // Open LinkedIn profile page
    chrome.tabs.create({ url: 'https://www.linkedin.com/in/me/', active: true })
  }

  function handleParseClick() {
    setStatus('choosing')
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

      // Save the profile
      const { storage } = await import('@/storage')
      const profile = response.profile

      for (const answer of profile.singleAnswers) {
        const existing = await storage.answers.getByType(answer.type)
        if (!existing.some(e => e.value.toLowerCase() === answer.value.toLowerCase())) {
          await storage.answers.save({
            id: `onboarding-${Date.now()}-${answer.type}`,
            type: answer.type,
            value: answer.value,
            display: answer.display || answer.value,
            aliases: [],
            sensitivity: 'normal',
            autofillAllowed: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        }
      }
      await storage.experiences.saveBatch(profile.experiences)

      setStatus('done')
      onDone()
    } catch (err) {
      console.error('LinkedIn parse error:', err)
      setStatus('error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Linkedin className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Import from LinkedIn</h2>
        <p className="text-sm text-gray-600 mt-1">
          The fastest way to set up your profile
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 space-y-3">
        {status === 'choosing' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 text-center font-medium">Choose processing method:</p>

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
                  <p className="text-sm font-medium text-gray-800">Local Processing (Recommended)</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    All processing happens on your device. No data leaves your browser.
                  </p>
                </div>
              </div>
            </button>

            {/* AI Processing Option */}
            <button
              onClick={() => parseProfile(true)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">AI-Enhanced Processing</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Better accuracy for names and dates.
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Data will be sent to AI service (not stored or used for training)
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setStatus('idle')}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : !done && status !== 'done' ? (
          <>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</div>
              <p className="text-sm text-gray-700 flex-1">Open your LinkedIn profile</p>
              <button onClick={openLinkedIn} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Open <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</div>
              <p className="text-sm text-gray-700 flex-1">Click Parse when page loaded</p>
              <button
                onClick={handleParseClick}
                disabled={status === 'parsing'}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {status === 'parsing' ? 'Parsing...' : 'Parse'}
              </button>
            </div>
            {status === 'error' && (
              <p className="text-xs text-red-600 text-center">
                Failed to parse. Make sure you're on a LinkedIn profile page.
              </p>
            )}
            <PrivacyBadge variant="ai-optional" />
          </>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">LinkedIn profile imported!</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={onNext} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-1">
          {done ? 'Continue' : 'Skip'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function ResumeStep({ done, onDone, onNext, onBack }: {
  done: boolean
  onDone: () => void
  onNext: () => void
  onBack: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('parsing')
    setErrorMsg('')

    try {
      const { resumeParser } = await import('@/profileParser')
      const profile = await resumeParser.parse(file)

      const { storage } = await import('@/storage')
      for (const answer of profile.singleAnswers) {
        const existing = await storage.answers.getByType(answer.type)
        if (!existing.some(e => e.value.toLowerCase() === answer.value.toLowerCase())) {
          await storage.answers.save({
            id: `onboarding-resume-${Date.now()}-${answer.type}`,
            type: answer.type,
            value: answer.value,
            display: answer.display || answer.value,
            aliases: [],
            sensitivity: 'normal',
            autofillAllowed: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        }
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

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <FileText className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Upload Your Resume</h2>
        <p className="text-sm text-gray-600 mt-1">
          We'll extract your information automatically
        </p>
      </div>

      <div className="bg-white rounded-xl p-4">
        {!done && status !== 'done' ? (
          <>
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-green-400 hover:bg-green-50/50 transition-colors">
                <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  {status === 'parsing' ? 'Processing...' : 'Click to upload'}
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF, Word, or Image</p>
              </div>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
                onChange={handleFile}
                className="hidden"
                disabled={status === 'parsing'}
              />
            </label>
            <PrivacyBadge />
          </>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">Resume imported!</p>
          </div>
        )}
        {status === 'error' && (
          <p className="text-xs text-red-600 text-center mt-2">{errorMsg}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={onNext} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-1">
          {done ? 'Continue' : 'Skip'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function PracticeStep({ done, onDone, onNext, onBack }: {
  done: boolean
  onDone: () => void
  onNext: () => void
  onBack: () => void
}) {
  const [fields, setFields] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
  })
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    const { storage } = await import('@/storage')

    const mappings: Array<[keyof typeof fields, Taxonomy]> = [
      ['fullName', Taxonomy.FULL_NAME],
      ['email', Taxonomy.EMAIL],
      ['phone', Taxonomy.PHONE],
      ['city', Taxonomy.CITY],
    ]

    for (const [field, type] of mappings) {
      const value = fields[field].trim()
      if (!value) continue

      const existing = await storage.answers.getByType(type)
      if (!existing.some(e => e.value.toLowerCase() === value.toLowerCase())) {
        await storage.answers.save({
          id: `onboarding-practice-${Date.now()}-${type}`,
          type,
          value,
          display: value,
          aliases: [],
          sensitivity: 'normal',
          autofillAllowed: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }
    }

    setSaved(true)
    onDone()
  }

  const hasInput = Object.values(fields).some(v => v.trim())

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <FormInput className="w-6 h-6 text-purple-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Quick Practice</h2>
        <p className="text-sm text-gray-600 mt-1">
          Fill this form using your browser's autofill, then save
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 space-y-3">
        {!done && !saved ? (
          <>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
              <input
                type="text"
                name="name"
                autoComplete="name"
                value={fields.fullName}
                onChange={e => setFields(f => ({ ...f, fullName: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Click and let browser autofill..."
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={fields.email}
                onChange={e => setFields(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Phone</label>
              <input
                type="tel"
                name="tel"
                autoComplete="tel"
                value={fields.phone}
                onChange={e => setFields(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">City</label>
              <input
                type="text"
                name="address-level2"
                autoComplete="address-level2"
                value={fields.city}
                onChange={e => setFields(f => ({ ...f, city: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            {hasInput && (
              <button
                onClick={handleSave}
                className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
              >
                Save to OneFillr
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">Data saved!</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        💡 Tip: Click a field and select from browser suggestions
      </p>

      <PrivacyBadge />

      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={onNext} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-1">
          {done ? 'Continue' : 'Skip'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function FeaturesStep({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const features = [
    {
      icon: Database,
      color: 'blue',
      title: 'Local Knowledge',
      desc: 'View and edit your saved answers',
    },
    {
      icon: Sparkles,
      color: 'purple',
      title: 'Smart Fill',
      desc: 'Click Fill button on any job application',
    },
    {
      icon: Brain,
      color: 'green',
      title: 'Auto Learn',
      desc: 'We learn from forms you fill manually',
    },
    {
      icon: Shield,
      color: 'amber',
      title: 'Privacy First',
      desc: 'Your data stays on your device by default',
    },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">You're All Set!</h2>
        <p className="text-sm text-gray-600 mt-1">
          Here's what you can do with OneFillr
        </p>
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
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={onComplete} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:opacity-90 flex items-center justify-center gap-1">
          Start Using <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
