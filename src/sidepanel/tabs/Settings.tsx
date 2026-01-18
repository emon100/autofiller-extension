import { useState, useEffect } from 'react'
import { Key, Cloud, Server, CheckCircle, Code2 } from 'lucide-react'

interface LLMConfig {
  enabled: boolean
  provider: 'openai' | 'anthropic' | 'dashscope' | 'deepseek' | 'zhipu' | 'custom'
  apiKey: string
  endpoint?: string
  model?: string
}

interface DevSettings {
  devModeEnabled: boolean
}

const DEFAULT_CONFIG: LLMConfig = {
  enabled: false,
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
}

const DEFAULT_DEV_SETTINGS: DevSettings = {
  devModeEnabled: false,
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'], endpoint: 'https://api.openai.com/v1/chat/completions' },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229'], endpoint: 'https://api.anthropic.com/v1/messages' },
  { id: 'dashscope', name: 'Aliyun DashScope (通义千问)', models: ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen-long'], endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' },
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'], endpoint: 'https://api.deepseek.com/v1/chat/completions' },
  { id: 'zhipu', name: 'Zhipu AI (智谱)', models: ['glm-4-flash', 'glm-4', 'glm-4-plus'], endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions' },
  { id: 'custom', name: 'Custom Endpoint', models: [], endpoint: '' },
] as const

export default function Settings() {
  const [config, setConfig] = useState<LLMConfig>(DEFAULT_CONFIG)
  const [devSettings, setDevSettings] = useState<DevSettings>(DEFAULT_DEV_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadConfig()
    loadDevSettings()
  }, [])

  async function loadConfig() {
    try {
      const result = await chrome.storage.local.get('llmConfig')
      if (result.llmConfig) {
        setConfig({ ...DEFAULT_CONFIG, ...result.llmConfig })
      }
    } catch {
      setConfig(DEFAULT_CONFIG)
    }
  }

  async function loadDevSettings() {
    try {
      const result = await chrome.storage.local.get('devSettings')
      if (result.devSettings) {
        setDevSettings({ ...DEFAULT_DEV_SETTINGS, ...result.devSettings })
      }
    } catch {
      setDevSettings(DEFAULT_DEV_SETTINGS)
    }
  }

  async function toggleDevMode() {
    const newSettings = { ...devSettings, devModeEnabled: !devSettings.devModeEnabled }
    setDevSettings(newSettings)
    await chrome.storage.local.set({ devSettings: newSettings })
  }

  async function saveConfig() {
    setSaving(true)
    try {
      await chrome.storage.local.set({ llmConfig: config })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function handleProviderChange(provider: LLMConfig['provider']) {
    setConfig(prev => ({
      ...prev,
      provider,
      // 切换 provider 时清空模型，让用户自己选择或输入
      model: '',
      endpoint: provider === 'custom' ? (prev.endpoint || '') : undefined,
    }))
  }

  const currentProvider = PROVIDERS.find(p => p.id === config.provider)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            <h3 className="font-medium text-gray-900">LLM Classification</h3>
          </div>
          <button
            onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mb-4">
          Use AI to classify ambiguous form fields. Requires API key.
        </p>

        {config.enabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider
              </label>
              <select
                value={config.provider}
                onChange={(e) => handleProviderChange(e.target.value as LLMConfig['provider'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <Key className="w-3.5 h-3.5" />
                  API Key
                </div>
              </label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder={config.provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {currentProvider && currentProvider.models.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  list={`models-${config.provider}`}
                  value={config.model || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="Select or type model name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <datalist id={`models-${config.provider}`}>
                  {currentProvider.models.map(m => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500 mt-1">
                  Select from list or type custom model name
                </p>
              </div>
            ) : config.provider === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Name
                </label>
                <input
                  type="text"
                  value={config.model || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="e.g., glm-4-flash, qwen-turbo, deepseek-chat"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the model name for your API
                </p>
              </div>
            )}

            {config.provider === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-1">
                    <Server className="w-3.5 h-3.5" />
                    Endpoint URL
                  </div>
                </label>
                <input
                  type="url"
                  value={config.endpoint || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                  placeholder="https://your-api.com/v1/chat"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <button
              onClick={saveConfig}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Saved
                </>
              ) : saving ? (
                'Saving...'
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-2">About</h3>
        <p className="text-xs text-gray-500">
          AutoFiller v1.0.0
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Smart form auto-filler for job applications.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="font-medium text-gray-900">Developer Mode</h3>
              <p className="text-xs text-gray-500">Enable developer tools tab</p>
            </div>
          </div>
          <button
            onClick={toggleDevMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              devSettings.devModeEnabled ? 'bg-purple-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                devSettings.devModeEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
