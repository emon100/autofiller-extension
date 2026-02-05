import { useState, useEffect } from 'react'
import { Sparkles, Check, Linkedin, FileText, Database } from 'lucide-react'

/**
 * Simplified HeroDemo for extension onboarding.
 * Shows the 3-step workflow: Import → Fill+Learn → Cross-platform fill
 */
export default function OnboardingHeroDemo() {
  const [currentTime, setCurrentTime] = useState(0)

  const STEP_DURATIONS = [6000, 7000, 4000]
  const TOTAL = STEP_DURATIONS.reduce((a, b) => a + b, 0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(t => {
        const next = t + 60
        if (next >= TOTAL) {
          // Loop
          return 0
        }
        return next
      })
    }, 60)
    return () => clearInterval(interval)
  }, [])

  let stepTime = currentTime
  let step = 0
  for (let i = 0; i < STEP_DURATIONS.length; i++) {
    if (stepTime < STEP_DURATIONS[i]) { step = i; break }
    stepTime -= STEP_DURATIONS[i]
    if (i === STEP_DURATIONS.length - 1) step = i
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-xs">
      {/* Step indicator */}
      <div className="flex border-b border-gray-100">
        {['Import', 'Fill', 'Done'].map((label, i) => (
          <div
            key={i}
            className={`flex-1 text-center py-1.5 text-[10px] font-medium transition-colors ${
              step === i ? 'bg-blue-50 text-blue-700' : step > i ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            {step > i ? <Check className="w-3 h-3 inline" /> : `${i + 1}.`} {label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 min-h-[140px]">
        {step === 0 && <Step1 time={stepTime} />}
        {step === 1 && <Step2 time={stepTime} />}
        {step === 2 && <Step3 time={stepTime} />}
      </div>
    </div>
  )
}

function Step1({ time }: { time: number }) {
  const fields = [
    { name: 'Name', value: 'John Doe' },
    { name: 'Email', value: 'john@gmail.com' },
    { name: 'Phone', value: '+1 415-555-1234' },
    { name: 'School', value: 'Stanford, CS' },
  ]
  const parseProgress = Math.min(1, time / 2500)
  const parseDone = time >= 2500
  const importProgress = parseDone ? Math.min(1, (time - 2800) / 2500) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-blue-700">
        <Linkedin className="w-3.5 h-3.5" />
        <span className="font-medium">LinkedIn Import</span>
      </div>

      {!parseDone && (
        <div className="bg-blue-50 rounded-lg p-2">
          <div className="flex items-center gap-1.5 text-blue-600 text-[11px]">
            <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
            Parsing... {Math.floor(parseProgress * 100)}%
          </div>
          <div className="mt-1 h-1 bg-blue-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${parseProgress * 100}%` }} />
          </div>
        </div>
      )}

      {parseDone && (
        <div className="space-y-1">
          {fields.map((f, i) => {
            const visible = importProgress > i / fields.length
            if (!visible) return null
            return (
              <div key={f.name} className="flex justify-between bg-gray-50 px-2 py-1 rounded text-[11px]">
                <span className="text-gray-500">{f.name}</span>
                <span className="text-gray-800 font-medium">{f.value}</span>
              </div>
            )
          })}
        </div>
      )}

      {importProgress >= 1 && (
        <div className="flex items-center gap-1 text-green-600 text-[11px]">
          <Database className="w-3 h-3" />
          <Check className="w-3 h-3" />
          Saved to local knowledge base
        </div>
      )}
    </div>
  )
}

function Step2({ time }: { time: number }) {
  const fields = [
    { name: 'Full Name', value: 'John Doe', auto: true },
    { name: 'Email', value: 'john@gmail.com', auto: true },
    { name: 'Phone', value: '+1 415-555-1234', auto: true },
    { name: 'Salary', value: '$150,000', auto: false },
  ]
  const fillProgress = Math.min(1, time / 1500)
  const fillDone = time >= 1800
  const userTyping = time >= 3000 && time < 5000
  const userDone = time >= 5000
  const learnToast = time >= 5500

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-emerald-700">
          <FileText className="w-3.5 h-3.5" />
          <span className="font-medium">Greenhouse ATS</span>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
          fillDone ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-600'
        }`}>
          <Sparkles className="w-3 h-3" />
          {fillDone ? 'Filled' : 'Filling...'}
        </div>
      </div>

      {fields.map((f, i) => {
        const isFilled = f.auto && fillProgress > i / 3
        const isUser = !f.auto && (userTyping || userDone)
        const value = isFilled || isUser ? f.value : ''
        return (
          <div key={f.name} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-14 shrink-0">{f.name}</span>
            <div className={`flex-1 px-2 py-1 border rounded text-[11px] ${
              !f.auto && userTyping ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'
            }`}>
              <span className={value ? 'text-gray-800' : 'text-gray-300'}>{value || '...'}</span>
              {!f.auto && userTyping && <span className="inline-block w-0.5 h-3 bg-blue-500 ml-0.5 animate-pulse" />}
            </div>
            {isFilled && fillDone && <Check className="w-3 h-3 text-green-500 shrink-0" />}
            {isUser && userDone && (
              <span className="text-[9px] px-1 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-200 shrink-0">New</span>
            )}
          </div>
        )
      })}

      {learnToast && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-[11px] text-blue-700 flex items-center gap-1.5">
          <span>💡</span> New field detected! Saved to knowledge base.
        </div>
      )}
    </div>
  )
}

function Step3({ time }: { time: number }) {
  const fillProgress = Math.min(1, time / 800)
  const done = time >= 1200

  const fields = ['Name', 'Email', 'Phone', 'Salary']

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-purple-700">
        <FileText className="w-3.5 h-3.5" />
        <span className="font-medium">Workday</span>
        <span className="text-[10px] text-purple-400 ml-auto">Different form style</span>
      </div>

      <div className="bg-gray-50 rounded-lg p-2 space-y-1">
        {fields.map((name, i) => {
          const filled = fillProgress > i / fields.length
          return (
            <div key={name} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 w-10 text-right shrink-0">{name}</span>
              <div className={`flex-1 px-2 py-0.5 border rounded text-[11px] transition-colors ${
                filled ? 'border-purple-300 bg-purple-50 text-gray-800' : 'border-gray-200 text-gray-300'
              }`}>
                {filled ? '••••••' : ''}
              </div>
              {filled && done && <Check className="w-3 h-3 text-green-500 shrink-0" />}
            </div>
          )
        })}
      </div>

      {done && (
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-1.5 text-green-600 font-medium text-[11px]">
            <Check className="w-4 h-4" />
            All filled in 0.8s!
          </div>
        </div>
      )}
    </div>
  )
}
