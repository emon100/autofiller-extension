import { ExperienceEntry, ExperienceGroupType } from '@/types'
import { profileStorage } from './profileStorage'

async function getStorage<T>(key: string): Promise<T | null> {
  const result = await chrome.storage.local.get(key)
  return result[key] || null
}

async function setStorage<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

async function getStorageKey(): Promise<string> {
  const profileId = await profileStorage.getActiveId()
  return profileStorage.getExperiencesKey(profileId)
}

export class ExperienceStorage {
  async save(entry: ExperienceEntry): Promise<void> {
    const entries = await this.getAllMap()
    entries[entry.id] = entry
    const key = await getStorageKey()
    await setStorage(key, entries)
  }

  async saveBatch(newEntries: ExperienceEntry[]): Promise<void> {
    const entries = await this.getAllMap()
    for (const entry of newEntries) {
      entries[entry.id] = entry
    }
    const key = await getStorageKey()
    await setStorage(key, entries)
  }

  async getById(id: string): Promise<ExperienceEntry | null> {
    const entries = await this.getAllMap()
    return entries[id] || null
  }

  async getByGroupType(type: ExperienceGroupType): Promise<ExperienceEntry[]> {
    const all = await this.getAll()
    return all
      .filter(e => e.groupType === type)
      .sort((a, b) => a.priority - b.priority)
  }

  async getByPriority(type: ExperienceGroupType, priority: number): Promise<ExperienceEntry | null> {
    const entries = await this.getByGroupType(type)
    return entries[priority] || null
  }

  async getAll(): Promise<ExperienceEntry[]> {
    const entries = await this.getAllMap()
    return Object.values(entries).sort((a, b) => {
      // First sort by groupType, then by priority
      if (a.groupType !== b.groupType) {
        const order: Record<ExperienceGroupType, number> = { WORK: 0, EDUCATION: 1, PROJECT: 2 }
        return order[a.groupType] - order[b.groupType]
      }
      return a.priority - b.priority
    })
  }

  async delete(id: string): Promise<void> {
    const entries = await this.getAllMap()
    delete entries[id]
    const key = await getStorageKey()
    await setStorage(key, entries)
    await this.normalizePriorities()
  }

  async deleteByGroupType(type: ExperienceGroupType): Promise<void> {
    const entries = await this.getAllMap()
    const filtered = Object.fromEntries(
      Object.entries(entries).filter(([, entry]) => entry.groupType !== type)
    )
    const key = await getStorageKey()
    await setStorage(key, filtered)
  }

  async update(id: string, updates: Partial<Omit<ExperienceEntry, 'id'>>): Promise<void> {
    const entry = await this.getById(id)
    if (entry) {
      const updated: ExperienceEntry = {
        ...entry,
        ...updates,
        updatedAt: Date.now(),
      }
      await this.save(updated)
    }
  }

  async reorder(ids: string[]): Promise<void> {
    const entries = await this.getAllMap()
    for (let i = 0; i < ids.length; i++) {
      const entry = entries[ids[i]]
      if (entry) {
        entry.priority = i
        entry.updatedAt = Date.now()
      }
    }
    const key = await getStorageKey()
    await setStorage(key, entries)
  }

  async clearAll(): Promise<void> {
    const key = await getStorageKey()
    await setStorage(key, {})
  }

  async getCount(): Promise<number> {
    const entries = await this.getAllMap()
    return Object.keys(entries).length
  }

  async getCountByGroupType(type: ExperienceGroupType): Promise<number> {
    const entries = await this.getByGroupType(type)
    return entries.length
  }

  private async getAllMap(): Promise<Record<string, ExperienceEntry>> {
    const key = await getStorageKey()
    return (await getStorage<Record<string, ExperienceEntry>>(key)) || {}
  }

  private async normalizePriorities(): Promise<void> {
    const entries = await this.getAllMap()
    const groups: ExperienceGroupType[] = ['WORK', 'EDUCATION', 'PROJECT']

    for (const type of groups) {
      const typeEntries = Object.values(entries)
        .filter(e => e.groupType === type)
        .sort((a, b) => a.priority - b.priority)

      typeEntries.forEach((entry, index) => {
        entry.priority = index
      })
    }

    const key = await getStorageKey()
    await setStorage(key, entries)
  }
}

export const experienceStorage = new ExperienceStorage()
