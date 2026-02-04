'use client'

import React from 'react'
import { Trash2, Database } from 'lucide-react'
import { useDemoContext } from './DemoContext'

export function SavedAnswersPanel() {
  const { answers, updateAnswer, deleteAnswer, clearAllAnswers } = useDemoContext()

  const answerList = Object.values(answers)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Database className="w-4 h-4" />
          Saved Answers
        </h3>
        <span className="text-xs text-gray-400">{answerList.length} items</span>
      </div>

      {answerList.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No saved answers.<br />
          Load a profile or fill forms.
        </p>
      ) : (
        <>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {answerList.map(answer => (
              <div key={answer.type} className="p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{answer.type}</span>
                  <button
                    onClick={() => deleteAnswer(answer.type)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="text"
                  value={answer.value}
                  onChange={e => updateAnswer(answer.type, e.target.value)}
                  className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 focus:outline-none"
                />
              </div>
            ))}
          </div>

          <button
            onClick={clearAllAnswers}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Clear All
          </button>
        </>
      )}
    </div>
  )
}
