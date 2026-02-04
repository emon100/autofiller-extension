'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import {
  DemoAnswerValue,
  DemoFormTemplate,
  DemoProfile,
  FillStats,
  ActivityLogEntry,
  FillHistoryItem,
  PendingObservation,
  SENSITIVE_TYPES,
  Taxonomy,
} from '@/lib/demo/types'
import { PROFILES } from '@/lib/demo/profiles'
import { FORM_TEMPLATES } from '@/lib/demo/templates'
import { demoStorage } from '@/lib/demo/storage'

interface DemoContextValue {
  // State
  answers: Record<string, DemoAnswerValue>
  currentTemplate: DemoFormTemplate | null
  currentProfile: string | null
  fillHistory: FillHistoryItem[]
  pendingObservations: PendingObservation[]
  activityLog: ActivityLogEntry[]
  lastFillStats: FillStats | null

  // Actions
  loadProfile: (profileId: string) => void
  loadTemplate: (templateId: string) => void
  setAnswers: (answers: Record<string, DemoAnswerValue>) => void
  addAnswer: (type: Taxonomy, value: string) => void
  updateAnswer: (type: Taxonomy, value: string) => void
  deleteAnswer: (type: Taxonomy) => void
  clearAllAnswers: () => void
  setFillHistory: (history: FillHistoryItem[]) => void
  setLastFillStats: (stats: FillStats | null) => void
  addPendingObservation: (obs: PendingObservation) => void
  clearPendingObservations: () => void
  commitPendingObservations: () => void
  addActivityLog: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void
  clearActivityLog: () => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function useDemoContext() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error('useDemoContext must be used within a DemoProvider')
  }
  return context
}

interface DemoProviderProps {
  children: ReactNode
  defaultTemplate?: string
  defaultProfile?: string
}

export function DemoProvider({ children, defaultTemplate = 'generic', defaultProfile }: DemoProviderProps) {
  const [answers, setAnswersState] = useState<Record<string, DemoAnswerValue>>({})
  const [currentTemplate, setCurrentTemplate] = useState<DemoFormTemplate | null>(null)
  const [currentProfile, setCurrentProfile] = useState<string | null>(defaultProfile || null)
  const [fillHistory, setFillHistory] = useState<FillHistoryItem[]>([])
  const [pendingObservations, setPendingObservations] = useState<PendingObservation[]>([])
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [lastFillStats, setLastFillStats] = useState<FillStats | null>(null)

  // Load saved answers on mount
  useEffect(() => {
    const savedAnswers = demoStorage.getAnswers()
    if (Object.keys(savedAnswers).length > 0) {
      setAnswersState(savedAnswers)
    } else if (defaultProfile && PROFILES[defaultProfile]) {
      setAnswersState(PROFILES[defaultProfile].answers)
      setCurrentProfile(defaultProfile)
    }

    // Load default template
    if (defaultTemplate && FORM_TEMPLATES[defaultTemplate]) {
      setCurrentTemplate(FORM_TEMPLATES[defaultTemplate])
    }
  }, [defaultProfile, defaultTemplate])

  const loadProfile = useCallback((profileId: string) => {
    const profile = PROFILES[profileId]
    if (profile) {
      setAnswersState(profile.answers)
      setCurrentProfile(profileId)
      demoStorage.setAnswers(profile.answers)
      setActivityLog(prev => [{
        id: Date.now().toString(),
        type: 'profile',
        timestamp: new Date(),
        data: { name: profile.name, count: Object.keys(profile.answers).length.toString() },
      }, ...prev])
    }
  }, [])

  const loadTemplate = useCallback((templateId: string) => {
    const template = FORM_TEMPLATES[templateId]
    if (template) {
      setCurrentTemplate(template)
      setPendingObservations([])
      setActivityLog(prev => [{
        id: Date.now().toString(),
        type: 'template',
        timestamp: new Date(),
        data: { name: template.title },
      }, ...prev])
    }
  }, [])

  const setAnswers = useCallback((newAnswers: Record<string, DemoAnswerValue>) => {
    setAnswersState(newAnswers)
    demoStorage.setAnswers(newAnswers)
  }, [])

  const addAnswer = useCallback((type: Taxonomy, value: string) => {
    setAnswersState(prev => {
      const updated: Record<string, DemoAnswerValue> = {
        ...prev,
        [type]: {
          id: Date.now().toString(),
          type,
          value,
          display: value,
          aliases: [],
          sensitivity: SENSITIVE_TYPES.has(type) ? 'sensitive' : 'normal',
          autofillAllowed: !SENSITIVE_TYPES.has(type),
        },
      }
      demoStorage.setAnswers(updated)
      return updated
    })
    setActivityLog(prev => [{
      id: Date.now().toString(),
      type: 'commit',
      timestamp: new Date(),
      data: { count: '1' },
    }, ...prev])
  }, [])

  const updateAnswer = useCallback((type: Taxonomy, value: string) => {
    setAnswersState(prev => {
      const updated: Record<string, DemoAnswerValue> = {
        ...prev,
        [type]: {
          ...prev[type],
          value,
          display: value,
        },
      }
      demoStorage.setAnswers(updated)
      return updated
    })
  }, [])

  const deleteAnswer = useCallback((type: Taxonomy) => {
    setAnswersState(prev => {
      const { [type]: _, ...rest } = prev
      demoStorage.setAnswers(rest)
      return rest
    })
  }, [])

  const clearAllAnswers = useCallback(() => {
    setAnswersState({})
    demoStorage.clearAnswers()
  }, [])

  const addPendingObservation = useCallback((obs: PendingObservation) => {
    setPendingObservations(prev => {
      const existing = prev.findIndex(p => p.fieldName === obs.fieldName)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = obs
        return updated
      }
      return [...prev, obs]
    })
  }, [])

  const clearPendingObservations = useCallback(() => {
    setPendingObservations([])
  }, [])

  const commitPendingObservations = useCallback(() => {
    setAnswersState(prev => {
      const updated = { ...prev }
      let committed = 0

      for (const obs of pendingObservations) {
        if (!obs.value) continue

        updated[obs.type] = {
          id: obs.id,
          type: obs.type,
          value: obs.value,
          display: obs.value,
          aliases: [],
          sensitivity: SENSITIVE_TYPES.has(obs.type) ? 'sensitive' : 'normal',
          autofillAllowed: !SENSITIVE_TYPES.has(obs.type),
        }
        committed++
      }

      if (committed > 0) {
        demoStorage.setAnswers(updated)
        setActivityLog(prev => [{
          id: Date.now().toString(),
          type: 'commit',
          timestamp: new Date(),
          data: { count: committed.toString() },
        }, ...prev])
      }

      return updated
    })

    setPendingObservations([])
  }, [pendingObservations])

  const addActivityLog = useCallback((entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
    setActivityLog(prev => [{
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date(),
    }, ...prev.slice(0, 29)])
  }, [])

  const clearActivityLog = useCallback(() => {
    setActivityLog([])
  }, [])

  const value: DemoContextValue = {
    answers,
    currentTemplate,
    currentProfile,
    fillHistory,
    pendingObservations,
    activityLog,
    lastFillStats,
    loadProfile,
    loadTemplate,
    setAnswers,
    addAnswer,
    updateAnswer,
    deleteAnswer,
    clearAllAnswers,
    setFillHistory,
    setLastFillStats,
    addPendingObservation,
    clearPendingObservations,
    commitPendingObservations,
    addActivityLog,
    clearActivityLog,
  }

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  )
}
