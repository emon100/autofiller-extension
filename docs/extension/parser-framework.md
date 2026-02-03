# 解析与填充框架设计文档

## 概述

AutoFiller 采用可扩展的插件式架构，将字段识别（解析）和值填充分离为独立的模块。这种设计允许：
- 添加新的语义标签（Taxonomy）
- 自定义解析规则
- 接入 LLM 进行智能语义理解
- 支持复杂的值转换逻辑

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        表单字段                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DOM Scanner                                  │
│  提取 FieldContext: labelText, attributes, optionsText, etc.    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Parser Framework                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Autocomplete │ │    Type      │ │   Name/ID    │            │
│  │   Parser     │ │   Parser     │ │   Parser     │            │
│  │ (priority:   │ │ (priority:   │ │ (priority:   │            │
│  │    100)      │ │    90)       │ │    80)       │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐                              │
│  │    Label     │ │     LLM      │  ← 可扩展                    │
│  │   Parser     │ │   Parser     │                              │
│  │ (priority:   │ │ (priority:   │                              │
│  │    70)       │ │    50)       │                              │
│  └──────────────┘ └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    CandidateType[]
                    (type, score, reasons)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Value Transformer                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │    Name      │ │    Date      │ │    Phone     │            │
│  │ Transformer  │ │ Transformer  │ │ Transformer  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐                              │
│  │   Boolean    │ │    Degree    │  ← 可扩展                    │
│  │ Transformer  │ │ Transformer  │                              │
│  └──────────────┘ └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Fill Executor                                 │
│  DirectFiller | SelectFiller | RadioFiller | ComboboxFiller     │
└─────────────────────────────────────────────────────────────────┘
```

## 核心接口定义

### 1. Taxonomy（语义标签）

```typescript
// src/types/index.ts
export enum Taxonomy {
  // Personal
  FULL_NAME = 'FULL_NAME',
  FIRST_NAME = 'FIRST_NAME',
  LAST_NAME = 'LAST_NAME',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  // ... 更多标签
  UNKNOWN = 'UNKNOWN',
}
```

### 2. IFieldParser（字段解析器接口）

```typescript
// src/types/index.ts
export interface IFieldParser {
  name: string           // 解析器名称
  priority: number       // 优先级（越高越先执行）
  canParse(context: FieldContext): boolean
  parse(context: FieldContext): Promise<CandidateType[]>
}

export interface CandidateType {
  type: Taxonomy         // 识别出的语义类型
  score: number          // 置信度 0-1
  reasons: string[]      // 判断依据（用于调试和 UI 展示）
}
```

### 3. IValueTransformer（值转换器接口）

```typescript
// src/types/index.ts
export interface IValueTransformer {
  name: string
  sourceType: Taxonomy           // 源语义类型
  targetTypes: Taxonomy[]        // 可转换的目标类型
  canTransform(sourceValue: string, targetContext: FieldContext): boolean
  transform(sourceValue: string, targetContext: FieldContext): string
}
```

### 4. FieldContext（字段上下文）

```typescript
export interface FieldContext {
  element: HTMLElement           // DOM 元素
  labelText: string              // 标签文本
  sectionTitle: string           // 所在区域标题
  attributes: Record<string, string>  // HTML 属性
  optionsText: string[]          // 下拉/单选选项
  widgetSignature: WidgetSignature    // 控件类型签名
  framePath: string[]            // iframe 路径
  shadowPath: string[]           // shadow DOM 路径
}
```

---

## 如何添加新的语义标签

### 步骤 1: 在 Taxonomy 中添加新标签

```typescript
// src/types/index.ts
export enum Taxonomy {
  // ... 现有标签
  
  // 添加新标签
  COMPANY_NAME = 'COMPANY_NAME',      // 公司名称
  JOB_TITLE = 'JOB_TITLE',            // 职位名称
  YEARS_EXPERIENCE = 'YEARS_EXPERIENCE', // 工作年限
}
```

### 步骤 2: 如果是敏感字段，添加到 SENSITIVE_TYPES

```typescript
// src/types/index.ts
export const SENSITIVE_TYPES = new Set([
  // ... 现有敏感类型
  Taxonomy.SALARY,
  // 如果新标签是敏感的，添加到这里
])
```

### 步骤 3: 在解析器中添加识别规则

```typescript
// src/parser/index.ts - NameIdParser
private readonly patterns: Array<{ pattern: RegExp; type: Taxonomy; score: number }> = [
  // ... 现有规则
  
  // 添加新规则
  { pattern: /company|employer|公司/i, type: Taxonomy.COMPANY_NAME, score: 0.85 },
  { pattern: /job.?title|position|职位/i, type: Taxonomy.JOB_TITLE, score: 0.85 },
  { pattern: /years?.?(of)?.?experience|工作年限/i, type: Taxonomy.YEARS_EXPERIENCE, score: 0.85 },
]
```

### 步骤 4: 如果需要值转换，添加 Transformer

```typescript
// src/transformer/index.ts
export class YearsExperienceTransformer implements IValueTransformer {
  name = 'YearsExperienceTransformer'
  sourceType = Taxonomy.YEARS_EXPERIENCE
  targetTypes = [Taxonomy.YEARS_EXPERIENCE]

  canTransform(sourceValue: string, targetContext: FieldContext): boolean {
    return /^\d+$/.test(sourceValue.trim())
  }

  transform(sourceValue: string, targetContext: FieldContext): string {
    const years = parseInt(sourceValue.trim())
    const options = targetContext.optionsText
    
    // 如果是下拉框，匹配合适的选项
    if (options.length > 0) {
      // 匹配 "3-5 years" 这样的选项
      for (const opt of options) {
        const match = opt.match(/(\d+)\s*[-–]\s*(\d+)/)
        if (match) {
          const min = parseInt(match[1])
          const max = parseInt(match[2])
          if (years >= min && years <= max) return opt
        }
      }
    }
    
    return sourceValue
  }
}

// 注册转换器
registerTransformer(new YearsExperienceTransformer())
```

---

## 如何添加自定义解析规则

### 方法 1: 扩展现有解析器

在 `NameIdParser` 或 `LabelParser` 中添加新的正则模式：

```typescript
// src/parser/index.ts
class NameIdParser implements IFieldParser {
  private readonly patterns = [
    // 添加你的规则
    { pattern: /your_pattern/i, type: Taxonomy.YOUR_TYPE, score: 0.85 },
  ]
}
```

### 方法 2: 创建自定义解析器

```typescript
// src/parser/custom-parser.ts
import { IFieldParser, FieldContext, CandidateType, Taxonomy } from '@/types'
import { registerParser } from '@/parser'

export class CustomDomainParser implements IFieldParser {
  name = 'CustomDomainParser'
  priority = 85  // 在 NameIdParser (80) 和 TypeAttributeParser (90) 之间

  canParse(context: FieldContext): boolean {
    // 只在特定网站启用
    return window.location.hostname.includes('specific-site.com')
  }

  async parse(context: FieldContext): Promise<CandidateType[]> {
    const results: CandidateType[] = []
    
    // 你的自定义逻辑
    const name = context.attributes.name || ''
    
    if (name === 'custom_field_xyz') {
      results.push({
        type: Taxonomy.COMPANY_NAME,
        score: 0.95,
        reasons: ['Site-specific field mapping']
      })
    }
    
    return results
  }
}

// 在应用启动时注册
registerParser(new CustomDomainParser())
```

### 方法 3: 基于站点的规则配置

```typescript
// src/parser/site-rules.ts
interface SiteRule {
  domain: string
  fieldMappings: Array<{
    selector: string       // CSS 选择器或 name/id
    type: Taxonomy
    score: number
  }>
}

const SITE_RULES: SiteRule[] = [
  {
    domain: 'greenhouse.io',
    fieldMappings: [
      { selector: '[name="job_application[first_name]"]', type: Taxonomy.FIRST_NAME, score: 1.0 },
      { selector: '[name="job_application[last_name]"]', type: Taxonomy.LAST_NAME, score: 1.0 },
    ]
  },
  {
    domain: 'lever.co',
    fieldMappings: [
      { selector: '[name="name"]', type: Taxonomy.FULL_NAME, score: 1.0 },
      { selector: '[name="email"]', type: Taxonomy.EMAIL, score: 1.0 },
    ]
  }
]

export class SiteRuleParser implements IFieldParser {
  name = 'SiteRuleParser'
  priority = 95  // 高优先级

  canParse(context: FieldContext): boolean {
    return SITE_RULES.some(rule => 
      window.location.hostname.includes(rule.domain)
    )
  }

  async parse(context: FieldContext): Promise<CandidateType[]> {
    const hostname = window.location.hostname
    const rule = SITE_RULES.find(r => hostname.includes(r.domain))
    
    if (!rule) return []
    
    for (const mapping of rule.fieldMappings) {
      if (context.element.matches(mapping.selector)) {
        return [{
          type: mapping.type,
          score: mapping.score,
          reasons: [`Site rule: ${rule.domain}`]
        }]
      }
    }
    
    return []
  }
}
```

---

## 如何接入 LLM

### 架构设计

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  FieldContext │ ──▶ │  PII Scrub   │ ──▶ │   LLM API   │
│  (本地)       │     │  (本地清洗)   │     │  (云端)     │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │   Response   │
                                          │ (JSON Schema │
                                          │  Validated)  │
                                          └──────────────┘
```

### 步骤 1: 实现 LLMParser

```typescript
// src/parser/llm-parser.ts
import { IFieldParser, FieldContext, CandidateType, Taxonomy } from '@/types'

interface LLMClassifyRequest {
  labelText: string
  sectionTitle: string
  optionsText: string[]
  attributes: {
    name?: string
    id?: string
    type?: string
    placeholder?: string
  }
}

interface LLMClassifyResponse {
  type: string
  confidence: number
  riskTag: 'normal' | 'sensitive'
  explanation: string
}

export class LLMParser implements IFieldParser {
  name = 'LLMParser'
  priority = 50  // 较低优先级，作为兜底

  private cache = new Map<string, CandidateType[]>()
  private apiEndpoint: string
  private apiKey: string

  constructor(config: { apiEndpoint: string; apiKey: string }) {
    this.apiEndpoint = config.apiEndpoint
    this.apiKey = config.apiKey
  }

  canParse(context: FieldContext): boolean {
    // 只有当其他解析器置信度不足时才调用 LLM
    return true
  }

  async parse(context: FieldContext): Promise<CandidateType[]> {
    const cacheKey = this.getCacheKey(context)
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    try {
      const request = this.buildRequest(context)
      const response = await this.callLLM(request)
      const results = this.parseResponse(response)
      
      this.cache.set(cacheKey, results)
      return results
    } catch (error) {
      console.error('LLM parsing failed:', error)
      return []
    }
  }

  private getCacheKey(context: FieldContext): string {
    return JSON.stringify({
      label: context.labelText,
      section: context.sectionTitle,
      name: context.attributes.name,
      type: context.attributes.type,
    })
  }

  private buildRequest(context: FieldContext): LLMClassifyRequest {
    return {
      labelText: this.scrubPII(context.labelText),
      sectionTitle: context.sectionTitle,
      optionsText: context.optionsText.slice(0, 10),  // 限制数量
      attributes: {
        name: context.attributes.name,
        id: context.attributes.id,
        type: context.attributes.type,
        placeholder: this.scrubPII(context.attributes.placeholder || ''),
      }
    }
  }

  private scrubPII(text: string): string {
    return text
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
      .replace(/\+?\d{10,}/g, '[PHONE]')
      .replace(/\d{3}-\d{2}-\d{4}/g, '[SSN]')
  }

  private async callLLM(request: LLMClassifyRequest): Promise<LLMClassifyResponse> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a form field classifier. Classify the given form field into one of these categories:
              ${Object.values(Taxonomy).join(', ')}
              
              Respond in JSON format:
              {
                "type": "TAXONOMY_VALUE",
                "confidence": 0.0-1.0,
                "riskTag": "normal" | "sensitive",
                "explanation": "brief reason"
              }`
          },
          {
            role: 'user',
            content: JSON.stringify(request)
          }
        ],
        response_format: { type: 'json_object' }
      })
    })

    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)
  }

  private parseResponse(response: LLMClassifyResponse): CandidateType[] {
    const type = Taxonomy[response.type as keyof typeof Taxonomy]
    
    if (!type) {
      return [{
        type: Taxonomy.UNKNOWN,
        score: 0,
        reasons: ['LLM returned unknown type']
      }]
    }

    return [{
      type,
      score: response.confidence,
      reasons: [`LLM: ${response.explanation}`]
    }]
  }
}
```

### 步骤 2: 配置和注册 LLMParser

```typescript
// src/content/index.ts
import { registerParser } from '@/parser'
import { LLMParser } from '@/parser/llm-parser'

// 从配置或环境变量获取
const LLM_CONFIG = {
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: process.env.OPENAI_API_KEY || '',
}

// 只在配置了 API Key 时启用
if (LLM_CONFIG.apiKey) {
  registerParser(new LLMParser(LLM_CONFIG))
}
```

### 步骤 3: 智能调用策略

```typescript
// src/parser/smart-parser.ts
export async function smartParse(context: FieldContext): Promise<CandidateType[]> {
  const results = await parseField(context)
  
  // 如果本地解析器置信度足够高，直接返回
  if (results[0]?.score >= 0.85) {
    return results
  }
  
  // 否则，异步调用 LLM 增强
  const llmParser = getParsers().find(p => p.name === 'LLMParser')
  if (llmParser && llmParser.canParse(context)) {
    const llmResults = await llmParser.parse(context)
    
    // 合并结果
    return mergeResults(results, llmResults)
  }
  
  return results
}

function mergeResults(local: CandidateType[], llm: CandidateType[]): CandidateType[] {
  const merged = [...local]
  
  for (const llmResult of llm) {
    const existing = merged.find(r => r.type === llmResult.type)
    if (existing) {
      // LLM 作为额外置信度加成
      existing.score = Math.min(1, existing.score + llmResult.score * 0.3)
      existing.reasons.push(...llmResult.reasons)
    } else {
      merged.push(llmResult)
    }
  }
  
  return merged.sort((a, b) => b.score - a.score)
}
```

---

## LLM 语义填充（高级）

除了字段识别，LLM 还可以用于智能值匹配：

```typescript
// src/transformer/llm-transformer.ts
export class LLMValueTransformer implements IValueTransformer {
  name = 'LLMValueTransformer'
  sourceType = Taxonomy.UNKNOWN  // 通用
  targetTypes = Object.values(Taxonomy)

  async transform(
    sourceValue: string, 
    targetContext: FieldContext
  ): Promise<string> {
    // 当选项很多或选项措辞复杂时，用 LLM 匹配
    if (targetContext.optionsText.length > 5) {
      const response = await this.callLLM({
        value: sourceValue,
        options: targetContext.optionsText,
        fieldLabel: targetContext.labelText,
      })
      return response.bestMatch
    }
    
    return sourceValue
  }

  private async callLLM(request: {
    value: string
    options: string[]
    fieldLabel: string
  }): Promise<{ bestMatch: string }> {
    // 调用 LLM 选择最匹配的选项
    const prompt = `Given the user's answer "${request.value}" and these options:
      ${request.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}
      
      Which option best matches the user's intent for the field "${request.fieldLabel}"?
      Return only the exact option text.`
    
    // ... LLM API 调用
  }
}
```

---

## 调试与测试

### 查看解析结果

在 Demo 页面的 Activity Log 中可以看到每个字段的解析结果和原因。

### 单元测试

```bash
npm test -- --grep "parser"
npm test -- --grep "transformer"
```

### 添加新测试

```typescript
// tests/unit/parser.test.ts
it('parses custom field type', async () => {
  const context = createFieldContext({ 
    attributes: { name: 'companyName' },
    labelText: 'Company Name'
  })
  const results = await parseField(context)
  
  expect(results[0].type).toBe(Taxonomy.COMPANY_NAME)
  expect(results[0].score).toBeGreaterThan(0.8)
})
```

---

## 最佳实践

1. **优先级选择**：
   - 100: 最可靠的信号（autocomplete 属性）
   - 90: 强类型信号（input type）
   - 80: name/id 关键字
   - 70: label 文本
   - 50: LLM 兜底

2. **置信度阈值**：
   - ≥ 0.75: 自动填充
   - 0.5-0.75: 显示建议按钮
   - < 0.5: 不处理

3. **缓存策略**：
   - 本地规则解析：无需缓存（同步且快速）
   - LLM 解析：基于字段特征缓存，避免重复调用

4. **错误处理**：
   - LLM 调用失败时，回退到本地解析结果
   - 永远不要阻塞用户操作
