import { FieldContext, Taxonomy, FormSection, ExperienceGroupType } from '@/types'

// Keywords that indicate experience sections
const WORK_SECTION_KEYWORDS = [
  'work experience', 'employment', 'professional experience', 'work history',
  '工作经历', '工作经验', '职业经历', 'experience', 'position', '职位',
]

const EDUCATION_SECTION_KEYWORDS = [
  'education', 'academic', 'school', 'university', 'degree',
  '教育经历', '教育背景', '学历', '学校',
]

// Field types that belong to work experience
const WORK_FIELD_TYPES = new Set([
  Taxonomy.COMPANY_NAME,
  Taxonomy.JOB_TITLE,
  Taxonomy.JOB_DESCRIPTION,
])

// Field types that belong to education
const EDUCATION_FIELD_TYPES = new Set([
  Taxonomy.SCHOOL,
  Taxonomy.DEGREE,
  Taxonomy.MAJOR,
  Taxonomy.GPA,
  Taxonomy.GRAD_DATE,
  Taxonomy.GRAD_YEAR,
  Taxonomy.GRAD_MONTH,
])

// Shared field types (can appear in both work and education)
const SHARED_FIELD_TYPES = new Set([
  Taxonomy.START_DATE,
  Taxonomy.END_DATE,
  Taxonomy.LOCATION,
  Taxonomy.CITY,
])

/**
 * Group fields by their section title
 */
export function groupFieldsBySection(fields: FieldContext[]): Map<string, FieldContext[]> {
  const groups = new Map<string, FieldContext[]>()

  for (const field of fields) {
    const sectionKey = field.sectionTitle || '_default'
    const existing = groups.get(sectionKey) || []
    existing.push(field)
    groups.set(sectionKey, existing)
  }

  return groups
}

/**
 * Detect repeating blocks in form sections
 * Returns FormSection array with block information
 */
export function detectFormSections(
  fields: FieldContext[],
  fieldTypes: Map<number, Taxonomy>
): FormSection[] {
  const sections: FormSection[] = []
  const groups = groupFieldsBySection(fields)

  // Analyze each group
  for (const [title, groupFields] of groups) {
    const groupType = detectGroupType(title, groupFields, fieldTypes, fields)

    // Check if this is a repeating block pattern
    const blockInfo = detectRepeatingBlocks(title, groups)

    sections.push({
      id: `section-${sections.length}`,
      title,
      fields: groupFields,
      isRepeatingBlock: blockInfo.isRepeating,
      blockIndex: blockInfo.blockIndex,
      groupType,
    })
  }

  // Sort sections: repeating blocks should be grouped together
  sections.sort((a, b) => {
    // Non-repeating blocks first
    if (a.isRepeatingBlock !== b.isRepeatingBlock) {
      return a.isRepeatingBlock ? 1 : -1
    }
    // Then by group type
    if (a.groupType !== b.groupType) {
      if (!a.groupType) return 1
      if (!b.groupType) return -1
      const order: Record<ExperienceGroupType, number> = { WORK: 0, EDUCATION: 1, PROJECT: 2 }
      return order[a.groupType] - order[b.groupType]
    }
    // Then by block index
    return a.blockIndex - b.blockIndex
  })

  return sections
}

/**
 * Detect the group type (WORK/EDUCATION) based on section title and field types
 */
function detectGroupType(
  title: string,
  groupFields: FieldContext[],
  fieldTypes: Map<number, Taxonomy>,
  allFields: FieldContext[]
): ExperienceGroupType | undefined {
  const lowerTitle = title.toLowerCase()

  // Check title keywords
  for (const keyword of WORK_SECTION_KEYWORDS) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      return 'WORK'
    }
  }

  for (const keyword of EDUCATION_SECTION_KEYWORDS) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      return 'EDUCATION'
    }
  }

  // Check field types in this group
  let workScore = 0
  let educationScore = 0

  for (const field of groupFields) {
    const fieldIndex = allFields.indexOf(field)
    const type = fieldTypes.get(fieldIndex)

    if (type && WORK_FIELD_TYPES.has(type)) {
      workScore += 2
    }
    if (type && EDUCATION_FIELD_TYPES.has(type)) {
      educationScore += 2
    }
    if (type && SHARED_FIELD_TYPES.has(type)) {
      workScore += 0.5
      educationScore += 0.5
    }
  }

  if (workScore > educationScore && workScore >= 2) {
    return 'WORK'
  }
  if (educationScore > workScore && educationScore >= 2) {
    return 'EDUCATION'
  }

  return undefined
}

/**
 * Detect if a section title indicates a repeating block pattern
 */
function detectRepeatingBlocks(
  title: string,
  allGroups: Map<string, FieldContext[]>
): { isRepeating: boolean; blockIndex: number } {
  // Pattern 1: Numbered sections like "Experience 1", "Experience 2"
  const numberedMatch = title.match(/(.+?)\s*(\d+)\s*$/)
  if (numberedMatch) {
    const baseTitle = numberedMatch[1].trim()
    const index = parseInt(numberedMatch[2], 10) - 1

    // Check if there are other sections with the same base title
    let hasMultiple = false
    for (const otherTitle of allGroups.keys()) {
      if (otherTitle !== title && otherTitle.startsWith(baseTitle)) {
        hasMultiple = true
        break
      }
    }

    if (hasMultiple) {
      return { isRepeating: true, blockIndex: index }
    }
  }

  // Pattern 2: Multiple sections with very similar structure
  // This is a heuristic - if multiple sections have similar field counts and types
  // This would require additional analysis

  return { isRepeating: false, blockIndex: 0 }
}
