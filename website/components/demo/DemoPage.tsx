'use client'

import React from 'react'
import { DemoProvider, useDemoContext } from './DemoContext'
import { DemoForm } from './DemoForm'
import { ProfileSelector } from './ProfileSelector'
import { FormTemplateSelector } from './FormTemplateSelector'
import { SavedAnswersPanel } from './SavedAnswersPanel'
import { ActivityLog } from './ActivityLog'
import { DemoToastContainer } from './DemoToast'
import { Zap, BarChart3 } from 'lucide-react'

function DemoStats() {
  const { lastFillStats } = useDemoContext()

  if (!lastFillStats) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-600">Last Fill Stats</span>
      </div>
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-xl font-bold text-blue-600">{lastFillStats.scanned}</p>
          <p className="text-xs text-gray-500">Scanned</p>
        </div>
        <div>
          <p className="text-xl font-bold text-green-600">{lastFillStats.filled}</p>
          <p className="text-xs text-gray-500">Filled</p>
        </div>
        <div>
          <p className="text-xl font-bold text-purple-600">{lastFillStats.transformed}</p>
          <p className="text-xs text-gray-500">Transformed</p>
        </div>
        <div>
          <p className="text-xl font-bold text-gray-600">{lastFillStats.timeMs}ms</p>
          <p className="text-xs text-gray-500">Time</p>
        </div>
      </div>
    </div>
  )
}

function DemoPageContent() {
  const { pendingObservations } = useDemoContext()

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Panel */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </span>
            AutoFiller Demo
          </h1>
          <p className="text-xs text-gray-500 mt-1">Interactive Form Filling Demo</p>
        </div>

        {/* Profile Selector */}
        <div className="p-4 border-b border-gray-100">
          <ProfileSelector />
        </div>

        {/* Form Templates */}
        <div className="p-4 border-b border-gray-100 overflow-y-auto flex-shrink-0 max-h-72">
          <FormTemplateSelector />
        </div>

        {/* Saved Answers */}
        <div className="flex-1 overflow-y-auto p-4">
          <SavedAnswersPanel />
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Two-Phase Save</span>
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Active</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Pending Fields</span>
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
              {pendingObservations.length}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Form Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <DemoForm />
        <DemoStats />
      </div>

      {/* Right Panel: Activity Log */}
      <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
        <ActivityLog />
      </div>

      {/* Toast Container */}
      <DemoToastContainer />
    </div>
  )
}

export default function DemoPage() {
  return (
    <DemoProvider defaultTemplate="generic">
      <DemoPageContent />
    </DemoProvider>
  )
}
