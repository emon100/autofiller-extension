import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Recorder, createQuestionKey, createObservation } from '@/recorder'
import { Taxonomy, QuestionKey, FieldContext } from '@/types'
import { storage } from '@/storage'

function createMockFieldContext(overrides: Partial<FieldContext> = {}): FieldContext {
  return {
    element: document.createElement('input'),
    labelText: 'Test Field',
    sectionTitle: '',
    attributes: { name: 'testField' },
    optionsText: [],
    framePath: [],
    shadowPath: [],
    widgetSignature: {
      kind: 'text',
      attributes: {},
      interactionPlan: 'nativeSetterWithEvents',
    },
    ...overrides,
  }
}

describe('Recorder', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('createQuestionKey', () => {
    it('creates question key from field context', () => {
      const context = createMockFieldContext({
        labelText: 'Full Name',
        sectionTitle: 'Personal Information',
        attributes: { name: 'fullName', autocomplete: 'name' },
      })

      const questionKey = createQuestionKey(context, Taxonomy.FULL_NAME)

      expect(questionKey.type).toBe(Taxonomy.FULL_NAME)
      expect(questionKey.phrases).toContain('full name')
      expect(questionKey.sectionHints).toContain('personal information')
    })

    it('normalizes phrases to lowercase', () => {
      const context = createMockFieldContext({
        labelText: 'EMAIL ADDRESS',
      })

      const questionKey = createQuestionKey(context, Taxonomy.EMAIL)

      expect(questionKey.phrases.every(p => p === p.toLowerCase())).toBe(true)
    })

    it('includes name and id in phrases', () => {
      const context = createMockFieldContext({
        labelText: 'School',
        attributes: { name: 'university', id: 'school-input' },
      })

      const questionKey = createQuestionKey(context, Taxonomy.SCHOOL)

      expect(questionKey.phrases).toContain('university')
      expect(questionKey.phrases).toContain('school-input')
    })

    it('generates hash for select options', () => {
      const context = createMockFieldContext({
        labelText: 'Country',
        optionsText: ['United States', 'China', 'Japan'],
        widgetSignature: {
          kind: 'select',
          attributes: {},
          interactionPlan: 'directSet',
        },
      })

      const questionKey = createQuestionKey(context, Taxonomy.LOCATION)

      expect(questionKey.choiceSetHash).toBeDefined()
      expect(questionKey.choiceSetHash?.length).toBeGreaterThan(0)
    })
  })

  describe('createObservation', () => {
    it('creates observation with all required fields', () => {
      const context = createMockFieldContext()
      const questionKey: QuestionKey = {
        id: 'qk-123',
        type: Taxonomy.FULL_NAME,
        phrases: ['full name'],
        sectionHints: [],
      }

      const observation = createObservation(
        context,
        questionKey,
        'answer-456',
        'John Doe',
        0.9
      )

      expect(observation.questionKeyId).toBe('qk-123')
      expect(observation.answerId).toBe('answer-456')
      expect(observation.confidence).toBe(0.9)
      expect(observation.timestamp).toBeGreaterThan(0)
      expect(observation.siteKey).toBeDefined()
      expect(observation.url).toBeDefined()
    })

    it('extracts site key from URL', () => {
      const context = createMockFieldContext()
      const questionKey: QuestionKey = {
        id: 'qk-123',
        type: Taxonomy.EMAIL,
        phrases: [],
        sectionHints: [],
      }

      const observation = createObservation(context, questionKey, 'a-1', 'test@example.com', 0.8)

      expect(observation.siteKey).toBeDefined()
    })

    it('includes widget signature', () => {
      const context = createMockFieldContext({
        widgetSignature: {
          kind: 'select',
          attributes: {},
          interactionPlan: 'directSet',
        },
      })
      const questionKey: QuestionKey = {
        id: 'qk-123',
        type: Taxonomy.LOCATION,
        phrases: [],
        sectionHints: [],
      }

      const observation = createObservation(context, questionKey, 'a-1', 'US', 0.85)

      expect(observation.widgetSignature.kind).toBe('select')
    })
  })

  describe('Recorder class', () => {
    let recorder: Recorder

    beforeEach(() => {
      storage.pendingObservations.discardAll()
      document.body.innerHTML = `
        <form id="test-form">
          <label for="name">Full Name</label>
          <input type="text" id="name" name="fullName" autocomplete="name" />
          <label for="email">Email</label>
          <input type="email" id="email" name="email" autocomplete="email" />
          <button type="submit">Submit</button>
        </form>
      `
      recorder = new Recorder()
    })

    afterEach(() => {
      recorder.stop()
    })

    it('starts and stops recording', () => {
      expect(recorder.isRecording).toBe(false)
      
      recorder.start()
      expect(recorder.isRecording).toBe(true)
      
      recorder.stop()
      expect(recorder.isRecording).toBe(false)
    })

    it('creates pending observation on blur event (phase 1)', async () => {
      const onPending = vi.fn()
      recorder.onPending(onPending)
      recorder.start()

      const input = document.getElementById('name') as HTMLInputElement
      input.value = 'John Doe'
      input.dispatchEvent(new Event('focus', { bubbles: true }))
      input.dispatchEvent(new Event('blur', { bubbles: true }))

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(onPending).toHaveBeenCalled()
      const pending = onPending.mock.calls[0][0]
      expect(pending.rawValue).toBe('John Doe')
      expect(pending.status).toBe('pending')
    })

    it('does not capture empty values', async () => {
      const onPending = vi.fn()
      recorder.onPending(onPending)
      recorder.start()

      const input = document.getElementById('name') as HTMLInputElement
      input.value = ''
      input.dispatchEvent(new Event('blur', { bubbles: true }))

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(onPending).not.toHaveBeenCalled()
    })

    it('does not capture unchanged values', async () => {
      const onPending = vi.fn()
      recorder.onPending(onPending)
      recorder.start()

      const input = document.getElementById('name') as HTMLInputElement
      input.value = 'Initial'
      input.dispatchEvent(new Event('focus', { bubbles: true }))
      
      input.dispatchEvent(new Event('blur', { bubbles: true }))
      
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const firstCallCount = onPending.mock.calls.length
      
      input.dispatchEvent(new Event('focus', { bubbles: true }))
      input.dispatchEvent(new Event('blur', { bubbles: true }))

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(onPending.mock.calls.length).toBe(firstCallCount)
    })

    it('creates pending observation on select change', async () => {
      document.body.innerHTML = `
        <form>
          <select id="country" name="country">
            <option value="">Select...</option>
            <option value="US">United States</option>
          </select>
        </form>
      `
      
      const onPending = vi.fn()
      recorder = new Recorder()
      recorder.onPending(onPending)
      recorder.start()

      const select = document.getElementById('country') as HTMLSelectElement
      select.value = 'US'
      select.dispatchEvent(new Event('change', { bubbles: true }))

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(onPending).toHaveBeenCalled()
    })

    it('creates pending observation on checkbox change', async () => {
      document.body.innerHTML = `
        <form>
          <label>
            <input type="checkbox" id="terms" name="terms" value="accepted" />
            I agree to terms
          </label>
        </form>
      `
      
      const onPending = vi.fn()
      recorder = new Recorder()
      recorder.onPending(onPending)
      recorder.start()

      const checkbox = document.getElementById('terms') as HTMLInputElement
      checkbox.checked = true
      checkbox.dispatchEvent(new Event('change', { bubbles: true }))

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(onPending).toHaveBeenCalled()
    })

    it('classifies field type automatically', async () => {
      const onPending = vi.fn()
      recorder.onPending(onPending)
      recorder.start()

      const emailInput = document.getElementById('email') as HTMLInputElement
      emailInput.value = 'test@example.com'
      emailInput.dispatchEvent(new Event('focus', { bubbles: true }))
      emailInput.dispatchEvent(new Event('blur', { bubbles: true }))

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(onPending).toHaveBeenCalled()
      const pending = onPending.mock.calls[0][0]
      expect(pending.classifiedType).toBe(Taxonomy.EMAIL)
    })

    it('commits pending observations on form submit (phase 2)', async () => {
      const onPending = vi.fn()
      const onObservation = vi.fn()
      const onCommit = vi.fn()
      
      recorder.onPending(onPending)
      recorder.onObservation(onObservation)
      recorder.onCommit(onCommit)
      recorder.start()

      const input = document.getElementById('name') as HTMLInputElement
      input.value = 'John Doe'
      input.dispatchEvent(new Event('blur', { bubbles: true }))

      await new Promise(resolve => setTimeout(resolve, 50))
      expect(onPending).toHaveBeenCalled()
      expect(onObservation).not.toHaveBeenCalled()

      const form = document.getElementById('test-form') as HTMLFormElement
      form.dispatchEvent(new Event('submit', { bubbles: true }))

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(onObservation).toHaveBeenCalled()
      expect(onCommit).toHaveBeenCalledWith(1)
    })

    it('tracks pending count correctly', async () => {
      recorder.start()

      expect(recorder.getPendingCount()).toBe(0)

      const nameInput = document.getElementById('name') as HTMLInputElement
      nameInput.value = 'John Doe'
      nameInput.dispatchEvent(new Event('blur', { bubbles: true }))

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(recorder.getPendingCount()).toBe(1)

      const emailInput = document.getElementById('email') as HTMLInputElement
      emailInput.value = 'john@example.com'
      emailInput.dispatchEvent(new Event('blur', { bubbles: true }))

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(recorder.getPendingCount()).toBe(2)
    })

    it('commits all pending via commitAllPending', async () => {
      const onCommit = vi.fn()
      recorder.onCommit(onCommit)
      recorder.start()

      const input = document.getElementById('name') as HTMLInputElement
      input.value = 'John Doe'
      input.dispatchEvent(new Event('blur', { bubbles: true }))

      await new Promise(resolve => setTimeout(resolve, 50))

      const committed = await recorder.commitAllPending()

      expect(committed).toBe(1)
      expect(recorder.getPendingCount()).toBe(0)
    })
  })
})
