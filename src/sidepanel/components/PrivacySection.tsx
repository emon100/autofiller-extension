import { useState, useEffect } from 'react'
import { Shield, Database, Trash2, RefreshCw, ExternalLink, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { storage } from '@/storage'
import { getConsentState, setConsentState, createConsentPreferences, ConsentPreferences } from '@/consent'
import { t } from '@/i18n'

const PRIVACY_POLICY_URL = 'https://www.onefil.help/privacy'

interface DataSummary {
  answersCount: number
  experiencesCount: number
  observationsCount: number
}

interface PrivacySectionProps {
  llmEnabled: boolean
  llmProvider: string
}

export default function PrivacySection({ llmEnabled, llmProvider }: PrivacySectionProps) {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null)
  const [dataSummary, setDataSummary] = useState<DataSummary>({ answersCount: 0, experiencesCount: 0, observationsCount: 0 })
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [consentState, answers, experiences, observations] = await Promise.all([
        getConsentState(),
        storage.answers.getAll(),
        storage.experiences.getAll(),
        storage.observations.getRecent(1000),
      ])
      setConsent(consentState)
      setDataSummary({
        answersCount: answers.length,
        experiencesCount: experiences.length,
        observationsCount: observations.length,
      })
    } catch (error) {
      console.error('Failed to load privacy data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleLLMConsent() {
    if (!consent) return

    const newConsent = createConsentPreferences({
      dataCollection: consent.dataCollection,
      llmDataSharing: !consent.llmDataSharing,
      acknowledgedPrivacyPolicy: consent.acknowledgedPrivacyPolicy,
    })
    await setConsentState(newConsent)
    setConsent(newConsent)
  }

  async function handleDeleteAllData() {
    setDeleting(true)
    try {
      await storage.clearAll()
      setDataSummary({ answersCount: 0, experiencesCount: 0, observationsCount: 0 })
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Failed to delete data:', error)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-500" />
          <h3 className="font-medium text-gray-900">{t('privacy.title')}</h3>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
          {/* Privacy Policy Link */}
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">{t('privacy.policy')}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>

          {/* Data Summary */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">{t('privacy.dataSummary')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white rounded-lg p-2">
                <div className="text-lg font-bold text-gray-900">{dataSummary.answersCount}</div>
                <div className="text-xs text-gray-500">{t('privacy.savedAnswers')}</div>
              </div>
              <div className="bg-white rounded-lg p-2">
                <div className="text-lg font-bold text-gray-900">{dataSummary.experiencesCount}</div>
                <div className="text-xs text-gray-500">{t('privacy.workEducation')}</div>
              </div>
              <div className="bg-white rounded-lg p-2">
                <div className="text-lg font-bold text-gray-900">{dataSummary.observationsCount}</div>
                <div className="text-xs text-gray-500">{t('privacy.fillRecords')}</div>
              </div>
            </div>
          </div>

          {/* LLM Data Sharing Warning */}
          {llmEnabled && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800">
                    <strong>{t('privacy.aiEnabled')}</strong>
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    {t('privacy.aiDataSentTo')} <strong>{llmProvider}</strong>
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    {t('privacy.aiDataNote')}
                  </p>
                </div>
              </div>
              {consent && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-amber-700">{t('privacy.allowAiSharing')}</span>
                  <button
                    onClick={handleToggleLLMConsent}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      consent.llmDataSharing ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        consent.llmDataSharing ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Delete All Data */}
          <div className="border-t border-gray-100 pt-4">
            {showDeleteConfirm ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium mb-2">
                  {t('privacy.deleteConfirm')}
                </p>
                <p className="text-xs text-red-600 mb-3">
                  {t('privacy.deleteWarning')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {t('privacy.cancel')}
                  </button>
                  <button
                    onClick={handleDeleteAllData}
                    disabled={deleting}
                    className="flex-1 px-3 py-1.5 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {deleting ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    {deleting ? t('privacy.deleting') : t('privacy.confirmDelete')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('privacy.deleteAll')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
