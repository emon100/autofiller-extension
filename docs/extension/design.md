# AutoFiller-Claude: Global Design Document

## 1. Executive Summary

AutoFiller-Claude is a Chrome browser extension that learns from user input on job application forms and intelligently auto-fills similar fields across different websites. The system uses semantic understanding to map questions to answers, enabling cross-site form filling with high accuracy.

### Core Value Proposition
- **Learn Once, Fill Everywhere**: Fill a form once, auto-fill similar questions on any job site
- **Semantic Understanding**: Maps "question semantics" to "answer semantics" across different phrasings
- **Conservative Approach**: "Rather miss than mistake" - only auto-fills high-confidence fields
- **Privacy First**: User data stays local; only field metadata (not answers) sent to LLM for classification

---

## 2. Architecture Overview

```
+------------------------------------------------------------------+
|                        Chrome Extension                           |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------------+     +-----------------------------+   |
|  |     Content Script     |     |        Side Panel UI        |   |
|  |   (AutoFiller Core)    |     |    (React + Tailwind)       |   |
|  +------------------------+     +-----------------------------+   |
|           |                               |                       |
|           v                               v                       |
|  +----------------------------------------------------------+    |
|  |                    Core Modules Layer                     |    |
|  |  +--------+ +--------+ +----------+ +--------+ +-------+  |    |
|  |  |Scanner | |Parser  | |Classifier| |Executor| |Recorder| |    |
|  |  +--------+ +--------+ +----------+ +--------+ +-------+  |    |
|  |       |          |           |           |          |     |    |
|  |       v          v           v           v          v     |    |
|  |  +--------------------------------------------------+     |    |
|  |  |              Transformer Layer                   |     |    |
|  |  |  (Name, Date, Phone, Boolean, Degree transforms) |     |    |
|  |  +--------------------------------------------------+     |    |
|  +----------------------------------------------------------+    |
|           |                                                       |
|           v                                                       |
|  +----------------------------------------------------------+    |
|  |                    Storage Layer                          |    |
|  |  +-------------+ +---------------+ +-----------------+    |    |
|  |  |AnswerStorage| |ObservationStore| |SiteSettingsStore|   |    |
|  |  +-------------+ +---------------+ +-----------------+    |    |
|  +----------------------------------------------------------+    |
|           |                                                       |
|           v                                                       |
|  +----------------------------------------------------------+    |
|  |               Chrome Storage (Local/Sync)                 |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
                              |
                              v (optional, metadata only)
                   +---------------------+
                   |    LLM Service      |
                   | (Field Classification)|
                   +---------------------+
```

---

## 3. Data Flow Diagrams

### 3.1 Recording Flow (Two-Phase Save)

```
User Input                      Phase 1: Temporary             Phase 2: Persist
    |                               |                              |
    v                               v                              v
+--------+    blur/change     +-----------+    form submit    +------------+
| User   | ----------------> | Pending   | ----------------> | Observation|
| Types  |                   |Observation|                   | (Persisted)|
+--------+                   +-----------+                   +------------+
    |                             |                               |
    |                             v                               v
    |                        In-Memory Map                  Chrome Storage
    |                        (formId -> [])                      |
    |                             |                               |
    +-------- page unload --------+                               |
              (discard)                                           v
                                                           AnswerValue
                                                           QuestionKey
```

### 3.2 Fill Flow

```
+-------------+     +----------+     +---------+     +------------+     +----------+
| scanFields()| --> | parseField| --> | Match   | --> | transform  | --> | fillField|
| (DOM Scan)  |     | (Classify)|     | Answers |     | Value      |     | (Execute)|
+-------------+     +----------+     +---------+     +------------+     +----------+
      |                  |                |                |                 |
      v                  v                v                v                 v
 FieldContext[]     CandidateType[]   FillPlan[]      Transformed      FillResult[]
                                                       Values
```

### 3.3 Parser Pipeline

```
FieldContext
     |
     v
+--------------------+
| Parser Framework   |
|                    |
| Priority Order:    |
| 1. Autocomplete(100) -----> "autocomplete=email" -> EMAIL (0.95)
| 2. TypeAttribute(90) -----> "type=tel" -> PHONE (0.90)
| 3. NameId(80) ------------> "id=firstName" -> FIRST_NAME (0.90)
| 4. Label(70) -------------> "label=School Name" -> SCHOOL (0.85)
| 5. LLM(50) ---------------> async classification (0.75-0.95)
|                    |
+--------------------+
     |
     v
CandidateType[] (sorted by score)
```

---

## 4. Core Data Models

### 4.1 Taxonomy (Semantic Field Types)

```typescript
enum Taxonomy {
  // Personal Info
  FULL_NAME, FIRST_NAME, LAST_NAME, EMAIL, PHONE, COUNTRY_CODE,
  LOCATION, CITY, LINKEDIN, GITHUB, PORTFOLIO,
  
  // Education
  SCHOOL, DEGREE, MAJOR, GRAD_DATE, GRAD_YEAR, GRAD_MONTH,
  START_DATE, END_DATE,
  
  // Work Authorization
  WORK_AUTH, NEED_SPONSORSHIP,
  
  // Sensitive (never auto-fill by default)
  EEO_GENDER, EEO_ETHNICITY, EEO_VETERAN, EEO_DISABILITY,
  GOV_ID, SALARY, RESUME_TEXT,
  
  UNKNOWN
}
```

### 4.2 AnswerValue (User's Stored Answers)

```typescript
interface AnswerValue {
  id: string
  type: Taxonomy              // Semantic type
  value: string               // Normalized value (E.164 phone, ISO date)
  display: string             // Human-readable display
  aliases: string[]           // Alternative names (e.g., school aliases)
  sensitivity: 'normal' | 'sensitive'
  autofillAllowed: boolean    // User controls if sensitive fields auto-fill
  createdAt: number
  updatedAt: number
}
```

### 4.3 Observation (Learning Record)

```typescript
interface Observation {
  id: string
  timestamp: number
  siteKey: string             // e.g., "jobs.lever.co"
  url: string
  questionKeyId: string       // Links to QuestionKey
  answerId: string            // Links to AnswerValue
  widgetSignature: WidgetSignature
  confidence: number          // How confident the classification was
}
```

### 4.4 PendingObservation (Phase 1 - Not Yet Committed)

```typescript
interface PendingObservation {
  ...Observation fields...
  formId: string              // Groups observations by form
  status: 'pending' | 'committed' | 'discarded'
  rawValue: string            // Original value before normalization
  classifiedType: Taxonomy    // Type determined during recording
}
```

### 4.5 FieldContext (DOM Field Metadata)

```typescript
interface FieldContext {
  element: HTMLElement
  labelText: string           // From <label>, aria-label, placeholder
  sectionTitle: string        // From fieldset/legend, nearby heading
  attributes: Record<string, string>  // id, name, type, autocomplete, etc.
  optionsText: string[]       // For select/combobox
  framePath: string[]         // iframe ancestry
  shadowPath: string[]        // shadow DOM path
  widgetSignature: WidgetSignature
}
```

### 4.6 WidgetSignature (Field Type Detection)

```typescript
interface WidgetSignature {
  kind: 'text' | 'select' | 'checkbox' | 'radio' | 'combobox' | 'date' | 'textarea' | 'custom'
  role?: string               // ARIA role
  attributes: Record<string, string>
  interactionPlan: 'directSet' | 'nativeSetterWithEvents' | 'openDropdownClickOption' | 'typeToSearchEnter'
  optionLocator?: string      // CSS selector for options
}
```

---

## 5. Module Design

### 5.1 Scanner Module (`src/scanner/index.ts`)

**Responsibility**: Extract FieldContext from DOM

**Key Functions**:
- `scanFields(root)` - Scan all fillable fields in a DOM subtree
- `extractFieldContext(element)` - Extract metadata for a single field
- `extractLabelText(element)` - Find label via multiple strategies
- `detectWidgetSignature(element)` - Determine field type and interaction method

**Features**:
- Open shadow DOM traversal
- Same-origin iframe support
- Radio group deduplication
- Visibility filtering

### 5.2 Parser Module (`src/parser/index.ts`)

**Responsibility**: Classify fields into Taxonomy types

**Architecture**: Extensible chain-of-responsibility pattern

```typescript
interface IFieldParser {
  name: string
  priority: number            // Higher = runs first
  canParse(context: FieldContext): boolean
  parse(context: FieldContext): Promise<CandidateType[]>
}
```

**Built-in Parsers**:
| Parser | Priority | Strategy |
|--------|----------|----------|
| AutocompleteParser | 100 | HTML autocomplete attribute |
| TypeAttributeParser | 90 | input type (email, tel, date) |
| NameIdParser | 80 | name/id attribute patterns |
| LabelParser | 70 | Label text keyword matching |
| LLMParser | 50 | Cloud LLM classification (async) |

**Extension Point**: `registerParser(parser)` to add custom parsers

### 5.3 Transformer Module (`src/transformer/index.ts`)

**Responsibility**: Convert stored values to match target field format

**Architecture**: Type-based transformer registry

```typescript
interface IValueTransformer {
  name: string
  sourceType: Taxonomy
  targetTypes: Taxonomy[]
  canTransform(sourceValue: string, targetContext: FieldContext): boolean
  transform(sourceValue: string, targetContext: FieldContext): string
}
```

**Built-in Transformers**:

| Transformer | Source | Target | Example |
|-------------|--------|--------|---------|
| NameTransformer | FULL_NAME | FIRST_NAME, LAST_NAME | "John Doe" -> "John" |
| DateTransformer | GRAD_DATE | GRAD_YEAR, GRAD_MONTH | "2024-05-15" -> "2024" |
| PhoneTransformer | PHONE | COUNTRY_CODE | "+14155551234" -> "(415) 555-1234" |
| BooleanTransformer | WORK_AUTH | NEED_SPONSORSHIP | "yes" -> "I confirm" |
| DegreeTransformer | DEGREE | DEGREE | "Master's" -> "MS" |

**Extension Point**: `registerTransformer(transformer)`

### 5.4 Executor Module (`src/executor/index.ts`)

**Responsibility**: Fill field values with proper event triggering

**Key Functions**:
- `fillField(context, value)` - Fill a single field
- `executeFillPlan(plans, options)` - Batch fill with throttling
- `createFillSnapshot(element)` - Capture pre-fill state
- `restoreSnapshot(element, snapshot)` - Undo fill

**Widget Handlers**:
| Widget | Strategy |
|--------|----------|
| text/textarea | Native setter + input/change events |
| select | Value match -> text match -> partial match |
| radio | Find matching option in group |
| checkbox | Boolean conversion |
| combobox | Type + wait + click option |

### 5.5 Recorder Module (`src/recorder/index.ts`)

**Responsibility**: Capture user input for learning

**Current Implementation** (to be upgraded):
- Listens to blur/change events
- Creates Observation on field interaction
- Stores immediately (needs two-phase upgrade)

**Target Implementation** (Two-Phase):
1. **Phase 1**: On blur/change -> create PendingObservation (in-memory)
2. **Phase 2**: On form submit -> commit all PendingObservations to storage

### 5.6 Storage Module (`src/storage/index.ts`)

**Responsibility**: Persistent data management

**Storage Classes**:
- `AnswerStorage` - CRUD for user answers
- `ObservationStorage` - Learning history
- `SiteSettingsStorage` - Per-site preferences
- `PendingObservationStorage` - (TODO) Temporary records

**Features**:
- Chrome storage.local wrapper
- Type-safe accessors
- Export/import for backup

### 5.7 Content Script (`src/content/index.ts`)

**Responsibility**: Main extension entry point for web pages

**AutoFiller Class Methods**:
- `initialize()` - Setup based on site settings
- `fill()` - Execute auto-fill
- `undo()` / `undoField()` - Revert changes
- `getSuggestions(field)` - Get candidates for low-confidence fields
- `enableRecording()` / `disableRecording()` - Toggle learning
- `enableAutofill()` / `disableAutofill()` - Toggle filling

---

## 6. Key Algorithms

### 6.1 Confidence Scoring

```
Final Score = max(parser_scores) + context_boosts

Context Boosts:
- Section title matches type: +0.15
- Multiple parsers agree: +0.10
- Previous observation on same site: +0.10

Thresholds:
- >= 0.75: Auto-fill
- 0.50-0.74: Suggest with buttons
- < 0.50: No action
```

### 6.2 Answer Matching

```
1. Exact type match (PHONE -> PHONE)
2. Related type match (FULL_NAME -> FIRST_NAME via transformer)
3. Alias match (answer.aliases contains field label)
4. Best match by recency (most recently updated answer)
```

### 6.3 Form Submit Detection

```
Priority Order:
1. form.addEventListener('submit') - Native form submission
2. Button click with submit-like text: /submit|next|continue|save|apply/i
3. URL change after button click (SPA navigation)
4. Manual "Save Now" button in extension UI
```

---

## 7. Security & Privacy

### 7.1 Data Handling

| Data Type | Storage | Sent to Cloud |
|-----------|---------|---------------|
| User answers | Local only | Never |
| Field labels | Local | Yes (for LLM classification) |
| Field values | Local only | Never |
| Site settings | Local | Never |

### 7.2 PII Scrubbing (Before LLM)

```typescript
// Patterns to redact before sending to LLM
const PII_PATTERNS = [
  /\b[\w.-]+@[\w.-]+\.\w+\b/g,     // Email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone
  /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,   // SSN
]
```

### 7.3 Sensitive Field Protection

- EEO fields (gender, ethnicity, veteran, disability) - Never auto-fill by default
- GOV_ID, SALARY - User must explicitly enable
- RESUME_TEXT - Suggest only, never auto-fill

---

## 8. UI Components

### 8.1 Field Badge (Inline)

```
States:
- [Filled] - Green badge, hover shows source & undo
- [Suggest: Stanford] [MIT] - Blue badge with candidate buttons
- [Sensitive] - Gray badge, click requires confirmation
- [x] - Hover-to-clear button
```

### 8.2 Side Panel Tabs

| Tab | Content |
|-----|---------|
| Saved Answers | Grouped by Taxonomy, edit/delete, toggle auto-fill |
| This Site | Record/Fill toggles, clear site data |
| Activity Log | Recent fills, explanations, timestamps |

### 8.3 Toast Notifications

```
"Detected: School (pending, will save on submit)"
"Saved 8 answers (edit)"
"Filled 12 fields | Undo | Details"
"Low confidence: 3 fields need review"
```

---

## 9. Extension Points

### 9.1 Custom Parser
```typescript
class MyCustomParser implements IFieldParser {
  name = 'MyCustomParser'
  priority = 85  // Between NameId and Label
  canParse(ctx) { return ctx.attributes.dataCustom !== undefined }
  async parse(ctx) { return [{ type: Taxonomy.SCHOOL, score: 0.9, reasons: ['custom logic'] }] }
}
registerParser(new MyCustomParser())
```

### 9.2 Custom Transformer
```typescript
class AddressTransformer implements IValueTransformer {
  name = 'AddressTransformer'
  sourceType = Taxonomy.LOCATION
  targetTypes = [Taxonomy.CITY]
  canTransform(v, ctx) { return v.includes(',') }
  transform(v, ctx) { return v.split(',')[0].trim() } // "San Francisco, CA" -> "San Francisco"
}
registerTransformer(new AddressTransformer())
```

### 9.3 LLM Provider
```typescript
class CustomLLMParser extends LLMParser {
  async callLLM(fieldMetadata) {
    return await myCustomLLMService.classify(fieldMetadata)
  }
}
```

---

## 10. Performance Considerations

### 10.1 Fill Performance
- Batch size: 5 fields per batch
- Inter-batch delay: 50ms (yield to main thread)
- User activity check: Skip if activity within 800ms
- Target: Complete 10+ fields in 2-3 seconds

### 10.2 Storage Performance
- Lazy loading of observations
- LRU cache for frequent answer lookups
- Debounced writes for rapid changes

### 10.3 LLM Performance
- Request batching: Group fields into single LLM call
- Response caching: Cache by field signature hash
- Timeout: 3 seconds max, fallback to local rules

---

## 11. Error Handling

### 11.1 Fill Errors
```
Retry Strategy:
1. First attempt fails -> retry once
2. Second attempt fails -> switch to suggest mode
3. Log error for debugging
```

### 11.2 Storage Errors
```
- Chrome quota exceeded: Prune old observations
- Storage unavailable: Queue writes, retry on reconnect
```

### 11.3 LLM Errors
```
- Timeout: Use local classification only
- Rate limit: Exponential backoff
- Invalid response: Log and skip LLM result
```

---

## 12. Testing Strategy

### 12.1 Unit Tests
- Parser: Each parser against various field configurations
- Transformer: All format conversions
- Executor: All widget types
- Storage: CRUD operations

### 12.2 Integration Tests
- Full flow: Record -> Store -> Fill -> Verify
- Two-phase save: Pending -> Submit -> Commit
- Undo: Fill -> Undo -> Verify restoration

### 12.3 E2E Tests (Playwright)
- Demo page scenarios
- Real job site smoke tests (Lever, Greenhouse, Workday)

---

## 13. Future Enhancements

### Phase 2
- [ ] Cloud sync with E2E encryption
- [ ] Import from LinkedIn/Resume
- [ ] Multi-profile support (work, personal)

### Phase 3
- [ ] AI-powered form understanding
- [ ] Cross-browser support (Firefox, Safari)
- [ ] Enterprise features (team sharing)
