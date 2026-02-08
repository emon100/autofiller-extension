import { useState, useEffect, lazy, Suspense } from 'react'
import { Tab } from '@headlessui/react'
import { Database, Activity, Settings as SettingsIcon, Code2, Pin, X, Sparkles } from 'lucide-react'
import SavedAnswers from './tabs/SavedAnswers'

import ActivityLog from './tabs/ActivityLog'
import Settings from './tabs/Settings'
import ConsentModal from './components/ConsentModal'
import Onboarding from './components/Onboarding'
import PostOnboardingTutorial from './components/PostOnboardingTutorial'
import { hasValidConsent } from '@/consent'
import { t, initLocale } from '@/i18n'
import { profileStorage, storage } from '@/storage'

const Developer = __DEV_MODE__ ? lazy(() => import('./tabs/Developer')) : null

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

function PinHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
      {/* Arrow pointing to top-right pin area */}
      <div className="absolute -top-3 right-12 flex flex-col items-center">
        <svg width="20" height="14" viewBox="0 0 20 14" fill="none" className="animate-bounce">
          <path d="M10 0L3 12h14L10 0z" fill="#3b82f6" opacity="0.8" />
        </svg>
      </div>

      <div className="flex items-start gap-2.5 pl-3 pr-2 py-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Pin className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800" id="pinHintTitle">
            {t('pinHint.title')}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed" id="pinHintDesc">
            {t('pinHint.desc')}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [devModeEnabled, setDevModeEnabled] = useState(false)
  const [consentValid, setConsentValid] = useState<boolean | null>(null)
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)
  const [localeReady, setLocaleReady] = useState(false)
  const [showPinHint, setShowPinHint] = useState(false)
  const [profileEmpty, setProfileEmpty] = useState(false)
  const [tutorialComplete, setTutorialComplete] = useState<boolean | null>(null)

  useEffect(() => {
    async function init() {
      await initLocale()
      setLocaleReady(true)
      await profileStorage.migrateIfNeeded()
      if (__DEV_MODE__) await loadDevSettings()
      await checkConsent()
      await checkOnboarding()
      await checkPinHint()
      await checkProfileEmpty()
      await checkTutorial()
    }
    init()

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (__DEV_MODE__ && changes.devSettings) {
        setDevModeEnabled(changes.devSettings.newValue?.devModeEnabled ?? false)
      }
      if (changes.userConsent) {
        checkConsent()
      }
      if (changes.onboardingComplete) {
        setOnboardingComplete(changes.onboardingComplete.newValue ?? false)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  async function loadDevSettings() {
    try {
      const result = await chrome.storage.local.get('devSettings')
      setDevModeEnabled(result.devSettings?.devModeEnabled ?? false)
    } catch {
      setDevModeEnabled(false)
    }
  }

  async function checkConsent() {
    const valid = await hasValidConsent()
    setConsentValid(valid)
  }

  async function checkOnboarding() {
    try {
      const result = await chrome.storage.local.get('onboardingComplete')
      setOnboardingComplete(result.onboardingComplete ?? false)
    } catch {
      setOnboardingComplete(false)
    }
  }

  async function checkPinHint() {
    try {
      const result = await chrome.storage.local.get('pinHintDismissed')
      setShowPinHint(!result.pinHintDismissed)
    } catch {
      setShowPinHint(true)
    }
  }

  async function dismissPinHint() {
    setShowPinHint(false)
    await chrome.storage.local.set({ pinHintDismissed: true })
  }

  async function checkProfileEmpty() {
    try {
      const answers = await storage.answers.getAll()
      const experiences = await storage.experiences.getAll()
      setProfileEmpty(answers.length === 0 && experiences.length === 0)
    } catch {
      setProfileEmpty(false)
    }
  }

  async function checkTutorial() {
    try {
      const result = await chrome.storage.local.get('tutorialCompleted')
      setTutorialComplete(result.tutorialCompleted ?? false)
    } catch {
      setTutorialComplete(false)
    }
  }

  async function restartOnboarding() {
    await chrome.storage.local.set({ onboardingComplete: false })
    setOnboardingComplete(false)
    setProfileEmpty(false)
  }

  function handleConsentAccepted() {
    setConsentValid(true)
  }

  function handleConsentDeclined() {
    // User declined - close the side panel
    window.close()
  }

  async function handleOnboardingComplete() {
    await chrome.storage.local.set({ onboardingComplete: true })
    setOnboardingComplete(true)
    await checkProfileEmpty()
  }

  async function handleOnboardingSkip() {
    await chrome.storage.local.set({ onboardingComplete: true })
    setOnboardingComplete(true)
    await checkProfileEmpty()
  }

  const baseTabs = [
    { name: t('tabs.localKnowledge'), icon: Database, component: SavedAnswers },
    { name: t('tabs.activity'), icon: Activity, component: ActivityLog },
    { name: t('tabs.settings'), icon: SettingsIcon, component: Settings },
  ]

  const tabs = (__DEV_MODE__ && Developer && devModeEnabled)
    ? [...baseTabs, { name: t('tabs.developer'), icon: Code2, component: Developer }]
    : baseTabs

  // Show loading state while checking consent and locale
  if (consentValid === null || onboardingComplete === null || !localeReady) {
    return (
      <div className="min-h-screen bg-white w-[360px] max-w-[360px] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  // Show consent modal if consent is not valid
  if (!consentValid) {
    return (
      <div className="min-h-screen bg-white w-[360px] max-w-[360px]">
        <ConsentModal
          onConsent={handleConsentAccepted}
          onDecline={handleConsentDeclined}
        />
      </div>
    )
  }

  // Show onboarding for new users
  if (!onboardingComplete) {
    return (
      <div className="min-h-screen bg-white w-[360px] max-w-[360px]">
        <Onboarding
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      </div>
    )
  }

  // Show tutorial after onboarding
  if (tutorialComplete === false) {
    return (
      <div className="min-h-screen bg-white w-[360px] max-w-[360px] p-4">
        <PostOnboardingTutorial onDone={() => setTutorialComplete(true)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white w-[360px] max-w-[360px] overflow-x-hidden">
      {showPinHint && <PinHint onDismiss={dismissPinHint} />}
      {profileEmpty && onboardingComplete && (
        <div className="mx-3 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{t('emptyProfile.title')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('emptyProfile.desc')}</p>
              <button
                onClick={restartOnboarding}
                className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
              >
                {t('emptyProfile.startSetup')}
              </button>
            </div>
          </div>
        </div>
      )}
      <Tab.Group>
        <Tab.List className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                classNames(
                  'flex-shrink-0 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                  'focus:outline-none',
                  selected
                    ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-transparent'
                )
              }
            >
              {tab.name}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="max-h-[calc(100vh-45px)] overflow-y-auto custom-scrollbar">
          {tabs.map((tab) => (
            <Tab.Panel key={tab.name} className="p-3">
              <Suspense fallback={<div className="text-gray-400 text-sm text-center py-4">Loading...</div>}>
                <tab.component />
              </Suspense>
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
