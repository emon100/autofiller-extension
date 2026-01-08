# 浏览器自动填表器插件（学生求职）PRD + 设计（MVP）

## 0. 一句话目标

用户在任意招聘网站手动填表一次后，插件自动记录"问题语义→答案语义"；之后在任意公司遇到同语义问题（如学校/电话/签证）可在 2–3 秒内自动填充（保守语义：宁可少填不错填），并对低置信度字段在字段旁提供 1–2 个候选答案按钮供用户一键确认，确认后持续学习。

## 1. 核心原则（必须满足）

* 速度：一键填充当前页面表单 2–3 秒完成主要字段；不阻塞用户操作，不抢焦点、不滚动（默认）。
* 信任：任何记录/填充都有可见反馈（日志、toast、字段旁标记）；支持撤销。
* 语义保守：低置信度不自动填；敏感字段默认永不自动填（只能建议）。
* 兼容优先：表单控件兼容尽量广（受控组件、自定义下拉/日期、open shadow、同域 iframe）。
* 增强识别默认开：使用云端/大模型仅做"语义识别/选项理解/同义归并"，不做浏览器 agent 操作；不上传用户答案。

## 2. MVP 范围（必须做 / 不做）

### 必须做

* 站点级开关：对每个站点首次弹"是否开启记录/自动填"（信任优先，可分别开关）。
* 记录（Record）：用户开启记录后，**仅在表单提交时**记录用户的"问题语义+答案语义"。
* 填充（Fill）：用户点击"一键填充"后批量填充；首屏优先；执行可打断。
* 低置信度引导：字段旁显示小标记（badge），提供 1–2 个候选答案按钮（点击即填+学习）。
* 撤销：支持撤销本次自动填充（恢复原值）。
* open shadow + 同域 iframe 扫描/填充。
* 受控组件兼容：React/Vue 受控输入（原生 setter + input/change 事件链）。
* 自定义下拉/日期：支持基于 ARIA role 的 combobox/listbox；支持"点击打开→匹配 option→点击"。
* Saved Answers 界面：侧边栏可查看/编辑已保存的语义答案（学校别名、电话、链接等），可标记敏感项是否允许自动填。
* Chrome 插件

### 暂不做（明确写入）

* 跨域 iframe、验证码、登录态处理。
* closed shadow 默认不支持（可后续白名单 + attachShadow hook）。
* 自动文件上传（仅提示/半自动）。

## 3. 用户流程（关键）

### 3.1 首次进入新站点（信任）

* 插件显示站点卡片：在 jobs.xxx.com 开启：记录[开/关] 自动填[开/关]
* 默认都为关，用户明确开启后生效（可在侧边栏随时改）。

### 3.2 记录学习（两阶段保存，仅提交时持久化）

**重要**：记录采用两阶段模式，避免用户填写中途的临时数据被误存：

* **阶段一：临时跟踪**
  * 用户填写字段并离开（blur/change）：插件在内存中临时记录 PendingObservation
  * 右下角轻提示：检测到：学校（暂存中，提交后保存）
  * 不持久化到存储，不影响后续自动填充

* **阶段二：提交时持久化**
  * 插件 hook 表单的 submit 事件、"下一步/Next"按钮点击
  * 检测提交成功后，将所有 PendingObservation 转为正式 Observation 并持久化
  * 右下角 toast：已保存 8 项答案（可编辑）
  * 敏感字段：toast 变为 检测到敏感问题，已记录但默认不自动填（可在 Saved Answers 调整）

* **提交检测策略**：
  * 优先：监听 form.submit 事件
  * 备选：监听包含"submit/next/continue/下一步/提交"文本的按钮点击
  * 备选：检测页面 URL 变化（表单提交后跳转）
  * 用户可手动点击插件的"Save Now"强制保存当前表单

### 3.3 一键填充（2–3 秒）

* 用户点击 Fill：插件生成 FillPlan 批量执行（不抢焦点、不滚动）。
* 结束 toast：已填充 12 项 | 撤销 | 查看详情

### 3.4 低置信度字段（不自动填，给按钮）

* 字段右侧出现小 badge：建议：学校 [清华大学] [北京大学]
* 用户点击候选按钮：立即填入并记录"该字段→该问题语义"的学习（提高下次置信度）。

## 4. 语义体系（Taxonomy）— MVP 最小集合

* Personal：FULL_NAME, FIRST_NAME, LAST_NAME, EMAIL, PHONE, COUNTRY_CODE, LOCATION/CITY, LINKEDIN, GITHUB, PORTFOLIO
* Education：SCHOOL, DEGREE, MAJOR, GRAD_DATE, GRAD_YEAR, GRAD_MONTH, START_DATE, END_DATE
* Work：WORK_AUTH(是否可工作), NEED_SPONSORSHIP(是否需要签证担保)
* Other：RESUME_TEXT (不自动), SALARY (敏感不自动), EEO (敏感不自动)

敏感默认不自动填：EEO_*, SALARY, GOV_ID, DISABILITY, VETERAN, ETHNICITY, GENDER。

## 5. 数据模型（落库结构，必须实现）

### 5.1 AnswerValue（语义答案）

* id
* type（taxonomy）
* value（规范化：电话E.164/日期ISO/布尔/枚举）
* display（UI展示）
* aliases[]（学校/公司等实体别名）
* sensitivity：normal|sensitive
* autofillAllowed：bool（敏感默认 false）

### 5.2 QuestionKey（跨站点可复用问题签名）

* id
* type（taxonomy）
* phrases[]：从 label/aria/附近文本抽取的规范化 tokens
* sectionHints[]：Education/Personal Info
* choiceSetHash?：选择题选项集合 hash（区分不同 yes/no 题）

### 5.3 Observation（一次记录）

* timestamp
* siteKey（eTLD+1）
* url
* questionKeyId
* answerId
* fieldLocator（可选：用于同站点加速定位，不作为跨站主依据）
* widgetSignature（见下）
* confidence

### 5.4 PendingObservation（临时记录，未提交）

* 与 Observation 相同结构
* formId：所属表单标识
* status：pending | committed | discarded

### 5.5 WidgetSignature（控件能力画像）

* kind：text/select/checkbox/radio/combobox/date/custom
* role/attributes：aria role、autocomplete、type
* interactionPlan：directSet / nativeSetter+events / openDropdown+clickOption / typeToSearch+enter
* optionLocator?：role=option 或列表容器 selector

## 6. 识别与填充算法（MVP 版，工程可做）

### 6.0 可扩展解析框架（Parser Framework）

识别与填充必须设计为可扩展框架，支持多种解析策略，便于后期接入 LLM：

**解析器接口（IFieldParser）**：
```typescript
interface IFieldParser {
  name: string
  priority: number  // 越高越优先
  canParse(context: FieldContext): boolean
  parse(context: FieldContext): Promise<ClassifyResult[]>
}

interface ClassifyResult {
  type: Taxonomy
  score: number  // 0-1
  reasons: string[]
}
```

**内置解析器（按优先级）**：
1. **AutocompleteParser** (priority: 100) - 基于 HTML autocomplete 属性
2. **TypeAttributeParser** (priority: 90) - 基于 input type (email/tel/date)
3. **NameIdParser** (priority: 80) - 基于 name/id 关键字规则
4. **LabelParser** (priority: 70) - 基于 label 文本关键字
5. **LLMParser** (priority: 50) - 云端/LLM 语义识别（异步，可选，后期扩展）

**填充器接口（IFieldFiller）**：
```typescript
interface IFieldFiller {
  name: string
  canFill(context: FieldContext, answer: AnswerValue): boolean
  fill(context: FieldContext, answer: AnswerValue): Promise<FillResult>
}
```

**内置填充器**：
1. **DirectFiller** - 直接设值（text/textarea）
2. **SelectFiller** - 下拉选择匹配
3. **RadioCheckboxFiller** - 单选/多选
4. **ComboboxFiller** - ARIA combobox 交互
5. **SemanticFiller** - 语义转换填充（见下节）

### 6.0.1 语义转换填充（Semantic Value Transformation）

存储的答案需要智能转换以适配不同表单格式：

**日期转换**：
| 存储格式 | 目标格式 | 转换示例 |
|---------|---------|---------|
| ISO 8601 (2024-05-15) | MM/DD/YYYY | 05/15/2024 |
| ISO 8601 | YYYY年M月 | 2024年5月 |
| ISO 8601 | Month YYYY (select) | May 2024 |
| ISO 8601 | 分离的年/月字段 | year: 2024, month: 05 |
| 2024-05 | date picker | 自动选择年月 |

**姓名转换**：
| 存储格式 | 目标字段 | 转换逻辑 |
|---------|---------|---------|
| "John Doe" | Full Name | 直接填写 |
| "John Doe" | First Name | 取第一个词 "John" |
| "John Doe" | Last Name | 取最后一个词 "Doe" |
| "张三" | Full Name | 直接填写 |
| "张三" | First Name (中文) | "三" |
| "张三" | Last Name (中文) | "张" |
| First + Last 分开存储 | Full Name | 拼接 "John Doe" |

**电话转换**：
| 存储格式 | 目标格式 | 转换示例 |
|---------|---------|---------|
| E.164 (+14155551234) | (XXX) XXX-XXXX | (415) 555-1234 |
| E.164 | XXX-XXX-XXXX | 415-555-1234 |
| E.164 | 纯数字 | 4155551234 |
| E.164 | 分离的国家码+号码 | +1 / 4155551234 |
| E.164 | 国际格式 | +1 415 555 1234 |

**布尔/选择转换**：
| 存储值 | 可匹配的选项文本 |
|-------|-----------------|
| true/yes | "Yes", "是", "True", "I agree", "Authorized", "已授权" |
| false/no | "No", "否", "False", "I decline", "Not authorized", "未授权" |
| "Bachelor's" | "Bachelor", "本科", "BS", "BA", "Undergraduate", "学士" |
| "Master's" | "Master", "硕士", "MS", "MA", "Graduate", "研究生" |
| "Ph.D." | "PhD", "Doctorate", "博士", "Doctor" |

**学历转换（文本↔下拉互转）**：
| 存储值 | 文本输入 | 下拉选项匹配 |
|-------|---------|-------------|
| "Master of Science" | 直接填写 | 匹配 "Master's", "MS", "硕士" |
| "Computer Science" | 直接填写 | 匹配 "CS", "计算机科学", "Computing" |

### 6.1 FieldContext 抽取（DOM 扫描）

对每个候选字段提取：

* labelText（label for / aria-label / aria-labelledby / placeholder / nearby text）
* sectionTitle（最近的 heading/fieldset legend）
* attributes：name/id/type/autocomplete/role
* optionsText[]（若为 select/listbox，取前 N 项文本）
* framePath（同域 iframe 支持）
* shadowPath（open shadow 支持）

### 6.2 本地快分类（必须）

规则优先输出 CandidateTypes：

* 强信号：autocomplete, type=email/tel/date, role=combobox, name/id 关键字
* 弱信号：labelText/sectionTitle 关键词（英/中最小词表）

输出：(type, score, reasons[])

### 6.3 云端/LLM 增强识别（默认开，异步）

用途：提高 taxonomy 分类、区分高风险题、理解选项语义、同义归并。

* 上传：仅 labelText/sectionTitle/optionsText/attributes（不含 value，不含用户答案）
* 本地先做 PII 清洗：检测 email/phone/address 模式，命中替换为 [REDACTED]
* 返回 JSON（必须 schema 校验）：
  * type
  * confidence
  * riskTag: normal|sensitive
  * choiceMapping?（把选项映射成布尔/枚举）
  * explanation（短文本，用于 UI 解释）

### 6.4 自动填门控（符合"宁可少填不错填"）

* 若 riskTag==sensitive 或 autofillAllowed==false：不自动填，只给建议按钮
* 若 confidence < T：不自动填，只给 1–2 个候选按钮
* 若 confidence >= T：自动填 阈值建议：T=0.75（可配置）

### 6.5 填充执行（必须不抢电脑）

* 批量 FillPlan，分批执行（每批 5–10 个字段），每批后让出主线程（setTimeout/idle callback）
* 不滚动、不抢焦点；若用户正在输入/最近 800ms 有键鼠活动，对该字段跳过并仅提示建议
* 对 input/textarea：使用原生 setter + dispatch input/change/blur
* checkbox/radio：优先 .click()
* combobox/listbox：click open → match option → click → verify
* 失败只重试一次；再失败进入建议模式

### 6.6 撤销

* 在填充前保存 originalValueSnapshot（value/checked/selectedIndex + 组件可恢复方式）
* "撤销本次填充"时按快照恢复并触发必要事件

## 7. UI 设计（MVP）

### 7.1 字段旁 badge（重点）

* 状态：
  * 已自动填（可点查看来源/撤销单项）
  * 建议填充（显示 1–2 个候选按钮）
  * 敏感建议（灰色，仅建议，点击需要确认）
* 交互：按钮点击立即填 + 记录学习 + badge 变为"已填"
* **悬浮清空**：鼠标悬浮在任意已填字段上时，显示小 × 按钮，点击可清空该字段值并移除 badge

### 7.2 悬浮窗 + Side Panel（主界面）

* Tab1：Saved Answers
  * 列表按 taxonomy 分组
  * 支持编辑/新增别名/标记敏感是否允许自动填
* Tab2：This Site
  * 记录开关、自动填开关、站点数据清除
* Tab3：Activity Log
  * 最近填充了哪些字段、使用了哪个答案、为什么这么判断（explanation）

### 7.3 透明提示

* toast：检测到字段（暂存中）… 已保存 N 项… 已填充… 未自动填：置信度不足，已给出建议按钮

## 8. 权限与安全

* 浏览器权限：storage, activeTab, scripting, tabs, webNavigation, alarms（按实现裁剪）
* 注入策略：默认仅对用户开启的站点运行（站点白名单）
* 存储：本地加密（至少对 AnswerValue 存储加密）；可选云同步（端到端加密，服务器存密文）
* 云端不上传用户答案；仅上传题面与选项，且本地清洗 PII

## 9. 验收标准（可测）

* 测试用例：请自动生成之前要求的表单，并自动完成用户填写+后期自动填写的端到端界面测试。
* 性能：点击 Fill 后 2–3 秒内完成可见字段填充（>=10字段页面）
* 稳定：React 受控输入填写后表单校验能通过（不出现"看起来填了但未生效"）
* 兼容：open shadow + 同域 iframe 表单能识别并填充
* 语义安全：低置信度不自动填；敏感默认不自动填
* 信任：每次记录/填充用户可见；可查看 Activity；可撤销

## 10. 同义表单测试用例（Synonym Form Test Cases）

为验证语义转换能力，需要测试以下场景：

### 10.1 日期格式互转

| 测试场景 | 表单A | 表单B | 预期行为 |
|---------|-------|-------|---------|
| 日期输入↔选择 | `<input type="date">` | `<select>年</select><select>月</select>` | 可互相填充 |
| ISO↔美式格式 | `2024-05-15` | `05/15/2024` | 自动转换格式 |
| 完整日期↔年月 | `2024-05-15` | `May 2024` | 提取年月 |

### 10.2 姓名拆分合并

| 测试场景 | 表单A | 表单B | 预期行为 |
|---------|-------|-------|---------|
| 全名↔姓名分离 | `Full Name: John Doe` | `First: ___ Last: ___` | 自动拆分/合并 |
| 中文姓名 | `姓名: 张三` | `姓: ___ 名: ___` | 正确识别中文姓在前 |
| 混合姓名 | `Name: 张三` | `First Name: ___ Last Name: ___` | 智能判断中英文 |

### 10.3 电话号码格式

| 测试场景 | 表单A | 表单B | 预期行为 |
|---------|-------|-------|---------|
| 完整号码↔分离 | `+14155551234` | `Country: ___ Number: ___` | 分离国家码 |
| 格式化↔纯数字 | `(415) 555-1234` | `4155551234` | 去除/添加格式 |
| 国际↔本地格式 | `+1 415 555 1234` | `415-555-1234` | 智能转换 |

### 10.4 学历/学位转换

| 测试场景 | 表单A | 表单B | 预期行为 |
|---------|-------|-------|---------|
| 文本↔下拉 | `<input>Master's</input>` | `<select>MS/MA/Master's</select>` | 匹配最佳选项 |
| 英文↔中文 | `Bachelor's Degree` | `本科/学士` | 跨语言匹配 |
| 简写↔全称 | `BS` | `Bachelor of Science` | 识别别名 |

### 10.5 是/否问题变体

| 测试场景 | 表单A | 表单B | 预期行为 |
|---------|-------|-------|---------|
| Radio↔Checkbox | `<input type="radio">Yes/No` | `<input type="checkbox">I confirm` | 语义等价填充 |
| 下拉↔单选 | `<select>Yes/No</select>` | `<input type="radio">` | 类型互转 |
| 不同措辞 | `Authorized to work?` | `Do you have work permit?` | 语义相同 |

### 10.6 地址格式

| 测试场景 | 表单A | 表单B | 预期行为 |
|---------|-------|-------|---------|
| 完整地址↔分离 | `Full Address` | `Street/City/State/Zip` | 智能拆分 |
| City↔Location | `City: San Francisco` | `Location: ___` | 识别同义词 |

## 11. 测试数据快速初始化

### 11.1 预设数据集（Test Profiles）

提供多套预设测试数据，方便快速切换：

**Profile 1: 美国求职者（英文）**
```json
{
  "FULL_NAME": "John Michael Doe",
  "FIRST_NAME": "John",
  "LAST_NAME": "Doe",
  "EMAIL": "john.doe@gmail.com",
  "PHONE": "+14155551234",
  "CITY": "San Francisco",
  "LINKEDIN": "https://linkedin.com/in/johndoe",
  "GITHUB": "https://github.com/johndoe",
  "SCHOOL": "Stanford University",
  "DEGREE": "Master of Science",
  "MAJOR": "Computer Science",
  "GRAD_DATE": "2024-05-15",
  "WORK_AUTH": "yes",
  "NEED_SPONSORSHIP": "no"
}
```

**Profile 2: 中国求职者（中文）**
```json
{
  "FULL_NAME": "张三",
  "FIRST_NAME": "三",
  "LAST_NAME": "张",
  "EMAIL": "zhangsan@qq.com",
  "PHONE": "+8613812345678",
  "CITY": "北京",
  "LINKEDIN": "https://linkedin.com/in/zhangsan",
  "SCHOOL": "清华大学",
  "DEGREE": "硕士",
  "MAJOR": "计算机科学与技术",
  "GRAD_DATE": "2024-06-30",
  "WORK_AUTH": "yes",
  "NEED_SPONSORSHIP": "yes"
}
```

**Profile 3: 国际学生**
```json
{
  "FULL_NAME": "Amit Patel",
  "EMAIL": "amit.patel@university.edu",
  "PHONE": "+919876543210",
  "SCHOOL": "IIT Delhi",
  "DEGREE": "Bachelor of Technology",
  "MAJOR": "Electrical Engineering",
  "WORK_AUTH": "no",
  "NEED_SPONSORSHIP": "yes"
}
```

### 11.2 Demo 页面快速初始化功能

* **Load Profile** 下拉菜单：一键加载预设数据集
* **Reset to Default** 按钮：恢复默认测试数据
* **Import JSON** 按钮：导入自定义 JSON 数据
* **Export Current** 按钮：导出当前已保存的答案
* **Clear All** 按钮：清空所有保存的数据

### 11.3 快捷键支持

* `Ctrl/Cmd + 1/2/3`：快速切换预设 Profile
* `Ctrl/Cmd + Shift + R`：重置为默认数据
* `Ctrl/Cmd + Shift + C`：清空所有数据

---

# 给 AI 开发工具的实现提示（任务拆解建议）

让 Claude/AI 按以下顺序实现：

1. 扩展骨架（Manifest V3）+ side panel + storage
2. DOM 扫描与 FieldContext 抽取（含 open shadow、iframe）
3. **可扩展解析框架** + 本地规则分类（CandidateTypes）
4. **语义转换填充器** + Fill 执行器（setter+events）
5. **两阶段 Record 模式**：PendingObservation + 提交检测 + Saved Answers UI
6. Badge UI 注入 + 候选按钮交互 + **悬浮清空按钮** + 学习闭环
7. 撤销机制 + Activity Log
8. **同义表单测试页面** + **快速数据初始化**
9. LLM 增强：PII 清洗 → 请求 → JSON schema 校验 → 缓存 → 置信度门控
10. combobox/listbox 适配器库（ARIA 优先）

---

# UI/原型与实现工具建议（AI 辅助）

* 原型：Figma + FigJam（让 AI 生成组件结构与文案），或用 tldraw 快速画流程
* 代码 UI：React + Tailwind + shadcn/ui（适合 side panel/popup 快速出高质感界面）
* 图标：lucide-react
* 让 AI 生成 UI：把"Side Panel 三个 Tab + Badge 样式 + Toast 文案"直接作为组件需求给它
* 若要自动产出设计稿：可用"Figma 插件类生成器"或让 AI 输出 Tailwind 的布局与色板（深浅色）
