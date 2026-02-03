# AutoFiller-Claude: Implementation Plan

## Overview

This document outlines the complete implementation roadmap from current state to production-ready Chrome extension.

---

## Current State Assessment

### ✅ Completed Modules

| Module | Status | Test Coverage | Notes |
|--------|--------|---------------|-------|
| `src/types/` | Complete | N/A | 169 lines, all interfaces defined |
| `src/scanner/` | Complete | 21 tests | DOM scanning with shadow DOM support |
| `src/parser/` | Complete | 29 tests | Extensible framework, 5 parsers |
| `src/classifier/` | Legacy | 31 tests | To be replaced by parser |
| `src/transformer/` | Complete | 30 tests | 5 transformers implemented |
| `src/executor/` | Complete | 25 tests | All widget types supported |
| `src/recorder/` | Partial | 14 tests | Needs two-phase upgrade |
| `src/storage/` | Complete | 14 tests | Chrome storage wrapper |
| `src/content/` | Partial | 0 tests | Needs parser/transformer integration |

**Total Tests**: 164 passing

### 🔶 Integration Gaps

1. **Content script uses old classifier** instead of new parser framework
2. **Transformer not integrated** into fill flow
3. **Two-phase recording not implemented** (PendingObservation)
4. **No Badge UI** for inline suggestions
5. **No Side Panel UI** for answer management

---

## Implementation Phases

### Phase 1: Core Integration (Priority: Critical)

**Goal**: Wire up existing modules into working end-to-end flow

#### Task 1.1: Replace Classifier with Parser in Content Script
**Estimated Time**: 1 hour  
**Files**: `src/content/index.ts`, `src/recorder/index.ts`

```typescript
// Before
import { classify } from '@/classifier'
const candidates = classify(field)

// After  
import { parseField } from '@/parser'
const candidates = await parseField(field)
```

**Changes Required**:
- Update `createFillPlans()` to use async `parseField()`
- Update `getSuggestions()` to use async `parseField()`
- Update `Recorder.captureField()` to use async `parseField()`
- Handle async nature in fill flow

#### Task 1.2: Integrate Value Transformer
**Estimated Time**: 1 hour  
**Files**: `src/content/index.ts`

```typescript
// In createFillPlans(), before adding to plans:
import { transformValue } from '@/transformer'

const transformedValue = transformValue(
  bestAnswer.value,
  bestAnswer.type,
  field
)

plans.push({
  field,
  answer: { ...bestAnswer, value: transformedValue },
  confidence: bestCandidate.score,
})
```

#### Task 1.3: Add Content Script Tests
**Estimated Time**: 2 hours  
**Files**: `tests/unit/content.test.ts`

Test cases:
- Fill flow with parser integration
- Fill flow with transformer integration
- Confidence threshold filtering
- Sensitive field blocking
- User activity timeout

---

### Phase 2: Two-Phase Recording (Priority: High)

**Goal**: Implement PRD requirement §3.2 - only persist on form submit

#### Task 2.1: Add PendingObservationStorage
**Estimated Time**: 1 hour  
**Files**: `src/storage/index.ts`

```typescript
export class PendingObservationStorage {
  private pending = new Map<string, PendingObservation[]>()
  
  addPending(formId: string, obs: PendingObservation): void
  getPending(formId: string): PendingObservation[]
  commitAll(formId: string): Promise<Observation[]>
  discardAll(formId: string): void
  clearAll(): void
}
```

#### Task 2.2: Upgrade Recorder for Two-Phase
**Estimated Time**: 2 hours  
**Files**: `src/recorder/index.ts`

Changes:
1. On blur/change: Create `PendingObservation` (in-memory)
2. Track form associations via `formId`
3. Add submit detection:
   - `form.addEventListener('submit')`
   - Button click detection (`/submit|next|continue/i`)
   - URL change detection
4. On submit: Call `commitAll(formId)`
5. On page unload without submit: Call `discardAll(formId)`

```typescript
class Recorder {
  private pendingStorage: PendingObservationStorage
  
  private setupSubmitDetection(): void {
    // Form submit listener
    document.addEventListener('submit', this.handleSubmit, true)
    
    // Button click fallback
    document.addEventListener('click', this.handleButtonClick, true)
    
    // Page unload cleanup
    window.addEventListener('beforeunload', this.handleUnload)
  }
  
  private handleSubmit(e: Event): void {
    const form = e.target as HTMLFormElement
    const formId = this.getFormId(form)
    this.commitPendingObservations(formId)
  }
}
```

#### Task 2.3: Add Manual Save Trigger
**Estimated Time**: 30 mins  
**Files**: `src/content/index.ts`

```typescript
class AutoFiller {
  async saveNow(): Promise<number> {
    // Force commit all pending observations
    return this.recorder.commitAllPending()
  }
}
```

#### Task 2.4: Two-Phase Recording Tests
**Estimated Time**: 1 hour  
**Files**: `tests/unit/recorder.test.ts`

Test cases:
- Pending observation creation on blur
- Commit on form submit
- Discard on page unload
- Manual save trigger
- Multi-form handling

---

### Phase 3: Badge UI (Priority: Medium)

**Goal**: Inline field badges for suggestions and filled status

#### Task 3.1: Badge Component Design
**Estimated Time**: 30 mins  
**Files**: `src/ui/Badge.ts`

Badge states:
```typescript
type BadgeState = 
  | { type: 'filled'; answerId: string; canUndo: boolean }
  | { type: 'suggest'; candidates: AnswerValue[] }
  | { type: 'sensitive'; candidates: AnswerValue[] }
  | { type: 'pending'; value: string }
```

#### Task 3.2: Badge Injection Logic
**Estimated Time**: 2 hours  
**Files**: `src/ui/BadgeManager.ts`

```typescript
class BadgeManager {
  private badges = new Map<HTMLElement, HTMLElement>()
  
  showBadge(field: FieldContext, state: BadgeState): void
  hideBadge(field: FieldContext): void
  updateBadge(field: FieldContext, state: BadgeState): void
  showClearButton(field: FieldContext): void  // Hover-to-clear
  
  private positionBadge(field: HTMLElement, badge: HTMLElement): void
  private handleCandidateClick(field: FieldContext, answer: AnswerValue): void
}
```

#### Task 3.3: Badge Styling
**Estimated Time**: 1 hour  
**Files**: `src/ui/badge.css`

- Inline positioning (absolute, right of field)
- State-based colors (green=filled, blue=suggest, gray=sensitive)
- Candidate buttons
- Clear (×) button on hover
- Animation for state transitions

#### Task 3.4: Integrate Badge into Content Script
**Estimated Time**: 1 hour  
**Files**: `src/content/index.ts`

```typescript
class AutoFiller {
  private badgeManager: BadgeManager
  
  async fill(): Promise<FillResult[]> {
    // ... existing fill logic ...
    
    // Show badges for filled fields
    for (const result of results) {
      if (result.success) {
        this.badgeManager.showBadge(result.field, { type: 'filled', ... })
      }
    }
    
    // Show suggestions for low-confidence fields
    for (const field of lowConfidenceFields) {
      const suggestions = await this.getSuggestions(field)
      this.badgeManager.showBadge(field, { type: 'suggest', candidates: suggestions })
    }
  }
}
```

---

### Phase 4: Side Panel UI (Priority: Medium)

**Goal**: React-based panel for answer management

#### Task 4.1: Setup React + Tailwind
**Estimated Time**: 1 hour  
**Files**: `src/sidepanel/`, `vite.config.ts`

```bash
# Dependencies
npm install @headlessui/react lucide-react
npm install -D tailwindcss postcss autoprefixer
```

#### Task 4.2: Saved Answers Tab
**Estimated Time**: 3 hours  
**Files**: `src/sidepanel/tabs/SavedAnswers.tsx`

Features:
- Group by Taxonomy category
- Edit answer value/display
- Add/remove aliases
- Toggle autofill permission for sensitive
- Delete answer

#### Task 4.3: This Site Tab
**Estimated Time**: 2 hours  
**Files**: `src/sidepanel/tabs/ThisSite.tsx`

Features:
- Recording toggle
- Autofill toggle
- Clear site data button
- Site-specific stats

#### Task 4.4: Activity Log Tab
**Estimated Time**: 2 hours  
**Files**: `src/sidepanel/tabs/ActivityLog.tsx`

Features:
- Recent fill/record events
- Explanation for each (why this type was chosen)
- Timestamp
- Link to undo

#### Task 4.5: Message Passing Setup
**Estimated Time**: 1 hour  
**Files**: `src/background/index.ts`, `src/sidepanel/App.tsx`

```typescript
// Background script handles messages between content and sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_ANSWERS': ...
    case 'UPDATE_ANSWER': ...
    case 'GET_SITE_SETTINGS': ...
    case 'TOGGLE_RECORDING': ...
  }
})
```

---

### Phase 5: LLM Integration (Priority: Low)

**Goal**: Cloud-based field classification for ambiguous cases

#### Task 5.1: LLM Parser Implementation
**Estimated Time**: 3 hours  
**Files**: `src/parser/LLMParser.ts`

```typescript
class LLMParser implements IFieldParser {
  name = 'LLMParser'
  priority = 50
  
  private cache = new Map<string, CandidateType[]>()
  private apiKey: string
  private endpoint: string
  
  async parse(context: FieldContext): Promise<CandidateType[]> {
    const cacheKey = this.getCacheKey(context)
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!
    
    const metadata = this.extractMetadata(context)
    const scrubbed = this.scrubPII(metadata)
    
    const response = await this.callLLM(scrubbed)
    const result = this.parseResponse(response)
    
    this.cache.set(cacheKey, result)
    return result
  }
  
  private scrubPII(metadata: FieldMetadata): FieldMetadata {
    // Remove emails, phones, SSN patterns
  }
}
```

#### Task 5.2: LLM Configuration UI
**Estimated Time**: 1 hour  
**Files**: `src/sidepanel/tabs/Settings.tsx`

- API key input (stored encrypted)
- Enable/disable toggle
- Provider selection (OpenAI, Claude, custom)

---

### Phase 6: Build & Distribution (Priority: High)

**Goal**: Packageable Chrome extension

#### Task 6.1: Manifest Configuration
**Estimated Time**: 30 mins  
**Files**: `public/manifest.json`

```json
{
  "manifest_version": 3,
  "name": "AutoFiller",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab", "scripting"],
  "action": { "default_popup": "popup.html" },
  "side_panel": { "default_path": "sidepanel.html" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "background": {
    "service_worker": "background.js"
  }
}
```

#### Task 6.2: Build Configuration
**Estimated Time**: 1 hour  
**Files**: `vite.config.ts`

- Multiple entry points (content, background, sidepanel, popup)
- Chrome extension output structure
- Production minification
- Source maps for debugging

#### Task 6.3: E2E Tests with Playwright
**Estimated Time**: 3 hours  
**Files**: `tests/e2e/`

Test scenarios:
- Load extension in Chrome
- Fill demo page forms
- Verify recording and storage
- Test undo functionality
- Cross-tab behavior

---

## Implementation Order

```
Week 1: Core Integration
├── Day 1-2: Task 1.1, 1.2 (Parser + Transformer integration)
├── Day 3: Task 1.3 (Content script tests)
├── Day 4-5: Task 2.1, 2.2 (Two-phase recording)
└── Day 5: Task 2.3, 2.4 (Manual save + tests)

Week 2: UI Layer
├── Day 1-2: Task 3.1, 3.2, 3.3 (Badge UI)
├── Day 3: Task 3.4 (Badge integration)
├── Day 4: Task 4.1 (React setup)
└── Day 5: Task 4.2 (Saved Answers tab)

Week 3: UI + Build
├── Day 1: Task 4.3 (This Site tab)
├── Day 2: Task 4.4 (Activity Log tab)
├── Day 3: Task 4.5 (Message passing)
├── Day 4: Task 6.1, 6.2 (Build setup)
└── Day 5: Task 6.3 (E2E tests)

Week 4: Polish + LLM
├── Day 1-2: Task 5.1 (LLM parser)
├── Day 3: Task 5.2 (LLM settings)
├── Day 4-5: Bug fixes, polish, documentation
```

---

## Immediate Next Steps (Today)

### Step 1: Integrate Parser Framework
Replace `classify()` with `parseField()` in:
- `src/content/index.ts` - `createFillPlans()`, `getSuggestions()`
- `src/recorder/index.ts` - `captureField()`

### Step 2: Integrate Value Transformer
Add `transformValue()` call in `createFillPlans()` before filling.

### Step 3: Run Tests
```bash
npm test
npm run build  # Verify no build errors
```

### Step 4: Update Demo
Test on `demo-pages/interactive-demo.html` to verify integration works.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Parser async breaking existing flow | Wrap in Promise.all where parallel safe |
| Transformer edge cases | Fallback to raw value if transform fails |
| Two-phase complexity | Start with simple form submit detection |
| Badge positioning conflicts | Use z-index and portal if needed |
| LLM latency | Cache aggressively, timeout at 3s |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Fill accuracy | >90% for common fields |
| Fill speed | <3 seconds for 10+ fields |
| Test coverage | >80% for core modules |
| Bundle size | <500KB total |
| Memory usage | <50MB runtime |

---

## Dependencies

### Runtime
- Chrome 88+ (Manifest V3 support)
- React 18
- Tailwind CSS 3

### Development
- Vite 5
- Vitest 1
- Playwright (E2E)
- TypeScript 5.3

---

## File Structure After Implementation

```
autofiller-claude/
├── src/
│   ├── types/index.ts
│   ├── scanner/index.ts
│   ├── parser/
│   │   ├── index.ts
│   │   └── LLMParser.ts          # Phase 5
│   ├── transformer/index.ts
│   ├── executor/index.ts
│   ├── recorder/index.ts          # Upgraded Phase 2
│   ├── storage/index.ts           # +PendingObservationStorage
│   ├── content/index.ts           # Upgraded Phase 1
│   ├── background/index.ts
│   ├── ui/                        # Phase 3
│   │   ├── Badge.ts
│   │   ├── BadgeManager.ts
│   │   └── badge.css
│   └── sidepanel/                 # Phase 4
│       ├── App.tsx
│       ├── tabs/
│       │   ├── SavedAnswers.tsx
│       │   ├── ThisSite.tsx
│       │   └── ActivityLog.tsx
│       └── components/
├── tests/
│   ├── unit/
│   │   ├── content.test.ts        # New
│   │   └── ... existing ...
│   └── e2e/                       # Phase 6
│       └── extension.spec.ts
├── public/
│   └── manifest.json
├── docs/
│   ├── design.md
│   └── implementation-plan.md
└── package.json
```
