import { Tab } from '@headlessui/react'
import { Database, Globe, Activity, Settings as SettingsIcon, Sparkles } from 'lucide-react'
import SavedAnswers from './tabs/SavedAnswers'
import ThisSite from './tabs/ThisSite'
import ActivityLog from './tabs/ActivityLog'
import Settings from './tabs/Settings'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function App() {
  const tabs = [
    { name: 'Saved Answers', icon: Database, component: SavedAnswers },
    { name: 'This Site', icon: Globe, component: ThisSite },
    { name: 'Activity', icon: Activity, component: ActivityLog },
    { name: 'Settings', icon: SettingsIcon, component: Settings },
  ]

  return (
    <div className="min-h-screen bg-white">
      <header className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-800">AutoFiller</span>
      </header>
      
      <Tab.Group>
        <Tab.List className="flex border-b border-gray-100">
          {tabs.map((tab) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                classNames(
                  'flex-1 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors',
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
        
        <Tab.Panels className="max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar">
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
