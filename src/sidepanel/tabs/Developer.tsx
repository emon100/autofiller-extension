import { useState, useEffect } from 'react'
import { Database, Trash2, Download, Upload, CheckCircle, AlertTriangle, User, Building2, GraduationCap, MessageSquare, Send, Bot, Loader2, Clock, XCircle, Sparkles, Play, RotateCcw, Cloud, Key, RefreshCw } from 'lucide-react'
import { Taxonomy, AnswerValue, SENSITIVE_TYPES, FillAnimationConfig, DEFAULT_FILL_ANIMATION_CONFIG } from '@/types'
import { saveLLMLog, getLLMLogs, clearLLMLogs, LLMLogEntry, logLLMRequest, logLLMResponse, logLLMError } from '@/utils/logger'
import { storage } from '@/storage'
import { profileStorage } from '@/storage/profileStorage'

const API_BASE_URL = 'https://www.onefil.help/api'

// Test profiles for development
const TEST_PROFILES = {
  us: {
    name: 'US Developer',
    description: 'Standard US-based developer profile',
    answers: [
      { type: Taxonomy.FULL_NAME, value: 'John Smith', display: 'John Smith' },
      { type: Taxonomy.FIRST_NAME, value: 'John', display: 'John' },
      { type: Taxonomy.LAST_NAME, value: 'Smith', display: 'Smith' },
      { type: Taxonomy.EMAIL, value: 'john.smith@example.com', display: 'john.smith@example.com' },
      { type: Taxonomy.PHONE, value: '+14155551234', display: '+1 (415) 555-1234' },
      { type: Taxonomy.CITY, value: 'San Francisco', display: 'San Francisco' },
      { type: Taxonomy.LOCATION, value: 'San Francisco, CA', display: 'San Francisco, CA' },
      { type: Taxonomy.LINKEDIN, value: 'https://linkedin.com/in/johnsmith', display: 'linkedin.com/in/johnsmith' },
      { type: Taxonomy.GITHUB, value: 'https://github.com/johnsmith', display: 'github.com/johnsmith' },
      { type: Taxonomy.PORTFOLIO, value: 'https://johnsmith.dev', display: 'johnsmith.dev' },
      { type: Taxonomy.SCHOOL, value: 'Stanford University', display: 'Stanford University' },
      { type: Taxonomy.DEGREE, value: "Bachelor's", display: "Bachelor's Degree" },
      { type: Taxonomy.MAJOR, value: 'Computer Science', display: 'Computer Science' },
      { type: Taxonomy.GRAD_DATE, value: '2020-06-01', display: 'June 2020' },
      { type: Taxonomy.GRAD_YEAR, value: '2020', display: '2020' },
      { type: Taxonomy.GRAD_MONTH, value: '06', display: 'June' },
      { type: Taxonomy.WORK_AUTH, value: 'US Citizen', display: 'US Citizen' },
      { type: Taxonomy.NEED_SPONSORSHIP, value: 'No', display: 'No' },
    ],
  },
  cn: {
    name: 'CN Developer',
    description: 'Chinese developer profile with international experience',
    answers: [
      { type: Taxonomy.FULL_NAME, value: 'Wei Zhang', display: 'Wei Zhang' },
      { type: Taxonomy.FIRST_NAME, value: 'Wei', display: 'Wei' },
      { type: Taxonomy.LAST_NAME, value: 'Zhang', display: 'Zhang' },
      { type: Taxonomy.EMAIL, value: 'wei.zhang@example.com', display: 'wei.zhang@example.com' },
      { type: Taxonomy.PHONE, value: '+8613812345678', display: '+86 138 1234 5678' },
      { type: Taxonomy.CITY, value: 'Beijing', display: 'Beijing' },
      { type: Taxonomy.LOCATION, value: 'Beijing, China', display: 'Beijing, China' },
      { type: Taxonomy.LINKEDIN, value: 'https://linkedin.com/in/weizhang', display: 'linkedin.com/in/weizhang' },
      { type: Taxonomy.GITHUB, value: 'https://github.com/weizhang', display: 'github.com/weizhang' },
      { type: Taxonomy.SCHOOL, value: 'Tsinghua University', display: 'Tsinghua University' },
      { type: Taxonomy.DEGREE, value: "Master's", display: "Master's Degree" },
      { type: Taxonomy.MAJOR, value: 'Software Engineering', display: 'Software Engineering' },
      { type: Taxonomy.GRAD_DATE, value: '2022-07-01', display: 'July 2022' },
      { type: Taxonomy.GRAD_YEAR, value: '2022', display: '2022' },
      { type: Taxonomy.GRAD_MONTH, value: '07', display: 'July' },
      { type: Taxonomy.WORK_AUTH, value: 'Requires Visa', display: 'Requires Visa' },
      { type: Taxonomy.NEED_SPONSORSHIP, value: 'Yes', display: 'Yes' },
    ],
  },
  intl: {
    name: 'International',
    description: 'International profile with diverse background',
    answers: [
      { type: Taxonomy.FULL_NAME, value: 'Maria Garcia', display: 'Maria Garcia' },
      { type: Taxonomy.FIRST_NAME, value: 'Maria', display: 'Maria' },
      { type: Taxonomy.LAST_NAME, value: 'Garcia', display: 'Garcia' },
      { type: Taxonomy.EMAIL, value: 'maria.garcia@example.com', display: 'maria.garcia@example.com' },
      { type: Taxonomy.PHONE, value: '+442071234567', display: '+44 20 7123 4567' },
      { type: Taxonomy.CITY, value: 'London', display: 'London' },
      { type: Taxonomy.LOCATION, value: 'London, UK', display: 'London, UK' },
      { type: Taxonomy.LINKEDIN, value: 'https://linkedin.com/in/mariagarcia', display: 'linkedin.com/in/mariagarcia' },
      { type: Taxonomy.GITHUB, value: 'https://github.com/mariagarcia', display: 'github.com/mariagarcia' },
      { type: Taxonomy.PORTFOLIO, value: 'https://mariagarcia.io', display: 'mariagarcia.io' },
      { type: Taxonomy.SCHOOL, value: 'University of Cambridge', display: 'University of Cambridge' },
      { type: Taxonomy.DEGREE, value: 'PhD', display: 'PhD' },
      { type: Taxonomy.MAJOR, value: 'Machine Learning', display: 'Machine Learning' },
      { type: Taxonomy.GRAD_DATE, value: '2023-09-01', display: 'September 2023' },
      { type: Taxonomy.GRAD_YEAR, value: '2023', display: '2023' },
      { type: Taxonomy.GRAD_MONTH, value: '09', display: 'September' },
      { type: Taxonomy.WORK_AUTH, value: 'Work Permit', display: 'Work Permit' },
      { type: Taxonomy.NEED_SPONSORSHIP, value: 'No', display: 'No' },
    ],
  },
}

type ProfileKey = keyof typeof TEST_PROFILES

interface LLMConfig {
  enabled: boolean
  useCustomApi: boolean  // If true, use custom API; if false, use backend API
  provider: 'openai' | 'anthropic' | 'dashscope' | 'deepseek' | 'zhipu' | 'custom'
  apiKey: string
  endpoint?: string
  model?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function Developer() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // LLM Chat Test States
  const [llmConfig, setLLMConfig] = useState<LLMConfig | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [llmLogs, setLLMLogs] = useState<LLMLogEntry[]>([])
  const [showLogs, setShowLogs] = useState(false)

  // Animation config states
  const [animationConfig, setAnimationConfig] = useState<FillAnimationConfig>(DEFAULT_FILL_ANIMATION_CONFIG)
  const [animationTesting, setAnimationTesting] = useState(false)

  // User auth state for backend API
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Demo animation states
  const [animationStage, setAnimationStage] = useState<'idle' | 'scanning' | 'thinking' | 'filling' | 'done'>('idle')
  const [demoInputs, setDemoInputs] = useState([
    { label: 'Full Name', targetValue: 'John Smith', currentValue: '' },
    { label: 'Email', targetValue: 'john.smith@example.com', currentValue: '' },
  ])
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0)
  const [animationProgress, setAnimationProgress] = useState(0)

  useEffect(() => {
    loadLLMConfig()
    loadLLMLogs()
    loadAnimationConfig()
    checkLoginStatus()
  }, [])

  async function checkLoginStatus() {
    try {
      const token = await storage.auth.getAccessToken()
      setIsLoggedIn(!!token)
    } catch {
      setIsLoggedIn(false)
    }
  }

  async function loadLLMConfig() {
    try {
      const result = await chrome.storage.local.get('llmConfig')
      // Default to backend API (useCustomApi: false)
      const defaultConfig: LLMConfig = {
        enabled: true,
        useCustomApi: false,
        provider: 'openai',
        apiKey: '',
      }
      setLLMConfig(result.llmConfig ? { ...defaultConfig, ...result.llmConfig } : defaultConfig)
    } catch {
      setLLMConfig({
        enabled: true,
        useCustomApi: false,
        provider: 'openai',
        apiKey: '',
      })
    }
  }

  async function loadLLMLogs() {
    const logs = await getLLMLogs()
    setLLMLogs(logs)
  }

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

  async function saveAnimationConfig(config: FillAnimationConfig) {
    setAnimationConfig(config)
    await chrome.storage.local.set({ fillAnimationConfig: config })
    showMessage('success', 'Animation config saved')
  }

  function updateAnimationConfig(updates: Partial<FillAnimationConfig>) {
    const newConfig = { ...animationConfig, ...updates }
    saveAnimationConfig(newConfig)
  }

  // Calculate character delay based on total content
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

  // Play demo animation locally
  async function playDemoAnimation() {
    if (animationTesting) return
    setAnimationTesting(true)

    // Reset demo inputs
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

        // Type character by character
        for (let charIdx = 0; charIdx <= targetValue.length; charIdx++) {
          const partialValue = targetValue.substring(0, charIdx)
          setDemoInputs(prev => prev.map((input, idx) =>
            idx === fieldIdx ? { ...input, currentValue: partialValue } : input
          ))

          // Update progress (20% to 95%)
          charsFilled++
          const progress = 20 + (charsFilled / totalChars) * 75
          setAnimationProgress(Math.min(95, progress))

          if (charIdx < targetValue.length) {
            await new Promise(r => setTimeout(r, charDelay))
          }
        }

        // Delay between fields
        if (fieldIdx < demoInputs.length - 1) {
          await new Promise(r => setTimeout(r, animationConfig.fieldDelay))
        }
      }

      // Stage 4: Done
      setAnimationStage('done')
      setAnimationProgress(100)
      await new Promise(r => setTimeout(r, 1500))

      // Reset to idle
      setAnimationStage('idle')

    } catch (err) {
      showMessage('error', 'Animation error')
    } finally {
      setAnimationTesting(false)
    }
  }

  // Reset demo to initial state
  function resetDemo() {
    setAnimationStage('idle')
    setDemoInputs(prev => prev.map(input => ({ ...input, currentValue: '' })))
    setCurrentFieldIndex(0)
    setAnimationProgress(0)
    setAnimationTesting(false)
  }

  async function handleClearLLMLogs() {
    await clearLLMLogs()
    setLLMLogs([])
    showMessage('success', 'LLM logs cleared')
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return

    // Check if using backend API or custom API
    const useBackendApi = !llmConfig?.useCustomApi

    // Validation based on API type
    if (useBackendApi) {
      if (!isLoggedIn) {
        showMessage('error', 'Please login to test backend API')
        return
      }
    } else {
      if (!llmConfig?.apiKey) {
        showMessage('error', 'Please configure API key first')
        return
      }
    }

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatLoading(true)

    const provider = useBackendApi ? 'backend' : llmConfig!.provider
    const model = useBackendApi ? 'AI Gateway' : (llmConfig!.model || 'gpt-4o-mini')
    const startTime = Date.now()

    // Log request
    logLLMRequest(provider, model, userMessage)
    await saveLLMLog({
      type: 'request',
      provider,
      model,
      prompt: userMessage,
      endpoint: useBackendApi ? API_BASE_URL : (llmConfig!.provider === 'custom' ? llmConfig!.endpoint : undefined),
    })

    try {
      let assistantMessage: string
      let latencyMs: number
      let tokenUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined

      if (useBackendApi) {
        // Call backend API for testing
        const token = await storage.auth.getAccessToken()
        if (!token) throw new Error('Not logged in')

        const response = await fetch(`${API_BASE_URL}/llm/classify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            fields: [{
              index: 0,
              labelText: 'Test field',
              name: 'test',
              id: 'test',
              type: 'text',
              placeholder: userMessage, // Use user message as context for testing
              surroundingText: userMessage,
            }],
          }),
        })

        latencyMs = Date.now() - startTime

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          if (response.status === 402) {
            throw new Error(`Insufficient credits: ${errorData.balance || 0} remaining`)
          }
          throw new Error(`Backend API error ${response.status}: ${errorData.error || 'Unknown'}`)
        }

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Request failed')
        }

        assistantMessage = `✅ Backend API test successful!\n\nCredits used: ${data.creditsUsed}\nResults: ${JSON.stringify(data.results, null, 2)}`
      } else {
        // Call custom API
        let endpoint: string
        let headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        let body: object

        // Provider endpoint mapping
        const PROVIDER_ENDPOINTS: Record<string, string> = {
          openai: 'https://api.openai.com/v1/chat/completions',
          dashscope: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
          deepseek: 'https://api.deepseek.com/v1/chat/completions',
          zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
          anthropic: 'https://api.anthropic.com/v1/messages',
        }

        if (provider === 'anthropic') {
          endpoint = PROVIDER_ENDPOINTS.anthropic
          headers['x-api-key'] = llmConfig!.apiKey
          headers['anthropic-version'] = '2023-06-01'
          body = {
            model,
            max_tokens: 500,
            messages: [{ role: 'user', content: userMessage }],
          }
        } else if (provider === 'custom') {
          // Custom endpoint (OpenAI compatible)
          endpoint = llmConfig!.endpoint || ''
          if (!endpoint) throw new Error('Custom endpoint URL not configured')
          headers['Authorization'] = `Bearer ${llmConfig!.apiKey}`
          body = {
            model,
            messages: [{ role: 'user', content: userMessage }],
            max_tokens: 500,
          }
          // Debug log for custom endpoint
          console.log('[LLM Test] Custom endpoint request:', {
            endpoint,
            hasAuthHeader: !!headers['Authorization'],
            model,
          })
        } else {
          // OpenAI compatible providers: openai, dashscope, deepseek, zhipu
          endpoint = PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openai
          headers['Authorization'] = `Bearer ${llmConfig!.apiKey}`
          body = {
            model,
            messages: [{ role: 'user', content: userMessage }],
            max_tokens: 500,
          }
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })

        latencyMs = Date.now() - startTime

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API Error ${response.status}: ${errorText}`)
        }

        const data = await response.json()

        if (provider === 'anthropic') {
          assistantMessage = data.content?.[0]?.text || 'No response'
        } else {
          assistantMessage = data.choices?.[0]?.message?.content || 'No response'
        }

        tokenUsage = data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined
      }

      // Log response
      logLLMResponse(provider, model, assistantMessage, latencyMs)
      await saveLLMLog({
        type: 'response',
        provider,
        model,
        response: assistantMessage,
        latencyMs,
        tokenUsage,
      })

      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }])
      showMessage('success', `LLM response received (${latencyMs}ms)`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      logLLMError(provider, model, errorMessage)
      await saveLLMLog({
        type: 'error',
        provider,
        model,
        error: errorMessage,
      })
      setChatMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${errorMessage}` }])
      showMessage('error', `LLM error: ${errorMessage}`)
    } finally {
      setChatLoading(false)
      await loadLLMLogs()
    }
  }

  function generateId(): string {
    return crypto.randomUUID()
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  async function loadTestProfile(profileKey: ProfileKey) {
    setLoading(true)
    try {
      const profile = TEST_PROFILES[profileKey]
      const now = Date.now()

      const answers: AnswerValue[] = profile.answers.map((a) => ({
        id: generateId(),
        type: a.type,
        value: a.value,
        display: a.display,
        aliases: [],
        sensitivity: SENSITIVE_TYPES.has(a.type) ? 'sensitive' : 'normal',
        autofillAllowed: !SENSITIVE_TYPES.has(a.type),
        createdAt: now,
        updatedAt: now,
      }))

      // Create a new profile and write answers to its namespaced key
      const newProfile = await profileStorage.create(profile.name)
      await profileStorage.setActiveId(newProfile.id)

      const answersMap: Record<string, AnswerValue> = {}
      for (const answer of answers) {
        answersMap[answer.id] = answer
      }
      const answersKey = profileStorage.getAnswersKey(newProfile.id)
      await chrome.storage.local.set({ [answersKey]: answersMap })
      showMessage('success', `Created profile "${profile.name}" with ${answers.length} fields`)
    } catch (err) {
      showMessage('error', 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  async function clearAllData() {
    if (!confirm('This will delete ALL stored data including answers, observations, and settings. Continue?')) {
      return
    }

    setLoading(true)
    try {
      await chrome.storage.local.clear()
      showMessage('success', 'All data cleared')
    } catch (err) {
      showMessage('error', 'Failed to clear data')
    } finally {
      setLoading(false)
    }
  }

  async function clearAnswersOnly() {
    if (!confirm('This will delete all saved answers and experiences. Continue?')) {
      return
    }

    setLoading(true)
    try {
      await chrome.storage.local.remove(['answers', 'experiences'])
      showMessage('success', 'All answers and experiences deleted')
    } catch (err) {
      showMessage('error', 'Failed to delete answers')
    } finally {
      setLoading(false)
    }
  }

  async function exportData() {
    setLoading(true)
    try {
      const data = await chrome.storage.local.get(null)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `autofiller-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showMessage('success', 'Data exported successfully')
    } catch (err) {
      showMessage('error', 'Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  async function importData() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setLoading(true)
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const ALLOWED_KEYS = ['answers', 'observations', 'siteSettings', 'experiences', 'fillAnimationConfig']
        const sanitized: Record<string, unknown> = {}
        for (const key of ALLOWED_KEYS) {
          if (key in data) sanitized[key] = data[key]
        }
        if (Object.keys(sanitized).length === 0) {
          showMessage('error', 'No valid data keys found in file')
          setLoading(false)
          return
        }
        await chrome.storage.local.set(sanitized)
        showMessage('success', `Imported ${Object.keys(sanitized).length} data keys successfully`)
      } catch (err) {
        showMessage('error', 'Failed to import data - invalid format')
      } finally {
        setLoading(false)
      }
    }
    input.click()
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-5 h-5 text-purple-600" />
          <h3 className="font-medium text-purple-900">Test Profiles</h3>
        </div>
        <p className="text-xs text-purple-700 mb-4">
          Load pre-configured test data for development and testing
        </p>

        <div className="space-y-2">
          {(Object.keys(TEST_PROFILES) as ProfileKey[]).map((key) => {
            const profile = TEST_PROFILES[key]
            const IconComponent = key === 'us' ? User : key === 'cn' ? Building2 : GraduationCap
            return (
              <button
                key={key}
                onClick={() => loadTestProfile(key)}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-colors text-left disabled:opacity-50"
              >
                <IconComponent className="w-5 h-5 text-purple-500" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm">{profile.name}</div>
                  <div className="text-xs text-gray-500 truncate">{profile.description}</div>
                </div>
                <span className="text-xs text-purple-600 font-medium">
                  {profile.answers.length} fields
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* LLM Chat Test */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-blue-900">LLM Connection Test</h3>
        </div>

        {/* Show different UI based on API mode */}
        {!llmConfig?.useCustomApi ? (
          // Backend API Mode
          <>
            <div className="text-xs text-blue-700 mb-3 flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              <span>Using: <span className="font-medium">Backend API (AI Gateway)</span></span>
              {isLoggedIn ? (
                <span className="text-green-600 ml-2">✓ Logged in</span>
              ) : (
                <span className="text-amber-600 ml-2">⚠️ Login required</span>
              )}
            </div>

            {!isLoggedIn ? (
              <div className="text-xs text-amber-700 bg-amber-100 p-3 rounded-lg">
                Please login in the Settings tab to test backend API
              </div>
            ) : (
              <ChatUI
                chatMessages={chatMessages}
                chatLoading={chatLoading}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChatMessage={sendChatMessage}
                clearChat={() => setChatMessages([])}
                placeholder="Enter field context to test classification..."
              />
            )}
          </>
        ) : (
          // Custom API Mode
          <>
            {!llmConfig?.apiKey ? (
              <div className="text-xs text-blue-700 bg-blue-100 p-3 rounded-lg">
                Please configure Custom LLM API key in Settings tab first
              </div>
            ) : (
              <>
                <div className="text-xs text-blue-700 mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  <span>Using: <span className="font-medium">Custom API ({llmConfig.provider})</span></span>
                </div>
                <div className="text-xs text-blue-700 mb-3">
                  Model: <span className="font-medium">{llmConfig.model || 'default'}</span>
                  {llmConfig.provider === 'custom' && llmConfig.endpoint && (
                    <>
                      <br />
                      Endpoint: <span className="font-medium text-blue-600">{llmConfig.endpoint}</span>
                    </>
                  )}
                  {llmConfig.provider === 'custom' && !llmConfig.endpoint && (
                    <span className="text-red-500 ml-2">Endpoint not configured</span>
                  )}
                </div>

                <ChatUI
                  chatMessages={chatMessages}
                  chatLoading={chatLoading}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  sendChatMessage={sendChatMessage}
                  clearChat={() => setChatMessages([])}
                  placeholder="Type a test message..."
                />
              </>
            )}
          </>
        )}
      </div>

      {/* LLM Logs */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">LLM Logs</h3>
            <span className="text-xs text-gray-500">({llmLogs.length})</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              {showLogs ? 'Hide' : 'Show'}
            </button>
            {llmLogs.length > 0 && (
              <button
                onClick={handleClearLLMLogs}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {showLogs && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {llmLogs.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">No logs yet</div>
            ) : (
              llmLogs.map((log, idx) => (
                <div key={idx} className={`text-xs p-2 rounded border ${
                  log.type === 'error'
                    ? 'bg-red-50 border-red-200'
                    : log.type === 'request'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {log.type === 'error' ? (
                      <XCircle className="w-3 h-3 text-red-500" />
                    ) : log.type === 'request' ? (
                      <Send className="w-3 h-3 text-yellow-600" />
                    ) : (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                    <span className="font-medium">{log.type.toUpperCase()}</span>
                    <span className="text-gray-500">{log.provider}/{log.model}</span>
                    <span className="text-gray-400 ml-auto flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {log.endpoint && (
                    <div className="text-blue-600 truncate">Endpoint: {log.endpoint}</div>
                  )}
                  {log.prompt && (
                    <div className="text-gray-700 truncate">Prompt: {log.prompt}</div>
                  )}
                  {log.response && (
                    <div className="text-gray-700 truncate">Response: {log.response}</div>
                  )}
                  {log.error && (
                    <div className="text-red-600">Error: {log.error}</div>
                  )}
                  {log.latencyMs && (
                    <div className="text-gray-500">Latency: {log.latencyMs}ms</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Fill Animation Config */}
      <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-medium text-indigo-900">Fill Animation</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-indigo-700">Enabled</span>
            <input
              type="checkbox"
              checked={animationConfig.enabled}
              onChange={(e) => updateAnimationConfig({ enabled: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
          </label>
        </div>

        <p className="text-xs text-indigo-700 mb-4">
          Typewriter effect with Scanning → Thinking → Filling stages
        </p>

        <div className="space-y-4">
          {/* Max Duration */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-indigo-800">Max Duration</span>
              <span className="font-medium text-indigo-900">{animationConfig.maxDuration}s</span>
            </div>
            <input
              type="range"
              min="3"
              max="20"
              step="1"
              value={animationConfig.maxDuration}
              onChange={(e) => updateAnimationConfig({ maxDuration: Number(e.target.value) })}
              className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Char Delay Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-indigo-800">Min Char Delay</span>
                <span className="font-medium text-indigo-900">{animationConfig.minCharDelay}ms</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={animationConfig.minCharDelay}
                onChange={(e) => updateAnimationConfig({ minCharDelay: Number(e.target.value) })}
                className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-indigo-800">Max Char Delay</span>
                <span className="font-medium text-indigo-900">{animationConfig.maxCharDelay}ms</span>
              </div>
              <input
                type="range"
                min="30"
                max="150"
                step="10"
                value={animationConfig.maxCharDelay}
                onChange={(e) => updateAnimationConfig({ maxCharDelay: Number(e.target.value) })}
                className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Stage Delays */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-indigo-800">Scanning Stage</span>
                <span className="font-medium text-indigo-900">{animationConfig.stageDelays.scanning}ms</span>
              </div>
              <input
                type="range"
                min="200"
                max="2000"
                step="100"
                value={animationConfig.stageDelays.scanning}
                onChange={(e) => updateAnimationConfig({
                  stageDelays: { ...animationConfig.stageDelays, scanning: Number(e.target.value) }
                })}
                className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-indigo-800">Thinking Stage</span>
                <span className="font-medium text-indigo-900">{animationConfig.stageDelays.thinking}ms</span>
              </div>
              <input
                type="range"
                min="200"
                max="2000"
                step="100"
                value={animationConfig.stageDelays.thinking}
                onChange={(e) => updateAnimationConfig({
                  stageDelays: { ...animationConfig.stageDelays, thinking: Number(e.target.value) }
                })}
                className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Field Delay */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-indigo-800">Field Delay</span>
              <span className="font-medium text-indigo-900">{animationConfig.fieldDelay}ms</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="50"
              value={animationConfig.fieldDelay}
              onChange={(e) => updateAnimationConfig({ fieldDelay: Number(e.target.value) })}
              className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Demo Preview */}
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-lg p-4 mt-4">
            {/* Stage Indicator */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-lg">
                {animationStage === 'idle' && '⏸️'}
                {animationStage === 'scanning' && '🔍'}
                {animationStage === 'thinking' && '🧠'}
                {animationStage === 'filling' && '✍️'}
                {animationStage === 'done' && '✨'}
              </span>
              <span className="text-white font-medium">
                {animationStage === 'idle' && 'Ready'}
                {animationStage === 'scanning' && 'Scanning...'}
                {animationStage === 'thinking' && 'Thinking...'}
                {animationStage === 'filling' && `Filling: ${demoInputs[currentFieldIndex]?.label || ''}`}
                {animationStage === 'done' && 'Complete!'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all duration-100"
                style={{ width: `${animationProgress}%` }}
              />
            </div>

            {/* Demo Input Fields */}
            <div className="space-y-3">
              {demoInputs.map((input, idx) => (
                <div key={idx}>
                  <label className="text-xs text-indigo-200 mb-1 block">{input.label}</label>
                  <div className={`relative bg-white rounded-lg overflow-hidden ${
                    animationStage === 'filling' && currentFieldIndex === idx ? 'ring-2 ring-indigo-400' : ''
                  }`}>
                    <input
                      type="text"
                      value={input.currentValue}
                      readOnly
                      placeholder={input.targetValue}
                      className="w-full px-3 py-2 text-sm text-gray-800 bg-transparent outline-none"
                    />
                    {animationStage === 'filling' && currentFieldIndex === idx && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-600 animate-pulse" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={playDemoAnimation}
              disabled={animationTesting || !animationConfig.enabled}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {animationTesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {animationTesting ? 'Playing...' : 'Play Demo'}
            </button>
            <button
              onClick={resetDemo}
              disabled={animationTesting}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">Data Management</h3>

        <div className="space-y-2">
          <button
            onClick={exportData}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export All Data
          </button>

          <button
            onClick={importData}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Data
          </button>
        </div>
      </div>

      {/* Debug Tools */}
      <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-5 h-5 text-amber-600" />
          <h3 className="font-medium text-amber-900">Debug Tools</h3>
        </div>

        <div className="space-y-2">
          <button
            onClick={async () => {
              await chrome.storage.local.remove('onboardingComplete')
              showMessage('success', 'Onboarding reset. Reload the extension to see it.')
              // Trigger a storage change event to refresh App.tsx
              window.location.reload()
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Restart Onboarding Flow
          </button>

          <button
            onClick={async () => {
              await chrome.storage.local.remove('userConsent')
              showMessage('success', 'Consent reset. Reload the extension.')
              window.location.reload()
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Consent Dialog
          </button>
        </div>
        <p className="text-xs text-amber-600 mt-2">
          Use these to test the first-run experience without clearing all data.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-red-200 p-4">
        <h3 className="font-medium text-red-900 mb-3">Danger Zone</h3>

        <div className="space-y-2">
          <button
            onClick={clearAnswersOnly}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete All Saved Answers
          </button>

          <button
            onClick={clearAllData}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </button>
        </div>
        <p className="text-xs text-red-600 mt-2">
          This will permanently delete saved data and cannot be undone.
        </p>
      </div>
    </div>
  )
}

// Extracted chat UI component to avoid duplication
interface ChatUIProps {
  chatMessages: ChatMessage[]
  chatLoading: boolean
  chatInput: string
  setChatInput: (value: string) => void
  sendChatMessage: () => void
  clearChat: () => void
  placeholder: string
}

function ChatUI({ chatMessages, chatLoading, chatInput, setChatInput, sendChatMessage, clearChat, placeholder }: ChatUIProps) {
  return (
    <>
      {chatMessages.length > 0 && (
        <div className="bg-white rounded-lg border border-blue-200 p-2 mb-3 max-h-48 overflow-y-auto">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`text-xs p-2 rounded mb-1 ${
              msg.role === 'user'
                ? 'bg-blue-100 text-blue-800 ml-4'
                : 'bg-gray-100 text-gray-800 mr-4'
            }`}>
              <span className="font-medium">{msg.role === 'user' ? 'You' : 'AI'}:</span> {msg.content}
            </div>
          ))}
          {chatLoading && (
            <div className="flex items-center gap-2 text-xs text-blue-600 p-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Waiting for response...
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
          placeholder={placeholder}
          disabled={chatLoading}
          className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={sendChatMessage}
          disabled={chatLoading || !chatInput.trim()}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {chatMessages.length > 0 && (
        <button
          onClick={clearChat}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800"
        >
          Clear chat
        </button>
      )}
    </>
  )
}
