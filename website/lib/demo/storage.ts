import { DemoAnswerValue } from './types'

const STORAGE_KEY = 'autofiller_demo_answers'

/**
 * localStorage-based storage adapter for the demo
 * Provides a similar API to chrome.storage
 */
export const demoStorage = {
  getAnswers(): Record<string, DemoAnswerValue> {
    if (typeof window === 'undefined') return {}
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  },

  setAnswers(answers: Record<string, DemoAnswerValue>): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
    } catch {
      console.error('Failed to save answers to localStorage')
    }
  },

  clearAnswers(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  },

  exportAnswers(): string {
    const answers = this.getAnswers()
    return JSON.stringify(answers, null, 2)
  },

  importAnswers(json: string): boolean {
    try {
      const answers = JSON.parse(json)
      this.setAnswers(answers)
      return true
    } catch {
      return false
    }
  },
}
