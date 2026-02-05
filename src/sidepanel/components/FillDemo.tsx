import { useState, useEffect } from 'react'
import { Play, RotateCcw, Loader2 } from 'lucide-react'
import { FillAnimationConfig, DEFAULT_FILL_ANIMATION_CONFIG } from '@/types'

interface DemoInput {
  label: string
  targetValue: string
  currentValue: string
}

interface FillDemoProps {
  /** Auto-play on mount */
  autoPlay?: boolean
  /** Show control buttons */
  showControls?: boolean
  /** Compact mode for smaller spaces */
  compact?: boolean
  /** Custom demo inputs */
  inputs?: Array<{ label: string; value: string }>
  /** Callback when animation completes */
  onComplete?: () => void
}

const DEFAULT_INPUTS = [
  { label: 'Full Name', value: 'John Smith' },
  { label: 'Email', value: 'john.smith@example.com' },
]

export default function FillDemo({
  autoPlay = false,
  showControls = true,
  compact = false,
  inputs = DEFAULT_INPUTS,
  onComplete,
}: FillDemoProps) {
  const [animationConfig, setAnimationConfig] = useState<FillAnimationConfig>(DEFAULT_FILL_ANIMATION_CONFIG)
  const [animationStage, setAnimationStage] = useState<'idle' | 'scanning' | 'thinking' | 'filling' | 'done'>('idle')
  const [demoInputs, setDemoInputs] = useState<DemoInput[]>(
    inputs.map(i => ({ label: i.label, targetValue: i.value, currentValue: '' }))
  )
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    loadAnimationConfig()
  }, [])

  useEffect(() => {
    if (autoPlay && !isPlaying && animationStage === 'idle') {
      const timer = setTimeout(() => playAnimation(), 500)
      return () => clearTimeout(timer)
    }
  }, [autoPlay, animationStage])

  async function loadAnimationConfig() {
    try {
      const result = await chrome.storage.local.get('fillAnimationConfig')
      if (result.fillAnimationConfig) {
        setAnimationConfig({ ...DEFAULT_FILL_ANIMATION_CONFIG, ...result.fillAnimationConfig })
      }
    } catch {
      // Use defaults
    }
  }

  function calculateCharDelay(): number {
    const totalChars = demoInputs.reduce((sum, input) => sum + input.targetValue.length, 0)
    const totalFields = demoInputs.length
    const stageTime = animationConfig.stageDelays.scanning + animationConfig.stageDelays.thinking
    const fieldDelayTime = totalFields * animationConfig.fieldDelay
    const availableTime = (animationConfig.maxDuration * 1000) - stageTime - fieldDelayTime

    if (totalChars === 0) return animationConfig.minCharDelay
    const calculatedDelay = availableTime / totalChars
    return Math.max(animationConfig.minCharDelay, Math.min(animationConfig.maxCharDelay, calculatedDelay))
  }

  async function playAnimation() {
    if (isPlaying) return
    setIsPlaying(true)

    // Reset
    setDemoInputs(prev => prev.map(input => ({ ...input, currentValue: '' })))
    setCurrentFieldIndex(0)
    setAnimationProgress(0)

    const charDelay = calculateCharDelay()

    try {
      // Stage 1: Scanning
      setAnimationStage('scanning')
      setAnimationProgress(5)
      await new Promise(r => setTimeout(r, animationConfig.stageDelays.scanning))

      // Stage 2: Thinking
      setAnimationStage('thinking')
      setAnimationProgress(15)
      await new Promise(r => setTimeout(r, animationConfig.stageDelays.thinking))

      // Stage 3: Filling
      setAnimationStage('filling')
      const totalChars = demoInputs.reduce((sum, input) => sum + input.targetValue.length, 0)
      let charsFilled = 0

      for (let fieldIdx = 0; fieldIdx < demoInputs.length; fieldIdx++) {
        setCurrentFieldIndex(fieldIdx)
        const targetValue = demoInputs[fieldIdx].targetValue

        for (let charIdx = 0; charIdx <= targetValue.length; charIdx++) {
          const partialValue = targetValue.substring(0, charIdx)
          setDemoInputs(prev => prev.map((input, idx) =>
            idx === fieldIdx ? { ...input, currentValue: partialValue } : input
          ))

          charsFilled++
          const progress = 20 + (charsFilled / totalChars) * 75
          setAnimationProgress(Math.min(95, progress))

          if (charIdx < targetValue.length) {
            await new Promise(r => setTimeout(r, charDelay))
          }
        }

        if (fieldIdx < demoInputs.length - 1) {
          await new Promise(r => setTimeout(r, animationConfig.fieldDelay))
        }
      }

      // Stage 4: Done
      setAnimationStage('done')
      setAnimationProgress(100)
      await new Promise(r => setTimeout(r, 1500))

      onComplete?.()

      // Reset to idle
      setAnimationStage('idle')
    } finally {
      setIsPlaying(false)
    }
  }

  function resetDemo() {
    setAnimationStage('idle')
    setDemoInputs(prev => prev.map(input => ({ ...input, currentValue: '' })))
    setCurrentFieldIndex(0)
    setAnimationProgress(0)
    setIsPlaying(false)
  }

  const stageEmoji = {
    idle: '⏸️',
    scanning: '🔍',
    thinking: '🧠',
    filling: '✍️',
    done: '✨'
  }[animationStage]

  const stageText = {
    idle: 'Ready',
    scanning: 'Scanning...',
    thinking: 'Thinking...',
    filling: `Filling: ${demoInputs[currentFieldIndex]?.label || ''}`,
    done: 'Complete!'
  }[animationStage]

  return (
    <div className={`bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl ${compact ? 'p-3' : 'p-4'}`}>
      {/* Stage Indicator */}
      <div className={`flex items-center justify-center gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
        <span className={compact ? 'text-base' : 'text-lg'}>{stageEmoji}</span>
        <span className={`text-white font-medium ${compact ? 'text-sm' : ''}`}>{stageText}</span>
      </div>

      {/* Progress Bar */}
      <div className={`h-1.5 bg-white/20 rounded-full overflow-hidden ${compact ? 'mb-3' : 'mb-4'}`}>
        <div
          className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all duration-100"
          style={{ width: `${animationProgress}%` }}
        />
      </div>

      {/* Demo Input Fields */}
      <div className={compact ? 'space-y-2' : 'space-y-3'}>
        {demoInputs.map((input, idx) => (
          <div key={idx}>
            <label className={`text-indigo-200 mb-1 block ${compact ? 'text-[10px]' : 'text-xs'}`}>{input.label}</label>
            <div className={`relative bg-white rounded-lg overflow-hidden ${
              animationStage === 'filling' && currentFieldIndex === idx ? 'ring-2 ring-indigo-400' : ''
            }`}>
              <input
                type="text"
                value={input.currentValue}
                readOnly
                placeholder={input.targetValue}
                className={`w-full text-gray-800 bg-transparent outline-none ${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
              />
              {animationStage === 'filling' && currentFieldIndex === idx && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-600 animate-pulse" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      {showControls && (
        <div className={`flex gap-2 ${compact ? 'pt-2' : 'pt-3'}`}>
          <button
            onClick={playAnimation}
            disabled={isPlaying}
            className={`flex-1 flex items-center justify-center gap-2 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors ${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
          >
            {isPlaying ? (
              <Loader2 className={`animate-spin ${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
            ) : (
              <Play className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            )}
            {isPlaying ? 'Playing...' : 'Play'}
          </button>
          <button
            onClick={resetDemo}
            disabled={isPlaying}
            className={`flex items-center justify-center gap-2 font-medium text-indigo-200 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors ${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
          >
            <RotateCcw className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          </button>
        </div>
      )}
    </div>
  )
}
