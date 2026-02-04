import { DemoFormTemplate, Taxonomy } from '../types'

export const LINKEDIN_TEMPLATE: DemoFormTemplate = {
  id: 'linkedin',
  title: 'LinkedIn Easy Apply',
  subtitle: 'Standard LinkedIn job application form',
  sections: [
    {
      title: 'Contact Info',
      fields: [
        { name: 'fullName', label: 'Full Name', type: 'text', taxonomy: Taxonomy.FULL_NAME, required: true },
        { name: 'email', label: 'Email Address', type: 'email', taxonomy: Taxonomy.EMAIL, required: true },
        { name: 'phone', label: 'Phone Number', type: 'tel', taxonomy: Taxonomy.PHONE },
        { name: 'location', label: 'Location (City)', type: 'text', taxonomy: Taxonomy.CITY },
      ],
    },
    {
      title: 'Online Presence',
      fields: [
        { name: 'linkedin', label: 'LinkedIn Profile URL', type: 'url', taxonomy: Taxonomy.LINKEDIN, placeholder: 'https://linkedin.com/in/...' },
        { name: 'portfolio', label: 'Website/Portfolio', type: 'url', taxonomy: Taxonomy.PORTFOLIO },
      ],
    },
    {
      title: 'Work Authorization',
      fields: [
        { name: 'workAuth', label: 'Are you legally authorized to work in the United States?', type: 'radio', taxonomy: Taxonomy.WORK_AUTH, options: ['Yes', 'No'] },
        { name: 'sponsorship', label: 'Will you now or in the future require sponsorship for employment visa status?', type: 'radio', taxonomy: Taxonomy.NEED_SPONSORSHIP, options: ['Yes', 'No'] },
      ],
    },
  ],
}

export const GREENHOUSE_TEMPLATE: DemoFormTemplate = {
  id: 'greenhouse',
  title: 'Greenhouse Application',
  subtitle: 'Common ATS application form',
  sections: [
    {
      title: 'Basic Information',
      fields: [
        { name: 'firstName', label: 'First Name', type: 'text', taxonomy: Taxonomy.FIRST_NAME, required: true },
        { name: 'lastName', label: 'Last Name', type: 'text', taxonomy: Taxonomy.LAST_NAME, required: true },
        { name: 'email', label: 'Email', type: 'email', taxonomy: Taxonomy.EMAIL, required: true },
        { name: 'phone', label: 'Phone', type: 'tel', taxonomy: Taxonomy.PHONE },
      ],
    },
    {
      title: 'Education',
      fields: [
        { name: 'school', label: 'School Name', type: 'text', taxonomy: Taxonomy.SCHOOL },
        { name: 'degree', label: 'Degree', type: 'select', taxonomy: Taxonomy.DEGREE, options: ['', "Bachelor's Degree", "Master's Degree", 'Ph.D.', 'Associate Degree', 'High School'] },
        { name: 'major', label: 'Discipline/Major', type: 'text', taxonomy: Taxonomy.MAJOR },
        { name: 'gradYear', label: 'End Date Year', type: 'select', taxonomy: Taxonomy.GRAD_YEAR, options: ['', '2020', '2021', '2022', '2023', '2024', '2025', '2026'] },
        { name: 'gradMonth', label: 'End Date Month', type: 'select', taxonomy: Taxonomy.GRAD_MONTH, options: ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] },
      ],
    },
    {
      title: 'Links',
      fields: [
        { name: 'linkedin', label: 'LinkedIn URL', type: 'url', taxonomy: Taxonomy.LINKEDIN },
        { name: 'github', label: 'GitHub URL', type: 'url', taxonomy: Taxonomy.GITHUB },
        { name: 'portfolio', label: 'Portfolio URL', type: 'url', taxonomy: Taxonomy.PORTFOLIO },
      ],
    },
  ],
}

export const WORKDAY_TEMPLATE: DemoFormTemplate = {
  id: 'workday',
  title: 'Workday Application',
  subtitle: 'Enterprise HR system form',
  sections: [
    {
      title: 'Personal Information',
      fields: [
        { name: 'firstName', label: 'Legal First Name', type: 'text', taxonomy: Taxonomy.FIRST_NAME, required: true },
        { name: 'lastName', label: 'Legal Last Name', type: 'text', taxonomy: Taxonomy.LAST_NAME, required: true },
        { name: 'email', label: 'Email Address', type: 'email', taxonomy: Taxonomy.EMAIL, required: true },
        { name: 'countryCode', label: 'Phone Country Code', type: 'select', taxonomy: Taxonomy.COUNTRY_CODE, options: ['', '+1 (United States)', '+86 (China)', '+91 (India)', '+44 (United Kingdom)'] },
        { name: 'phone', label: 'Phone Number', type: 'tel', taxonomy: Taxonomy.PHONE },
        { name: 'city', label: 'City', type: 'text', taxonomy: Taxonomy.CITY },
      ],
    },
    {
      title: 'Education',
      fields: [
        { name: 'school', label: 'School or University', type: 'text', taxonomy: Taxonomy.SCHOOL },
        { name: 'degree', label: 'Degree', type: 'select', taxonomy: Taxonomy.DEGREE, options: ['', "Bachelor's", "Master's", 'Doctorate', 'Associate', 'Diploma'] },
        { name: 'major', label: 'Field of Study', type: 'text', taxonomy: Taxonomy.MAJOR },
        { name: 'gradDate', label: 'Completion Date', type: 'month', taxonomy: Taxonomy.GRAD_DATE },
      ],
    },
    {
      title: 'Websites',
      fields: [
        { name: 'linkedin', label: 'LinkedIn', type: 'url', taxonomy: Taxonomy.LINKEDIN },
        { name: 'github', label: 'GitHub', type: 'url', taxonomy: Taxonomy.GITHUB },
      ],
    },
    {
      title: 'Work Authorization',
      fields: [
        { name: 'workAuth', label: 'Are you authorized to work in this country?', type: 'select', taxonomy: Taxonomy.WORK_AUTH, options: ['', 'Yes', 'No'] },
        { name: 'sponsorship', label: 'Will you require visa sponsorship?', type: 'select', taxonomy: Taxonomy.NEED_SPONSORSHIP, options: ['', 'Yes', 'No'] },
      ],
    },
  ],
}

export const GENERIC_TEMPLATE: DemoFormTemplate = {
  id: 'generic',
  title: 'Generic Job Application',
  subtitle: 'Standard application form',
  sections: [
    {
      title: 'Contact Information',
      fields: [
        { name: 'fullName', label: 'Full Name', type: 'text', taxonomy: Taxonomy.FULL_NAME, required: true },
        { name: 'email', label: 'Email', type: 'email', taxonomy: Taxonomy.EMAIL, required: true },
        { name: 'phone', label: 'Phone Number', type: 'tel', taxonomy: Taxonomy.PHONE },
        { name: 'city', label: 'Current City', type: 'text', taxonomy: Taxonomy.CITY },
        { name: 'linkedin', label: 'LinkedIn Profile', type: 'url', taxonomy: Taxonomy.LINKEDIN },
      ],
    },
    {
      title: 'Education',
      fields: [
        { name: 'school', label: 'University/School', type: 'text', taxonomy: Taxonomy.SCHOOL },
        { name: 'degree', label: 'Degree', type: 'select', taxonomy: Taxonomy.DEGREE, options: ['', "Bachelor's", "Master's", 'Ph.D.'] },
        { name: 'major', label: 'Major', type: 'text', taxonomy: Taxonomy.MAJOR },
        { name: 'gradDate', label: 'Graduation Date', type: 'month', taxonomy: Taxonomy.GRAD_DATE },
      ],
    },
    {
      title: 'Work Authorization',
      fields: [
        { name: 'workAuth', label: 'Legally authorized to work?', type: 'radio', taxonomy: Taxonomy.WORK_AUTH, options: ['Yes', 'No'] },
        { name: 'sponsorship', label: 'Require visa sponsorship?', type: 'radio', taxonomy: Taxonomy.NEED_SPONSORSHIP, options: ['Yes', 'No'] },
      ],
    },
  ],
}

// Synonym test templates for demonstrating value transformation
export const SYNONYM_NAME_TEMPLATE: DemoFormTemplate = {
  id: 'synonym-name',
  title: 'Name Format Test',
  subtitle: 'Full name vs First+Last split',
  fields: [
    { name: 'fullName', label: 'Full Name', type: 'text', taxonomy: Taxonomy.FULL_NAME },
    { name: 'firstName', label: 'First Name', type: 'text', taxonomy: Taxonomy.FIRST_NAME },
    { name: 'lastName', label: 'Last Name', type: 'text', taxonomy: Taxonomy.LAST_NAME },
    { name: 'givenName', label: 'Given Name (Same as First)', type: 'text', taxonomy: Taxonomy.FIRST_NAME },
    { name: 'familyName', label: 'Family Name (Same as Last)', type: 'text', taxonomy: Taxonomy.LAST_NAME },
  ],
}

export const SYNONYM_DATE_TEMPLATE: DemoFormTemplate = {
  id: 'synonym-date',
  title: 'Date Format Test',
  subtitle: 'Different date input methods',
  fields: [
    { name: 'gradDate', label: 'Graduation Date (Date Picker)', type: 'date', taxonomy: Taxonomy.GRAD_DATE },
    { name: 'gradMonth', label: 'Graduation Month (Month Picker)', type: 'month', taxonomy: Taxonomy.GRAD_DATE },
    { name: 'gradYearSelect', label: 'Graduation Year', type: 'select', taxonomy: Taxonomy.GRAD_YEAR, options: ['', '2022', '2023', '2024', '2025', '2026'] },
    { name: 'gradMonthSelect', label: 'Graduation Month', type: 'select', taxonomy: Taxonomy.GRAD_MONTH, options: ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] },
  ],
}

export const SYNONYM_PHONE_TEMPLATE: DemoFormTemplate = {
  id: 'synonym-phone',
  title: 'Phone Format Test',
  subtitle: 'Different phone input methods',
  fields: [
    { name: 'phoneE164', label: 'Phone (E.164: +14155551234)', type: 'tel', taxonomy: Taxonomy.PHONE },
    { name: 'phoneLocal', label: 'Phone (Local: 4155551234)', type: 'tel', taxonomy: Taxonomy.PHONE, maxlength: '10' },
    { name: 'phoneFormatted', label: 'Phone (Formatted)', type: 'tel', taxonomy: Taxonomy.PHONE, placeholder: '(415) 555-1234' },
    { name: 'countryCode', label: 'Country Code', type: 'select', taxonomy: Taxonomy.COUNTRY_CODE, options: ['', '+1 (US)', '+86 (CN)', '+91 (IN)', '+44 (UK)'] },
  ],
}

export const SYNONYM_BOOL_TEMPLATE: DemoFormTemplate = {
  id: 'synonym-bool',
  title: 'Boolean/Choice Test',
  subtitle: 'Yes/No in different formats',
  fields: [
    { name: 'workAuthRadio', label: 'Authorized to work? (Radio)', type: 'radio', taxonomy: Taxonomy.WORK_AUTH, options: ['Yes', 'No'] },
    { name: 'workAuthSelect', label: 'Work Authorization (Select)', type: 'select', taxonomy: Taxonomy.WORK_AUTH, options: ['', 'Yes', 'No'] },
    { name: 'workAuthCheck', label: 'I am authorized to work in this country', type: 'checkbox', taxonomy: Taxonomy.WORK_AUTH },
    { name: 'sponsorRadio', label: 'Need visa sponsorship?', type: 'radio', taxonomy: Taxonomy.NEED_SPONSORSHIP, options: ['Yes', 'No'] },
    { name: 'sponsorSelect', label: 'Sponsorship Required', type: 'select', taxonomy: Taxonomy.NEED_SPONSORSHIP, options: ['', 'Yes, I need sponsorship', 'No, I do not need sponsorship'] },
  ],
}

export const MINI_DEMO_TEMPLATE: DemoFormTemplate = {
  id: 'mini',
  title: 'Quick Demo',
  subtitle: 'Try AutoFiller',
  fields: [
    { name: 'fullName', label: 'Full Name', type: 'text', taxonomy: Taxonomy.FULL_NAME, required: true },
    { name: 'email', label: 'Email', type: 'email', taxonomy: Taxonomy.EMAIL, required: true },
    { name: 'phone', label: 'Phone', type: 'tel', taxonomy: Taxonomy.PHONE },
    { name: 'linkedin', label: 'LinkedIn', type: 'url', taxonomy: Taxonomy.LINKEDIN },
    { name: 'workAuth', label: 'Authorized to work?', type: 'radio', taxonomy: Taxonomy.WORK_AUTH, options: ['Yes', 'No'] },
  ],
}

export const FORM_TEMPLATES: Record<string, DemoFormTemplate> = {
  linkedin: LINKEDIN_TEMPLATE,
  greenhouse: GREENHOUSE_TEMPLATE,
  workday: WORKDAY_TEMPLATE,
  generic: GENERIC_TEMPLATE,
  'synonym-name': SYNONYM_NAME_TEMPLATE,
  'synonym-date': SYNONYM_DATE_TEMPLATE,
  'synonym-phone': SYNONYM_PHONE_TEMPLATE,
  'synonym-bool': SYNONYM_BOOL_TEMPLATE,
  mini: MINI_DEMO_TEMPLATE,
}

export const TEMPLATE_CATEGORIES = [
  {
    name: 'Real Job Sites',
    templates: ['linkedin', 'greenhouse', 'workday', 'generic'],
  },
  {
    name: 'Transformation Tests',
    templates: ['synonym-name', 'synonym-date', 'synonym-phone', 'synonym-bool'],
  },
]
