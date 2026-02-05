/**
 * LLM Service for non-classification tasks
 * Handles: decision making, data cleaning, normalization
 */

import { ExperienceGroupType, LinkedInProfile } from '@/types'
import { parseJSONSafe } from '@/utils/jsonRepair'
import { isLLMEnabled, callLLMWithText } from '@/profileParser/llmHelpers'

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
    return `Clean and normalize this LinkedIn profile data for use in job applications.

Raw data:
${JSON.stringify(profile, null, 2)}

Tasks:
1. Standardize name format (First Last for Western, or proper Chinese name split)
2. Normalize date formats to YYYY-MM (e.g., "Jul 2022" -> "2022-07")
3. Clean up degree names (e.g., "Bachelor's degree" -> "Bachelor's", "本科" -> "Bachelor's")
4. Extract city from location if possible
5. Standardize company/school names (remove extra text like "· Full-time")
6. Fix any encoding issues or HTML artifacts
7. Normalize phone to E.164 format if possible
8. Make job titles consistent (capitalize properly)

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
