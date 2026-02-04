/**
 * Smart Widget Visibility Controller
 *
 * Controls when the floating widget should appear based on:
 * - Number of form fields detected
 * - Type of page (job application indicators)
 * - User interaction patterns
 * - URL patterns
 */

import { scanFields } from '@/scanner'

export interface VisibilityConfig {
  // Minimum form fields required to show widget
  minFormFields: number
  // Show widget immediately or wait for user interaction
  showMode: 'immediate' | 'on-focus' | 'on-scroll-to-form'
  // URL patterns that always show widget
  alwaysShowPatterns: RegExp[]
  // URL patterns that never show widget
  neverShowPatterns: RegExp[]
  // Delay before showing (ms)
  showDelay: number
}

const DEFAULT_CONFIG: VisibilityConfig = {
  minFormFields: 3,
  showMode: 'immediate',
  showDelay: 500,
  alwaysShowPatterns: [
    // Common job application URLs
    /\/apply/i,
    /\/application/i,
    /\/career/i,
    /\/jobs?\//i,
    /\/job-application/i,
    /\/submit-application/i,
    // ATS systems
    /greenhouse\.io/i,
    /lever\.co/i,
    /workday\.com/i,
    /icims\.com/i,
    /smartrecruiters/i,
    /ashbyhq\.com/i,
    /breezy\.hr/i,
    /recruitee/i,
    /jazz\.co/i,
    /jobvite/i,
    // Chinese job sites
    /zhaopin\.com/i,
    /51job\.com/i,
    /lagou\.com/i,
    /boss\.com/i,
    /liepin\.com/i,
  ],
  neverShowPatterns: [
    // Login/auth pages
    /\/login/i,
    /\/signin/i,
    /\/signup/i,
    /\/register/i,
    /\/auth/i,
    /\/password/i,
    // Payment pages
    /\/checkout/i,
    /\/payment/i,
    /\/cart/i,
    // Settings pages
    /\/settings/i,
    /\/preferences/i,
    /\/account/i,
  ],
}

// Keywords that indicate a job application page
const JOB_APPLICATION_KEYWORDS = [
  'apply', 'application', 'job', 'career', 'position', 'resume', 'cv',
  'candidate', 'applicant', 'employment', 'hire', 'hiring', 'recruit',
  '申请', '求职', '简历', '招聘', '职位', '应聘'
]

// Form field labels that suggest job applications
const JOB_FORM_INDICATORS = [
  /full\s*name/i, /first\s*name/i, /last\s*name/i,
  /email/i, /phone/i,
  /education/i, /school/i, /university/i, /degree/i,
  /experience/i, /employer/i, /company/i, /job\s*title/i,
  /resume/i, /cv/i, /cover\s*letter/i,
  /work\s*authorization/i, /visa/i, /sponsorship/i,
  /linkedin/i, /github/i, /portfolio/i,
  /姓名/i, /电话/i, /邮箱/i, /学历/i, /工作经历/i,
]

export interface VisibilityDecision {
  shouldShow: boolean
  reason: string
  confidence: number
  suggestedMode: 'full' | 'minimal' | 'hidden'
  formFieldCount: number
}

export class WidgetVisibilityController {
  private config: VisibilityConfig
  private cachedDecision: VisibilityDecision | null = null
  private lastCheckTime = 0
  private checkCacheMs = 2000 // Cache decision for 2 seconds

  constructor(config: Partial<VisibilityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Main decision function - should the widget be shown?
   */
  async shouldShowWidget(): Promise<VisibilityDecision> {
    const now = Date.now()
    if (this.cachedDecision && (now - this.lastCheckTime) < this.checkCacheMs) {
      return this.cachedDecision
    }

    const decision = await this.evaluateVisibility()
    this.cachedDecision = decision
    this.lastCheckTime = now

    return decision
  }

  /**
   * Evaluate visibility based on multiple signals
   */
  private async evaluateVisibility(): Promise<VisibilityDecision> {
    const url = window.location.href
    const path = window.location.pathname

    // Check never-show patterns first
    for (const pattern of this.config.neverShowPatterns) {
      if (pattern.test(url) || pattern.test(path)) {
        return {
          shouldShow: false,
          reason: `URL matches excluded pattern: ${pattern}`,
          confidence: 1.0,
          suggestedMode: 'hidden',
          formFieldCount: 0,
        }
      }
    }

    // Check always-show patterns
    for (const pattern of this.config.alwaysShowPatterns) {
      if (pattern.test(url) || pattern.test(path)) {
        return {
          shouldShow: true,
          reason: `URL matches job application pattern: ${pattern}`,
          confidence: 0.95,
          suggestedMode: 'full',
          formFieldCount: -1, // Unknown, but irrelevant
        }
      }
    }

    // Scan for form fields
    const fields = scanFields(document.body)
    const fieldCount = fields.length

    if (fieldCount === 0) {
      return {
        shouldShow: false,
        reason: 'No form fields detected',
        confidence: 1.0,
        suggestedMode: 'hidden',
        formFieldCount: 0,
      }
    }

    // Check if page content suggests job application
    const pageScore = this.calculateJobApplicationScore(fields)

    if (pageScore >= 0.7) {
      return {
        shouldShow: true,
        reason: `High job application score (${(pageScore * 100).toFixed(0)}%)`,
        confidence: pageScore,
        suggestedMode: 'full',
        formFieldCount: fieldCount,
      }
    }

    if (fieldCount >= this.config.minFormFields && pageScore >= 0.4) {
      return {
        shouldShow: true,
        reason: `${fieldCount} form fields with moderate job signals (${(pageScore * 100).toFixed(0)}%)`,
        confidence: pageScore,
        suggestedMode: pageScore >= 0.6 ? 'full' : 'minimal',
        formFieldCount: fieldCount,
      }
    }

    if (fieldCount >= 8) {
      // Large form, might be relevant
      return {
        shouldShow: true,
        reason: `Large form detected (${fieldCount} fields)`,
        confidence: 0.5,
        suggestedMode: 'minimal',
        formFieldCount: fieldCount,
      }
    }

    return {
      shouldShow: false,
      reason: `Only ${fieldCount} fields, low job application score (${(pageScore * 100).toFixed(0)}%)`,
      confidence: 1 - pageScore,
      suggestedMode: 'hidden',
      formFieldCount: fieldCount,
    }
  }

  /**
   * Calculate a score indicating how likely this is a job application form
   */
  private calculateJobApplicationScore(fields: Array<{ labelText: string; sectionTitle: string; attributes: Record<string, string> }>): number {
    let score = 0
    let checks = 0

    // Check page title
    const pageTitle = document.title.toLowerCase()
    for (const keyword of JOB_APPLICATION_KEYWORDS) {
      if (pageTitle.includes(keyword.toLowerCase())) {
        score += 0.3
        break
      }
    }
    checks++

    // Check URL path
    const urlPath = window.location.pathname.toLowerCase()
    for (const keyword of JOB_APPLICATION_KEYWORDS) {
      if (urlPath.includes(keyword.toLowerCase())) {
        score += 0.3
        break
      }
    }
    checks++

    // Check field labels
    let jobFieldCount = 0
    for (const field of fields) {
      const text = `${field.labelText} ${field.sectionTitle} ${field.attributes.placeholder || ''}`.toLowerCase()
      for (const indicator of JOB_FORM_INDICATORS) {
        if (indicator.test(text)) {
          jobFieldCount++
          break
        }
      }
    }

    const fieldRatio = fields.length > 0 ? jobFieldCount / fields.length : 0
    score += fieldRatio * 0.4
    checks++

    // Check for resume/file upload fields
    const hasFileUpload = fields.some(f =>
      f.attributes.type === 'file' ||
      /resume|cv|cover/i.test(f.labelText)
    )
    if (hasFileUpload) {
      score += 0.2
    }
    checks++

    // Check for education/experience sections
    const hasEducationSection = fields.some(f =>
      /education|school|university|degree|学历|学校/i.test(f.sectionTitle)
    )
    const hasExperienceSection = fields.some(f =>
      /experience|employment|work|工作|经历/i.test(f.sectionTitle)
    )
    if (hasEducationSection || hasExperienceSection) {
      score += 0.2
    }
    checks++

    return Math.min(1, score)
  }

  /**
   * Force re-evaluation on next check
   */
  invalidateCache(): void {
    this.cachedDecision = null
    this.lastCheckTime = 0
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VisibilityConfig>): void {
    this.config = { ...this.config, ...config }
    this.invalidateCache()
  }

  /**
   * Get current config
   */
  getConfig(): VisibilityConfig {
    return { ...this.config }
  }
}

// Singleton instance
export const visibilityController = new WidgetVisibilityController()
