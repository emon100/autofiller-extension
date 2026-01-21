import {
  Taxonomy,
  ExperienceEntry,
  ParsedProfile,
  ExtractedAnswer,
  ResumeParseResult,
} from '@/types'
import { callLLMWithText, callLLMWithImage, parseJSONFromLLMResponse, isLLMEnabled } from './llmHelpers'
import { RESUME_PARSE_PROMPT, RESUME_VISION_PROMPT } from './prompts/resumePrompt'

export class ResumeParser {
  static readonly SUPPORTED_TYPES = ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'webp']

  /**
   * Check if a file type is supported
   */
  static isSupported(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase()
    return ext ? this.SUPPORTED_TYPES.includes(ext) : false
  }

  /**
   * Parse a resume file and return structured profile data
   */
  async parse(file: File): Promise<ParsedProfile> {
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (!ext || !ResumeParser.SUPPORTED_TYPES.includes(ext)) {
      throw new Error(`Unsupported file type: ${ext}`)
    }

    const enabled = await isLLMEnabled()
    if (!enabled) {
      throw new Error('LLM is not configured. Please configure LLM settings to parse resumes.')
    }

    let rawText = ''
    let parseResult: ResumeParseResult

    if (ext === 'pdf') {
      rawText = await this.extractPdfText(file)
      parseResult = await this.parseWithLLM(rawText)
    } else if (['docx', 'doc'].includes(ext)) {
      rawText = await this.extractWordText(file)
      parseResult = await this.parseWithLLM(rawText)
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      parseResult = await this.parseImageWithLLM(file)
    } else {
      throw new Error(`Unsupported file type: ${ext}`)
    }

    return this.buildParsedProfile(parseResult, rawText)
  }

  /**
   * Extract text from PDF file using pdf.js
   */
  private async extractPdfText(file: File): Promise<string> {
    // Dynamic import pdf.js to avoid loading it when not needed
    const pdfjsLib = await import('pdfjs-dist')

    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    const textParts: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map(item => ('str' in item ? item.str : ''))
        .join(' ')
      textParts.push(pageText)
    }

    return textParts.join('\n\n')
  }

  /**
   * Extract text from Word document using mammoth.js
   */
  private async extractWordText(file: File): Promise<string> {
    // Dynamic import mammoth to avoid loading it when not needed
    const mammoth = await import('mammoth')

    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })

    return result.value
  }

  /**
   * Parse text using LLM
   */
  private async parseWithLLM(text: string): Promise<ResumeParseResult> {
    const prompt = RESUME_PARSE_PROMPT + text

    const response = await callLLMWithText(prompt, {
      systemPrompt: 'You are a resume parser. Extract structured information and return valid JSON only.',
      maxTokens: 3000,
    })

    const parsed = parseJSONFromLLMResponse<ResumeParseResult>(response)

    if (!parsed) {
      throw new Error('Failed to parse LLM response')
    }

    return this.normalizeParseResult(parsed)
  }

  /**
   * Parse image using LLM vision
   */
  private async parseImageWithLLM(file: File): Promise<ResumeParseResult> {
    const base64 = await this.fileToBase64(file)
    const mimeType = file.type || 'image/png'

    const response = await callLLMWithImage(base64, RESUME_VISION_PROMPT, mimeType, {
      systemPrompt: 'You are a resume parser. Extract all visible information from the image and return valid JSON only.',
      maxTokens: 4000,
    })

    const parsed = parseJSONFromLLMResponse<ResumeParseResult>(response)

    if (!parsed) {
      throw new Error('Failed to parse LLM vision response')
    }

    return this.normalizeParseResult(parsed)
  }

  /**
   * Convert file to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * Normalize parse result to ensure consistent format
   */
  private normalizeParseResult(result: ResumeParseResult): ResumeParseResult {
    return {
      fullName: result.fullName?.trim(),
      firstName: result.firstName?.trim(),
      lastName: result.lastName?.trim(),
      email: result.email?.trim()?.toLowerCase(),
      phone: result.phone?.trim(),
      location: result.location?.trim(),
      city: result.city?.trim(),
      linkedinUrl: result.linkedinUrl?.trim(),
      githubUrl: result.githubUrl?.trim(),
      portfolioUrl: result.portfolioUrl?.trim(),
      summary: result.summary?.trim(),
      education: (result.education || []).map(edu => ({
        school: edu.school?.trim() || '',
        degree: edu.degree?.trim(),
        major: edu.major?.trim(),
        gpa: edu.gpa != null ? String(edu.gpa).trim() : undefined,
        startDate: this.normalizeDate(edu.startDate),
        endDate: this.normalizeDate(edu.endDate),
        gradDate: this.normalizeDate(edu.gradDate),
      })),
      experience: (result.experience || []).map(exp => ({
        company: exp.company?.trim() || '',
        title: exp.title?.trim() || '',
        location: exp.location?.trim(),
        startDate: this.normalizeDate(exp.startDate),
        endDate: this.normalizeDate(exp.endDate),
        description: exp.description?.trim(),
        highlights: exp.highlights?.map(h => h.trim()),
      })),
      skills: (result.skills || []).map(s => s.trim()).filter(Boolean),
    }
  }

  /**
   * Normalize date to YYYY-MM format
   */
  private normalizeDate(date?: string): string | undefined {
    if (!date) return undefined
    date = date.trim().toLowerCase()

    if (date === 'present' || date === '至今') {
      return 'present'
    }

    // Already in YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(date)) {
      return date
    }

    // YYYY format
    if (/^\d{4}$/.test(date)) {
      return `${date}-01`
    }

    // Try to parse various formats
    const monthMap: Record<string, string> = {
      'jan': '01', 'january': '01',
      'feb': '02', 'february': '02',
      'mar': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'may': '05',
      'jun': '06', 'june': '06',
      'jul': '07', 'july': '07',
      'aug': '08', 'august': '08',
      'sep': '09', 'september': '09',
      'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12',
    }

    // "Month YYYY" format
    const monthYearMatch = date.match(/([a-z]+)\s*(\d{4})/i)
    if (monthYearMatch) {
      const month = monthMap[monthYearMatch[1].toLowerCase().slice(0, 3)]
      if (month) {
        return `${monthYearMatch[2]}-${month}`
      }
    }

    // "YYYY年MM月" format
    const chineseMatch = date.match(/(\d{4})年(\d{1,2})月?/)
    if (chineseMatch) {
      return `${chineseMatch[1]}-${chineseMatch[2].padStart(2, '0')}`
    }

    return undefined
  }

  /**
   * Build ParsedProfile from ResumeParseResult
   */
  private buildParsedProfile(result: ResumeParseResult, rawText: string): ParsedProfile {
    const singleAnswers: ExtractedAnswer[] = []
    const experiences: ExperienceEntry[] = []
    const now = Date.now()

    // Single value answers - map fields to taxonomy types with confidence
    const fieldMappings: Array<[Taxonomy, string | undefined, number]> = [
      [Taxonomy.FULL_NAME, result.fullName, 0.9],
      [Taxonomy.FIRST_NAME, result.firstName, 0.85],
      [Taxonomy.LAST_NAME, result.lastName, 0.85],
      [Taxonomy.EMAIL, result.email, 0.95],
      [Taxonomy.PHONE, result.phone, 0.9],
      [Taxonomy.LOCATION, result.location, 0.85],
      [Taxonomy.CITY, result.city, 0.8],
      [Taxonomy.LINKEDIN, result.linkedinUrl, 0.95],
      [Taxonomy.GITHUB, result.githubUrl, 0.95],
      [Taxonomy.PORTFOLIO, result.portfolioUrl, 0.9],
      [Taxonomy.SUMMARY, result.summary, 0.85],
      [Taxonomy.SKILLS, result.skills?.join(', '), 0.85],
    ]

    for (const [type, value, confidence] of fieldMappings) {
      if (value) {
        singleAnswers.push({ type, value, confidence })
      }
    }

    // Work experiences
    for (let index = 0; index < result.experience.length; index++) {
      const exp = result.experience[index]
      const fields = this.buildFields([
        [Taxonomy.COMPANY_NAME, exp.company],
        [Taxonomy.JOB_TITLE, exp.title],
        [Taxonomy.LOCATION, exp.location],
        [Taxonomy.START_DATE, exp.startDate],
        [Taxonomy.END_DATE, exp.endDate],
        [Taxonomy.JOB_DESCRIPTION, exp.description],
      ])

      experiences.push({
        id: `resume-work-${now}-${index}`,
        groupType: 'WORK',
        priority: index,
        startDate: exp.startDate,
        endDate: exp.endDate,
        fields,
        createdAt: now,
        updatedAt: now,
      })
    }

    // Education
    for (let index = 0; index < result.education.length; index++) {
      const edu = result.education[index]
      const fields = this.buildFields([
        [Taxonomy.SCHOOL, edu.school],
        [Taxonomy.DEGREE, edu.degree],
        [Taxonomy.MAJOR, edu.major],
        [Taxonomy.GPA, edu.gpa],
        [Taxonomy.START_DATE, edu.startDate],
        [Taxonomy.END_DATE, edu.endDate],
        [Taxonomy.GRAD_DATE, edu.gradDate],
      ])

      experiences.push({
        id: `resume-edu-${now}-${index}`,
        groupType: 'EDUCATION',
        priority: index,
        startDate: edu.startDate,
        endDate: edu.endDate || edu.gradDate,
        fields,
        createdAt: now,
        updatedAt: now,
      })
    }

    return {
      source: 'resume',
      extractedAt: now,
      singleAnswers,
      experiences,
      rawText,
    }
  }

  /**
   * Build fields object from array of [Taxonomy, value] pairs, filtering out undefined values
   */
  private buildFields(pairs: Array<[Taxonomy, string | undefined]>): Partial<Record<Taxonomy, string>> {
    const fields: Partial<Record<Taxonomy, string>> = {}
    for (const [type, value] of pairs) {
      if (value) {
        fields[type] = value
      }
    }
    return fields
  }
}

export const resumeParser = new ResumeParser()
