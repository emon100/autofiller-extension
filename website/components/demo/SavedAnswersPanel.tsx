'use client'

import React, { useState } from 'react'
import { Trash2, Database, Plus, Edit2, Check, X, Download, Upload, ChevronDown, ChevronRight } from 'lucide-react'
import { useDemoContext } from './DemoContext'
import { Taxonomy } from '@/lib/demo/types'

// 字段类型分类
const FIELD_CATEGORIES: Record<string, { label: string; icon: string; types: string[] }> = {
  personal: {
    label: '个人信息',
    icon: '👤',
    types: ['FULL_NAME', 'FIRST_NAME', 'LAST_NAME', 'EMAIL', 'PHONE', 'COUNTRY_CODE', 'CITY'],
  },
  professional: {
    label: '职业信息',
    icon: '💼',
    types: ['LINKEDIN', 'GITHUB', 'PORTFOLIO', 'WORK_AUTH', 'NEED_SPONSORSHIP', 'YEARS_OF_EXPERIENCE'],
  },
  education: {
    label: '教育背景',
    icon: '🎓',
    types: ['SCHOOL', 'DEGREE', 'MAJOR', 'GRAD_DATE', 'GRAD_YEAR', 'GRAD_MONTH', 'START_DATE', 'END_DATE', 'GPA'],
  },
  other: {
    label: '其他',
    icon: '📝',
    types: [],
  },
}

export function SavedAnswersPanel() {
  const { answers, updateAnswer, deleteAnswer, clearAllAnswers, addAnswer } = useDemoContext()
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['personal', 'professional'])
  const [editingType, setEditingType] = useState<Taxonomy | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newType, setNewType] = useState('')
  const [newValue, setNewValue] = useState('')

  const answerList = Object.values(answers)

  // 将答案分组到各类别
  const categorizedAnswers = Object.entries(FIELD_CATEGORIES).map(([key, category]) => {
    const categoryAnswers = answerList.filter(a =>
      category.types.includes(a.type as string) ||
      (key === 'other' && !Object.values(FIELD_CATEGORIES).some(c => c.types.includes(a.type as string)))
    )
    return { key, ...category, answers: categoryAnswers }
  }).filter(c => c.answers.length > 0 || c.key !== 'other')

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const startEditing = (type: Taxonomy, value: string) => {
    setEditingType(type)
    setEditValue(value)
  }

  const saveEdit = () => {
    if (editingType) {
      updateAnswer(editingType, editValue)
      setEditingType(null)
      setEditValue('')
    }
  }

  const cancelEdit = () => {
    setEditingType(null)
    setEditValue('')
  }

  const handleAddNew = () => {
    if (newType && newValue) {
      const taxonomyType = newType.toUpperCase().replace(/\s+/g, '_') as Taxonomy
      addAnswer(taxonomyType, newValue)
      setNewType('')
      setNewValue('')
      setIsAddingNew(false)
    }
  }

  const exportData = () => {
    const data = JSON.stringify(answers, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '1fillr-knowledge-base.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-500" />
          知识库
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={exportData}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="导出数据"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsAddingNew(true)}
            className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
            title="添加字段"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded">
          {answerList.length} 字段
        </span>
        <span className="px-2 py-1 bg-green-50 text-green-600 rounded">
          安全存储
        </span>
      </div>

      {/* Add New Field Form */}
      {isAddingNew && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
          <p className="text-xs font-medium text-blue-700">添加新字段</p>
          <input
            type="text"
            placeholder="字段类型 (如 COMPANY)"
            value={newType}
            onChange={e => setNewType(e.target.value)}
            className="w-full text-xs px-2 py-1.5 border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            type="text"
            placeholder="字段值"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            className="w-full text-xs px-2 py-1.5 border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddNew}
              disabled={!newType || !newValue}
              className="flex-1 text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              添加
            </button>
            <button
              onClick={() => { setIsAddingNew(false); setNewType(''); setNewValue(''); }}
              className="text-xs px-2 py-1 text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {answerList.length === 0 ? (
        <div className="text-center py-6">
          <Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">知识库为空</p>
          <p className="text-xs text-gray-400 mt-1">
            加载预设档案或填写表单来建立知识库
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {categorizedAnswers.map(category => (
            <div key={category.key} className="border border-gray-100 rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.key)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span>{category.icon}</span>
                  <span className="font-medium text-gray-700">{category.label}</span>
                  <span className="text-xs text-gray-400">({category.answers.length})</span>
                </span>
                {expandedCategories.includes(category.key) ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Category Content */}
              {expandedCategories.includes(category.key) && (
                <div className="p-2 space-y-1.5">
                  {category.answers.map(answer => (
                    <div
                      key={answer.type}
                      className="p-2 bg-white rounded border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-gray-400">{answer.type}</span>
                        <div className="flex items-center gap-1">
                          {editingType === answer.type ? (
                            <>
                              <button
                                onClick={saveEdit}
                                className="p-0.5 text-green-500 hover:text-green-600"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-0.5 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(answer.type, answer.value)}
                                className="p-0.5 text-gray-400 hover:text-blue-500 transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteAnswer(answer.type)}
                                className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {editingType === answer.type ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit()}
                          autoFocus
                          className="w-full text-sm bg-blue-50 border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        <p className="text-sm text-gray-700 truncate">{answer.value}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {answerList.length > 0 && (
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={clearAllAnswers}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            清空全部
          </button>
          <span className="text-xs text-gray-400">
            数据安全存储
          </span>
        </div>
      )}
    </div>
  )
}
