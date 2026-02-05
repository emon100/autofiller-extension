import { useState, useEffect } from 'react'
import { Tab } from '@headlessui/react'
import { Database, Globe, Activity, Settings as SettingsIcon, Code2, Upload } from 'lucide-react'
import SavedAnswers from './tabs/SavedAnswers'
import ImportProfile from './tabs/ImportProfile'
import ThisSite from './tabs/ThisSite'
import ActivityLog from './tabs/ActivityLog'
import Settings from './tabs/Settings'
import Developer from './tabs/Developer'
import ConsentModal from './components/ConsentModal'
import Onboarding from './components/Onboarding'
import { hasValidConsent } from '@/consent'
import { t, initLocale } from '@/i18n'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function App() {
  const [devModeEnabled, setDevModeEnabled] = useState(false)
  const [consentValid, setConsentValid] = useState<boolean | null>(null)
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)
  const [localeReady, setLocaleReady] = useState(false)

  useEffect(() => {
    async function init() {
      await initLocale()
      setLocaleReady(true)
      await loadDevSettings()
      await checkConsent()
      await checkOnboarding()
    }
    init()

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.devSettings) {
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
  }

  async function handleOnboardingSkip() {
    await chrome.storage.local.set({ onboardingComplete: true })
    setOnboardingComplete(true)
  }

  const baseTabs = [
    { name: t('tabs.localKnowledge'), icon: Database, component: SavedAnswers },
    { name: t('tabs.import'), icon: Upload, component: ImportProfile },
    { name: t('tabs.thisSite'), icon: Globe, component: ThisSite },
    { name: t('tabs.activity'), icon: Activity, component: ActivityLog },
    { name: t('tabs.settings'), icon: SettingsIcon, component: Settings },
  ]

  const devTab = { name: t('tabs.developer'), icon: Code2, component: Developer }
  const tabs = devModeEnabled ? [...baseTabs, devTab] : baseTabs

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

  return (
    <div className="min-h-screen bg-white w-[360px] max-w-[360px] overflow-x-hidden">
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
              <tab.component />
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
