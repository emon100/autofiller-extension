# AutoFiller 项目架构文档

## 项目概述

AutoFiller 是一个 Chrome 浏览器扩展，用于自动填充求职申请表单。用户填写一次表单后，插件学习"问题语义→答案语义"的映射，之后在任意招聘网站遇到同类问题时自动填充。

## 技术栈

| 类别 | 技术 |
|------|------|
| 扩展框架 | Chrome Manifest V3 |
| 语言 | TypeScript |
| 构建工具 | Vite |
| 测试框架 | Vitest + Playwright |
| UI 框架 | React + Tailwind CSS |
| DOM 模拟 | happy-dom |

## 目录结构

```
autofiller-claude/
├── src/                    # 源代码
│   ├── types/              # 类型定义
│   ├── scanner/            # DOM 扫描器
│   ├── parser/             # 可扩展解析框架
│   ├── classifier/         # 字段分类器（旧版）
│   ├── transformer/        # 值转换器
│   ├── executor/           # 填充执行器
│   ├── recorder/           # 用户输入记录器
│   ├── storage/            # 存储层
│   ├── content/            # Content Script 入口
│   └── background/         # Service Worker
├── tests/                  # 测试
│   ├── unit/               # 单元测试
│   └── fixtures/           # 测试用 HTML
├── demo-pages/             # 演示页面
├── docs/                   # 文档
├── public/                 # 静态资源
└── dist/                   # 构建输出（gitignore）
```

## 模块架构

### 数据流

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Content Script                                  │
│  ┌─────────┐    ┌─────────┐    ┌───────────┐    ┌──────────┐              │
│  │ Scanner │───▶│ Parser  │───▶│Transformer│───▶│ Executor │              │
│  └─────────┘    └─────────┘    └───────────┘    └──────────┘              │
│       │              │                                │                     │
│       │              │                                │                     │
│       ▼              ▼                                ▼                     │
│  FieldContext   CandidateType[]              FillResult                    │
│                                                       │                     │
│  ┌─────────┐                                         │                     │
│  │Recorder │◀────────────────────────────────────────┘                     │
│  └─────────┘                                                                │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────┐                                                                │
│  │ Storage │◀─────────────────────────────────────────────────────────────│
│  └─────────┘                                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Background (Service Worker)                        │
│  - 消息路由                                                                   │
│  - 存储管理                                                                   │
│  - 站点设置                                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 核心模块详解

### 1. Types (`src/types/index.ts`)

定义所有核心数据结构和接口。

#### Taxonomy（语义标签枚举）

```typescript
enum Taxonomy {
  FULL_NAME, FIRST_NAME, LAST_NAME,  // 姓名
  EMAIL, PHONE, COUNTRY_CODE,         // 联系方式
  CITY, LINKEDIN, GITHUB, PORTFOLIO,  // 位置和链接
  SCHOOL, DEGREE, MAJOR,              // 教育
  GRAD_DATE, GRAD_YEAR, GRAD_MONTH,   // 毕业时间
  WORK_AUTH, NEED_SPONSORSHIP,        // 工作授权
  EEO_*, SALARY, GOV_ID,              // 敏感字段
  UNKNOWN                             // 未识别
}
```

#### 核心数据模型

| 模型 | 用途 | 关键字段 |
|------|------|----------|
| `AnswerValue` | 用户保存的答案 | type, value, display, aliases, autofillAllowed |
| `FieldContext` | 字段上下文 | element, labelText, attributes, optionsText |
| `CandidateType` | 解析结果 | type, score, reasons |
| `FillResult` | 填充结果 | success, previousValue, newValue |
| `PendingObservation` | 待提交记录 | formId, type, value, status |
| `Observation` | 已提交记录 | timestamp, siteKey, answerId |

#### 插件接口

| 接口 | 用途 |
|------|------|
| `IFieldParser` | 字段解析器（可扩展，支持 LLM） |
| `IFieldFiller` | 字段填充器 |
| `IValueTransformer` | 值转换器 |

---

### 2. Scanner (`src/scanner/index.ts`)

**职责**：扫描 DOM，提取所有可填充字段的上下文信息。

**核心函数**：

```typescript
function scanFields(root: HTMLElement | Document): FieldContext[]
```

**功能**：
- 遍历所有 `<input>`, `<select>`, `<textarea>` 元素
- 提取标签文本（label, aria-label, placeholder）
- 提取所在区域标题（heading, fieldset legend）
- 检测控件类型（text, select, radio, checkbox, combobox）
- 支持 Open Shadow DOM
- 支持同域 iframe

**依赖**：无

**被依赖**：Content Script, Recorder

---

### 3. Parser (`src/parser/index.ts`)

**职责**：基于可扩展框架识别字段语义类型。

**核心函数**：

```typescript
function parseField(context: FieldContext): Promise<CandidateType[]>
function registerParser(parser: IFieldParser): void
function getParsers(): IFieldParser[]
```

**内置解析器（按优先级）**：

| 解析器 | 优先级 | 识别依据 |
|--------|--------|----------|
| `AutocompleteParser` | 100 | HTML autocomplete 属性 |
| `TypeAttributeParser` | 90 | input type (email/tel/date) |
| `NameIdParser` | 80 | name/id 属性关键字 |
| `LabelParser` | 70 | label 文本关键字 |
| `LLMParser` | 50 | LLM 语义识别（占位） |

**扩展方式**：实现 `IFieldParser` 接口，调用 `registerParser()` 注册

**依赖**：Types

**被依赖**：Content Script

---

### 4. Classifier (`src/classifier/index.ts`)

**职责**：旧版字段分类器（正在迁移到 Parser）。

**核心函数**：

```typescript
function classify(context: FieldContext): CandidateType[]
```

**说明**：提供向后兼容，内部逻辑与 Parser 中的 NameIdParser + LabelParser 类似。

---

### 5. Transformer (`src/transformer/index.ts`)

**职责**：在填充前转换值格式，适配不同表单的输入要求。

**核心函数**：

```typescript
function transformValue(
  sourceValue: string, 
  sourceType: Taxonomy, 
  targetContext: FieldContext
): string

function registerTransformer(transformer: IValueTransformer): void
```

**内置转换器**：

| 转换器 | 转换能力 |
|--------|----------|
| `NameTransformer` | Full Name ↔ First + Last（支持中英文） |
| `DateTransformer` | ISO ↔ US ↔ Year/Month 分离 ↔ 月份名称 |
| `PhoneTransformer` | E.164 ↔ 本地格式 ↔ 分离国家码 |
| `BooleanTransformer` | Yes/No ↔ Checkbox ↔ 下拉选项 |
| `DegreeTransformer` | 学历别名匹配（Bachelor's ↔ BS ↔ 本科） |

**依赖**：Types

**被依赖**：Content Script

---

### 6. Executor (`src/executor/index.ts`)

**职责**：执行实际的表单填充操作，兼容各种输入控件。

**核心函数**：

```typescript
function fillField(context: FieldContext, value: string): Promise<FillResult>
function fillText(element: HTMLInputElement, value: string): Promise<FillResult>
function fillSelect(element: HTMLSelectElement, value: string): Promise<FillResult>
function fillRadio(element: HTMLInputElement, value: string): Promise<FillResult>
function fillCheckbox(element: HTMLInputElement, value: string): Promise<FillResult>
function fillCombobox(element: HTMLInputElement, value: string): Promise<FillResult>

function createFillSnapshot(element: HTMLElement): FillSnapshot
function restoreSnapshot(element: HTMLElement, snapshot: FillSnapshot): void
```

**关键特性**：
- 使用原生 setter + 事件触发，兼容 React/Vue 受控组件
- 批量执行时 yield 主线程，避免阻塞 UI
- 支持填充撤销（快照/恢复）

**依赖**：Types

**被依赖**：Content Script

---

### 7. Recorder (`src/recorder/index.ts`)

**职责**：监听用户输入，记录为 PendingObservation。

**核心类**：

```typescript
class Recorder {
  start(): void      // 开始监听
  stop(): void       // 停止监听
  onObservation(callback): void  // 注册回调
}
```

**两阶段保存**：
1. **阶段一**：blur/change 时记录到内存（PendingObservation）
2. **阶段二**：表单提交时持久化到存储（Observation）

**依赖**：Scanner, Classifier, Storage

**被依赖**：Content Script

---

### 8. Storage (`src/storage/index.ts`)

**职责**：封装 Chrome Storage API，管理数据持久化。

**核心类**：

```typescript
class AnswerStorage {
  save(answer: AnswerValue): Promise<void>
  getByType(type: Taxonomy): Promise<AnswerValue[]>
  findByValue(type: Taxonomy, value: string): Promise<AnswerValue | null>
  delete(id: string): Promise<void>
}

class ObservationStorage {
  save(observation: Observation): Promise<void>
  getRecent(limit: number): Promise<Observation[]>
}

class SiteSettingsStorage {
  get(siteKey: string): Promise<SiteSettings | null>
  getOrCreate(siteKey: string): Promise<SiteSettings>
  update(siteKey: string, updates: Partial<SiteSettings>): Promise<void>
}
```

**依赖**：Types, Chrome Storage API

**被依赖**：Content Script, Recorder

---

### 9. Content Script (`src/content/index.ts`)

**职责**：主入口，协调各模块完成填充/记录流程。

**核心类**：

```typescript
class AutoFiller {
  initialize(): Promise<void>
  fill(): Promise<FillResult[]>       // 一键填充
  undo(): Promise<void>               // 撤销
  undoField(element: HTMLElement): Promise<void>
  getSuggestions(field: FieldContext): Promise<AnswerValue[]>
  enableRecording(): Promise<void>
  disableRecording(): Promise<void>
}
```

**关键常量**：

```typescript
const CONFIDENCE_THRESHOLD = 0.75    // 自动填充阈值
const USER_ACTIVITY_TIMEOUT = 800    // 用户活动检测窗口 (ms)
```

**依赖**：所有其他模块

---

### 10. Background (`src/background/index.ts`)

**职责**：Service Worker，处理扩展级别的事件和消息。

**功能**：
- 监听扩展安装/更新事件
- 消息路由（Content Script ↔ Popup/Side Panel）
- 管理站点设置

---

## 测试架构

### 单元测试

| 测试文件 | 测试数 | 覆盖模块 |
|----------|--------|----------|
| `scanner.test.ts` | 21 | DOM 扫描、Shadow DOM、iframe |
| `classifier.test.ts` | 31 | 字段分类规则 |
| `executor.test.ts` | 25 | 各类控件填充 |
| `recorder.test.ts` | 14 | 用户输入监听 |
| `storage.test.ts` | 14 | 存储层 CRUD |
| `parser.test.ts` | 29 | 解析框架 |
| `transformer.test.ts` | 30 | 值转换器 |

**运行测试**：

```bash
npm test              # 运行所有测试
npm test -- --watch   # 监视模式
npm run test:ui       # 可视化测试 UI
```

### 测试工具

- **Vitest**：快速的 Vite 原生测试框架
- **happy-dom**：轻量 DOM 模拟
- **Playwright**：E2E 测试（待完善）

---

## Demo 页面

| 文件 | 用途 |
|------|------|
| `interactive-demo.html` | **主测试页面**：完整功能演示 |
| `plugin-ui-prototype.html` | 浮动控件 UI 原型 |
| `single.html` | 单页表单测试 |
| `wizard.html` | 多步向导测试 |
| `messy.html` | 复杂布局测试 |
| `conditional.html` | 条件字段测试 |

---

## 构建与部署

### 开发

```bash
npm run dev           # 启动开发服务器
```

### 构建

```bash
npm run build         # 构建扩展
```

输出到 `dist/` 目录，可在 Chrome 中加载为未打包扩展。

### 发布检查清单

- [ ] 所有测试通过：`npm test`
- [ ] TypeScript 编译无错误：`npx tsc --noEmit`
- [ ] 构建成功：`npm run build`
- [ ] 在真实网站测试（Greenhouse, Lever, Workday）

---

## 扩展点

### 添加新语义标签

1. 在 `Taxonomy` 枚举添加
2. 在 Parser 添加识别规则
3. 如需值转换，添加 Transformer

详见：[解析框架文档](./parser-framework.md)

### 接入 LLM

1. 实现 `IFieldParser` 接口
2. 调用 `registerParser()` 注册
3. 配置 API 密钥

详见：[解析框架文档 - LLM 章节](./parser-framework.md#如何接入-llm)

### 支持新的表单控件

1. 在 `WidgetSignature.kind` 添加类型
2. 在 Executor 添加对应的 fill 函数
3. 在 Scanner 添加检测逻辑

---

## 设计原则

1. **保守填充**：置信度 < 0.75 不自动填，只给建议
2. **隐私优先**：敏感字段默认不自动填
3. **不打扰用户**：不滚动、不抢焦点、用户活动时跳过
4. **可撤销**：所有填充都可一键撤销
5. **可扩展**：插件式架构，支持自定义规则和 LLM
