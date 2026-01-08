import { useState, useEffect } from 'react'
import { Clock, Check, Sparkles, AlertCircle } from 'lucide-react'
import type { Observation } from '@/types'

interface ActivityItem {
  id: string
  action: 'fill' | 'learn' | 'skip'
  timestamp: number
  fieldType: string
  value?: string
  count?: number
  siteKey: string
  confidence?: number
  reason?: string
}

export default function ActivityLog() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActivities()
  }, [])

  async function loadActivities() {
    try {
      const result = await chrome.storage.local.get(['observations', 'activityLog'])
      const observations: Record<string, Observation> = result.observations || {}
      const activityLog: ActivityItem[] = result.activityLog || []
      
      const observationItems: ActivityItem[] = Object.values(observations)
        .map(obs => ({
          id: obs.id,
          action: 'learn' as const,
          timestamp: obs.timestamp,
          fieldType: obs.questionKeyId.split('_')[0] || 'UNKNOWN',
          value: '***',
          siteKey: obs.siteKey,
          confidence: Math.round(obs.confidence * 100),
        }))
      
      const allActivities = [...activityLog, ...observationItems]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50)
      
      setActivities(allActivities)
    } catch {
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return `${Math.floor(diff / 86400000)}d`
  }

  function getDateGroup(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 86400000) return 'Today'
    if (diff < 172800000) return 'Yesterday'
    return date.toLocaleDateString()
  }

  function groupActivitiesByDate(items: ActivityItem[]): Record<string, ActivityItem[]> {
    const groups: Record<string, ActivityItem[]> = {}
    for (const item of items) {
      const group = getDateGroup(item.timestamp)
      if (!groups[group]) groups[group] = []
      groups[group].push(item)
    }
    return groups
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
          <Clock className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-sm font-medium text-gray-900">No activity yet</h3>
        <p className="mt-1 text-xs text-gray-500">
          Your form activity will appear here.
        </p>
      </div>
    )
  }

  const groupedActivities = groupActivitiesByDate(activities)

  return (
    <div className="space-y-2">
      {Object.entries(groupedActivities).map(([dateGroup, items]) => (
        <div key={dateGroup}>
          <p className="text-xs text-gray-400 uppercase mb-2">{dateGroup}</p>
          <div className="space-y-2">
            {items.map(activity => (
              <ActivityCard key={activity.id} activity={activity} formatTime={formatTime} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ActivityCard({ 
  activity, 
  formatTime 
}: { 
  activity: ActivityItem
  formatTime: (ts: number) => string 
}) {
  const isSkip = activity.action === 'skip'
  const isFill = activity.action === 'fill'
  const isLearn = activity.action === 'learn'
  
  const iconBgClass = isFill ? 'bg-green-100' : isLearn ? 'bg-blue-100' : 'bg-amber-100'
  const iconColorClass = isFill ? 'text-green-600' : isLearn ? 'text-blue-600' : 'text-amber-600'
  
  return (
    <div className={`border rounded-lg p-2 hover:border-blue-200 transition-colors ${
      isSkip ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'
    }`}>
      <div className="flex items-start gap-2">
        <div className={`w-6 h-6 ${iconBgClass} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
          {isFill ? (
            <Check className={`w-3 h-3 ${iconColorClass}`} />
          ) : isLearn ? (
            <Sparkles className={`w-3 h-3 ${iconColorClass}`} />
          ) : (
            <AlertCircle className={`w-3 h-3 ${iconColorClass}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-800">
              {isFill ? `Filled ${activity.count || 1} fields` : 
               isLearn ? `Learned: ${activity.fieldType}` :
               `Skipped: ${activity.fieldType}`}
            </p>
            <span className="text-xs text-gray-400">{formatTime(activity.timestamp)}</span>
          </div>
          {isLearn && activity.value && (
            <p className="text-xs text-gray-500">{activity.value}</p>
          )}
          {isLearn && activity.confidence && (
            <p className="text-xs text-blue-600">{activity.confidence}% confidence</p>
          )}
          {isSkip && activity.reason && (
            <p className="text-xs text-amber-600">{activity.reason}</p>
          )}
          <p className="text-xs text-gray-500">{activity.siteKey}</p>
        </div>
      </div>
    </div>
  )
}
