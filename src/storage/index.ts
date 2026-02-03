import { AnswerValue, Observation, SiteSettings, Taxonomy, PendingObservation, ExperienceEntry, AuthState, CreditsInfo } from '@/types'
import { ExperienceStorage, experienceStorage } from './experienceStorage'

export { ExperienceStorage, experienceStorage }

const STORAGE_KEYS = {
  ANSWERS: 'answers',
  OBSERVATIONS: 'observations',
  SITE_SETTINGS: 'siteSettings',
  QUESTION_KEYS: 'questionKeys',
  AUTH_STATE: 'authState',
  CREDITS_CACHE: 'creditsCache',
} as const

/**
 * Check if the extension context is still valid.
 * Returns false if the extension has been reloaded/updated.
 */
export function isExtensionContextValid(): boolean {
  try {
    // In real extension environment, chrome.runtime.id exists when context is valid
    // In test environment, chrome.runtime may not exist but chrome.storage does
    if (typeof chrome === 'undefined') return false

    // If chrome.runtime exists, check if id is present (real extension)
    if (chrome.runtime) {
      return !!chrome.runtime.id
    }

    // If only chrome.storage exists (test environment), consider it valid
    if (chrome.storage?.local) {
      return true
    }

    return false
  } catch {
    return false
  }
}

/**
 * Custom error class for extension context invalidation
 */
export class ExtensionContextInvalidatedError extends Error {
  constructor() {
    super('Extension has been updated. Please refresh the page.')
    this.name = 'ExtensionContextInvalidatedError'
  }
}

async function getStorage<T>(key: string): Promise<T | null> {
  if (!isExtensionContextValid()) {
    throw new ExtensionContextInvalidatedError()
  }
  const result = await chrome.storage.local.get(key)
  return result[key] || null
}

async function setStorage<T>(key: string, value: T): Promise<void> {
  if (!isExtensionContextValid()) {
    throw new ExtensionContextInvalidatedError()
  }
  await chrome.storage.local.set({ [key]: value })
}

export class AnswerStorage {
  async save(answer: AnswerValue): Promise<void> {
    const answers = await this.getAllMap()
    answers[answer.id] = answer
    await setStorage(STORAGE_KEYS.ANSWERS, answers)
  }

  async getById(id: string): Promise<AnswerValue | null> {
    const answers = await this.getAllMap()
    return answers[id] || null
  }

  async getByType(type: Taxonomy): Promise<AnswerValue[]> {
    const answers = await this.getAllMap()
    return Object.values(answers).filter(a => a.type === type)
  }

  async findByValue(type: Taxonomy, value: string): Promise<AnswerValue | null> {
    const answers = await this.getByType(type)
    const normalizedValue = value.toLowerCase().trim()

    for (const answer of answers) {
      if (answer.value.toLowerCase() === normalizedValue) {
        return answer
      }
      if (answer.aliases.some(a => a.toLowerCase() === normalizedValue)) {
        return answer
      }
    }

    return null
  }

  async getAll(): Promise<AnswerValue[]> {
    const answers = await this.getAllMap()
    return Object.values(answers)
  }

  async delete(id: string): Promise<void> {
    const answers = await this.getAllMap()
    delete answers[id]
    await setStorage(STORAGE_KEYS.ANSWERS, answers)
  }

  async update(id: string, updates: Partial<AnswerValue>): Promise<void> {
    const answer = await this.getById(id)
    if (answer) {
      const updated = { ...answer, ...updates, updatedAt: Date.now() }
      await this.save(updated)
    }
  }

  private async getAllMap(): Promise<Record<string, AnswerValue>> {
    return (await getStorage<Record<string, AnswerValue>>(STORAGE_KEYS.ANSWERS)) || {}
  }
}

export class ObservationStorage {
  async save(observation: Observation): Promise<void> {
    const observations = await this.getAllMap()
    observations[observation.id] = observation
    await setStorage(STORAGE_KEYS.OBSERVATIONS, observations)
  }

  async getById(id: string): Promise<Observation | null> {
    const observations = await this.getAllMap()
    return observations[id] || null
  }

  async getBySite(siteKey: string): Promise<Observation[]> {
    const observations = await this.getAllMap()
    return Object.values(observations)
      .filter(o => o.siteKey === siteKey)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  async getRecent(limit: number = 50): Promise<Observation[]> {
    const observations = await this.getAllMap()
    return Object.values(observations)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  async getByQuestionKey(questionKeyId: string): Promise<Observation[]> {
    const observations = await this.getAllMap()
    return Object.values(observations)
      .filter(o => o.questionKeyId === questionKeyId)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  async delete(id: string): Promise<void> {
    const observations = await this.getAllMap()
    delete observations[id]
    await setStorage(STORAGE_KEYS.OBSERVATIONS, observations)
  }

  async clearBySite(siteKey: string): Promise<void> {
    const observations = await this.getAllMap()
    const filtered: Record<string, Observation> = {}
    for (const [id, obs] of Object.entries(observations)) {
      if (obs.siteKey !== siteKey) {
        filtered[id] = obs
      }
    }
    await setStorage(STORAGE_KEYS.OBSERVATIONS, filtered)
  }

  private async getAllMap(): Promise<Record<string, Observation>> {
    return (await getStorage<Record<string, Observation>>(STORAGE_KEYS.OBSERVATIONS)) || {}
  }
}

export class SiteSettingsStorage {
  async save(settings: SiteSettings): Promise<void> {
    const allSettings = await this.getAllMap()
    allSettings[settings.siteKey] = settings
    await setStorage(STORAGE_KEYS.SITE_SETTINGS, allSettings)
  }

  async get(siteKey: string): Promise<SiteSettings | null> {
    const allSettings = await this.getAllMap()
    return allSettings[siteKey] || null
  }

  async getOrCreate(siteKey: string): Promise<SiteSettings> {
    const existing = await this.get(siteKey)
    if (existing) return existing

    const newSettings: SiteSettings = {
      siteKey,
      recordEnabled: true,
      autofillEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await this.save(newSettings)
    return newSettings
  }

  async update(siteKey: string, updates: Partial<SiteSettings>): Promise<void> {
    const settings = await this.get(siteKey)
    if (settings) {
      const updated = { ...settings, ...updates, updatedAt: Date.now() }
      await this.save(updated)
    }
  }

  async delete(siteKey: string): Promise<void> {
    const allSettings = await this.getAllMap()
    delete allSettings[siteKey]
    await setStorage(STORAGE_KEYS.SITE_SETTINGS, allSettings)
  }

  async getAll(): Promise<SiteSettings[]> {
    const allSettings = await this.getAllMap()
    return Object.values(allSettings)
  }

  private async getAllMap(): Promise<Record<string, SiteSettings>> {
    return (await getStorage<Record<string, SiteSettings>>(STORAGE_KEYS.SITE_SETTINGS)) || {}
  }
}

export class PendingObservationStorage {
  private pendingByForm = new Map<string, PendingObservation[]>()

  add(formId: string, pending: PendingObservation): void {
    const existing = this.pendingByForm.get(formId) || []
    const idx = existing.findIndex(p => p.fieldLocator === pending.fieldLocator)
    if (idx >= 0) existing[idx] = pending
    else existing.push(pending)
    this.pendingByForm.set(formId, existing)
  }

  getByForm(formId: string): PendingObservation[] {
    return this.pendingByForm.get(formId) || []
  }

  getAllPending(): PendingObservation[] {
    return Array.from(this.pendingByForm.values()).flat()
  }

  getFormIds(): string[] {
    return Array.from(this.pendingByForm.keys())
  }

  updateStatus(formId: string, status: PendingObservation['status']): void {
    this.pendingByForm.get(formId)?.forEach(p => p.status = status)
  }

  commit(formId: string): PendingObservation[] {
    const pending = this.pendingByForm.get(formId) || []
    this.pendingByForm.delete(formId)
    return pending.map(p => ({ ...p, status: 'committed' as const }))
  }

  discard(formId: string): void {
    this.pendingByForm.delete(formId)
  }

  discardAll(): void {
    this.pendingByForm.clear()
  }

  hasPending(formId: string): boolean {
    return (this.pendingByForm.get(formId)?.length ?? 0) > 0
  }

  getPendingCount(): number {
    return Array.from(this.pendingByForm.values()).reduce((sum, arr) => sum + arr.length, 0)
  }
}

// API base URL
const API_BASE_URL = 'https://www.onefil.help/api'
const TOKEN_BUFFER_MS = 5 * 60 * 1000 // 5 minutes

export class AuthStorage {
  async getAuthState(): Promise<AuthState | null> {
    return getStorage<AuthState>(STORAGE_KEYS.AUTH_STATE)
  }

  async setAuthState(state: AuthState): Promise<void> {
    await setStorage(STORAGE_KEYS.AUTH_STATE, state)
  }

  async clearAuthState(): Promise<void> {
    if (!isExtensionContextValid()) throw new ExtensionContextInvalidatedError()
    await chrome.storage.local.remove(STORAGE_KEYS.AUTH_STATE)
  }

  async getAccessToken(): Promise<string | null> {
    const state = await this.getAuthState()
    if (!state || state.expiresAt <= Date.now() + TOKEN_BUFFER_MS) return null
    return state.accessToken
  }

  async fetchCredits(): Promise<CreditsInfo | null> {
    const token = await this.getAccessToken()
    if (!token) return null

    try {
      const response = await fetch(`${API_BASE_URL}/credits`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!response.ok) {
        if (response.status === 401) await this.clearAuthState()
        return null
      }

      const credits = await response.json() as CreditsInfo
      await setStorage(STORAGE_KEYS.CREDITS_CACHE, credits)
      return credits
    } catch {
      return getStorage<CreditsInfo>(STORAGE_KEYS.CREDITS_CACHE)
    }
  }

  async consumeCredits(amount: number, type: 'fill' | 'resume_parse'): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const token = await this.getAccessToken()
    if (!token) return { success: false, newBalance: 0, error: 'Not logged in' }

    try {
      const response = await fetch(`${API_BASE_URL}/credits`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, type }),
      })

      const result = await response.json()
      if (!response.ok) {
        return { success: false, newBalance: result.balance || 0, error: result.error || 'Failed to consume credits' }
      }

      const cached = await getStorage<CreditsInfo>(STORAGE_KEYS.CREDITS_CACHE)
      if (cached) {
        cached.balance = result.newBalance
        await setStorage(STORAGE_KEYS.CREDITS_CACHE, cached)
      }

      return { success: true, newBalance: result.newBalance }
    } catch (e) {
      return { success: false, newBalance: 0, error: `Network error: ${e}` }
    }
  }
}

export class Storage {
  answers = new AnswerStorage()
  observations = new ObservationStorage()
  siteSettings = new SiteSettingsStorage()
  pendingObservations = new PendingObservationStorage()
  experiences = experienceStorage
  auth = new AuthStorage()

  async clearAll(): Promise<void> {
    await chrome.storage.local.remove([
      STORAGE_KEYS.ANSWERS,
      STORAGE_KEYS.OBSERVATIONS,
      STORAGE_KEYS.SITE_SETTINGS,
      STORAGE_KEYS.QUESTION_KEYS,
      'experiences',
    ])
    this.pendingObservations.discardAll()
  }

  async exportData(): Promise<{
    answers: AnswerValue[]
    observations: Observation[]
    siteSettings: SiteSettings[]
    experiences: ExperienceEntry[]
  }> {
    const [answers, observations, siteSettings, experiences] = await Promise.all([
      this.answers.getAll(),
      this.observations.getRecent(1000),
      this.siteSettings.getAll(),
      this.experiences.getAll(),
    ])
    return { answers, observations, siteSettings, experiences }
  }

  async importData(data: {
    answers?: AnswerValue[]
    siteSettings?: SiteSettings[]
    experiences?: ExperienceEntry[]
  }): Promise<void> {
    if (data.answers) {
      for (const answer of data.answers) {
        await this.answers.save(answer)
      }
    }
    if (data.siteSettings) {
      for (const settings of data.siteSettings) {
        await this.siteSettings.save(settings)
      }
    }
    if (data.experiences) {
      await this.experiences.saveBatch(data.experiences)
    }
  }
}

export const storage = new Storage()
