/**
 * OnboardingHeroDemo - Extension side panel version
 * Mirrors the website's HeroDemo animation (website/components/landing/HeroDemo.tsx)
 * Adapted for the narrower side panel layout (~350px)
 *
 * Keep animation logic in sync with the website version.
 */
import { useState, useEffect } from 'react'
import { Sparkles, Check, Linkedin, FileText, Database, BookOpen, RotateCcw } from 'lucide-react'
import { t } from '@/i18n'

export default function OnboardingHeroDemo() {
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)

  // Same step durations as website but compressed for side panel
  const STEPS = [
    { id: 1, duration: 6000 },
    { id: 2, duration: 8000 },
    { id: 3, duration: 5000 },
  ]

  const TOTAL_DURATION = STEPS.reduce((sum, s) => sum + s.duration, 0)

  const getCurrentStep = () => {
    let accumulated = 0
    for (let i = 0; i < STEPS.length; i++) {
      accumulated += STEPS[i].duration
      if (currentTime < accumulated) return i + 1
    }
    return 3
  }

  const currentStep = getCurrentStep()

  const getStepTime = () => {
    let accumulated = 0
    for (let i = 0; i < currentStep - 1; i++) {
      accumulated += STEPS[i].duration
    }
    return currentTime - accumulated
  }

  const stepTime = getStepTime()

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentTime(t => {
        const newTime = t + 50
        if (newTime >= TOTAL_DURATION) {
          // Loop
          return 0
        }
        return newTime
      })
    }, 50)

    return () => clearInterval(interval)
  }, [isPlaying])

  const handleRestart = () => {
    setCurrentTime(0)
    setIsPlaying(true)
  }

  const stepLabels = [
    t('onboarding.welcome.demoStep1'),
    t('onboarding.welcome.demoStep2'),
    t('onboarding.welcome.demoStep3'),
  ]

  return (
    <div className="relative">
      {/* Step Indicator */}
      <div className="mb-2 flex items-center gap-1.5">
        {STEPS.map((step, i) => (
          <div
            key={step.id}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all ${
              currentStep === i + 1
                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                : currentStep > i + 1
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {currentStep > i + 1 ? (
              <Check className="w-3 h-3" />
            ) : (
              <span>{i + 1}</span>
            )}
            <span className="hidden sm:inline">{stepLabels[i]}</span>
          </div>
        ))}

        <button
          onClick={handleRestart}
          className="ml-auto p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Demo Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {currentStep === 1 && <Step1Content stepTime={stepTime} />}
        {currentStep === 2 && <Step2Content stepTime={stepTime} />}
        {currentStep === 3 && <Step3Content stepTime={stepTime} />}
      </div>
    </div>
  )
}

// Step 1: LinkedIn Import (mirrors website Step1Content)
function Step1Content({ stepTime }: { stepTime: number }) {
  const linkedinUrl = 'linkedin.com/in/johndoe'
  const typingProgress = Math.min(1, stepTime / 1500)
  const typedUrl = linkedinUrl.slice(0, Math.floor(typingProgress * linkedinUrl.length))

  const parseStarted = stepTime >= 2000
  const parseProgress = parseStarted ? Math.min(1, (stepTime - 2000) / 1500) : 0
  const parseComplete = stepTime >= 3500

  const importingData = stepTime >= 3800
  const importProgress = importingData ? Math.min(1, (stepTime - 3800) / 1500) : 0
  const importComplete = stepTime >= 5300

  const importedFields = [
    { name: 'Name', value: 'John Doe' },
    { name: 'Email', value: 'john.doe@gmail.com' },
    { name: 'Phone', value: '+1 (415) 555-1234' },
    { name: 'School', value: 'Stanford, CS' },
  ]

  return (
    <>
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-2 text-white">
        <div className="flex items-center gap-1.5">
          <Linkedin className="w-3.5 h-3.5" />
          <span className="font-medium text-xs">LinkedIn Import</span>
        </div>
      </div>

      <div className="p-3 space-y-2.5 min-h-[130px]">
        {/* URL Input */}
        <div className="flex gap-1.5">
          <div className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs bg-white">
            <span className="text-gray-900">{typedUrl}</span>
            {typingProgress < 1 && (
              <span className="inline-block w-0.5 h-3 bg-blue-500 ml-0.5 animate-pulse" />
            )}
          </div>
          <button
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              parseStarted ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {parseStarted && !parseComplete && (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {parseComplete ? <Check className="w-3 h-3" /> : 'Parse'}
          </button>
        </div>

        {/* Parsing Animation */}
        {parseStarted && !parseComplete && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <div className="flex items-center gap-1.5 text-blue-700 text-[11px]">
              <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              Parsing... {Math.floor(parseProgress * 100)}%
            </div>
            <div className="mt-1 h-1 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${parseProgress * 100}%` }} />
            </div>
          </div>
        )}

        {/* Import to Knowledge Base */}
        {parseComplete && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Database className="w-3 h-3 text-green-600" />
              <span className="text-[11px] font-medium text-gray-900">Save to local DB</span>
              {importComplete && (
                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Done</span>
              )}
            </div>
            <div className="space-y-1">
              {importedFields.map((field, i) => {
                const fieldProgress = Math.max(0, Math.min(1, (importProgress * importedFields.length - i)))
                return fieldProgress > 0 ? (
                  <div key={field.name} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-[11px]">
                    <span className="text-gray-500">{field.name}</span>
                    <span className="text-gray-900 font-medium">{field.value}</span>
                  </div>
                ) : null
              })}
            </div>
          </div>
        )}

        {importComplete && (
          <div className="bg-green-50 border border-green-200 rounded p-2">
            <div className="flex items-center gap-1.5 text-green-700 text-[11px]">
              <Check className="w-3 h-3" />
              Imported 4 fields — stored locally only
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Step 2: Fill + Learn (mirrors website Step2Content)
function Step2Content({ stepTime }: { stepTime: number }) {
  const fillClicked = stepTime >= 800
  const fillProgress = fillClicked ? Math.min(1, (stepTime - 800) / 1200) : 0
  const fillComplete = stepTime >= 2000

  const userTypingStart = 3000
  const userTypingEnd = 5000
  const userTyping = stepTime >= userTypingStart && stepTime < userTypingEnd
  const typingProgress = userTyping ? (stepTime - userTypingStart) / (userTypingEnd - userTypingStart) : stepTime >= userTypingEnd ? 1 : 0

  const learningToast = stepTime >= 5500
  const confirmClicked = stepTime >= 7000

  const fields = [
    { name: 'Full Name', value: 'John Doe', autoFilled: true },
    { name: 'Email', value: 'john.doe@gmail.com', autoFilled: true },
    { name: 'Phone', value: '+1 (415) 555-1234', autoFilled: true },
    { name: 'Salary', value: '$150,000', autoFilled: false, userInput: true },
  ]

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-medium text-xs">Greenhouse ATS</span>
          </div>
          {/* Fill Button */}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
            fillClicked && !fillComplete ? 'bg-white/30' : 'bg-white/20'
          }`}>
            <Sparkles className="w-3 h-3" />
            {fillClicked && !fillComplete ? (
              <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : fillComplete ? 'Filled' : 'Fill'}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-1.5 min-h-[130px]">
        {fields.map((field, i) => {
          const isFilled = field.autoFilled && fillProgress > i / 3
          const isUserField = field.userInput
          const showUserValue = isUserField && typingProgress > 0
          const isTypingThis = isUserField && userTyping

          return (
            <div key={field.name} className="flex items-center gap-2">
              <label className="text-[10px] text-gray-500 w-14 shrink-0">{field.name}</label>
              <div
                className={`flex-1 px-2 py-1 border rounded text-xs transition-all ${
                  isTypingThis ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'
                }`}
              >
                <span className={isFilled || showUserValue ? 'text-gray-900' : 'text-gray-300'}>
                  {isFilled || showUserValue ? field.value : '...'}
                </span>
                {isTypingThis && (
                  <span className="inline-block w-0.5 h-3 bg-blue-500 ml-0.5 animate-pulse" />
                )}
              </div>
              {isFilled && !isUserField && fillComplete && (
                <span className="text-[9px] px-1 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 shrink-0 flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5" /> Auto
                </span>
              )}
              {showUserValue && !userTyping && (
                <span className="text-[9px] px-1 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">New</span>
              )}
            </div>
          )
        })}

        {/* Learning Toast */}
        {learningToast && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2.5 mt-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-xs text-gray-900">New field detected</span>
            </div>
            <p className="text-[10px] text-gray-600 mb-2">
              Save "Expected Salary" to knowledge base?
            </p>
            <div className="flex gap-1.5">
              <button className={`flex-1 px-2 py-1 text-[10px] font-medium rounded transition-all ${
                confirmClicked ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
              }`}>
                {confirmClicked ? <Check className="w-3 h-3 mx-auto" /> : 'Confirm'}
              </button>
              <button className="px-2 py-1 text-[10px] font-medium text-gray-600 border border-gray-200 rounded">
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Step 3: Cross-platform fill (mirrors website Step3Content)
function Step3Content({ stepTime }: { stepTime: number }) {
  const fillClicked = stepTime >= 400
  const fillProgress = fillClicked ? Math.min(1, (stepTime - 400) / 800) : 0
  const fillComplete = stepTime >= 1200

  const fields = [
    { label: 'Name', value: 'John Doe' },
    { label: 'Email', value: 'john.doe@gmail.com' },
    { label: 'Phone', value: '+1 (415) 555-1234' },
    { label: 'Salary', value: '$150,000' },
  ]

  return (
    <>
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-3 py-2 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-medium text-xs">Workday</span>
          </div>
          <span className="text-[10px] text-purple-200">Different form style</span>
        </div>
      </div>

      <div className="p-3 min-h-[130px] relative">
        <div className="bg-gray-50 rounded p-2.5 space-y-1.5">
          {fields.map((field, i) => {
            const isFilled = fillProgress > i / fields.length
            return (
              <div key={field.label} className="flex items-center gap-2">
                <label className="w-12 text-[10px] text-gray-500 text-right shrink-0">{field.label}</label>
                <div className={`flex-1 px-2 py-0.5 border rounded text-xs transition-all ${
                  isFilled ? 'border-purple-300 bg-purple-50 text-gray-900' : 'border-gray-300 bg-white text-gray-400'
                }`}>
                  {isFilled ? field.value : ''}
                </div>
                {isFilled && fillComplete && (
                  <Check className="w-3 h-3 text-green-500 shrink-0" />
                )}
              </div>
            )
          })}
        </div>

        {/* Success overlay */}
        {fillComplete && (
          <div className="absolute inset-0 bg-white/95 rounded-b-xl flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-green-600 font-bold text-sm">All filled!</p>
              <p className="text-gray-400 text-[10px] mt-0.5">0.8s — same data, different form</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
