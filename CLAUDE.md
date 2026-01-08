# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Guidelines

### Code Cleanup Rule
**Delete unused code during implementation.** No backward compatibility needed - only passing tests matter. Remove:
- Unused imports
- Unused variables/functions
- Legacy modules replaced by new implementations
- Dead code paths

## Project Overview

**autofiller-claude** is a Chrome browser extension for auto-filling job application forms. Users fill forms once manually, and the extension learns "question semantic → answer semantic" mappings to auto-fill similar questions on any job site.

### Core Principles
- **Speed**: Fill visible fields in 2-3 seconds, non-blocking
- **Trust**: All actions have visible feedback (toast, badges, logs); support undo
- **Conservative**: Low confidence = no auto-fill (suggest only); sensitive fields never auto-fill by default
- **Two-Phase Save**: Only persist answers when form is submitted (not on blur)
- **Compatibility**: Support React/Vue controlled inputs, custom dropdowns, open shadow DOM, same-origin iframes

## Tech Stack

- **Extension**: Chrome Manifest V3
- **Language**: TypeScript
- **Testing**: Vitest
- **UI Framework**: React + Tailwind CSS + shadcn/ui
- **Icons**: lucide-react
- **Storage**: chrome.storage with encryption for sensitive data

## Architecture

### Data Models (in `types/`)

```
AnswerValue         - Saved semantic answers (e.g., school name, phone)
                      Fields: id, type, value, display, aliases[], sensitivity, autofillAllowed

PendingObservation  - Temporary tracked input (before form submit)
                      Fields: id, formId, type, value, status (pending/committed/discarded)

Observation         - Committed user input record
                      Fields: timestamp, siteKey, url, questionKeyId, answerId, confidence

QuestionKey         - Cross-site reusable question signatures
                      Fields: id, type, phrases[], sectionHints[], choiceSetHash?

WidgetSignature     - Form control capability profile
                      Fields: kind, role/attributes, interactionPlan, optionLocator?
```

### Core Modules

1. **DOM Scanner** (`scanner/`) - Extract FieldContext from page
   - labelText, sectionTitle, attributes, optionsText[]
   - framePath (iframe), shadowPath (shadow DOM)

2. **Parser Framework** (`parser/`) - Extensible field classification
   - IFieldParser interface for plugin architecture
   - Built-in parsers: AutocompleteParser, TypeAttributeParser, NameIdParser, LabelParser
   - LLMParser placeholder for future AI enhancement

3. **Value Transformer** (`transformer/`) - Semantic value conversion
   - Name split/merge (Full Name ↔ First + Last)
   - Date format conversion (ISO ↔ US ↔ select ↔ split year/month)
   - Phone format conversion (E.164 ↔ local ↔ formatted)
   - Boolean/choice normalization (Yes/No ↔ checkbox ↔ select)
   - Degree alias matching (Bachelor's ↔ BS ↔ 本科)

4. **Fill Executor** (`executor/`) - Execute fill operations
   - Native setter + input/change/blur events for controlled inputs
   - Click-based flow for combobox/listbox (open → match → click)
   - Batch execution with yield to main thread

5. **Recorder** (`recorder/`) - Two-phase save
   - Phase 1: Track PendingObservation on blur/change
   - Phase 2: Commit to storage on form submit

### Taxonomy (MVP)

**Personal**: FULL_NAME, FIRST_NAME, LAST_NAME, EMAIL, PHONE, COUNTRY_CODE, CITY, LINKEDIN, GITHUB, PORTFOLIO

**Education**: SCHOOL, DEGREE, MAJOR, GRAD_DATE, GRAD_YEAR, GRAD_MONTH, START_DATE, END_DATE

**Work**: WORK_AUTH, NEED_SPONSORSHIP

**Sensitive** (no auto-fill): EEO_*, SALARY, GOV_ID, DISABILITY, VETERAN, ETHNICITY, GENDER

### UI Components

**Field Badge**: Inline element next to form fields showing:
- "Filled" or "Transformed" (with source/undo)
- "Suggested" (1-2 candidate buttons)
- "Sensitive" (amber, confirmation required)
- "Pending" (gray, waiting for submit)
- Hover shows × button to clear field

**Floating Widget**: Save Now + Fill buttons

**Toast**: Feedback for record/fill actions with undo option

## Demo Pages

Test pages in `demo-pages/`:
- `interactive-demo.html` - **Main test page** with all features:
  - Quick profile loading (US/CN/International)
  - Synonym form tests (name split, date formats, phone formats, boolean variants)
  - Two-phase save demonstration
  - Hover-to-clear functionality
  - Value transformation visualization

## Fill Execution Rules

- Confidence threshold: 0.75 (configurable)
- Batch size: 5-10 fields per batch
- Yield between batches via setTimeout/requestIdleCallback
- Skip field if user activity in last 800ms
- Retry failed fills once, then fallback to suggestion mode
- Never scroll or steal focus

## Commands

```bash
npm test        # Run unit tests
npm run build   # Build extension
```

## Not in MVP Scope

- Cross-origin iframes
- Closed shadow DOM (future: whitelist + attachShadow hook)
- CAPTCHA/login handling
- Automatic file uploads (prompt only)
