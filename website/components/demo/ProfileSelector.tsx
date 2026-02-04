'use client'

import React from 'react'
import { User, Globe, MapPin } from 'lucide-react'
import { useDemoContext } from './DemoContext'

const PROFILE_CONFIGS = [
  { id: 'us', name: 'US Applicant', icon: MapPin, flag: '🇺🇸' },
  { id: 'cn', name: 'CN Applicant', icon: Globe, flag: '🇨🇳' },
  { id: 'intl', name: 'International', icon: User, flag: '🌍' },
]

export function ProfileSelector() {
  const { currentProfile, loadProfile } = useDemoContext()

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Quick Initialize</h3>
      <div className="flex flex-wrap gap-2">
        {PROFILE_CONFIGS.map(profile => (
          <button
            key={profile.id}
            onClick={() => loadProfile(profile.id)}
            className={`
              px-3 py-1.5 text-xs rounded-lg border transition-colors
              ${currentProfile === profile.id
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}
            `}
          >
            <span className="mr-1">{profile.flag}</span>
            {profile.name}
          </button>
        ))}
      </div>
    </div>
  )
}
