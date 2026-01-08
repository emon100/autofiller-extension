import { describe, it, expect } from 'vitest'
import { 
  parseField, 
  getParsers, 
  registerParser,
  AutocompleteParser,
  TypeAttributeParser,
  NameIdParser,
  LabelParser
} from '@/parser'
import { Taxonomy, FieldContext, WidgetSignature } from '@/types'

function createFieldContext(overrides: Partial<FieldContext> = {}): FieldContext {
  const defaultSignature: WidgetSignature = {
    kind: 'text',
    attributes: {},
    interactionPlan: 'nativeSetterWithEvents'
  }
  
  return {
    element: document.createElement('input'),
    labelText: '',
    sectionTitle: '',
    attributes: {},
    optionsText: [],
    framePath: [],
    shadowPath: [],
    widgetSignature: defaultSignature,
    ...overrides
  }
}

describe('Parser Framework', () => {
  describe('getParsers', () => {
    it('returns parsers sorted by priority', () => {
      const parsers = getParsers()
      expect(parsers.length).toBeGreaterThan(0)
      
      for (let i = 1; i < parsers.length; i++) {
        expect(parsers[i - 1].priority).toBeGreaterThanOrEqual(parsers[i].priority)
      }
    })
  })

  describe('AutocompleteParser', () => {
    const parser = new AutocompleteParser()

    it('parses autocomplete="name" as FULL_NAME', async () => {
      const context = createFieldContext({ attributes: { autocomplete: 'name' } })
      const results = await parser.parse(context)
      
      expect(results).toHaveLength(1)
      expect(results[0].type).toBe(Taxonomy.FULL_NAME)
      expect(results[0].score).toBe(0.95)
    })

    it('parses autocomplete="email" as EMAIL', async () => {
      const context = createFieldContext({ attributes: { autocomplete: 'email' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.EMAIL)
    })

    it('parses autocomplete="tel" as PHONE', async () => {
      const context = createFieldContext({ attributes: { autocomplete: 'tel' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.PHONE)
    })

    it('parses autocomplete="given-name" as FIRST_NAME', async () => {
      const context = createFieldContext({ attributes: { autocomplete: 'given-name' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.FIRST_NAME)
    })

    it('parses autocomplete="family-name" as LAST_NAME', async () => {
      const context = createFieldContext({ attributes: { autocomplete: 'family-name' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.LAST_NAME)
    })

    it('returns false for canParse with unknown autocomplete', () => {
      const context = createFieldContext({ attributes: { autocomplete: 'unknown' } })
      expect(parser.canParse(context)).toBe(false)
    })
  })

  describe('TypeAttributeParser', () => {
    const parser = new TypeAttributeParser()

    it('parses type="email" as EMAIL', async () => {
      const context = createFieldContext({ attributes: { type: 'email' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.EMAIL)
      expect(results[0].score).toBe(0.9)
    })

    it('parses type="tel" as PHONE', async () => {
      const context = createFieldContext({ attributes: { type: 'tel' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.PHONE)
    })

    it('parses type="date" as GRAD_DATE', async () => {
      const context = createFieldContext({ attributes: { type: 'date' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.GRAD_DATE)
    })

    it('parses type="url" as PORTFOLIO', async () => {
      const context = createFieldContext({ attributes: { type: 'url' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.PORTFOLIO)
    })
  })

  describe('NameIdParser', () => {
    const parser = new NameIdParser()

    it('parses name="fullName" as FULL_NAME', async () => {
      const context = createFieldContext({ attributes: { name: 'fullName' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.FULL_NAME)
    })

    it('parses name="firstName" as FIRST_NAME', async () => {
      const context = createFieldContext({ attributes: { name: 'firstName' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.FIRST_NAME)
    })

    it('parses name="lastName" as LAST_NAME', async () => {
      const context = createFieldContext({ attributes: { name: 'lastName' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.LAST_NAME)
    })

    it('parses id="email" as EMAIL', async () => {
      const context = createFieldContext({ attributes: { id: 'email' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.EMAIL)
    })

    it('parses name="linkedin" as LINKEDIN', async () => {
      const context = createFieldContext({ attributes: { name: 'linkedin' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.LINKEDIN)
      expect(results[0].score).toBe(0.95)
    })

    it('parses name="github" as GITHUB', async () => {
      const context = createFieldContext({ attributes: { name: 'github' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.GITHUB)
    })

    it('parses name="school" as SCHOOL', async () => {
      const context = createFieldContext({ attributes: { name: 'school' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.SCHOOL)
    })

    it('parses name="workAuth" as WORK_AUTH', async () => {
      const context = createFieldContext({ attributes: { name: 'workAuth' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.WORK_AUTH)
    })

    it('parses name="sponsorship" as NEED_SPONSORSHIP', async () => {
      const context = createFieldContext({ attributes: { name: 'sponsorship' } })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.NEED_SPONSORSHIP)
    })
  })

  describe('LabelParser', () => {
    const parser = new LabelParser()

    it('parses label "Full Name" as FULL_NAME', async () => {
      const context = createFieldContext({ labelText: 'Full Name' })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.FULL_NAME)
    })

    it('parses Chinese label "姓名" as FULL_NAME', async () => {
      const context = createFieldContext({ labelText: '姓名' })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.FULL_NAME)
    })

    it('parses label "Email Address" as EMAIL', async () => {
      const context = createFieldContext({ labelText: 'Email Address' })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.EMAIL)
    })

    it('parses Chinese label "电话" as PHONE', async () => {
      const context = createFieldContext({ labelText: '电话' })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.PHONE)
    })

    it('parses label "School/University" as SCHOOL', async () => {
      const context = createFieldContext({ labelText: 'School/University' })
      const results = await parser.parse(context)
      
      expect(results[0].type).toBe(Taxonomy.SCHOOL)
    })

    it('considers sectionTitle for classification', async () => {
      const context = createFieldContext({ 
        labelText: 'School',
        sectionTitle: 'Education'
      })
      const results = await parser.parse(context)
      
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].type).toBe(Taxonomy.SCHOOL)
    })
  })

  describe('parseField (integrated)', () => {
    it('returns UNKNOWN for unrecognized fields', async () => {
      const context = createFieldContext({ 
        attributes: { name: 'xyz123' },
        labelText: 'Custom Field'
      })
      const results = await parseField(context)
      
      expect(results[results.length - 1].type).toBe(Taxonomy.UNKNOWN)
    })

    it('prioritizes autocomplete over other signals', async () => {
      const context = createFieldContext({ 
        attributes: { 
          autocomplete: 'email',
          name: 'phone'
        }
      })
      const results = await parseField(context)
      
      expect(results[0].type).toBe(Taxonomy.EMAIL)
    })

    it('combines results from multiple parsers', async () => {
      const context = createFieldContext({ 
        attributes: { name: 'email' },
        labelText: 'Email Address'
      })
      const results = await parseField(context)
      
      expect(results[0].type).toBe(Taxonomy.EMAIL)
      expect(results.length).toBeGreaterThanOrEqual(1)
    })
  })
})
