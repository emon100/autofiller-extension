import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnswerStorage, ObservationStorage, SiteSettingsStorage } from '@/storage'
import { AnswerValue, Observation, SiteSettings, Taxonomy, SENSITIVE_TYPES } from '@/types'

const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}

vi.stubGlobal('chrome', { storage: mockChromeStorage })

describe('Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return activeProfileId='default' for profile-aware storage
    mockChromeStorage.local.get.mockImplementation((key: string | string[]) => {
      if (key === 'activeProfileId') return Promise.resolve({ activeProfileId: 'default' })
      return Promise.resolve({})
    })
    mockChromeStorage.local.set.mockResolvedValue(undefined)
    mockChromeStorage.local.remove.mockResolvedValue(undefined)
  })

  describe('AnswerStorage', () => {
    let storage: AnswerStorage

    beforeEach(() => {
      storage = new AnswerStorage()
    })

    it('saves answer value', async () => {
      const answer: AnswerValue = {
        id: 'ans-1',
        type: Taxonomy.FULL_NAME,
        value: 'John Doe',
        display: 'John Doe',
        aliases: [],
        sensitivity: 'normal',
        autofillAllowed: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await storage.save(answer)

      expect(mockChromeStorage.local.set).toHaveBeenCalled()
    })

    it('retrieves answer by id', async () => {
      const answer: AnswerValue = {
        id: 'ans-1',
        type: Taxonomy.EMAIL,
        value: 'test@example.com',
        display: 'test@example.com',
        aliases: [],
        sensitivity: 'normal',
        autofillAllowed: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      mockChromeStorage.local.get.mockImplementation((key: string | string[]) => {
        if (key === 'activeProfileId') return Promise.resolve({ activeProfileId: 'default' })
        if (key === 'answers-default') return Promise.resolve({ 'answers-default': { 'ans-1': answer } })
        return Promise.resolve({})
      })

      const result = await storage.getById('ans-1')

      expect(result).toEqual(answer)
    })

    it('retrieves answers by type', async () => {
      const answers: Record<string, AnswerValue> = {
        'ans-1': {
          id: 'ans-1',
          type: Taxonomy.EMAIL,
          value: 'test1@example.com',
          display: 'test1@example.com',
          aliases: [],
          sensitivity: 'normal',
          autofillAllowed: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        'ans-2': {
          id: 'ans-2',
          type: Taxonomy.EMAIL,
          value: 'test2@example.com',
          display: 'test2@example.com',
          aliases: [],
          sensitivity: 'normal',
          autofillAllowed: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        'ans-3': {
          id: 'ans-3',
          type: Taxonomy.PHONE,
          value: '1234567890',
          display: '1234567890',
          aliases: [],
          sensitivity: 'normal',
          autofillAllowed: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      }

      mockChromeStorage.local.get.mockImplementation((key: string | string[]) => {
        if (key === 'activeProfileId') return Promise.resolve({ activeProfileId: 'default' })
        if (key === 'answers-default') return Promise.resolve({ 'answers-default': answers })
        return Promise.resolve({})
      })

      const emailAnswers = await storage.getByType(Taxonomy.EMAIL)

      expect(emailAnswers).toHaveLength(2)
      expect(emailAnswers.every(a => a.type === Taxonomy.EMAIL)).toBe(true)
    })

    it('marks sensitive types correctly', async () => {
      const answer: AnswerValue = {
        id: 'ans-1',
        type: Taxonomy.EEO_GENDER,
        value: 'male',
        display: 'Male',
        aliases: [],
        sensitivity: 'sensitive',
        autofillAllowed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      expect(SENSITIVE_TYPES.has(answer.type)).toBe(true)
      expect(answer.autofillAllowed).toBe(false)
    })

    it('updates existing answer', async () => {
      const existingAnswer: AnswerValue = {
        id: 'ans-1',
        type: Taxonomy.SCHOOL,
        value: 'MIT',
        display: 'MIT',
        aliases: [],
        sensitivity: 'normal',
        autofillAllowed: true,
        createdAt: 1000,
        updatedAt: 1000,
      }

      mockChromeStorage.local.get.mockImplementation((key: string | string[]) => {
        if (key === 'activeProfileId') return Promise.resolve({ activeProfileId: 'default' })
        if (key === 'answers-default') return Promise.resolve({ 'answers-default': { 'ans-1': existingAnswer } })
        return Promise.resolve({})
      })

      const updatedAnswer = { ...existingAnswer, value: 'Stanford', updatedAt: 2000 }
      await storage.save(updatedAnswer)

      expect(mockChromeStorage.local.set).toHaveBeenCalled()
    })

    it('deletes answer', async () => {
      mockChromeStorage.local.get.mockImplementation((key: string | string[]) => {
        if (key === 'activeProfileId') return Promise.resolve({ activeProfileId: 'default' })
        if (key === 'answers-default') return Promise.resolve({ 'answers-default': { 'ans-1': { id: 'ans-1' } } })
        return Promise.resolve({})
      })

      await storage.delete('ans-1')

      expect(mockChromeStorage.local.set).toHaveBeenCalled()
    })

    it('finds answer by value match', async () => {
      const answers: Record<string, AnswerValue> = {
        'ans-1': {
          id: 'ans-1',
          type: Taxonomy.SCHOOL,
          value: 'Tsinghua University',
          display: 'Tsinghua University',
          aliases: ['清华大学', 'THU'],
          sensitivity: 'normal',
          autofillAllowed: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      }

      mockChromeStorage.local.get.mockImplementation((key: string | string[]) => {
        if (key === 'activeProfileId') return Promise.resolve({ activeProfileId: 'default' })
        if (key === 'answers-default') return Promise.resolve({ 'answers-default': answers })
        return Promise.resolve({})
      })

      const result = await storage.findByValue(Taxonomy.SCHOOL, '清华大学')

      expect(result).toBeDefined()
      expect(result?.id).toBe('ans-1')
    })

    it('returns all answers', async () => {
      const answers: Record<string, AnswerValue> = {
        'ans-1': { id: 'ans-1', type: Taxonomy.EMAIL } as AnswerValue,
        'ans-2': { id: 'ans-2', type: Taxonomy.PHONE } as AnswerValue,
      }

      mockChromeStorage.local.get.mockImplementation((key: string | string[]) => {
        if (key === 'activeProfileId') return Promise.resolve({ activeProfileId: 'default' })
        if (key === 'answers-default') return Promise.resolve({ 'answers-default': answers })
        return Promise.resolve({})
      })

      const result = await storage.getAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('ObservationStorage', () => {
    let storage: ObservationStorage

    beforeEach(() => {
      storage = new ObservationStorage()
    })

    it('saves observation', async () => {
      const observation: Observation = {
        id: 'obs-1',
        timestamp: Date.now(),
        siteKey: 'example.com',
        url: 'https://example.com/form',
        questionKeyId: 'qk-1',
        answerId: 'ans-1',
        widgetSignature: {
          kind: 'text',
          attributes: {},
          interactionPlan: 'nativeSetterWithEvents',
        },
        confidence: 0.9,
      }

      await storage.save(observation)

      expect(mockChromeStorage.local.set).toHaveBeenCalled()
    })

    it('retrieves observations by site', async () => {
      const observations: Record<string, Observation> = {
        'obs-1': {
          id: 'obs-1',
          timestamp: Date.now(),
          siteKey: 'example.com',
          url: 'https://example.com/form',
          questionKeyId: 'qk-1',
          answerId: 'ans-1',
          widgetSignature: { kind: 'text', attributes: {}, interactionPlan: 'nativeSetterWithEvents' },
          confidence: 0.9,
        },
        'obs-2': {
          id: 'obs-2',
          timestamp: Date.now(),
          siteKey: 'other.com',
          url: 'https://other.com/form',
          questionKeyId: 'qk-2',
          answerId: 'ans-2',
          widgetSignature: { kind: 'text', attributes: {}, interactionPlan: 'nativeSetterWithEvents' },
          confidence: 0.8,
        },
      }

      mockChromeStorage.local.get.mockImplementation((key: string | string[]) => {
        if (key === 'activeProfileId') return Promise.resolve({ activeProfileId: 'default' })
        if (key === 'observations-default') return Promise.resolve({ 'observations-default': observations })
        return Promise.resolve({})
      })

      const result = await storage.getBySite('example.com')

      expect(result).toHaveLength(1)
      expect(result[0].siteKey).toBe('example.com')
    })

    it('limits returned observations', async () => {
      const observations: Record<string, Observation> = {}
      for (let i = 0; i < 100; i++) {
        observations[`obs-${i}`] = {
          id: `obs-${i}`,
          timestamp: i,
          siteKey: 'example.com',
          url: 'https://example.com',
          questionKeyId: 'qk-1',
          answerId: 'ans-1',
          widgetSignature: { kind: 'text', attributes: {}, interactionPlan: 'nativeSetterWithEvents' },
          confidence: 0.9,
        }
      }

      mockChromeStorage.local.get.mockImplementation((key: string | string[]) => {
        if (key === 'activeProfileId') return Promise.resolve({ activeProfileId: 'default' })
        if (key === 'observations-default') return Promise.resolve({ 'observations-default': observations })
        return Promise.resolve({})
      })

      const result = await storage.getRecent(10)

      expect(result).toHaveLength(10)
    })
  })

  describe('SiteSettingsStorage', () => {
    let storage: SiteSettingsStorage

    beforeEach(() => {
      storage = new SiteSettingsStorage()
    })

    it('saves site settings', async () => {
      const settings: SiteSettings = {
        siteKey: 'example.com',
        recordEnabled: true,
        autofillEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await storage.save(settings)

      expect(mockChromeStorage.local.set).toHaveBeenCalled()
    })

    it('retrieves site settings', async () => {
      const settings: SiteSettings = {
        siteKey: 'example.com',
        recordEnabled: true,
        autofillEnabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      mockChromeStorage.local.get.mockResolvedValue({
        'siteSettings': { 'example.com': settings },
      })

      const result = await storage.get('example.com')

      expect(result).toEqual(settings)
    })

    it('returns default settings for unknown site', async () => {
      mockChromeStorage.local.get.mockResolvedValue({ 'siteSettings': {} })

      const result = await storage.get('unknown.com')

      expect(result).toBeNull()
    })
  })
})
