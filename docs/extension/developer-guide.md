# AutoFiller Developer Guide

Extension guide for adding custom field types, parsers, and transformers.

---

## Architecture Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Scanner   │───▶│   Parser    │───▶│ Transformer │───▶│  Executor   │
│ (DOM scan)  │    │ (classify)  │    │ (convert)   │    │ (fill)      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                  │
                          ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐
                   │  Taxonomy   │    │   Types     │
                   │  (enum)     │    │ (interfaces)│
                   └─────────────┘    └─────────────┘
```

| Module | Purpose | Extension Point |
|--------|---------|-----------------|
| `src/types/index.ts` | Core types & Taxonomy enum | Add new field types |
| `src/parser/index.ts` | Field classification | Add custom parsers |
| `src/transformer/index.ts` | Value conversion | Add custom transformers |

---

## 1. Extending Taxonomy

Taxonomy defines all recognizable field types.

### Step 1: Add to Enum

```typescript
// src/types/index.ts

export enum Taxonomy {
  // ... existing types ...
  
  // Add your new type
  COMPANY_NAME = 'COMPANY_NAME',
  JOB_TITLE = 'JOB_TITLE',
  COVER_LETTER = 'COVER_LETTER',
}
```

### Step 2: Mark as Sensitive (if needed)

```typescript
// src/types/index.ts

export const SENSITIVE_TYPES = new Set([
  // ... existing sensitive types ...
  
  Taxonomy.COVER_LETTER,  // Add if sensitive
])
```

### Step 3: Add Parser Rules

See Section 2 for parser implementation.

### Step 4: Add Transformer (if needed)

See Section 3 for transformer implementation.

---

## 2. Creating Custom Parsers

Parsers classify form fields into Taxonomy types.

### Interface

```typescript
interface IFieldParser {
  name: string           // Parser identifier
  priority: number       // Higher = runs first (0-100)
  canParse(context: FieldContext): boolean
  parse(context: FieldContext): Promise<CandidateType[]>
}
```

### Priority Guidelines

| Priority | Parser Type | Example |
|----------|-------------|---------|
| 100 | Explicit attributes | `autocomplete="email"` |
| 90 | Type attributes | `type="email"` |
| 80 | Name/ID patterns | `name="firstName"` |
| 70 | Label text | `<label>Email</label>` |
| 50 | LLM fallback | AI classification |
| 30 | Custom heuristics | Site-specific rules |

### Example: Company Name Parser

```typescript
// src/parser/CompanyParser.ts

import { FieldContext, CandidateType, Taxonomy, IFieldParser } from '@/types'

export class CompanyParser implements IFieldParser {
  name = 'CompanyParser'
  priority = 75  // Between label and name/id parsers

  private readonly patterns = [
    /company.?name|employer|organization/i,
    /current.?company|previous.?company/i,
    /公司|雇主|单位/,
  ]

  canParse(context: FieldContext): boolean {
    const combined = `${context.labelText} ${context.attributes.name || ''}`
    return this.patterns.some(p => p.test(combined))
  }

  async parse(context: FieldContext): Promise<CandidateType[]> {
    const label = context.labelText.toLowerCase()
    const name = (context.attributes.name || '').toLowerCase()
    const combined = `${label} ${name}`

    for (const pattern of this.patterns) {
      if (pattern.test(combined)) {
        return [{
          type: Taxonomy.COMPANY_NAME,
          score: 0.85,
          reasons: [`matches pattern: ${pattern.source}`]
        }]
      }
    }

    return []
  }
}
```

### Registration

```typescript
// src/parser/index.ts

import { CompanyParser } from './CompanyParser'

// Add to parsers array
const parsers: IFieldParser[] = [
  new AutocompleteParser(),
  new TypeAttributeParser(),
  new CompanyParser(),  // Add here
  new NameIdParser(),
  new LabelParser(),
  new LLMParser(),
]

// Or register dynamically
import { registerParser } from '@/parser'
registerParser(new CompanyParser())
```

### FieldContext Reference

```typescript
interface FieldContext {
  element: HTMLElement              // DOM element
  labelText: string                 // Associated label text
  sectionTitle: string              // Section/fieldset heading
  attributes: Record<string, string> // Element attributes
  optionsText: string[]             // Select/radio options
  framePath: string[]               // iframe hierarchy
  shadowPath: string[]              // Shadow DOM hierarchy
  widgetSignature: WidgetSignature  // Widget metadata
}

interface WidgetSignature {
  kind: 'text' | 'select' | 'checkbox' | 'radio' | 'combobox' | 'date' | 'textarea' | 'custom'
  role?: string                     // ARIA role
  attributes: Record<string, string>
  interactionPlan: InteractionPlan
  optionLocator?: string            // CSS selector for options
}
```

---

## 3. Creating Custom Transformers

Transformers convert stored values to match target field formats.

### Interface

```typescript
interface IValueTransformer {
  name: string
  sourceType: Taxonomy              // Type stored in answers
  targetTypes: Taxonomy[]           // Types this can transform to
  canTransform(sourceValue: string, targetContext: FieldContext): boolean
  transform(sourceValue: string, targetContext: FieldContext): string
}
```

### Example: Address Transformer

```typescript
// src/transformer/AddressTransformer.ts

import { Taxonomy, FieldContext, IValueTransformer } from '@/types'

export class AddressTransformer implements IValueTransformer {
  name = 'AddressTransformer'
  sourceType = Taxonomy.LOCATION       // Full address stored
  targetTypes = [
    Taxonomy.LOCATION,
    Taxonomy.CITY,
    Taxonomy.STATE,
    Taxonomy.ZIP_CODE,
  ]

  canTransform(sourceValue: string, targetContext: FieldContext): boolean {
    return sourceValue.length > 0
  }

  transform(sourceValue: string, targetContext: FieldContext): string {
    const targetType = this.detectTargetType(targetContext)
    const parsed = this.parseAddress(sourceValue)

    switch (targetType) {
      case Taxonomy.CITY:
        return parsed.city
      case Taxonomy.STATE:
        return parsed.state
      case Taxonomy.ZIP_CODE:
        return parsed.zip
      default:
        return sourceValue
    }
  }

  private detectTargetType(context: FieldContext): Taxonomy {
    const combined = `${context.labelText} ${context.attributes.name || ''}`.toLowerCase()

    if (/city|城市/.test(combined)) return Taxonomy.CITY
    if (/state|province|省/.test(combined)) return Taxonomy.STATE
    if (/zip|postal|邮编/.test(combined)) return Taxonomy.ZIP_CODE

    return Taxonomy.LOCATION
  }

  private parseAddress(value: string): { city: string; state: string; zip: string } {
    // Simple US address parsing: "City, ST 12345"
    const match = value.match(/^(.+),\s*([A-Z]{2})\s*(\d{5})?/)
    if (match) {
      return {
        city: match[1].trim(),
        state: match[2],
        zip: match[3] || ''
      }
    }
    return { city: value, state: '', zip: '' }
  }
}
```

### Registration

```typescript
// src/transformer/index.ts

import { AddressTransformer } from './AddressTransformer'

const transformers: IValueTransformer[] = [
  new NameTransformer(),
  new DateTransformer(),
  new PhoneTransformer(),
  new BooleanTransformer(),
  new DegreeTransformer(),
  new AddressTransformer(),  // Add here
]

// Or register dynamically
import { registerTransformer } from '@/transformer'
registerTransformer(new AddressTransformer())
```

### Transform Flow

```
User Answer: "San Francisco, CA 94102"
     │
     ▼
Target Field: <input name="city" />
     │
     ▼
detectTargetType() → Taxonomy.CITY
     │
     ▼
parseAddress() → { city: "San Francisco", state: "CA", zip: "94102" }
     │
     ▼
Output: "San Francisco"
```

---

## 4. Matching Select Options

When transforming values for `<select>` elements, match against available options.

### Pattern

```typescript
transform(sourceValue: string, targetContext: FieldContext): string {
  if (targetContext.widgetSignature.kind === 'select') {
    return this.matchSelectOption(sourceValue, targetContext.optionsText)
  }
  return sourceValue
}

private matchSelectOption(value: string, options: string[]): string {
  const normalized = value.toLowerCase().trim()

  // Exact match
  const exact = options.find(o => o.toLowerCase() === normalized)
  if (exact) return exact

  // Partial match
  const partial = options.find(o => 
    o.toLowerCase().includes(normalized) || 
    normalized.includes(o.toLowerCase())
  )
  if (partial) return partial

  return value
}
```

---

## 5. Testing

### Parser Tests

```typescript
// tests/unit/company-parser.test.ts

import { describe, it, expect } from 'vitest'
import { CompanyParser } from '@/parser/CompanyParser'
import { Taxonomy } from '@/types'

function createContext(overrides = {}) {
  return {
    element: document.createElement('input'),
    labelText: '',
    sectionTitle: '',
    attributes: {},
    optionsText: [],
    framePath: [],
    shadowPath: [],
    widgetSignature: { kind: 'text', attributes: {}, interactionPlan: 'nativeSetterWithEvents' },
    ...overrides
  }
}

describe('CompanyParser', () => {
  const parser = new CompanyParser()

  it('detects company name from label', async () => {
    const context = createContext({ labelText: 'Company Name' })
    const results = await parser.parse(context)

    expect(results).toHaveLength(1)
    expect(results[0].type).toBe(Taxonomy.COMPANY_NAME)
    expect(results[0].score).toBeGreaterThan(0.8)
  })

  it('detects employer from attribute', async () => {
    const context = createContext({ 
      labelText: 'Employer',
      attributes: { name: 'currentEmployer' }
    })
    const results = await parser.parse(context)

    expect(results[0].type).toBe(Taxonomy.COMPANY_NAME)
  })
})
```

### Transformer Tests

```typescript
// tests/unit/address-transformer.test.ts

import { describe, it, expect } from 'vitest'
import { AddressTransformer } from '@/transformer/AddressTransformer'
import { Taxonomy } from '@/types'

describe('AddressTransformer', () => {
  const transformer = new AddressTransformer()

  it('extracts city from full address', () => {
    const context = createContext({ 
      labelText: 'City',
      attributes: { name: 'city' }
    })
    const result = transformer.transform('San Francisco, CA 94102', context)

    expect(result).toBe('San Francisco')
  })

  it('extracts state from full address', () => {
    const context = createContext({ 
      labelText: 'State',
      attributes: { name: 'state' }
    })
    const result = transformer.transform('San Francisco, CA 94102', context)

    expect(result).toBe('CA')
  })
})
```

### Run Tests

```bash
npm test                    # Run all tests
npm test -- --run           # Run once (no watch)
npm test -- company         # Filter by name
```

---

## 6. Common Patterns

### Detecting Target Type from Context

```typescript
private detectTargetType(context: FieldContext): Taxonomy {
  const label = context.labelText.toLowerCase()
  const name = (context.attributes.name || '').toLowerCase()
  const id = (context.attributes.id || '').toLowerCase()
  const combined = `${label} ${name} ${id}`

  // Check patterns in order of specificity
  if (/specific-pattern/.test(combined)) return Taxonomy.SPECIFIC_TYPE
  if (/general-pattern/.test(combined)) return Taxonomy.GENERAL_TYPE

  return this.sourceType  // Default to source type
}
```

### Handling Multiple Formats

```typescript
private parseValue(value: string): ParsedValue | null {
  // Try format 1
  const format1 = value.match(/pattern1/)
  if (format1) return { /* parsed */ }

  // Try format 2
  const format2 = value.match(/pattern2/)
  if (format2) return { /* parsed */ }

  // Unknown format
  return null
}

transform(sourceValue: string, targetContext: FieldContext): string {
  const parsed = this.parseValue(sourceValue)
  if (!parsed) return sourceValue  // Fallback to original

  // ... transform logic
}
```

### Confidence Scoring

```typescript
async parse(context: FieldContext): Promise<CandidateType[]> {
  let score = 0.5  // Base score
  const reasons: string[] = []

  // Boost for exact attribute match
  if (context.attributes.autocomplete === 'organization') {
    score += 0.4
    reasons.push('autocomplete="organization"')
  }

  // Boost for label match
  if (/company/i.test(context.labelText)) {
    score += 0.2
    reasons.push('label contains "company"')
  }

  // Boost for section context
  if (/employment|work/i.test(context.sectionTitle)) {
    score += 0.1
    reasons.push('in employment section')
  }

  return [{
    type: Taxonomy.COMPANY_NAME,
    score: Math.min(score, 0.95),  // Cap at 0.95
    reasons
  }]
}
```

---

## 7. File Structure

```
src/
├── types/index.ts              # Add Taxonomy values here
├── parser/
│   ├── index.ts                # Register parsers here
│   ├── CompanyParser.ts        # Custom parser
│   └── ...
├── transformer/
│   ├── index.ts                # Register transformers here
│   ├── AddressTransformer.ts   # Custom transformer
│   └── ...
tests/unit/
├── company-parser.test.ts
├── address-transformer.test.ts
└── ...
```

---

## 8. Checklist for New Field Types

- [ ] Add to `Taxonomy` enum in `src/types/index.ts`
- [ ] Add to `SENSITIVE_TYPES` if sensitive
- [ ] Create parser in `src/parser/`
- [ ] Register parser in `src/parser/index.ts`
- [ ] Create transformer if value conversion needed
- [ ] Register transformer in `src/transformer/index.ts`
- [ ] Add unit tests for parser
- [ ] Add unit tests for transformer
- [ ] Test on demo page
- [ ] Run `npm test` to verify all tests pass
