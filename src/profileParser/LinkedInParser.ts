import {
  Taxonomy,
  ExperienceEntry,
  LinkedInProfile,
  LinkedInWorkExperience,
  LinkedInEducation,
  ParsedProfile,
  ExtractedAnswer,
} from '@/types'

// Shared month abbreviation to number mapping
const MONTH_MAP: Record<string, string> = {
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
  'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
}

/**
 * Parse LinkedIn profile page to extract structured data
 * Works with saved HTML files or live LinkedIn pages
 */
export class LinkedInParser {
  /**
   * Check if the current page is a LinkedIn profile
   */
  static isLinkedInProfile(url: string = window.location.href): boolean {
    return /linkedin\.com\/in\//.test(url)
  }

  /**
   * Check if this is the user's own profile (has edit buttons)
   */
  static isOwnProfile(root: Document | Element = document): boolean {
    // Check for edit profile button or add buttons
    const editButton = root.querySelector('[id*="edit-profile"], [id*="add-edit"], [aria-label*="编辑"], [aria-label*="Edit"]')
    const addButton = root.querySelector('[id*="overflow-添加"], [id*="overflow-Add"]')
    return !!(editButton || addButton)
  }

  /**
   * Parse the LinkedIn profile page and return structured data
   */
  parse(root: Document | Element = document): LinkedInProfile {
    const profile: LinkedInProfile = {
      fullName: this.extractName(root),
      headline: this.extractHeadline(root),
      location: this.extractLocation(root),
      linkedinUrl: this.extractLinkedInUrl(root),
      about: this.extractAbout(root),
      workExperiences: this.extractWorkExperiences(root),
      educations: this.extractEducation(root),
      skills: this.extractSkills(root),
    }

    // Try to extract contact info if available
    const contactInfo = this.extractContactInfo(root)
    if (contactInfo.email) profile.email = contactInfo.email
    if (contactInfo.phone) profile.phone = contactInfo.phone

    return profile
  }

  /**
   * Convert LinkedIn profile to ParsedProfile format for storage
   */
  toParsedProfile(profile: LinkedInProfile): ParsedProfile {
    const singleAnswers: ExtractedAnswer[] = []
    const experiences: ExperienceEntry[] = []

    // Build single answers from profile fields
    if (profile.fullName) {
      singleAnswers.push({ type: Taxonomy.FULL_NAME, value: profile.fullName, confidence: 0.95 })
      const nameParts = this.splitName(profile.fullName)
      if (nameParts.firstName) {
        singleAnswers.push({ type: Taxonomy.FIRST_NAME, value: nameParts.firstName, confidence: 0.9 })
      }
      if (nameParts.lastName) {
        singleAnswers.push({ type: Taxonomy.LAST_NAME, value: nameParts.lastName, confidence: 0.9 })
      }
    }

    // Map remaining fields to taxonomy types with confidence
    const fieldMappings: Array<[Taxonomy, string | undefined, number]> = [
      [Taxonomy.EMAIL, profile.email, 0.95],
      [Taxonomy.PHONE, profile.phone, 0.95],
      [Taxonomy.LOCATION, profile.location, 0.9],
      [Taxonomy.LINKEDIN, profile.linkedinUrl, 0.99],
      [Taxonomy.SUMMARY, profile.about, 0.9],
      [Taxonomy.SKILLS, profile.skills.length > 0 ? profile.skills.join(', ') : undefined, 0.9],
    ]

    for (const [type, value, confidence] of fieldMappings) {
      if (value) {
        singleAnswers.push({ type, value, confidence })
      }
    }

    // Extract city from location if available
    if (profile.location) {
      const city = this.extractCityFromLocation(profile.location)
      if (city) {
        singleAnswers.push({ type: Taxonomy.CITY, value: city, confidence: 0.8 })
      }
    }

    // Convert work experiences and education
    for (let i = 0; i < profile.workExperiences.length; i++) {
      experiences.push(this.workToExperienceEntry(profile.workExperiences[i], i))
    }
    for (let i = 0; i < profile.educations.length; i++) {
      experiences.push(this.educationToExperienceEntry(profile.educations[i], i))
    }

    return {
      source: 'linkedin',
      extractedAt: Date.now(),
      singleAnswers,
      experiences,
    }
  }

  private extractName(root: Document | Element): string {
    // Try multiple selectors for name
    const selectors = [
      'h1.text-heading-xlarge',
      'h1[class*="text-heading"]',
      '.pv-text-details__left-panel h1',
      '.ph5 h1',
    ]

    for (const selector of selectors) {
      const el = root.querySelector(selector)
      if (el?.textContent) {
        return this.cleanText(el.textContent)
      }
    }

    return ''
  }

  private extractHeadline(root: Document | Element): string {
    const selectors = [
      '.text-body-medium.break-words',
      '.pv-text-details__left-panel .text-body-medium',
    ]

    for (const selector of selectors) {
      const el = root.querySelector(selector)
      if (el?.textContent) {
        return this.cleanText(el.textContent)
      }
    }

    return ''
  }

  private extractLocation(root: Document | Element): string {
    const selectors = [
      '.pv-text-details__left-panel .text-body-small:not(.break-words)',
      '.ph5 .text-body-small',
    ]

    for (const selector of selectors) {
      const elements = root.querySelectorAll(selector)
      for (const el of elements) {
        const text = this.cleanText(el.textContent || '')
        // Location typically contains city/country, not "connections" or "followers"
        if (text && !text.includes('关注') && !text.includes('connection') && !text.includes('follower')) {
          return text
        }
      }
    }

    return ''
  }

  private extractLinkedInUrl(root: Document | Element): string {
    // Try to get from canonical link or window location
    const canonical = root.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (canonical?.href) {
      return canonical.href
    }

    if (typeof window !== 'undefined' && window.location.href.includes('linkedin.com/in/')) {
      return window.location.href.split('?')[0]
    }

    return ''
  }

  private extractAbout(root: Document | Element): string {
    // About section
    const aboutSection = root.querySelector('#about')?.closest('section') ||
                         root.querySelector('[id*="about"]')?.parentElement

    if (aboutSection) {
      const content = aboutSection.querySelector('.pv-shared-text-with-see-more span[aria-hidden="true"]') ||
                      aboutSection.querySelector('.inline-show-more-text span[aria-hidden="true"]')
      if (content?.textContent) {
        return this.cleanText(content.textContent)
      }
    }

    return ''
  }

  private extractContactInfo(root: Document | Element): { email?: string; phone?: string } {
    const result: { email?: string; phone?: string } = {}

    // Contact info might be in a modal or section
    // Note: LinkedIn contact info is often in a modal that requires interaction
    // For now, we only extract what's directly visible on the page

    // Try to find email
    const emailPatterns = root.querySelectorAll('a[href^="mailto:"]')
    if (emailPatterns.length > 0) {
      const href = (emailPatterns[0] as HTMLAnchorElement).href
      result.email = href.replace('mailto:', '')
    }

    // Try to find phone
    const phonePatterns = root.querySelectorAll('a[href^="tel:"]')
    if (phonePatterns.length > 0) {
      const href = (phonePatterns[0] as HTMLAnchorElement).href
      result.phone = href.replace('tel:', '')
    }

    return result
  }

  private extractWorkExperiences(root: Document | Element): LinkedInWorkExperience[] {
    const experiences: LinkedInWorkExperience[] = []

    // Find experience section
    const experienceSection = root.querySelector('#experience')?.closest('section') ||
                              root.querySelector('[id="experience"]')?.parentElement?.parentElement

    if (!experienceSection) {
      return experiences
    }

    // Find all experience items
    const items = experienceSection.querySelectorAll('[data-view-name="profile-component-entity"]')

    items.forEach(item => {
      const exp = this.parseWorkExperienceItem(item)
      if (exp) {
        experiences.push(exp)
      }
    })

    return experiences
  }

  private parseWorkExperienceItem(item: Element): LinkedInWorkExperience | null {
    // Extract job title - look for the bold/title text
    const titleEl = item.querySelector('.t-bold span[aria-hidden="true"]') ||
                    item.querySelector('.hoverable-link-text span[aria-hidden="true"]')
    const title = titleEl ? this.cleanText(titleEl.textContent || '') : ''

    if (!title) return null

    // Extract company name - usually after title in t-14 t-normal
    const companyEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]')
    let company = ''
    if (companyEl?.textContent) {
      const parts = companyEl.textContent.split('·').map(p => this.cleanText(p))
      company = parts[0] || ''
      // parts[1] would be employment type (Full-time, Part-time, etc.) - not used currently
    }

    // Extract date range
    const dateEl = item.querySelector('.t-black--light .pvs-entity__caption-wrapper[aria-hidden="true"]')
    let startDate: string | undefined
    let endDate: string | undefined
    let current = false

    if (dateEl?.textContent) {
      const dateText = this.cleanText(dateEl.textContent)
      const dateResult = this.parseDateRange(dateText)
      startDate = dateResult.startDate
      endDate = dateResult.endDate
      current = dateResult.current
    }

    // Extract location
    const locationEls = item.querySelectorAll('.t-14.t-normal.t-black--light span[aria-hidden="true"]')
    let location: string | undefined
    locationEls.forEach(el => {
      const text = this.cleanText(el.textContent || '')
      if (text && !text.includes('年') && !text.includes('个月') && !text.includes('month') && !text.includes('year')) {
        location = text.split('·')[0].trim()
      }
    })

    return {
      title,
      company,
      location,
      startDate,
      endDate,
      current,
    }
  }

  private extractEducation(root: Document | Element): LinkedInEducation[] {
    const educations: LinkedInEducation[] = []

    // Find education section
    const educationSection = root.querySelector('#education')?.closest('section') ||
                             root.querySelector('[id="education"]')?.parentElement?.parentElement

    if (!educationSection) {
      return educations
    }

    // Find all education items
    const items = educationSection.querySelectorAll('[data-view-name="profile-component-entity"]')

    items.forEach(item => {
      const edu = this.parseEducationItem(item)
      if (edu) {
        educations.push(edu)
      }
    })

    return educations
  }

  private parseEducationItem(item: Element): LinkedInEducation | null {
    // Extract school name
    const schoolEl = item.querySelector('.t-bold span[aria-hidden="true"]') ||
                     item.querySelector('.hoverable-link-text span[aria-hidden="true"]')
    const school = schoolEl ? this.cleanText(schoolEl.textContent || '') : ''

    if (!school) return null

    // Extract degree and field
    const degreeEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]')
    let degree: string | undefined
    let field: string | undefined

    if (degreeEl?.textContent) {
      const text = this.cleanText(degreeEl.textContent)
      // Common format: "Bachelor's degree, Computer Science" or "本科 · 计算机科学"
      const parts = text.split(/[,·]/).map(p => this.cleanText(p))
      degree = parts[0]
      field = parts[1]
    }

    // Extract date range
    const dateEl = item.querySelector('.t-black--light .pvs-entity__caption-wrapper[aria-hidden="true"]') ||
                   item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]')
    let startDate: string | undefined
    let endDate: string | undefined

    if (dateEl?.textContent) {
      const dateText = this.cleanText(dateEl.textContent)
      const dateResult = this.parseDateRange(dateText)
      startDate = dateResult.startDate
      endDate = dateResult.endDate
    }

    return {
      school,
      degree,
      field,
      startDate,
      endDate,
    }
  }

  private extractSkills(root: Document | Element): string[] {
    const skills: string[] = []

    // Find skills section
    const skillsSection = root.querySelector('#skills')?.closest('section') ||
                          root.querySelector('[id="skills"]')?.parentElement?.parentElement

    if (!skillsSection) {
      return skills
    }

    // Find skill items
    const skillItems = skillsSection.querySelectorAll('[data-view-name="profile-component-entity"]')

    skillItems.forEach(item => {
      const skillEl = item.querySelector('.t-bold span[aria-hidden="true"]') ||
                      item.querySelector('.hoverable-link-text span[aria-hidden="true"]')
      if (skillEl?.textContent) {
        const skill = this.cleanText(skillEl.textContent)
        if (skill && !skills.includes(skill)) {
          skills.push(skill)
        }
      }
    })

    return skills
  }

  private parseDateRange(dateText: string): { startDate?: string; endDate?: string; current: boolean } {
    const result: { startDate?: string; endDate?: string; current: boolean } = { current: false }

    // Check for "present" or "至今"
    if (dateText.includes('至今') || dateText.toLowerCase().includes('present')) {
      result.current = true
    }

    // Extract years and months
    // Chinese format: "2022年7月 - 2025年7月" or "2022年7月 - 至今"
    // English format: "Jul 2022 - Jul 2025" or "Jul 2022 - Present"

    const chinesePattern = /(\d{4})年(\d{1,2})月/g
    const englishPattern = /([A-Za-z]+)\s+(\d{4})/g

    const chineseMatches = [...dateText.matchAll(chinesePattern)]
    if (chineseMatches.length >= 1) {
      result.startDate = `${chineseMatches[0][1]}-${chineseMatches[0][2].padStart(2, '0')}`
      if (chineseMatches.length >= 2) {
        result.endDate = `${chineseMatches[1][1]}-${chineseMatches[1][2].padStart(2, '0')}`
      } else if (result.current) {
        result.endDate = 'present'
      }
      return result
    }

    const englishMatches = [...dateText.matchAll(englishPattern)]
    if (englishMatches.length >= 1) {
      const month1 = MONTH_MAP[englishMatches[0][1].toLowerCase().slice(0, 3)] || '01'
      result.startDate = `${englishMatches[0][2]}-${month1}`

      if (englishMatches.length >= 2) {
        const month2 = MONTH_MAP[englishMatches[1][1].toLowerCase().slice(0, 3)] || '01'
        result.endDate = `${englishMatches[1][2]}-${month2}`
      } else if (result.current) {
        result.endDate = 'present'
      }
    }

    // Try year-only format
    const yearOnlyPattern = /(\d{4})\s*[-–]\s*(\d{4}|至今|present)/i
    const yearMatch = dateText.match(yearOnlyPattern)
    if (yearMatch && !result.startDate) {
      result.startDate = `${yearMatch[1]}-01`
      if (yearMatch[2].match(/\d{4}/)) {
        result.endDate = `${yearMatch[2]}-01`
      } else {
        result.endDate = 'present'
        result.current = true
      }
    }

    return result
  }

  private workToExperienceEntry(work: LinkedInWorkExperience, index: number): ExperienceEntry {
    const now = Date.now()
    const fields = this.buildFields([
      [Taxonomy.COMPANY_NAME, work.company],
      [Taxonomy.JOB_TITLE, work.title],
      [Taxonomy.LOCATION, work.location],
      [Taxonomy.START_DATE, work.startDate],
      [Taxonomy.END_DATE, work.endDate],
      [Taxonomy.JOB_DESCRIPTION, work.description],
    ])

    return {
      id: `linkedin-work-${now}-${index}`,
      groupType: 'WORK',
      priority: index,
      startDate: work.startDate,
      endDate: work.endDate,
      fields,
      createdAt: now,
      updatedAt: now,
    }
  }

  private educationToExperienceEntry(edu: LinkedInEducation, index: number): ExperienceEntry {
    const now = Date.now()
    const fields = this.buildFields([
      [Taxonomy.SCHOOL, edu.school],
      [Taxonomy.DEGREE, edu.degree],
      [Taxonomy.MAJOR, edu.field],
      [Taxonomy.START_DATE, edu.startDate],
      [Taxonomy.END_DATE, edu.endDate],
      [Taxonomy.GRAD_DATE, edu.endDate !== 'present' ? edu.endDate : undefined],
    ])

    return {
      id: `linkedin-edu-${now}-${index}`,
      groupType: 'EDUCATION',
      priority: index,
      startDate: edu.startDate,
      endDate: edu.endDate,
      fields,
      createdAt: now,
      updatedAt: now,
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

  private splitName(fullName: string): { firstName?: string; lastName?: string } {
    const parts = fullName.trim().split(/\s+/)

    if (parts.length === 0) return {}

    // Check if it's a Chinese name (no spaces, all Chinese characters)
    if (parts.length === 1 && /^[\u4e00-\u9fa5]+$/.test(fullName)) {
      // Chinese name: first char is surname, rest is given name
      return {
        lastName: fullName.charAt(0),
        firstName: fullName.slice(1),
      }
    }

    // Western name: first word is first name, last word is last name
    return {
      firstName: parts[0],
      lastName: parts.length > 1 ? parts[parts.length - 1] : undefined,
    }
  }

  private extractCityFromLocation(location: string): string {
    // Common patterns for city extraction
    // "San Francisco, California, United States" -> "San Francisco"
    // "中国 广东省 深圳" -> "深圳"
    // "深圳市" -> "深圳"

    const parts = location.split(/[,·]/);

    // For Chinese locations, city is often the last specific part
    if (/[\u4e00-\u9fa5]/.test(location)) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = this.cleanText(parts[i])
        if (part && !part.includes('省') && !part.includes('国')) {
          return part.replace(/[市区县]$/, '')
        }
      }
    }

    // For Western locations, city is often the first part
    return this.cleanText(parts[0])
  }

  private cleanText(text: string): string {
    return text
      .replace(/<!---->/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

export const linkedInParser = new LinkedInParser()
