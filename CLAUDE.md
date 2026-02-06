# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Guidelines

### Code Cleanup Rule
**Delete unused code during implementation.** No backward compatibility needed - only passing tests matter. Remove unused imports, variables, functions, legacy modules, and dead code paths.

## Commands

```bash
npm test                          # Run all unit tests (vitest --run)
npm test -- tests/unit/parser.test.ts  # Run a single test file
npm run build                     # Dev build (tsc + vite two-stage)
npm run build:prod                # Production build (minified, no sourcemaps, console stripped)
npm run lint                      # ESLint on src/
npm run test:e2e                  # Playwright end-to-end tests
npm run test:ui                   # Vitest interactive UI
```

### Build Pipeline

Two-stage Vite build (both stages required):
1. **Stage 1** (default): Builds `background.js` (service worker) + `sidepanel.js` (React app) as ES modules. Also generates `sidepanel.html` and copies `public/` assets.
2. **Stage 2** (`BUILD_TARGET=content`): Builds `content.js` as IIFE (Chrome content scripts don't support ES modules). Appends to `dist/` without clearing.

Production mode (`BUILD_MODE=production`): Enables terser minification, drops `console.log/info/debug`, removes comments, mangles `_`-prefixed properties, disables sourcemaps.

**Path alias**: `@/` → `src/` (configured in both `vite.config.ts` and `vitest.config.ts`)

## Project Overview

**OneFillr** (package name: `autofiller-claude`) is a Chrome MV3 browser extension for auto-filling job application forms. Users fill forms once manually, and the extension learns "question semantic → answer semantic" mappings to auto-fill similar questions on any job site. It also supports importing profiles from LinkedIn pages and resume files (PDF/Word).

### Core Principles
- **Speed**: Fill visible fields in 2-3 seconds, non-blocking
- **Trust**: All actions have visible feedback (toast, badges, logs); support undo
- **Conservative**: Low confidence = no auto-fill (suggest only); sensitive fields never auto-fill by default
- **Two-Phase Save**: Only persist answers when form is submitted (not on blur)
- **Compatibility**: React/Vue controlled inputs, custom dropdowns, open shadow DOM, same-origin iframes

## Tech Stack

- **Extension**: Chrome Manifest V3
- **Language**: TypeScript (strict mode, target ES2020)
- **Build**: Vite 5 with two-stage build
- **Testing**: Vitest (happy-dom environment) + Playwright for E2E
- **UI Framework**: React 18 + Tailwind CSS 4 + shadcn/ui + @headlessui/react
- **Icons**: lucide-react
- **Storage**: chrome.storage with multi-profile isolation
- **LLM**: Multi-provider support (OpenAI, Anthropic, DashScope, DeepSeek, Zhipu)
- **I18n**: Custom bilingual system (English + Chinese)
- **Auth**: Google OAuth via chrome.identity
- **Website**: Next.js marketing site at `website/` with Supabase backend

## Architecture

### Extension Entry Points

```
src/background/index.ts   → dist/background.js  (service worker, ES module)
src/content/main.ts        → dist/content.js     (content script, IIFE)
src/sidepanel/main.tsx     → dist/sidepanel.js   (React app, ES module)
```

### Content Script Flow

`main.ts` → creates `AutoFiller` instance (defined in `index.ts`, ~1500 lines, the central orchestrator).

**AutoFiller** coordinates all content-side logic:
1. **Scanning**: Uses `scanner/` to extract `FieldContext` from DOM (labels, attributes, options, widget signatures)
2. **Parsing**: Uses `parser/` to classify fields into `Taxonomy` types (rule-based chain + optional LLM batch parsing)
3. **Matching**: Looks up `AnswerValue` from storage by taxonomy type
4. **Transforming**: Uses `transformer/` to convert between formats (date, phone, name, degree, boolean)
5. **Filling**: Uses `executor/` to set values with proper events for React/Vue compatibility
6. **Recording**: Uses `recorder/` for two-phase save (track on blur → commit on form submit)

Additional features in AutoFiller:
- **Dynamic form monitoring**: MutationObserver detects new fields
- **Auto-add**: Clicks "Add" buttons to fill repeating sections (work experience, education) via LLM decision
- **AI SuperFill**: LLM-based filling for fields that rule-based parsing can't classify
- **Animated filling**: Typewriter effect for human-like interaction
- **Experience mapping**: Maps form sections to stored work/education/project entries
- **Smart widget visibility**: Only shows floating widget on detected job application pages

### Background Script

Routes messages between content scripts and side panel. Creates context menus ("AutoFill this form", "AI fill this field", "Open OneFillr panel"). Opens welcome page on install.

### Side Panel (React)

Tabbed interface: Local Knowledge, Import, This Site, Activity, Settings, Developer.

Key features:
- **Onboarding wizard**: Welcome → LinkedIn/Resume import → Practice → Features
- **Profile switcher**: Multi-profile support with isolated data
- **LLM settings**: Provider selection, API key, model, endpoint, thinking mode toggle
- **Auth**: Google Sign-In with credits display
- **Language switcher**: en/zh

### Core Modules

| Module | Location | Purpose |
|--------|----------|---------|
| Scanner | `src/scanner/` | DOM scanning, label extraction, section detection, add-button detection |
| Parser | `src/parser/` | Field classification via plugin chain (rule-based + LLM). `LLMParser.ts` is the largest (~30KB) |
| Transformer | `src/transformer/` | Value format conversion (names, dates, phones, booleans, degrees) |
| Executor | `src/executor/` | Fill operations: directSet, nativeSetterWithEvents, openDropdownClickOption, typeToSearchEnter |
| Recorder | `src/recorder/` | Two-phase save: PendingObservation on blur → commit on form submit |
| Services | `src/services/` | `LLMService` (add-more decisions, super fill, profile cleaning) + `KnowledgeNormalizer` |
| Profile Parser | `src/profileParser/` | LinkedIn DOM parsing + Resume file parsing (PDF via pdfjs-dist, Word via mammoth) |
| Storage | `src/storage/` | Multi-profile storage layer (answers, experiences, observations, settings, auth, credits) |
| I18n | `src/i18n/` | 160+ translation keys, auto-detects browser language, `t(key, params?)` function |
| UI | `src/ui/` | FloatingWidget (~42KB, multi-phase), BadgeManager, Toast, AIPromotionBubble, WidgetVisibility |
| Utils | `src/utils/` | `llmProvider.ts` (multi-provider LLM abstraction with PII scrubbing), `authLogin.ts` (Google OAuth) |

### Data Models (in `src/types/`)

```
AnswerValue         - Saved semantic answers (id, type, value, display, aliases[], sensitivity, autofillAllowed)
ExperienceEntry     - Work/education/project entries (groupType, priority, fields, startDate, endDate)
QuestionKey         - Cross-site reusable question signatures (type, phrases[], sectionHints[])
FieldContext        - Extracted form field info (element, labelText, sectionTitle, attributes, optionsText[], widgetSignature)
WidgetSignature     - Form control profile (kind: text|select|checkbox|radio|combobox|date|textarea|custom)
PendingObservation  - Temporary tracked input before form submit
Observation         - Committed user input record
ParsedProfile       - Imported profile from LinkedIn/resume (singleAnswers[], experiences[])
AuthState           - Auth tokens + user info
```

### Taxonomy (48 field types)

**Personal**: FULL_NAME, FIRST_NAME, LAST_NAME, EMAIL, PHONE, COUNTRY_CODE, CITY, LINKEDIN, GITHUB, PORTFOLIO, SUMMARY

**Education**: SCHOOL, DEGREE, MAJOR, GPA, GRAD_DATE, GRAD_YEAR, GRAD_MONTH

**Work**: COMPANY_NAME, JOB_TITLE, JOB_DESCRIPTION, SKILLS, WORK_AUTH, NEED_SPONSORSHIP

**Shared**: START_DATE, END_DATE

**Sensitive** (no auto-fill): RESUME_TEXT, SALARY, EEO_*, GOV_ID, DISABILITY, VETERAN, ETHNICITY, GENDER

### Storage Architecture

**Multi-profile isolation**: Each profile gets namespaced keys (`answers-{profileId}`, `experiences-{profileId}`, `observations-{profileId}`). Default profile auto-created. Migration from global to profile-namespaced storage exists.

**LLM Dual Mode**:
- **Backend API**: For logged-in users with credits (requests go through OneFillr server)
- **Custom API (BYOK)**: Users provide their own API key/endpoint

### Fill Execution Rules

- Confidence threshold: 0.75 (configurable)
- Batch size: 5-10 fields per batch with yield between batches
- Skip field if user activity in last 800ms
- Retry failed fills once, then fallback to suggestion mode
- Snapshot/restore for undo functionality
- Never scroll or steal focus

## Demo Pages

Test pages in `demo-pages/` — use `interactive-demo.html` as the main test page (profile loading, synonym tests, two-phase save, value transformation).

## Testing

- **Unit tests**: `tests/unit/` — badge, executor, parser, recorder, scanner, storage, transformer
- **E2E tests**: `tests/e2e/` — Playwright
- **Environment**: happy-dom (lightweight DOM simulation)
- **Coverage**: v8 provider

## Not in MVP Scope

- Cross-origin iframes
- Closed shadow DOM
- CAPTCHA/login handling
- Automatic file uploads
