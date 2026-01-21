import { useState, useEffect } from 'react'
import { Database, Trash2, Download, Upload, CheckCircle, AlertTriangle, User, Building2, GraduationCap, MessageSquare, Send, Bot, Loader2, Clock, XCircle } from 'lucide-react'
import { Taxonomy, AnswerValue, SENSITIVE_TYPES } from '@/types'
import { saveLLMLog, getLLMLogs, clearLLMLogs, LLMLogEntry, logLLMRequest, logLLMResponse, logLLMError } from '@/utils/logger'

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

  useEffect(() => {
    loadLLMConfig()
    loadLLMLogs()
  }, [])

  async function loadLLMConfig() {
    try {
      const result = await chrome.storage.local.get('llmConfig')
      setLLMConfig(result.llmConfig || null)
    } catch {
      setLLMConfig(null)
    }
  }

  async function loadLLMLogs() {
    const logs = await getLLMLogs()
    setLLMLogs(logs)
  }

  async function handleClearLLMLogs() {
    await clearLLMLogs()
    setLLMLogs([])
    showMessage('success', 'LLM logs cleared')
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || !llmConfig?.apiKey || chatLoading) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatLoading(true)

    const provider = llmConfig.provider
    const model = llmConfig.model || 'gpt-4o-mini'
    const startTime = Date.now()

    // Log request
    logLLMRequest(provider, model, userMessage)
    await saveLLMLog({
      type: 'request',
      provider,
      model,
      prompt: userMessage,
    })

    try {
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
        headers['x-api-key'] = llmConfig.apiKey
        headers['anthropic-version'] = '2023-06-01'
        body = {
          model,
          max_tokens: 500,
          messages: [{ role: 'user', content: userMessage }],
        }
      } else if (provider === 'custom') {
        // Custom endpoint
        endpoint = llmConfig.endpoint || ''
        if (!endpoint) throw new Error('Custom endpoint URL not configured')
        headers['Authorization'] = `Bearer ${llmConfig.apiKey}`
        body = {
          model,
          messages: [{ role: 'user', content: userMessage }],
          max_tokens: 500,
        }
      } else {
        // OpenAI compatible providers: openai, dashscope, deepseek, zhipu
        endpoint = PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openai
        headers['Authorization'] = `Bearer ${llmConfig.apiKey}`
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

      const latencyMs = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      let assistantMessage: string

      if (provider === 'anthropic') {
        assistantMessage = data.content?.[0]?.text || 'No response'
      } else {
        assistantMessage = data.choices?.[0]?.message?.content || 'No response'
      }

      // Log response
      logLLMResponse(provider, model, assistantMessage, latencyMs)
      await saveLLMLog({
        type: 'response',
        provider,
        model,
        response: assistantMessage,
        latencyMs,
        tokenUsage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
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

      // Convert to object format expected by storage
      const answersMap: Record<string, AnswerValue> = {}
      for (const answer of answers) {
        answersMap[answer.id] = answer
      }
      await chrome.storage.local.set({ answers: answersMap })
      showMessage('success', `Loaded "${profile.name}" profile with ${answers.length} fields`)
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
        await chrome.storage.local.set(data)
        showMessage('success', 'Data imported successfully')
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

        {!llmConfig?.apiKey ? (
          <div className="text-xs text-blue-700 bg-blue-100 p-3 rounded-lg">
            ⚠️ Please configure LLM API key in Settings tab first
          </div>
        ) : (
          <>
            <div className="text-xs text-blue-700 mb-3">
              Provider: <span className="font-medium">{llmConfig.provider}</span> |
              Model: <span className="font-medium">{llmConfig.model || 'default'}</span>
            </div>

            {/* Chat Messages */}
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

            {/* Chat Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type a test message..."
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
                onClick={() => setChatMessages([])}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                Clear chat
              </button>
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
