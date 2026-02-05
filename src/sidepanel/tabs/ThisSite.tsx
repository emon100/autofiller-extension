import { useState, useEffect } from 'react'
import { Globe, Trash2 } from 'lucide-react'
import type { SiteSettings } from '@/types'

export default function ThisSite() {
  const [siteKey, setSiteKey] = useState<string>('')
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [stats, setStats] = useState({ recorded: 0, filled: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCurrentSite()
  }, [])

  async function loadCurrentSite() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.url) {
        const url = new URL(tab.url)
        const key = url.hostname
        setSiteKey(key)
        
        const result = await chrome.storage.local.get(['siteSettings', 'observations', 'activityLog'])
        const allSettings = result.siteSettings || {}
        setSettings(allSettings[key] || null)
        
        const observations = result.observations || {}
        const activityLog = result.activityLog || []
        
        const siteObservations = Object.values(observations).filter(
          (obs: unknown) => (obs as { siteKey: string }).siteKey === key
        )
        const siteFills = activityLog.filter(
          (log: { siteKey: string; action: string }) => 
            log.siteKey === key && log.action === 'fill'
        )
        
        setStats({
          recorded: siteObservations.length,
          filled: siteFills.length,
        })
      }
    } catch {
      setSiteKey('')
    } finally {
      setLoading(false)
    }
  }

  async function toggleSetting(settingKey: 'recordEnabled' | 'autofillEnabled') {
    if (!siteKey) return

    const result = await chrome.storage.local.get('siteSettings')
    const allSettings = result.siteSettings || {}

    const current = allSettings[siteKey] || {
      siteKey,
      recordEnabled: true,
      autofillEnabled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    current[settingKey] = !current[settingKey]
    current.updatedAt = Date.now()
    allSettings[siteKey] = current

    await chrome.storage.local.set({ siteSettings: allSettings })
    setSettings(current)
  }

  async function clearSiteData() {
    if (!siteKey) return
    if (!confirm(`Clear all data for ${siteKey}?`)) return
    
    const result = await chrome.storage.local.get(['observations', 'siteSettings'])
    const observations = result.observations || {}
    const siteSettings = result.siteSettings || {}
    
    const filteredObservations: Record<string, unknown> = {}
    for (const [id, obs] of Object.entries(observations)) {
      if ((obs as { siteKey: string }).siteKey !== siteKey) {
        filteredObservations[id] = obs
      }
    }
    
    delete siteSettings[siteKey]
    
    await chrome.storage.local.set({ 
      observations: filteredObservations,
      siteSettings 
    })
    
    setSettings(null)
    setStats({ recorded: 0, filled: 0 })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    )
  }

  const recordEnabled = settings?.recordEnabled ?? true
  const autofillEnabled = settings?.autofillEnabled ?? false // Default OFF for security

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-3 border border-blue-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <Globe className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-800 text-sm">{siteKey || 'Unknown'}</p>
            <p className="text-xs text-gray-500">Current site</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-white rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">Record Mode</p>
              <p className="text-xs text-gray-500">Learn inputs</p>
            </div>
            <ToggleSwitch enabled={recordEnabled} onToggle={() => toggleSetting('recordEnabled')} />
          </div>
          
          <div className="flex items-center justify-between p-2 bg-white rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">Auto-Fill</p>
              <p className="text-xs text-gray-500">Fill automatically</p>
            </div>
            <ToggleSwitch enabled={autofillEnabled} onToggle={() => toggleSetting('autofillEnabled')} />
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl p-3">
        <p className="text-xs font-medium text-gray-500 mb-2">Statistics</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-blue-600">{stats.recorded}</p>
            <p className="text-xs text-gray-500">Recorded</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-green-600">{stats.filled}</p>
            <p className="text-xs text-gray-500">Filled</p>
          </div>
        </div>
      </div>

      <button
        onClick={clearSiteData}
        className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Clear Site Data
      </button>
    </div>
  )
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={enabled}
        onChange={onToggle}
      />
      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform"></div>
    </label>
  )
}
