// Demo-specific types for the website interactive demo

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
  WORK_AUTH = 'WORK_AUTH',
  NEED_SPONSORSHIP = 'NEED_SPONSORSHIP',
  EEO_GENDER = 'EEO_GENDER',
  EEO_ETHNICITY = 'EEO_ETHNICITY',
  UNKNOWN = 'UNKNOWN',
}

export const SENSITIVE_TYPES = new Set([
  Taxonomy.EEO_GENDER,
  Taxonomy.EEO_ETHNICITY,
])

export interface DemoAnswerValue {
  id: string
  type: Taxonomy
  value: string
  display: string
  aliases: string[]
  sensitivity: 'normal' | 'sensitive'
  autofillAllowed: boolean
}

export interface DemoFieldDef {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'url' | 'date' | 'month' | 'select' | 'radio' | 'checkbox'
  taxonomy: Taxonomy
  required?: boolean
  placeholder?: string
  maxlength?: string
  options?: string[]
}

export interface DemoFormSection {
  title: string
  fields: DemoFieldDef[]
}

export interface DemoFormTemplate {
  id: string
  title: string
  subtitle: string
  fields?: DemoFieldDef[]
  sections?: DemoFormSection[]
}

export interface DemoProfile {
  id: string
  name: string
  answers: Record<string, DemoAnswerValue>
}

export type BadgeType = 'filled' | 'transformed' | 'suggest' | 'sensitive' | 'pending'

export interface FillStats {
  scanned: number
  filled: number
  transformed: number
  timeMs: number
}

export interface ActivityLogEntry {
  id: string
  type: 'profile' | 'fill' | 'commit' | 'template'
  timestamp: Date
  data: Record<string, string | number>
}

export interface FillHistoryItem {
  fieldName: string
  previousValue: string
  newValue: string
}

export interface PendingObservation {
  id: string
  fieldName: string
  type: Taxonomy
  value: string
  timestamp: number
}
