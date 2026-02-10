/**
 * LLM Service for non-classification tasks
 * Handles: decision making, data cleaning, normalization
 */

import { ExperienceGroupType, LinkedInProfile } from '@/types'
import { parseJSONSafe } from '@/utils/jsonRepair'
import { isLLMEnabled, callLLMWithText } from '@/profileParser/llmHelpers'

export interface AIFillResult {
  fieldId: string
  value: string
  confidence: number
}

export interface AddButtonDecision {
  shouldAdd: boolean
  reason: string
  confidence: number
}

export interface CleanedProfileData {
  fullName?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  location?: string
  city?: string
  workExperiences: Array<{
    company: string
    title: string
    location?: string
    startDate?: string  // YYYY-MM format
    endDate?: string    // YYYY-MM or 'present'
    description?: string
  }>
  educations: Array<{
    school: string
    degree?: string
    major?: string
    startDate?: string
    endDate?: string
    gpa?: string
  }>
  skills: string[]
}

export class LLMService {
  /**
   * Ask LLM whether to click "Add" button based on context
   */
  async shouldAddMoreEntries(context: {
    sectionType: ExperienceGroupType
    currentFormCount: number
    storedExperienceCount: number
    buttonText: string
    sectionContext: string  // Surrounding text/labels
    existingFieldLabels: string[]
  }): Promise<AddButtonDecision> {
    const enabled = await isLLMEnabled()
    if (!enabled) {
      return {
        shouldAdd: context.storedExperienceCount > context.currentFormCount,
        reason: 'LLM not available, using count comparison',
        confidence: 0.5,
      }
    }

    const prompt = this.buildAddButtonDecisionPrompt(context)

    try {
      const response = await callLLMWithText(prompt, {
        systemPrompt: 'You are a helpful assistant. Respond with valid JSON only.',
        maxTokens: 200,
      })
      return this.parseAddButtonDecision(response)
    } catch (error) {
      console.error('[LLMService] Add button decision error:', error)
      return {
        shouldAdd: context.storedExperienceCount > context.currentFormCount,
        reason: 'LLM error, fallback to count comparison',
        confidence: 0.5,
      }
    }
  }

  /**
   * Clean and normalize LinkedIn profile data
   */
  async cleanLinkedInProfile(rawProfile: LinkedInProfile): Promise<CleanedProfileData> {
    const enabled = await isLLMEnabled()
    if (!enabled) {
      return this.basicCleanProfile(rawProfile)
    }

    const prompt = this.buildProfileCleaningPrompt(rawProfile)

    try {
      const response = await callLLMWithText(prompt, {
        systemPrompt: 'You are a helpful assistant. Respond with valid JSON only.',
        maxTokens: 2000,
      })
      const cleaned = this.parseCleanedProfile(response)
      return this.mergeWithOriginal(cleaned, rawProfile)
    } catch (error) {
      console.error('[LLMService] Profile cleaning error:', error)
      return this.basicCleanProfile(rawProfile)
    }
  }

  private buildAddButtonDecisionPrompt(context: {
    sectionType: ExperienceGroupType
    currentFormCount: number
    storedExperienceCount: number
    buttonText: string
    sectionContext: string
    existingFieldLabels: string[]
  }): string {
    const sectionName = {
      WORK: 'work experience',
      EDUCATION: 'education',
      PROJECT: 'project',
    }[context.sectionType]

    return `You are helping fill out a job application form. Decide whether to click an "Add" button.

Context:
- Section type: ${sectionName}
- Current form entries: ${context.currentFormCount}
- User's stored ${sectionName} records: ${context.storedExperienceCount}
- Add button text: "${context.buttonText}"
- Section context: "${context.sectionContext}"
- Existing field labels in form: ${context.existingFieldLabels.slice(0, 5).join(', ')}

Should we click the add button to create a new ${sectionName} entry?

Consider:
1. Do we have more stored records than current form entries?
2. Is the section context appropriate for adding more entries?
3. Would adding more entries make sense for this job application?

Return JSON only:
{
  "shouldAdd": true/false,
  "reason": "brief explanation",
  "confidence": 0.0-1.0
}`
  }

  private buildProfileCleaningPrompt(profile: LinkedInProfile): string {
    // Build structured, clean text instead of dumping raw JSON
    const workList = profile.workExperiences.length > 0
      ? profile.workExperiences.map((w, i) =>
        `${i + 1}. ${w.title} at ${w.company}${w.location ? ` (${w.location})` : ''}\n   ${w.startDate || '?'} - ${w.endDate || '?'}${w.current ? ' [current]' : ''}${w.description ? `\n   ${w.description.substring(0, 300)}` : ''}`
      ).join('\n')
      : '(none)'

    const eduList = profile.educations.length > 0
      ? profile.educations.map((e, i) =>
        `${i + 1}. ${e.school}${e.degree ? ` — ${e.degree}` : ''}${e.field ? `, ${e.field}` : ''}\n   ${e.startDate || '?'} - ${e.endDate || '?'}${e.activities ? `\n   Activities: ${e.activities.substring(0, 200)}` : ''}`
      ).join('\n')
      : '(none)'

    return `Clean and normalize this LinkedIn profile data for use in job applications.

Profile data to clean:

Name: ${profile.fullName}
Headline: ${profile.headline || '(none)'}
Location: ${profile.location || '(none)'}
Email: ${profile.email || '(none)'}
Phone: ${profile.phone || '(none)'}
About: ${profile.about ? profile.about.substring(0, 500) : '(none)'}

Work Experience:
${workList}

Education:
${eduList}

Skills: ${profile.skills.length > 0 ? profile.skills.join(', ') : '(none)'}

Tasks:
1. Standardize name format (First Last for Western, or proper Chinese name split)
2. Normalize date formats to YYYY-MM (e.g., "Jul 2022" -> "2022-07", "2022年7月" -> "2022-07")
3. Clean up degree names (e.g., "Bachelor's degree" -> "Bachelor's", "本科" -> "Bachelor's")
4. Extract city from location if possible
5. Standardize company/school names (remove extra text like "· Full-time", "· 全职")
6. Fix any encoding issues or HTML artifacts
7. Normalize phone to E.164 format if possible
8. Make job titles consistent (capitalize properly)

IMPORTANT:
- Return null for any fields you are uncertain about. Do NOT guess or fabricate data.
- If a field contains noise or UI artifacts (e.g., connection counts, button labels), return null for it.
- Only include data that was clearly present in the input above.

Return ONLY valid JSON in this exact format:
{
  "fullName": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "city": "string or null",
  "workExperiences": [
    {
      "company": "string",
      "title": "string",
      "location": "string or null",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or present",
      "description": "string or null"
    }
  ],
  "educations": [
    {
      "school": "string",
      "degree": "string or null",
      "major": "string or null",
      "startDate": "YYYY-MM or null",
      "endDate": "YYYY-MM or null",
      "gpa": "string or null"
    }
  ],
  "skills": ["string"]
}`
  }

  private parseAddButtonDecision(response: string): AddButtonDecision {
    const parsed = parseJSONSafe<{
      shouldAdd?: boolean
      reason?: string
      confidence?: number
    }>(response, {})

    return {
      shouldAdd: !!parsed.shouldAdd,
      reason: parsed.reason || 'No reason provided',
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
    }
  }

  private parseCleanedProfile(response: string): Partial<CleanedProfileData> {
    return parseJSONSafe<Partial<CleanedProfileData>>(response, {})
  }

  private basicCleanProfile(profile: LinkedInProfile): CleanedProfileData {
    return {
      fullName: profile.fullName,
      firstName: this.extractFirstName(profile.fullName),
      lastName: this.extractLastName(profile.fullName),
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      city: this.extractCity(profile.location),
      workExperiences: profile.workExperiences.map(w => ({
        company: w.company,
        title: w.title,
        location: w.location,
        startDate: w.startDate,
        endDate: w.endDate,
        description: w.description,
      })),
      educations: profile.educations.map(e => ({
        school: e.school,
        degree: e.degree,
        major: e.field,
        startDate: e.startDate,
        endDate: e.endDate,
      })),
      skills: profile.skills,
    }
  }

  private mergeWithOriginal(cleaned: Partial<CleanedProfileData>, original: LinkedInProfile): CleanedProfileData {
    return {
      fullName: cleaned.fullName || original.fullName,
      firstName: cleaned.firstName || this.extractFirstName(original.fullName),
      lastName: cleaned.lastName || this.extractLastName(original.fullName),
      email: cleaned.email || original.email,
      phone: cleaned.phone || original.phone,
      location: cleaned.location || original.location,
      city: cleaned.city || this.extractCity(original.location),
      workExperiences: cleaned.workExperiences?.length
        ? cleaned.workExperiences
        : original.workExperiences.map(w => ({
          company: w.company,
          title: w.title,
          location: w.location,
          startDate: w.startDate,
          endDate: w.endDate,
          description: w.description,
        })),
      educations: cleaned.educations?.length
        ? cleaned.educations
        : original.educations.map(e => ({
          school: e.school,
          degree: e.degree,
          major: e.field,
          startDate: e.startDate,
          endDate: e.endDate,
        })),
      skills: cleaned.skills?.length ? cleaned.skills : original.skills,
    }
  }

  /**
   * AI SuperFill: use LLM to fill remaining empty fields
   * Takes user profile context and unfilled field descriptions
   */
  async superFillFields(context: {
    userProfile: Record<string, string>
    experiences: Array<{ type: string; fields: Record<string, string> }>
    unfilledFields: Array<{
      fieldId: string
      label: string
      fieldType: string // 'text' | 'textarea' | 'select' | 'checkbox' | 'radio'
      required?: boolean
      placeholder?: string
      options?: string[] // for select/radio
      sectionTitle?: string
    }>
  }): Promise<AIFillResult[]> {
    const enabled = await isLLMEnabled()
    if (!enabled) throw new Error('AI not enabled or not logged in')

    if (context.unfilledFields.length === 0) return []

    const prompt = this.buildSuperFillPrompt(context)

    const response = await callLLMWithText(prompt, {
      systemPrompt: 'You fill job application forms. Return valid JSON only. For text/select fields, give the shortest factual value (e.g. "1 month", "Yes", "Online Search"). Only write full sentences for textarea fields that explicitly ask open-ended questions.',
      maxTokens: 2000,
      temperature: 0.1,
    })
    return this.parseSuperFillResponse(response, context.unfilledFields)
  }

  /**
   * AI fill a single field using LLM
   */
  async fillSingleField(context: {
    userProfile: Record<string, string>
    experiences: Array<{ type: string; fields: Record<string, string> }>
    field: {
      label: string
      fieldType: string
      placeholder?: string
      options?: string[]
      sectionTitle?: string
      surroundingText?: string
    }
  }): Promise<string | null> {
    const enabled = await isLLMEnabled()
    if (!enabled) throw new Error('AI not enabled or not logged in')

    const prompt = this.buildSingleFieldPrompt(context)

    const response = await callLLMWithText(prompt, {
      systemPrompt: 'You fill job application forms. Return valid JSON only. For text/select fields, give the shortest factual value (e.g. "1 month", "Yes"). Only write full sentences for textarea fields that explicitly ask open-ended questions.',
      maxTokens: 500,
      temperature: 0.3,
    })
    return this.parseSingleFieldResponse(response)
  }

  private buildSuperFillPrompt(context: {
    userProfile: Record<string, string>
    experiences: Array<{ type: string; fields: Record<string, string> }>
    unfilledFields: Array<{
      fieldId: string
      label: string
      fieldType: string
      required?: boolean
      placeholder?: string
      options?: string[]
      sectionTitle?: string
    }>
  }): string {
    const profileStr = Object.entries(context.userProfile)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n')

    const expStr = context.experiences
      .map(e => `  [${e.type}] ${Object.entries(e.fields).map(([k, v]) => `${k}=${v}`).join(', ')}`)
      .join('\n')

    const fieldsStr = context.unfilledFields
      .map(f => {
        let desc = `  - id: "${f.fieldId}", label: "${f.label}", type: ${f.fieldType}`
        if (f.required) desc += `, required: true`
        if (f.placeholder) desc += `, placeholder: "${f.placeholder}"`
        if (f.options?.length) desc += `, options: [${f.options.slice(0, 20).map(o => `"${o}"`).join(', ')}]`
        if (f.sectionTitle) desc += `, section: "${f.sectionTitle}"`
        return desc
      })
      .join('\n')

    return `Fill out the remaining empty fields in a job application form.

User Profile:
${profileStr}

Experiences:
${expStr || '  (none)'}

Unfilled Fields:
${fieldsStr}

Rules:
1. For select/radio fields, the value MUST match one of the provided options exactly.
2. For text fields, provide the shortest factual answer (e.g. "2 weeks", "Yes", "3 years"). Never write sentences.
3. For textarea fields asking behavioral or soft-skill questions (e.g. "Why do you want to work here?", "Describe a challenge you overcame", "Tell us about yourself"):
   - Write a specific, relevant answer (3-5 sentences) that directly addresses the question.
   - Reference the user's actual work experience, skills, and background from their profile.
   - Do NOT give generic or vague answers. Tailor each response to what is being asked.
   - For "Why this role/company?" questions, connect the user's experience to the role.
   - For "Tell me about yourself" questions, focus on professional background and key achievements.
4. If you cannot determine a reasonable value, set confidence to 0.
5. For questions about salary, set confidence to 0 (let user decide).
6. For "How did you hear about us" type questions, use "Online Search" or similar.
7. For optional fields (not marked required) that are non-essential (e.g. "Preferred Name", "Nickname", "Middle Name"), set confidence to 0. Only fill optional fields when the user's profile has a clear matching value.

CRITICAL — Semantic relevance:
8. ONLY use data that is semantically relevant to the field's label/category. Each field must be filled ONLY with data from the matching category:
   - Pronoun/gender fields → ONLY use pronoun/gender data (he/him, she/her, they/them, etc.)
   - Name fields → ONLY use name data
   - Location/address fields → ONLY use location/address data
   - Phone fields → ONLY use phone data
   NEVER fill a field with data from an unrelated category. If no matching data exists, set confidence to 0.

CRITICAL — Intelligent field decomposition:
9. When a user's profile contains a COMPOSITE value (e.g. a full address, full name, or location string), you MUST decompose it into the appropriate sub-fields based on each field's label. NEVER copy the entire composite value into every sub-field.
   Example: If the user's address is "A Street, City of London, England, United Kingdom" and the form has:
     - "Address line 1" → fill with "A Street" (the street address only)
     - "Address line 2" → ONLY fill if there's a flat/unit/apartment number. Otherwise leave empty (confidence: 0)
     - "Town/City" → fill with "City of London"
     - "County" → fill with "England"
     - "Country" → fill with "United Kingdom"
     - "Postcode" → leave empty (confidence: 0) because no postcode exists in the data
10. For address/location fields, extract ONLY the relevant component. Never repeat the full address string.
11. If you cannot confidently extract a specific sub-component (e.g. postcode from an address that doesn't contain one), set confidence to 0.
12. For select/dropdown fields with many options (like country, state, degree), pick the option that is the closest semantic match to the user's profile data. For location dropdowns, match by city/state/country name.

Return JSON array:
[
  { "fieldId": "...", "value": "...", "confidence": 0.0-1.0 }
]`
  }

  private buildSingleFieldPrompt(context: {
    userProfile: Record<string, string>
    experiences: Array<{ type: string; fields: Record<string, string> }>
    field: {
      label: string
      fieldType: string
      placeholder?: string
      options?: string[]
      sectionTitle?: string
      surroundingText?: string
    }
  }): string {
    const profileStr = Object.entries(context.userProfile)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n')

    const expStr = context.experiences
      .map(e => `  [${e.type}] ${Object.entries(e.fields).map(([k, v]) => `${k}=${v}`).join(', ')}`)
      .join('\n')

    const f = context.field
    let fieldDesc = `Label: "${f.label}", Type: ${f.fieldType}`
    if (f.placeholder) fieldDesc += `, Placeholder: "${f.placeholder}"`
    if (f.options?.length) fieldDesc += `, Options: [${f.options.slice(0, 20).map(o => `"${o}"`).join(', ')}]`
    if (f.sectionTitle) fieldDesc += `, Section: "${f.sectionTitle}"`
    if (f.surroundingText) fieldDesc += `, Context: "${f.surroundingText.slice(0, 200)}"`

    return `Fill this single form field in a job application.

User Profile:
${profileStr}

Experiences:
${expStr || '  (none)'}

Field: ${fieldDesc}

Rules:
1. For select/radio, value MUST match one of the options exactly. Pick the closest semantic match.
2. For text fields, give the shortest factual answer (e.g. "2 weeks", "Yes"). Never write sentences.
3. For textarea (open-ended questions like "Why are you interested?", "Describe a challenge", "Tell us about yourself"):
   - Write a specific, professional, personalized answer (3-5 sentences).
   - Reference the user's actual experience, skills, and achievements from their profile.
   - Do NOT give generic answers. Directly address what is being asked.
   - For behavioral questions, use the STAR method (Situation, Task, Action, Result) concisely.
4. Use the user's profile and experience to personalize the answer.
5. CRITICAL — Semantic relevance: ONLY use data that matches the field's category. Pronoun fields → only pronoun data. Name fields → only name data. Location fields → only location data. NEVER fill a field with data from an unrelated category.
6. CRITICAL: If a profile value is a composite string (e.g. full address "A Street, City of London, England, UK"), extract ONLY the relevant sub-component for this specific field. For "Town/City" extract just the city, for "Address line 1" extract just the street, for "Address line 2" only fill if there's a flat/unit number. NEVER copy the full composite value.
7. If you cannot confidently extract the relevant sub-component or find matching data, set confidence to 0.
8. For location dropdowns, pick the closest matching option to the user's city/state/country.

Return JSON:
{ "value": "...", "confidence": 0.0-1.0 }`
  }

  private parseSuperFillResponse(
    response: string,
    fields: Array<{ fieldId: string }>
  ): AIFillResult[] {
    const parsed = parseJSONSafe<AIFillResult[]>(response, [])
    if (!Array.isArray(parsed)) return []

    // Validate that fieldIds match
    const validIds = new Set(fields.map(f => f.fieldId))
    return parsed
      .filter(r => validIds.has(r.fieldId) && r.value && r.confidence > 0)
      .map(r => ({
        fieldId: r.fieldId,
        value: String(r.value),
        confidence: Math.max(0, Math.min(1, r.confidence || 0)),
      }))
  }

  private parseSingleFieldResponse(response: string): string | null {
    const parsed = parseJSONSafe<{ value?: string; confidence?: number }>(response, {})
    if (!parsed.value || (parsed.confidence !== undefined && parsed.confidence < 0.3)) {
      return null
    }
    return String(parsed.value)
  }

  private extractFirstName(fullName: string): string {
    if (!fullName) return ''
    const parts = fullName.trim().split(/\s+/)
    if (/^[\u4e00-\u9fa5]+$/.test(fullName)) {
      return fullName.slice(1)
    }
    return parts[0] || ''
  }

  private extractLastName(fullName: string): string {
    if (!fullName) return ''
    const parts = fullName.trim().split(/\s+/)
    if (/^[\u4e00-\u9fa5]+$/.test(fullName)) {
      return fullName.charAt(0)
    }
    return parts.length > 1 ? parts[parts.length - 1] : ''
  }

  private extractCity(location?: string): string | undefined {
    if (!location) return undefined
    const parts = location.split(/[,·]/)
    if (/[\u4e00-\u9fa5]/.test(location)) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i].trim()
        if (part && !part.includes('省') && !part.includes('国')) {
          return part.replace(/[市区县]$/, '')
        }
      }
    }
    return parts[0]?.trim()
  }

}

export const llmService = new LLMService()
