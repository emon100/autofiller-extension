export enum Taxonomy {
  FULL_NAME = 'FULL_NAME',
  FIRST_NAME = 'FIRST_NAME',
  LAST_NAME = 'LAST_NAME',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  COUNTRY_CODE = 'COUNTRY_CODE',
  LOCATION = 'LOCATION',
  CITY = 'CITY',
  LINKEDIN = 'LINKEDIN',
  GITHUB = 'GITHUB',
  PORTFOLIO = 'PORTFOLIO',
  SCHOOL = 'SCHOOL',
  DEGREE = 'DEGREE',
  MAJOR = 'MAJOR',
  GRAD_DATE = 'GRAD_DATE',
  GRAD_YEAR = 'GRAD_YEAR',
  GRAD_MONTH = 'GRAD_MONTH',
  START_DATE = 'START_DATE',
  END_DATE = 'END_DATE',
  WORK_AUTH = 'WORK_AUTH',
  NEED_SPONSORSHIP = 'NEED_SPONSORSHIP',
  RESUME_TEXT = 'RESUME_TEXT',
  SALARY = 'SALARY',
  EEO_GENDER = 'EEO_GENDER',
  EEO_ETHNICITY = 'EEO_ETHNICITY',
  EEO_VETERAN = 'EEO_VETERAN',
  EEO_DISABILITY = 'EEO_DISABILITY',
  GOV_ID = 'GOV_ID',
  UNKNOWN = 'UNKNOWN',
}

export const SENSITIVE_TYPES = new Set([
  Taxonomy.EEO_GENDER,
  Taxonomy.EEO_ETHNICITY,
  Taxonomy.EEO_VETERAN,
  Taxonomy.EEO_DISABILITY,
  Taxonomy.GOV_ID,
  Taxonomy.SALARY,
  Taxonomy.RESUME_TEXT,
])

export type Sensitivity = 'normal' | 'sensitive'

export interface AnswerValue {
  id: string
  type: Taxonomy
  value: string
  display: string
  aliases: string[]
  sensitivity: Sensitivity
  autofillAllowed: boolean
  createdAt: number
  updatedAt: number
}

export interface QuestionKey {
  id: string
  type: Taxonomy
  phrases: string[]
  sectionHints: string[]
  choiceSetHash?: string
}

export interface Observation {
  id: string
  timestamp: number
  siteKey: string
  url: string
  questionKeyId: string
  answerId: string
  fieldLocator?: string
  widgetSignature: WidgetSignature
  confidence: number
}

export type WidgetKind = 'text' | 'select' | 'checkbox' | 'radio' | 'combobox' | 'date' | 'textarea' | 'custom'

export type InteractionPlan = 
  | 'directSet'
  | 'nativeSetterWithEvents'
  | 'openDropdownClickOption'
  | 'typeToSearchEnter'

export interface WidgetSignature {
  kind: WidgetKind
  role?: string
  attributes: Record<string, string>
  interactionPlan: InteractionPlan
  optionLocator?: string
}

export interface FieldContext {
  element: HTMLElement
  labelText: string
  sectionTitle: string
  attributes: Record<string, string>
  optionsText: string[]
  framePath: string[]
  shadowPath: string[]
  widgetSignature: WidgetSignature
}

export interface CandidateType {
  type: Taxonomy
  score: number
  reasons: string[]
}

export interface FillResult {
  success: boolean
  element: HTMLElement
  previousValue: string
  newValue: string
  error?: string
}

export interface FillPlan {
  field: FieldContext
  answer: AnswerValue
  confidence: number
}

export interface SiteSettings {
  siteKey: string
  recordEnabled: boolean
  autofillEnabled: boolean
  createdAt: number
  updatedAt: number
}

export type PendingStatus = 'pending' | 'committed' | 'discarded'

export interface PendingObservation {
  id: string
  timestamp: number
  siteKey: string
  url: string
  formId: string
  questionKeyId: string
  fieldLocator?: string
  widgetSignature: WidgetSignature
  confidence: number
  rawValue: string
  classifiedType: Taxonomy
  status: PendingStatus
}

export interface IFieldParser {
  name: string
  priority: number
  canParse(context: FieldContext): boolean
  parse(context: FieldContext): Promise<CandidateType[]>
}

export interface IFieldFiller {
  name: string
  canFill(context: FieldContext, answer: AnswerValue): boolean
  fill(context: FieldContext, answer: AnswerValue): Promise<FillResult>
}

export interface IValueTransformer {
  name: string
  sourceType: Taxonomy
  targetTypes: Taxonomy[]
  canTransform(sourceValue: string, targetContext: FieldContext): boolean
  transform(sourceValue: string, targetContext: FieldContext): string
}
