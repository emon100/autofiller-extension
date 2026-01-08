import { AnswerValue, Observation, SiteSettings, Taxonomy } from '@/types'

const STORAGE_KEYS = {
  ANSWERS: 'answers',
  OBSERVATIONS: 'observations',
  SITE_SETTINGS: 'siteSettings',
  QUESTION_KEYS: 'questionKeys',
} as const

async function getStorage<T>(key: string): Promise<T | null> {
  const result = await chrome.storage.local.get(key)
  return result[key] || null
}

async function setStorage<T>(key: string, value: T): Promise<void> {
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
      recordEnabled: false,
      autofillEnabled: false,
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

export class Storage {
  answers = new AnswerStorage()
  observations = new ObservationStorage()
  siteSettings = new SiteSettingsStorage()

  async clearAll(): Promise<void> {
    await chrome.storage.local.remove([
      STORAGE_KEYS.ANSWERS,
      STORAGE_KEYS.OBSERVATIONS,
      STORAGE_KEYS.SITE_SETTINGS,
      STORAGE_KEYS.QUESTION_KEYS,
    ])
  }

  async exportData(): Promise<{
    answers: AnswerValue[]
    observations: Observation[]
    siteSettings: SiteSettings[]
  }> {
    const [answers, observations, siteSettings] = await Promise.all([
      this.answers.getAll(),
      this.observations.getRecent(1000),
      this.siteSettings.getAll(),
    ])
    return { answers, observations, siteSettings }
  }

  async importData(data: {
    answers?: AnswerValue[]
    siteSettings?: SiteSettings[]
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
  }
}

export const storage = new Storage()
