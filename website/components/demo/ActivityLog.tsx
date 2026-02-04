'use client'

import React from 'react'
import { Download, Save, CheckCircle, FileText, Trash2 } from 'lucide-react'
import { useDemoContext } from './DemoContext'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  profile: <Download className="w-3.5 h-3.5 text-purple-500" />,
  commit: <Save className="w-3.5 h-3.5 text-green-500" />,
  fill: <CheckCircle className="w-3.5 h-3.5 text-blue-500" />,
  template: <FileText className="w-3.5 h-3.5 text-gray-500" />,
}

const TYPE_COLORS: Record<string, string> = {
  profile: 'border-purple-200 bg-purple-50',
  commit: 'border-green-200 bg-green-50',
  fill: 'border-blue-200 bg-blue-50',
  template: 'border-gray-200 bg-gray-50',
}

export function ActivityLog() {
  const { activityLog, clearActivityLog } = useDemoContext()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">Activity Log</h3>
        <button
          onClick={clearActivityLog}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activityLog.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No activity yet</p>
        ) : (
          activityLog.map(entry => (
            <div
              key={entry.id}
              className={`p-2 rounded-lg border text-xs animate-fade-in ${TYPE_COLORS[entry.type] || 'border-gray-200'}`}
            >
              <div className="flex items-center gap-1.5 text-gray-600">
                {TYPE_ICONS[entry.type]}
                <span className="font-medium capitalize">{entry.type}</span>
                <span className="ml-auto text-gray-400">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
              </div>
              {Object.entries(entry.data).map(([key, value]) => (
                <div key={key} className="text-gray-500 mt-1">
                  {key}: {value}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
