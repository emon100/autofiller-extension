import { useState } from 'react'
import { Shield, Database, Brain, ExternalLink, Check, X } from 'lucide-react'
import { setConsentState, createConsentPreferences } from '@/consent'
import { t } from '@/i18n'

interface ConsentModalProps {
  onConsent: () => void
  onDecline: () => void
}

const PRIVACY_POLICY_URL = 'https://www.onefil.help/privacy'

export default function ConsentModal({ onConsent, onDecline }: ConsentModalProps) {
  const [llmDataSharing, setLlmDataSharing] = useState(true)
  const [acknowledgedPolicy, setAcknowledgedPolicy] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleAccept() {
    if (!acknowledgedPolicy) return

    setSaving(true)
    try {
      const preferences = createConsentPreferences({
        dataCollection: true,
        llmDataSharing,
        acknowledgedPrivacyPolicy: acknowledgedPolicy,
      })
      await setConsentState(preferences)
      onConsent()
    } catch (error) {
      console.error('Failed to save consent:', error)
    } finally {
      setSaving(false)
    }
  }

  function handleDecline() {
    onDecline()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('consent.title')}</h2>
              <p className="text-blue-100 text-sm">{t('consent.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Local Storage Info */}
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('consent.localStorage.title')}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('consent.localStorage.desc')}
              </p>
            </div>
          </div>

          {/* AI Feature Toggle */}
          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{t('consent.ai.title')}</h3>
                <button
                  onClick={() => setLlmDataSharing(!llmDataSharing)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    llmDataSharing ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      llmDataSharing ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {t('consent.ai.desc')}
              </p>
            </div>
          </div>

          {/* Privacy Policy Acknowledgement */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="pt-0.5">
              <input
                type="checkbox"
                checked={acknowledgedPolicy}
                onChange={(e) => setAcknowledgedPolicy(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div className="text-sm text-gray-700">
              {t('consent.policyAck')}{' '}
              <a
                href={PRIVACY_POLICY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                {t('consent.privacyPolicy')}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleDecline}
            className="flex-1 px-4 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            {t('consent.decline')}
          </button>
          <button
            onClick={handleAccept}
            disabled={!acknowledgedPolicy || saving}
            className={`flex-1 px-4 py-2.5 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              acknowledgedPolicy && !saving
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            {saving ? t('consent.saving') : t('consent.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
