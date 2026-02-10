import { Taxonomy } from './index'

// 经历分组类型
export type ExperienceGroupType = 'WORK' | 'EDUCATION' | 'PROJECT'

// 经历条目 - 表示一段完整的工作/教育/项目经历
export interface ExperienceEntry {
  id: string
  groupType: ExperienceGroupType
  priority: number              // 排序序号（0 = 最近/最重要）
  startDate?: string            // YYYY-MM 格式
  endDate?: string              // YYYY-MM 或 'present'
  fields: Partial<Record<Taxonomy, string>>  // 该经历的所有字段
  createdAt: number
  updatedAt: number
}

// 解析来源
export type ProfileSource = 'resume' | 'linkedin'

// 提取的单值答案（用于解析结果）
export interface ExtractedAnswer {
  type: Taxonomy
  value: string
  display?: string
  confidence: number
}

// 解析结果
export interface ParsedProfile {
  source: ProfileSource
  extractedAt: number
  singleAnswers: ExtractedAnswer[]   // 单值答案（姓名、邮箱等）
  experiences: ExperienceEntry[]      // 多段经历
  rawText?: string                    // 原始文本（用于调试）
}

// 表单区块 - 用于识别重复的经历区块
export interface FormSection {
  id: string
  title: string                       // sectionTitle
  fields: import('./index').FieldContext[]
  isRepeatingBlock: boolean           // 是否是重复的经历区块
  blockIndex: number                  // 第几个区块（0-based）
  groupType?: ExperienceGroupType     // 检测到的经历类型
}

// LinkedIn页面解析结果
export interface LinkedInWorkExperience {
  company: string
  title: string
  location?: string
  startDate?: string
  endDate?: string
  description?: string
  current: boolean
}

export interface LinkedInEducation {
  school: string
  degree?: string
  field?: string
  startDate?: string
  endDate?: string
  activities?: string
}

export interface LinkedInProfile {
  fullName: string
  headline?: string
  location?: string
  email?: string
  phone?: string
  linkedinUrl: string
  about?: string
  workExperiences: LinkedInWorkExperience[]
  educations: LinkedInEducation[]
  skills: string[]
  showAllLinks?: {
    experience?: string
    education?: string
  }
}

// 简历解析LLM响应格式
export interface ResumeParseResult {
  fullName?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  location?: string
  city?: string
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  summary?: string
  education: Array<{
    school: string
    degree?: string
    major?: string
    gpa?: string
    startDate?: string   // YYYY-MM
    endDate?: string     // YYYY-MM
    gradDate?: string    // YYYY-MM (毕业日期)
  }>
  experience: Array<{
    company: string
    title: string
    location?: string
    startDate?: string   // YYYY-MM
    endDate?: string     // YYYY-MM 或 'present'
    description?: string
    highlights?: string[]
  }>
  skills: string[]
}

// 导入确认UI的数据
export interface ImportPreviewData {
  source: ProfileSource
  singleAnswers: Array<{
    type: Taxonomy
    value: string
    existingValue?: string  // 如果已存在，显示冲突
    willReplace: boolean
  }>
  experiences: Array<{
    entry: ExperienceEntry
    isNew: boolean
  }>
}
