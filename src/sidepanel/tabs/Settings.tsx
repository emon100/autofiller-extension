import { useState, useEffect } from 'react'
import { Key, Server, CheckCircle, Code2, Type, User, CreditCard, LogIn, LogOut, ExternalLink, Infinity, RefreshCw, Loader2, Globe, Sparkles, Gift } from 'lucide-react'
import { storage } from '@/storage'
import { AuthUser, CreditsInfo } from '@/types'
import { launchLogin } from '@/utils/authLogin'
import PrivacySection from '../components/PrivacySection'
import { t, getUserPreference, setLocale, Locale } from '@/i18n'

const WEBSITE_URL = 'https://www.onefil.help'

interface LLMConfig {
  enabled: boolean
  useCustomApi: boolean  // New: whether to use custom API instead of backend
  provider: 'openai' | 'anthropic' | 'dashscope' | 'deepseek' | 'zhipu' | 'custom'
  apiKey: string
  endpoint?: string
  model?: string
  disableThinking?: boolean
}

const DEFAULT_CONFIG: LLMConfig = {
  enabled: true,  // LLM is enabled by default (uses backend API)
  useCustomApi: false,  // Default to backend API
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  disableThinking: false,
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
  const [devModeEnabled, setDevModeEnabled] = useState(false)
  const [fillAnimationEnabled, setFillAnimationEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [language, setLanguage] = useState<Locale>(getUserPreference())

  // Account state
  const [user, setUser] = useState<AuthUser | null>(null)
  const [credits, setCredits] = useState<CreditsInfo | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [refreshingCredits, setRefreshingCredits] = useState(false)

  useEffect(() => {
    (async () => {
      const result = await chrome.storage.local.get(['llmConfig', 'devSettings', 'fillAnimationConfig'])
      if (result.llmConfig) setConfig({ ...DEFAULT_CONFIG, ...result.llmConfig })
      if (result.devSettings) setDevModeEnabled(result.devSettings.devModeEnabled ?? false)
      if (result.fillAnimationConfig) setFillAnimationEnabled(result.fillAnimationConfig.enabled ?? true)

      const authState = await storage.auth.getAuthState()
      if (authState && authState.expiresAt > Date.now()) {
        setUser(authState.user)
        setCredits(await storage.auth.fetchCredits())
      }
      setLoadingAuth(false)
    })()
  }, [])

  async function handleLogin() {
    setLoggingIn(true)
    setLoginError('')

    const result = await launchLogin()
    if (result.success && result.user) {
      setUser(result.user)
      setCredits(await storage.auth.fetchCredits())
    } else if (result.error) {
      setLoginError(result.error)
    }

    setLoggingIn(false)
  }

  async function handleRefreshCredits() {
    setRefreshingCredits(true)
    setCredits(await storage.auth.fetchCredits())
    setRefreshingCredits(false)
  }

  async function handleLogout() {
    await storage.auth.clearAuthState()
    setUser(null)
    setCredits(null)
  }

  async function toggleDevMode() {
    const newValue = !devModeEnabled
    setDevModeEnabled(newValue)
    await chrome.storage.local.set({ devSettings: { devModeEnabled: newValue } })
  }

  async function toggleFillAnimation() {
    const newValue = !fillAnimationEnabled
    setFillAnimationEnabled(newValue)
    await chrome.storage.local.set({ fillAnimationConfig: { enabled: newValue } })
  }

  async function handleLanguageChange(newLocale: Locale) {
    setLanguage(newLocale)
    await setLocale(newLocale)
    // Reload the page to apply the new language
    window.location.reload()
  }

  async function saveConfig() {
    setSaving(true)
    await chrome.storage.local.set({ llmConfig: config })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  function handleProviderChange(provider: LLMConfig['provider']) {
    setConfig(prev => ({
      ...prev,
      provider,
      model: '',
      endpoint: provider === 'custom' ? (prev.endpoint || '') : undefined,
    }))
  }

  const currentProvider = PROVIDERS.find(p => p.id === config.provider)

  return (
    <div className="space-y-4">
      {/* Account Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-5 h-5 text-blue-500" />
          <h3 className="font-medium text-gray-900">{t('settings.account')}</h3>
        </div>

        {loadingAuth ? (
          <div className="text-sm text-gray-500">{t('settings.loading')}</div>
        ) : user ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-4 h-4" />
                {t('settings.signOut')}
              </button>
            </div>

            {/* Credits Display */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">{t('settings.credits')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefreshCredits}
                    disabled={refreshingCredits}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Refresh credits"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshingCredits ? 'animate-spin' : ''}`} />
                  </button>
                  <div className="text-right">
                    {credits?.subscription ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <Infinity className="w-4 h-4" />
                        <span className="text-sm font-semibold">{t('settings.unlimited')}</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">
                        {credits?.balance ?? '...'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {credits?.subscription && (
                <p className="text-xs text-gray-500 mt-1">
                  {credits.subscription.planId} - {t('settings.renews')} {new Date(credits.subscription.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <a
              href={`${WEBSITE_URL}/pricing`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              {t('settings.buyCredits')}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {t('settings.loginDesc')}
            </p>
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Gift className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs font-medium text-amber-700">{t('settings.loginBonus')}</p>
            </div>
            <button
              onClick={handleLogin}
              disabled={loggingIn}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('settings.loggingIn')}
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {t('settings.login')}
                </>
              )}
            </button>
            {loginError && (
              <p className="text-xs text-red-500">{loginError}</p>
            )}
            <p className="text-xs text-gray-500 text-center">
              {t('settings.noAccountNeeded')}
            </p>
          </div>
        )}
      </div>

      {/* AI Enhancement Section - Simple toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="font-medium text-gray-900">{t('settings.aiEnhancement')}</h3>
              <p className="text-xs text-gray-500">
                {user
                  ? t('settings.aiEnhancementDesc')
                  : t('settings.aiEnhancementLoginRequired')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const newConfig = { ...config, enabled: !config.enabled }
              setConfig(newConfig)
              chrome.storage.local.set({ llmConfig: newConfig })
            }}
            disabled={!user && !config.useCustomApi}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.enabled ? 'bg-purple-600' : 'bg-gray-200'
            } ${!user && !config.useCustomApi ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {config.enabled && user && !config.useCustomApi && (
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {t('settings.usingBackendApi')}
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-2">{t('settings.about')}</h3>
        <p className="text-xs text-gray-500">
          OneFillr v1.0.0
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {t('settings.aboutDesc')}
        </p>
      </div>

      {/* Language Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            <h3 className="font-medium text-gray-900">{t('settings.language')}</h3>
          </div>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as Locale)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="auto">{t('settings.language.auto')}</option>
            <option value="en">{t('settings.language.en')}</option>
            <option value="zh">{t('settings.language.zh')}</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-green-500" />
            <div>
              <h3 className="font-medium text-gray-900">{t('settings.typingAnimation')}</h3>
              <p className="text-xs text-gray-500">{t('settings.typingAnimationDesc')}</p>
            </div>
          </div>
          <button
            onClick={toggleFillAnimation}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              fillAnimationEnabled ? 'bg-green-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                fillAnimationEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Privacy Section */}
      <PrivacySection
        llmEnabled={config.enabled}
        llmProvider={config.useCustomApi ? (PROVIDERS.find(p => p.id === config.provider)?.name || config.provider) : 'Backend API'}
      />

      {/* Developer Mode */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="font-medium text-gray-900">{t('settings.devMode')}</h3>
              <p className="text-xs text-gray-500">{t('settings.devModeDesc')}</p>
            </div>
          </div>
          <button
            onClick={toggleDevMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              devModeEnabled ? 'bg-purple-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                devModeEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Custom LLM API - Only visible in dev mode */}
        {devModeEnabled && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('settings.useCustomApi')}
                </label>
                <p className="text-xs text-gray-500">{t('settings.useCustomApiDesc')}</p>
              </div>
              <button
                onClick={() => setConfig(prev => ({ ...prev, useCustomApi: !prev.useCustomApi }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.useCustomApi ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.useCustomApi ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {config.useCustomApi && (
              <div className="space-y-3 pl-2 border-l-2 border-blue-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings.llm.provider')}
                  </label>
                  <select
                    value={config.provider}
                    onChange={(e) => handleProviderChange(e.target.value as LLMConfig['provider'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
                      {t('settings.llm.apiKey')}
                    </div>
                  </label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {currentProvider && currentProvider.models.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings.llm.model')}
                    </label>
                    <input
                      type="text"
                      list={`models-${config.provider}`}
                      value={config.model || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                      placeholder={t('settings.llm.modelPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id={`models-${config.provider}`}>
                      {currentProvider.models.map(m => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                )}

                {config.provider === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('settings.llm.modelName')}
                      </label>
                      <input
                        type="text"
                        value={config.model || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                        placeholder="e.g., gpt-4o-mini"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <div className="flex items-center gap-1">
                          <Server className="w-3.5 h-3.5" />
                          {t('settings.llm.endpoint')}
                        </div>
                      </label>
                      <input
                        type="url"
                        value={config.endpoint || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                        placeholder="https://api.example.com/v1/chat/completions"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saved ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {t('settings.saved')}
                    </>
                  ) : (
                    t('settings.save')
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
