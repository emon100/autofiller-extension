/**
 * Type label mappings for taxonomy types.
 * Converts taxonomy codes (e.g., FULL_NAME) to human-readable labels (e.g., "Full Name").
 */

export const TYPE_LABELS: Record<string, string> = {
  FULL_NAME: 'Full Name',
  FIRST_NAME: 'First Name',
  LAST_NAME: 'Last Name',
  EMAIL: 'Email',
  PHONE: 'Phone',
  COUNTRY_CODE: 'Country Code',
  SCHOOL: 'School',
  DEGREE: 'Degree',
  MAJOR: 'Major',
  GPA: 'GPA',
  GRAD_DATE: 'Graduation Date',
  GRAD_YEAR: 'Graduation Year',
  GRAD_MONTH: 'Graduation Month',
  LINKEDIN: 'LinkedIn',
  GITHUB: 'GitHub',
  PORTFOLIO: 'Portfolio',
  LOCATION: 'Location',
  CITY: 'City',
  COMPANY_NAME: 'Company Name',
  JOB_TITLE: 'Job Title',
  JOB_DESCRIPTION: 'Job Description',
  START_DATE: 'Start Date',
  END_DATE: 'End Date',
  WORK_AUTH: 'Work Authorization',
  NEED_SPONSORSHIP: 'Need Sponsorship',
  EEO_GENDER: 'Gender (EEO)',
  EEO_ETHNICITY: 'Ethnicity (EEO)',
  EEO_VETERAN: 'Veteran Status (EEO)',
  EEO_DISABILITY: 'Disability (EEO)',
  GOV_ID: 'Government ID',
  SALARY: 'Salary',
  SUMMARY: 'Summary',
  SKILLS: 'Skills',
  UNKNOWN: 'Unknown',
}

/**
 * Get the human-readable label for a taxonomy type.
 * Returns the type itself if no label is defined.
 */
export function getTypeLabel(type: string): string {
  return TYPE_LABELS[type] || type
}

/**
 * Taxonomy options for dropdown menus.
 * Each option has a value (taxonomy code) and label (human-readable name).
 */
export const TAXONOMY_OPTIONS: Array<{ value: string; label: string }> = Object.entries(TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)
