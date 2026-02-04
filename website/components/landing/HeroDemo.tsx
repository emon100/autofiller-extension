'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, Check, ArrowRight, Zap, Play, RotateCcw, FileText, Linkedin, Database, BookOpen } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

/**
 * HeroDemo - 三步演示 OneFillr 的核心功能
 */

export default function HeroDemo() {
  const { t } = useI18n()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  // 三个步骤的配置
  const STEPS = [
    {
      id: 1,
      title: t('demo.steps.import.title'),
      description: t('demo.steps.import.description'),
      duration: 8000,
    },
    {
      id: 2,
      title: t('demo.steps.fillAndLearn.title'),
      description: t('demo.steps.fillAndLearn.description'),
      duration: 10000,
    },
    {
      id: 3,
      title: t('demo.steps.crossPlatform.title'),
      description: t('demo.steps.crossPlatform.description'),
      duration: 6000,
    },
  ]

  const TOTAL_DURATION = STEPS.reduce((sum, s) => sum + s.duration, 0)

  // 计算当前步骤
  const getCurrentStep = () => {
    let accumulated = 0
    for (let i = 0; i < STEPS.length; i++) {
      accumulated += STEPS[i].duration
      if (currentTime < accumulated) return i + 1
    }
    return 3
  }

  const currentStep = getCurrentStep()
  const currentStepConfig = STEPS[currentStep - 1]

  // 计算当前步骤内的时间
  const getStepTime = () => {
    let accumulated = 0
    for (let i = 0; i < currentStep - 1; i++) {
      accumulated += STEPS[i].duration
    }
    return currentTime - accumulated
  }

  const stepTime = getStepTime()

  // 动画循环
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentTime(t => {
        const newTime = t + 50
        if (newTime >= TOTAL_DURATION) {
          setIsPlaying(false)
          return TOTAL_DURATION
        }
        return newTime
      })
    }, 50)

    return () => clearInterval(interval)
  }, [isPlaying])

  const handleStart = () => {
    setHasStarted(true)
    setIsPlaying(true)
    setCurrentTime(0)
  }

  const handleRestart = () => {
    setCurrentTime(0)
    setIsPlaying(true)
  }

  // 未开始时显示封面
  if (!hasStarted) {
    return (
      <div className="relative max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Preview Image */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 px-6 py-12 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('demo.heroTitle')}</h3>
            <p className="text-blue-100 text-sm mb-6">
              {t('demo.heroSubtitle')}
            </p>
            <button
              onClick={handleStart}
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
            >
              <Play className="w-5 h-5" />
              {t('demo.startDemo')}
            </button>
          </div>

          {/* Step Preview */}
          <div className="p-4 bg-gray-50">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {STEPS.map((step, i) => (
                <div key={step.id} className="p-2">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-1 text-gray-600 font-medium">
                    {i + 1}
                  </div>
                  <p className="text-gray-600 line-clamp-2">{step.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 flex justify-center">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {t('demo.tryInteractive')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative max-w-lg mx-auto">
      {/* Step Indicator */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {STEPS.map((step, i) => (
            <div
              key={step.id}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                currentStep === i + 1
                  ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-200'
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
              <span className="hidden sm:inline">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Description */}
      <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">{t('demo.step', { number: currentStep })}：</span>
          {currentStepConfig.description}
        </p>
      </div>

      {/* Demo Content */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-visible">
        {currentStep === 1 && <Step1Content stepTime={stepTime} />}
        {currentStep === 2 && <Step2Content stepTime={stepTime} />}
        {currentStep === 3 && <Step3Content stepTime={stepTime} />}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={handleRestart}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <Link
          href="/demo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {t('demo.interactiveDemo')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

// Step 1: 导入 LinkedIn 资料
function Step1Content({ stepTime }: { stepTime: number }) {
  const linkedinUrl = 'linkedin.com/in/johndoe'
  const typingProgress = Math.min(1, stepTime / 2000)
  const typedUrl = linkedinUrl.slice(0, Math.floor(typingProgress * linkedinUrl.length))

  const parseStarted = stepTime >= 2500
  const parseProgress = parseStarted ? Math.min(1, (stepTime - 2500) / 2000) : 0
  const parseComplete = stepTime >= 4500

  const importingData = stepTime >= 5000
  const importProgress = importingData ? Math.min(1, (stepTime - 5000) / 2000) : 0
  const importComplete = stepTime >= 7000

  const importedFields = [
    { name: '姓名', value: 'John Doe' },
    { name: '邮箱', value: 'john.doe@gmail.com' },
    { name: '电话', value: '+1 (415) 555-1234' },
    { name: '学历', value: 'Stanford University, CS' },
    { name: '工作经历', value: '5 years at Google' },
  ]

  return (
    <>
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 text-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Linkedin className="w-4 h-4" />
          <span className="font-medium text-sm">导入 LinkedIn 资料</span>
        </div>
      </div>

      <div className="p-5 space-y-4 min-h-[300px]">
        {/* URL Input */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn 个人主页链接</label>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <span className="text-gray-900">{typedUrl}</span>
              {typingProgress < 1 && (
                <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
              )}
            </div>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                parseStarted
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {parseStarted && !parseComplete && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {parseComplete ? <Check className="w-4 h-4" /> : '解析'}
            </button>
          </div>
        </div>

        {/* Parsing Animation */}
        {parseStarted && !parseComplete && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 animate-fade-in">
            <div className="flex items-center gap-2 text-blue-700 text-sm">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              正在解析 LinkedIn 页面... {Math.floor(parseProgress * 100)}%
            </div>
            <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${parseProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Import to Knowledge Base */}
        {parseComplete && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900">导入到本地知识库</span>
              {importComplete && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  完成
                </span>
              )}
            </div>
            <div className="space-y-2">
              {importedFields.map((field, i) => {
                const fieldProgress = Math.max(0, Math.min(1, (importProgress * importedFields.length - i)))
                const isVisible = fieldProgress > 0

                return isVisible ? (
                  <div
                    key={field.name}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-sm animate-slide-in-right"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <span className="text-gray-600">{field.name}</span>
                    <span className="text-gray-900 font-medium">{field.value}</span>
                  </div>
                ) : null
              })}
            </div>
          </div>
        )}

        {importComplete && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 animate-fade-in">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <Check className="w-4 h-4" />
              已导入 5 个字段到知识库，数据仅存储在本地
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Step 2: 填写表单 + 学习新内容
function Step2Content({ stepTime }: { stepTime: number }) {
  const fillClicked = stepTime >= 1000
  const fillProgress = fillClicked ? Math.min(1, (stepTime - 1000) / 1500) : 0
  const fillComplete = stepTime >= 2500

  const userTypingStart = 4000
  const userTypingEnd = 6500
  const userTyping = stepTime >= userTypingStart && stepTime < userTypingEnd
  const typingProgress = userTyping ? (stepTime - userTypingStart) / (userTypingEnd - userTypingStart) : stepTime >= userTypingEnd ? 1 : 0

  const learningToast = stepTime >= 7000
  const confirmClicked = stepTime >= 9000

  const fields = [
    { name: 'Full Name', value: 'John Doe', autoFilled: true },
    { name: 'Email', value: 'john.doe@gmail.com', autoFilled: true },
    { name: 'Phone', value: '+1 (415) 555-1234', autoFilled: true },
    { name: 'Years of Experience', value: '5', autoFilled: false, userInput: true },
    { name: 'Expected Salary', value: '$150,000', autoFilled: false, userInput: true },
  ]

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-white rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="font-medium text-sm">Greenhouse Application</span>
          </div>
          <span className="text-xs text-emerald-200">标准 ATS 表单</span>
        </div>
      </div>

      <div className="p-4 space-y-3 min-h-[300px] relative">
        {fields.map((field, i) => {
          const isFilled = field.autoFilled && fillProgress > i / 3
          const isUserField = field.userInput
          const showUserValue = isUserField && typingProgress > (i - 3) / 2
          const isTypingThis = isUserField && userTyping && i === 3 + Math.floor(typingProgress * 2)

          return (
            <div key={field.name} className="relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">{field.name}</label>
              <div
                className={`w-full px-3 py-2 border rounded-lg text-sm transition-all ${
                  isTypingThis ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-300'
                }`}
              >
                <span className={isFilled || showUserValue ? 'text-gray-900' : 'text-gray-400'}>
                  {isFilled || showUserValue ? field.value : `Enter ${field.name.toLowerCase()}`}
                </span>
                {isTypingThis && (
                  <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
                )}
              </div>

              {/* Badges */}
              {isFilled && !isUserField && fillComplete && (
                <div className="absolute -right-1 top-6 translate-x-full">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    <Check className="w-3 h-3" />
                    已填
                  </span>
                </div>
              )}
              {showUserValue && (
                <div className="absolute -right-1 top-6 translate-x-full">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    新增
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {/* Fill Button */}
        <div className="absolute -right-2 bottom-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex items-center overflow-hidden">
            <button
              className={`px-3 py-2 text-xs font-medium text-white flex items-center gap-1.5 transition-all ${
                fillClicked && !fillComplete ? 'bg-blue-700' : 'bg-gradient-to-r from-blue-500 to-blue-600'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Fill
              {fillClicked && !fillComplete && (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
            </button>
          </div>
        </div>

        {/* Learning Toast */}
        {learningToast && (
          <div className="absolute -right-4 top-4 animate-slide-in-right z-10">
            <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-56">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">学习到新内容</span>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                检测到 2 个新字段，是否保存到知识库？
              </p>
              <div className="flex gap-2">
                <button
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    confirmClicked
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {confirmClicked ? <Check className="w-3 h-3 mx-auto" /> : '确认保存'}
                </button>
                <button className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg">
                  跳过
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Step 3: 不同表单样式快速填充
function Step3Content({ stepTime }: { stepTime: number }) {
  const fillClicked = stepTime >= 500
  const fillProgress = fillClicked ? Math.min(1, (stepTime - 500) / 800) : 0
  const fillComplete = stepTime >= 1300

  const fields = [
    { label: '申请人姓名', value: 'John Doe' },
    { label: '联系邮箱', value: 'john.doe@gmail.com' },
    { label: '手机号码', value: '+1 (415) 555-1234' },
    { label: '工作年限', value: '5' },
    { label: '期望薪资', value: '$150,000' },
  ]

  return (
    <>
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-5 py-3 text-white rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="font-medium text-sm">Workday 申请表</span>
          </div>
          <span className="text-xs text-purple-200">完全不同的表单样式</span>
        </div>
      </div>

      <div className="p-4 min-h-[300px] relative">
        {/* Different form style - horizontal layout */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          {fields.map((field, i) => {
            const isFilled = fillProgress > i / fields.length

            return (
              <div key={field.label} className="flex items-center gap-4">
                <label className="w-24 text-xs font-medium text-gray-600 text-right shrink-0">
                  {field.label}
                </label>
                <div
                  className={`flex-1 px-3 py-1.5 border rounded text-sm transition-all ${
                    isFilled ? 'border-purple-300 bg-purple-50' : 'border-gray-300 bg-white'
                  }`}
                >
                  <span className={isFilled ? 'text-gray-900' : 'text-gray-400'}>
                    {isFilled ? field.value : ''}
                  </span>
                </div>
                {isFilled && fillComplete && (
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                )}
              </div>
            )
          })}
        </div>

        {/* Fill Button */}
        <div className="absolute -right-2 bottom-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex items-center overflow-hidden">
            <button
              className={`px-3 py-2 text-xs font-medium text-white flex items-center gap-1.5 transition-all ${
                fillClicked && !fillComplete ? 'bg-purple-700' : 'bg-gradient-to-r from-purple-500 to-pink-600'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Fill
              {fillClicked && !fillComplete && (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
            </button>
          </div>
        </div>

        {/* Success Message - extends beyond container to cover the Fill button */}
        {fillComplete && (
          <div className="absolute -inset-2 -right-16 bg-white/95 rounded-2xl flex items-center justify-center animate-fade-in z-20">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-green-600 font-bold text-lg">5 字段全部填充！</p>
              <p className="text-gray-500 text-sm mt-1">用时 0.8 秒</p>
              <p className="text-gray-400 text-xs mt-2">
                不同表单样式，相同的极速体验
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
