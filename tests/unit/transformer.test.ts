import { describe, it, expect } from 'vitest'
import {
  transformValue,
  stripCountryCode,
  NameTransformer,
  DateTransformer,
  PhoneTransformer,
  BooleanTransformer,
  DegreeTransformer
} from '@/transformer'
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

describe('Value Transformers', () => {
  describe('NameTransformer', () => {
    const transformer = new NameTransformer()

    it('extracts first name from English full name', () => {
      const context = createFieldContext({ 
        labelText: 'First Name',
        attributes: { name: 'firstName' }
      })
      const result = transformer.transform('John Doe', context)
      expect(result).toBe('John')
    })

    it('extracts last name from English full name', () => {
      const context = createFieldContext({ 
        labelText: 'Last Name',
        attributes: { name: 'lastName' }
      })
      const result = transformer.transform('John Doe', context)
      expect(result).toBe('Doe')
    })

    it('extracts first name (given name) from Chinese full name', () => {
      const context = createFieldContext({ 
        labelText: '名',
        attributes: { name: 'firstName' }
      })
      const result = transformer.transform('张三', context)
      expect(result).toBe('三')
    })

    it('extracts last name (family name) from Chinese full name', () => {
      const context = createFieldContext({ 
        labelText: '姓',
        attributes: { name: 'lastName' }
      })
      const result = transformer.transform('张三', context)
      expect(result).toBe('张')
    })

    it('returns full name for full name field', () => {
      const context = createFieldContext({ 
        labelText: 'Full Name',
        attributes: { name: 'fullName' }
      })
      const result = transformer.transform('John Doe', context)
      expect(result).toBe('John Doe')
    })

    it('handles multi-word names', () => {
      const context = createFieldContext({ 
        labelText: 'Last Name',
        attributes: { name: 'lastName' }
      })
      const result = transformer.transform('John Michael Doe', context)
      expect(result).toBe('Doe')
    })
  })

  describe('DateTransformer', () => {
    const transformer = new DateTransformer()

    it('converts ISO date to year only', () => {
      const context = createFieldContext({ 
        labelText: 'Graduation Year',
        attributes: { name: 'gradYear' }
      })
      const result = transformer.transform('2024-05-15', context)
      expect(result).toBe('2024')
    })

    it('converts ISO date to month name for select', () => {
      const context = createFieldContext({ 
        labelText: 'Graduation Month',
        attributes: { name: 'gradMonth' },
        optionsText: ['January', 'February', 'March', 'April', 'May'],
        widgetSignature: { kind: 'select', attributes: {}, interactionPlan: 'directSet' }
      })
      const result = transformer.transform('2024-05-15', context)
      expect(result).toBe('May')
    })

    it('converts ISO date to date input format', () => {
      const context = createFieldContext({ 
        attributes: { type: 'date' }
      })
      const result = transformer.transform('2024-05-15', context)
      expect(result).toBe('2024-05-15')
    })

    it('converts ISO date to month input format', () => {
      const context = createFieldContext({ 
        attributes: { type: 'month' }
      })
      const result = transformer.transform('2024-05-15', context)
      expect(result).toBe('2024-05')
    })

    it('handles year-only input', () => {
      const context = createFieldContext({ 
        labelText: 'Year',
        attributes: { name: 'year' }
      })
      const result = transformer.transform('2024', context)
      expect(result).toBe('2024')
    })

    it('returns original for unrecognized format', () => {
      const context = createFieldContext({})
      const result = transformer.transform('invalid-date', context)
      expect(result).toBe('invalid-date')
    })

    it('converts ISO date to short month name for select', () => {
      const context = createFieldContext({ 
        labelText: 'Month',
        attributes: { name: 'month' },
        optionsText: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        widgetSignature: { kind: 'select', attributes: {}, interactionPlan: 'directSet' }
      })
      const result = transformer.transform('2024-05-15', context)
      expect(result).toBe('May')
    })

    it('converts ISO date to numeric month for select with numbers', () => {
      const context = createFieldContext({ 
        labelText: 'Month',
        attributes: { name: 'month' },
        optionsText: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        widgetSignature: { kind: 'select', attributes: {}, interactionPlan: 'directSet' }
      })
      const result = transformer.transform('2024-05-15', context)
      expect(result).toBe('5')
    })

    it('converts ISO date to padded numeric month for select', () => {
      const context = createFieldContext({ 
        labelText: 'Month',
        attributes: { name: 'month' },
        optionsText: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
        widgetSignature: { kind: 'select', attributes: {}, interactionPlan: 'directSet' }
      })
      const result = transformer.transform('2024-05-15', context)
      expect(result).toBe('05')
    })

    it('falls back to full month name when no exact option match', () => {
      const context = createFieldContext({ 
        labelText: 'Month',
        attributes: { name: 'month' },
        optionsText: ['January', 'February', 'March', 'April', 'May'],
        widgetSignature: { kind: 'select', attributes: {}, interactionPlan: 'directSet' }
      })
      const result = transformer.transform('2024-05-15', context)
      expect(result).toBe('May')
    })
  })

  describe('PhoneTransformer', () => {
    const transformer = new PhoneTransformer()

    it('extracts country code from E.164', () => {
      const context = createFieldContext({ 
        labelText: 'Country Code',
        attributes: { name: 'countryCode' }
      })
      const result = transformer.transform('+14155551234', context)
      expect(result).toBe('+1')
    })

    it('extracts local number (10 digits)', () => {
      const context = createFieldContext({ 
        attributes: { maxlength: '10' }
      })
      const result = transformer.transform('+14155551234', context)
      expect(result).toBe('4155551234')
    })

    it('formats as US phone with parentheses', () => {
      const context = createFieldContext({ 
        attributes: { placeholder: '(555) 555-5555' }
      })
      const result = transformer.transform('+14155551234', context)
      expect(result).toBe('(415) 555-1234')
    })

    it('formats as US phone with dashes', () => {
      const context = createFieldContext({ 
        attributes: { placeholder: '555-555-5555' }
      })
      const result = transformer.transform('+14155551234', context)
      expect(result).toBe('415-555-1234')
    })

    it('returns international format by default', () => {
      const context = createFieldContext({})
      const result = transformer.transform('+14155551234', context)
      expect(result).toBe('+1 4155551234')
    })

    it('handles already formatted phone', () => {
      const context = createFieldContext({})
      const result = transformer.transform('(415) 555-1234', context)
      expect(result).toBe('4155551234')
    })
  })

  describe('BooleanTransformer', () => {
    const transformer = new BooleanTransformer()

    it('transforms "yes" to checkbox true', () => {
      const context = createFieldContext({ 
        widgetSignature: { kind: 'checkbox', attributes: {}, interactionPlan: 'directSet' }
      })
      const result = transformer.transform('yes', context)
      expect(result).toBe('true')
    })

    it('transforms "no" to checkbox false', () => {
      const context = createFieldContext({ 
        widgetSignature: { kind: 'checkbox', attributes: {}, interactionPlan: 'directSet' }
      })
      const result = transformer.transform('no', context)
      expect(result).toBe('false')
    })

    it('matches select option text for true', () => {
      const context = createFieldContext({ 
        optionsText: ['Select...', 'Yes, I am authorized', 'No, I am not authorized'],
        widgetSignature: { kind: 'select', attributes: {}, interactionPlan: 'directSet' }
      })
      const result = transformer.transform('yes', context)
      expect(result).toBe('Yes, I am authorized')
    })

    it('matches select option text for false', () => {
      const context = createFieldContext({ 
        optionsText: ['Select...', 'Yes', 'No'],
        widgetSignature: { kind: 'select', attributes: {}, interactionPlan: 'directSet' }
      })
      const result = transformer.transform('no', context)
      expect(result).toBe('No')
    })

    it('handles Chinese boolean values', () => {
      const context = createFieldContext({ 
        widgetSignature: { kind: 'checkbox', attributes: {}, interactionPlan: 'directSet' }
      })
      expect(transformer.transform('是', context)).toBe('true')
      expect(transformer.transform('否', context)).toBe('false')
    })
  })

  describe('DegreeTransformer', () => {
    const transformer = new DegreeTransformer()

    it('matches Bachelor variants', () => {
      const context = createFieldContext({ 
        optionsText: ['', "Bachelor's Degree", "Master's Degree", 'Ph.D.']
      })
      
      expect(transformer.transform("bachelor's", context)).toBe("Bachelor's Degree")
      expect(transformer.transform('BS', context)).toBe("Bachelor's Degree")
      expect(transformer.transform('本科', context)).toBe("Bachelor's Degree")
    })

    it('matches Master variants', () => {
      const context = createFieldContext({ 
        optionsText: ['', "Bachelor's", "Master's", 'Doctorate']
      })
      
      expect(transformer.transform("master's", context)).toBe("Master's")
      expect(transformer.transform('MS', context)).toBe("Master's")
      expect(transformer.transform('硕士', context)).toBe("Master's")
    })

    it('matches PhD variants', () => {
      const context = createFieldContext({ 
        optionsText: ['', 'Bachelor', 'Master', 'Ph.D.']
      })
      
      expect(transformer.transform('phd', context)).toBe('Ph.D.')
      expect(transformer.transform('doctorate', context)).toBe('Ph.D.')
      expect(transformer.transform('博士', context)).toBe('Ph.D.')
    })

    it('returns original if no match', () => {
      const context = createFieldContext({ 
        optionsText: ['Option A', 'Option B']
      })
      const result = transformer.transform("Master's", context)
      expect(result).toBe("Master's")
    })
  })

  describe('transformValue (integrated)', () => {
    it('transforms full name to first name', () => {
      const context = createFieldContext({ 
        labelText: 'First Name',
        attributes: { name: 'firstName' }
      })
      const result = transformValue('John Doe', Taxonomy.FULL_NAME, context)
      expect(result).toBe('John')
    })

    it('transforms date to year', () => {
      const context = createFieldContext({ 
        labelText: 'Graduation Year',
        attributes: { name: 'gradYear' }
      })
      const result = transformValue('2024-05-15', Taxonomy.GRAD_DATE, context)
      expect(result).toBe('2024')
    })

    it('returns original for unknown transformation', () => {
      const context = createFieldContext({})
      const result = transformValue('some value', Taxonomy.UNKNOWN, context)
      expect(result).toBe('some value')
    })
  })

  describe('stripCountryCode', () => {
    it('strips US country code (+1)', () => {
      expect(stripCountryCode('+1 5551234567')).toBe('5551234567')
    })

    it('strips China country code (+86)', () => {
      expect(stripCountryCode('+86 13812345678')).toBe('13812345678')
    })

    it('strips UK country code (+44)', () => {
      expect(stripCountryCode('+44 7911123456')).toBe('7911123456')
    })

    it('returns as-is when no country code prefix', () => {
      expect(stripCountryCode('5551234567')).toBe('5551234567')
    })

    it('strips country code from compact format', () => {
      expect(stripCountryCode('+14155551234')).toBe('4155551234')
    })
  })
})
