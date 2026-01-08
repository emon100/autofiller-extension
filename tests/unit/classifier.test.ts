import { describe, it, expect } from 'vitest'
import { classify, classifyByAutocomplete, classifyByType, classifyByNameId, classifyByLabel } from '@/classifier'
import { Taxonomy, FieldContext, WidgetSignature } from '@/types'

function createMockFieldContext(overrides: Partial<FieldContext> = {}): FieldContext {
  return {
    element: document.createElement('input'),
    labelText: '',
    sectionTitle: '',
    attributes: {},
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

describe('Classifier', () => {
  describe('classifyByAutocomplete', () => {
    it('identifies name from autocomplete="name"', () => {
      const field = createMockFieldContext({ attributes: { autocomplete: 'name' } })
      const result = classifyByAutocomplete(field)
      expect(result?.type).toBe(Taxonomy.FULL_NAME)
      expect(result?.score).toBeGreaterThanOrEqual(0.9)
    })

    it('identifies email from autocomplete="email"', () => {
      const field = createMockFieldContext({ attributes: { autocomplete: 'email' } })
      const result = classifyByAutocomplete(field)
      expect(result?.type).toBe(Taxonomy.EMAIL)
    })

    it('identifies phone from autocomplete="tel"', () => {
      const field = createMockFieldContext({ attributes: { autocomplete: 'tel' } })
      const result = classifyByAutocomplete(field)
      expect(result?.type).toBe(Taxonomy.PHONE)
    })

    it('identifies city from autocomplete="address-level2"', () => {
      const field = createMockFieldContext({ attributes: { autocomplete: 'address-level2' } })
      const result = classifyByAutocomplete(field)
      expect(result?.type).toBe(Taxonomy.CITY)
    })

    it('returns null for unknown autocomplete', () => {
      const field = createMockFieldContext({ attributes: { autocomplete: 'unknown' } })
      const result = classifyByAutocomplete(field)
      expect(result).toBeNull()
    })
  })

  describe('classifyByType', () => {
    it('identifies email from type="email"', () => {
      const field = createMockFieldContext({ attributes: { type: 'email' } })
      const result = classifyByType(field)
      expect(result?.type).toBe(Taxonomy.EMAIL)
      expect(result?.score).toBeGreaterThanOrEqual(0.8)
    })

    it('identifies phone from type="tel"', () => {
      const field = createMockFieldContext({ attributes: { type: 'tel' } })
      const result = classifyByType(field)
      expect(result?.type).toBe(Taxonomy.PHONE)
    })

    it('identifies date from type="date"', () => {
      const field = createMockFieldContext({ 
        attributes: { type: 'date' },
        widgetSignature: { kind: 'date', attributes: {}, interactionPlan: 'nativeSetterWithEvents' }
      })
      const result = classifyByType(field)
      expect(result).not.toBeNull()
    })

    it('returns null for type="text"', () => {
      const field = createMockFieldContext({ attributes: { type: 'text' } })
      const result = classifyByType(field)
      expect(result).toBeNull()
    })
  })

  describe('classifyByNameId', () => {
    it('identifies fullName from name="fullName"', () => {
      const field = createMockFieldContext({ attributes: { name: 'fullName' } })
      const result = classifyByNameId(field)
      expect(result?.type).toBe(Taxonomy.FULL_NAME)
    })

    it('identifies email from id="email"', () => {
      const field = createMockFieldContext({ attributes: { id: 'email' } })
      const result = classifyByNameId(field)
      expect(result?.type).toBe(Taxonomy.EMAIL)
    })

    it('identifies phone from name="phoneNumber"', () => {
      const field = createMockFieldContext({ attributes: { name: 'phoneNumber' } })
      const result = classifyByNameId(field)
      expect(result?.type).toBe(Taxonomy.PHONE)
    })

    it('identifies school from name="university"', () => {
      const field = createMockFieldContext({ attributes: { name: 'university' } })
      const result = classifyByNameId(field)
      expect(result?.type).toBe(Taxonomy.SCHOOL)
    })

    it('identifies linkedin from name="linkedinUrl"', () => {
      const field = createMockFieldContext({ attributes: { name: 'linkedinUrl' } })
      const result = classifyByNameId(field)
      expect(result?.type).toBe(Taxonomy.LINKEDIN)
    })

    it('identifies github from id="github_profile"', () => {
      const field = createMockFieldContext({ attributes: { id: 'github_profile' } })
      const result = classifyByNameId(field)
      expect(result?.type).toBe(Taxonomy.GITHUB)
    })

    it('identifies workAuth from name="work_authorization"', () => {
      const field = createMockFieldContext({ attributes: { name: 'work_authorization' } })
      const result = classifyByNameId(field)
      expect(result?.type).toBe(Taxonomy.WORK_AUTH)
    })

    it('identifies sponsorship from name="requireSponsorship"', () => {
      const field = createMockFieldContext({ attributes: { name: 'requireSponsorship' } })
      const result = classifyByNameId(field)
      expect(result?.type).toBe(Taxonomy.NEED_SPONSORSHIP)
    })

    it('identifies gender from name="gender"', () => {
      const field = createMockFieldContext({ attributes: { name: 'gender' } })
      const result = classifyByNameId(field)
      expect(result?.type).toBe(Taxonomy.EEO_GENDER)
    })

    it('identifies ethnicity from name="race"', () => {
      const field = createMockFieldContext({ attributes: { name: 'race' } })
      const result = classifyByNameId(field)
      expect(result?.type).toBe(Taxonomy.EEO_ETHNICITY)
    })
  })

  describe('classifyByLabel', () => {
    it('identifies fullName from label "Full Name"', () => {
      const field = createMockFieldContext({ labelText: 'Full Name' })
      const result = classifyByLabel(field)
      expect(result?.type).toBe(Taxonomy.FULL_NAME)
    })

    it('identifies email from label "Email Address"', () => {
      const field = createMockFieldContext({ labelText: 'Email Address' })
      const result = classifyByLabel(field)
      expect(result?.type).toBe(Taxonomy.EMAIL)
    })

    it('identifies phone from label "Phone Number"', () => {
      const field = createMockFieldContext({ labelText: 'Phone Number' })
      const result = classifyByLabel(field)
      expect(result?.type).toBe(Taxonomy.PHONE)
    })

    it('identifies school from label "University"', () => {
      const field = createMockFieldContext({ labelText: 'University' })
      const result = classifyByLabel(field)
      expect(result?.type).toBe(Taxonomy.SCHOOL)
    })

    it('identifies graduation date from label "Expected Graduation"', () => {
      const field = createMockFieldContext({ labelText: 'Expected Graduation' })
      const result = classifyByLabel(field)
      expect(result?.type).toBe(Taxonomy.GRAD_DATE)
    })

    it('identifies workAuth from label "Are you authorized to work"', () => {
      const field = createMockFieldContext({ labelText: 'Are you authorized to work in this country?' })
      const result = classifyByLabel(field)
      expect(result?.type).toBe(Taxonomy.WORK_AUTH)
    })

    it('identifies sponsorship from label "require visa sponsorship"', () => {
      const field = createMockFieldContext({ labelText: 'Will you require visa sponsorship?' })
      const result = classifyByLabel(field)
      expect(result?.type).toBe(Taxonomy.NEED_SPONSORSHIP)
    })

    it('uses section hints for context', () => {
      const field = createMockFieldContext({ 
        labelText: 'Start Date',
        sectionTitle: 'Education'
      })
      const result = classifyByLabel(field)
      expect(result?.type).toBe(Taxonomy.START_DATE)
    })
  })

  describe('classify (combined)', () => {
    it('prefers autocomplete over other signals', () => {
      const field = createMockFieldContext({
        labelText: 'Your Email',
        attributes: { autocomplete: 'email', name: 'contact', type: 'text' }
      })
      const results = classify(field)
      expect(results[0].type).toBe(Taxonomy.EMAIL)
      expect(results[0].score).toBeGreaterThanOrEqual(0.9)
    })

    it('combines multiple weak signals', () => {
      const field = createMockFieldContext({
        labelText: 'School',
        attributes: { name: 'school_name' },
        sectionTitle: 'Education'
      })
      const results = classify(field)
      expect(results[0].type).toBe(Taxonomy.SCHOOL)
    })

    it('returns UNKNOWN for unrecognized fields', () => {
      const field = createMockFieldContext({
        labelText: 'Custom Field XYZ',
        attributes: { name: 'customXyz' }
      })
      const results = classify(field)
      expect(results.some(r => r.type === Taxonomy.UNKNOWN)).toBe(true)
    })

    it('provides multiple candidates with scores', () => {
      const field = createMockFieldContext({
        labelText: 'Name',
        attributes: { name: 'name' }
      })
      const results = classify(field)
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results[0].score).toBeGreaterThan(0)
      expect(results[0].reasons.length).toBeGreaterThan(0)
    })
  })
})
