/**
 * Profile management for 1Fillr
 * Each profile has its own isolated answers and experiences.
 */

export interface Profile {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

const PROFILES_KEY = 'profiles'
const ACTIVE_PROFILE_KEY = 'activeProfileId'
const DEFAULT_PROFILE_ID = 'default'

async function getStorage<T>(key: string): Promise<T | null> {
  const result = await chrome.storage.local.get(key)
  return result[key] || null
}

async function setStorage<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

export class ProfileStorage {
  async getAll(): Promise<Profile[]> {
    const profiles = await getStorage<Record<string, Profile>>(PROFILES_KEY)
    if (!profiles || Object.keys(profiles).length === 0) {
      // Auto-create default profile
      const defaultProfile = this.createDefaultProfile()
      await setStorage(PROFILES_KEY, { [defaultProfile.id]: defaultProfile })
      return [defaultProfile]
    }
    return Object.values(profiles).sort((a, b) => a.createdAt - b.createdAt)
  }

  async getById(id: string): Promise<Profile | null> {
    const profiles = await getStorage<Record<string, Profile>>(PROFILES_KEY)
    return profiles?.[id] || null
  }

  async getActiveId(): Promise<string> {
    const id = await getStorage<string>(ACTIVE_PROFILE_KEY)
    return id || DEFAULT_PROFILE_ID
  }

  async setActiveId(id: string): Promise<void> {
    await setStorage(ACTIVE_PROFILE_KEY, id)
  }

  async create(name: string): Promise<Profile> {
    const profiles = await getStorage<Record<string, Profile>>(PROFILES_KEY) || {}
    const id = `profile-${Date.now()}`
    const profile: Profile = {
      id,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    profiles[id] = profile
    await setStorage(PROFILES_KEY, profiles)
    return profile
  }

  async rename(id: string, name: string): Promise<void> {
    const profiles = await getStorage<Record<string, Profile>>(PROFILES_KEY) || {}
    if (profiles[id]) {
      profiles[id].name = name
      profiles[id].updatedAt = Date.now()
      await setStorage(PROFILES_KEY, profiles)
    }
  }

  async delete(id: string): Promise<void> {
    if (id === DEFAULT_PROFILE_ID) return // Can't delete default

    const profiles = await getStorage<Record<string, Profile>>(PROFILES_KEY) || {}
    delete profiles[id]
    await setStorage(PROFILES_KEY, profiles)

    // Clean up profile data
    await chrome.storage.local.remove([
      `answers-${id}`,
      `experiences-${id}`,
      `observations-${id}`,
    ])

    // If this was active, switch to default
    const activeId = await this.getActiveId()
    if (activeId === id) {
      await this.setActiveId(DEFAULT_PROFILE_ID)
    }
  }

  /**
   * Migrate existing global data (answers, experiences) to default profile.
   * Called once on first use.
   */
  async migrateIfNeeded(): Promise<void> {
    const profiles = await getStorage<Record<string, Profile>>(PROFILES_KEY)
    if (profiles && Object.keys(profiles).length > 0) return // Already migrated

    // Create default profile
    const defaultProfile = this.createDefaultProfile()
    await setStorage(PROFILES_KEY, { [defaultProfile.id]: defaultProfile })
    await setStorage(ACTIVE_PROFILE_KEY, DEFAULT_PROFILE_ID)

    // Move existing answers to profile-namespaced key
    const result = await chrome.storage.local.get(['answers', 'experiences', 'observations'])
    const batch: Record<string, unknown> = {}

    if (result.answers && Object.keys(result.answers).length > 0) {
      batch[`answers-${DEFAULT_PROFILE_ID}`] = result.answers
    }
    if (result.experiences && Object.keys(result.experiences).length > 0) {
      batch[`experiences-${DEFAULT_PROFILE_ID}`] = result.experiences
    }
    if (result.observations && Object.keys(result.observations).length > 0) {
      batch[`observations-${DEFAULT_PROFILE_ID}`] = result.observations
    }

    if (Object.keys(batch).length > 0) {
      await chrome.storage.local.set(batch)
    }
  }

  getAnswersKey(profileId: string): string {
    return `answers-${profileId}`
  }

  getExperiencesKey(profileId: string): string {
    return `experiences-${profileId}`
  }

  getObservationsKey(profileId: string): string {
    return `observations-${profileId}`
  }

  private createDefaultProfile(): Profile {
    return {
      id: DEFAULT_PROFILE_ID,
      name: 'Default',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }
}

export const profileStorage = new ProfileStorage()
