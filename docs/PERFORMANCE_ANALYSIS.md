# Onefillr 性能分析报告

## 1. Token 消耗分析

### 1.1 批量分类 Prompt (LLMParser)

**典型 Prompt 结构:**

```
System: "You are a form field classifier. Respond only with valid JSON."
                                                            ~50 tokens

Taxonomy List (37 types):                                  ~400 tokens
- FULL_NAME: Full name
- FIRST_NAME: First name only
- EMAIL: Email address
...

Page Context (optional):                                   ~50-100 tokens
- Title: Apply for Software Engineer
- URL Path: /apply/123
- Keywords: apply, job, career

Form State (optional, up to 10 fields):                    ~100-200 tokens
- "Full Name" → FULL_NAME
- "Email" → EMAIL

Few-shot Examples (optional, up to 5):                     ~50-100 tokens
- Label "Full Name" → FULL_NAME (0.95)

Fields to classify (per field, ~80 tokens):                ~80 × N tokens
[Field 0]
Element: <input>
Type: text
Name: full_name
Label: Full Name
Placeholder: Enter your name
Ancestor text: [label@depth1] Full Name*...

Response format instructions:                              ~100 tokens
```

**Token 估算表:**

| 字段数量 | Input Tokens | Output Tokens | 总计 | 成本 (GPT-4o-mini) |
|---------|--------------|---------------|------|-------------------|
| 5 字段  | ~1,000       | ~100          | 1,100 | $0.00017 |
| 10 字段 | ~1,500       | ~200          | 1,700 | $0.00026 |
| 20 字段 | ~2,500       | ~400          | 2,900 | $0.00044 |
| 30 字段 | ~3,500       | ~600          | 4,100 | $0.00062 |

**批处理设置:**
- 当前 `BATCH_SIZE = 15`
- 每批最多处理 15 个字段

### 1.2 知识库标准化 (KnowledgeNormalizer)

| 操作类型 | Input Tokens | Output Tokens | 成本 |
|---------|--------------|---------------|------|
| 学历标准化 | ~200 | ~80 | $0.00004 |
| 专业标准化 | ~180 | ~60 | $0.00004 |
| 技能标准化 | ~200 | ~100 | $0.00005 |
| 技能批量 (10个) | ~400 | ~300 | $0.00011 |
| 地址标准化 | ~220 | ~100 | $0.00005 |
| 公司名标准化 | ~180 | ~50 | $0.00004 |

### 1.3 添加按钮决策 (LLMService)

| 操作 | Input Tokens | Output Tokens | 成本 |
|-----|--------------|---------------|------|
| shouldAddMoreEntries | ~400 | ~60 | $0.00007 |

---

## 2. 响应时间分析

### 2.1 模型输出速度

| 模型 | 输出速度 (tokens/s) | 典型响应时间 |
|-----|-------------------|-------------|
| GPT-4o-mini | ~100 | 1-2s |
| GPT-4o | ~80 | 1.5-3s |
| Claude 3 Haiku | ~150 | 0.5-1.5s |
| Claude 3.5 Sonnet | ~100 | 1-2s |
| DeepSeek-chat | ~120 | 0.8-1.5s |
| Qwen-plus | ~90 | 1-2s |
| GLM-4-flash | ~100 | 1-1.5s |

### 2.2 典型填充流程时间分解

**无 LLM 模式 (纯规则):**
```
扫描字段:        50-100ms
规则解析:        10-30ms
知识库查询:      20-50ms
值转换:          5-10ms
执行填充:        100-300ms
─────────────────────────────
总计:            ~200-500ms ✅ 非常快
```

**启用 LLM 模式:**
```
扫描字段:        50-100ms
LLM 分类请求:    800-2000ms ⚠️ 主要瓶颈
知识库标准化:    300-800ms (如果触发)
知识库查询:      20-50ms
值转换:          5-10ms
执行填充:        100-300ms
─────────────────────────────
总计:            ~1.5-3.5s
```

---

## 3. 优化建议

### 3.1 已实施的优化

✅ **批量处理**: 15 字段一批，减少 API 调用次数
✅ **结果缓存**: 5 分钟缓存，相同字段不重复请求
✅ **PII 过滤**: 不发送用户实际数据
✅ **JSON 修复**: 容错 LLM 返回的格式问题

### 3.2 可进一步优化

#### A. 优先级策略 (推荐实施)
```typescript
// 先用规则解析，只有未匹配的字段才用 LLM
const ruleResults = await parseWithRules(fields)
const unmatched = fields.filter((_, i) =>
  ruleResults[i].type === 'UNKNOWN' || ruleResults[i].score < 0.7
)
if (unmatched.length > 0) {
  await parseWithLLM(unmatched) // 只处理规则无法识别的
}
```
**预期提升**: 减少 60-80% LLM 调用

#### B. 流式响应 (部分模型支持)
```typescript
// 边生成边解析，更早开始填充
const stream = await callLLMStream(prompt)
for await (const chunk of stream) {
  const partial = tryParsePartialJSON(chunk)
  if (partial.complete) fillField(partial.result)
}
```
**预期提升**: 减少感知延迟 30-50%

#### C. 预测性预加载
```typescript
// 页面加载时就开始分析，不等用户点击
window.addEventListener('load', async () => {
  const fields = scanFields()
  await preAnalyzeFields(fields) // 后台执行
})
```
**预期提升**: 用户体验感觉"即时"

#### D. 更快的模型选择
| 场景 | 推荐模型 | 原因 |
|-----|---------|------|
| 速度优先 | Claude 3 Haiku | 最快，~0.5-1s |
| 成本优先 | DeepSeek-chat | 便宜 90%+ |
| 平衡选择 | GPT-4o-mini | 速度/质量平衡 |

#### E. 减少 Prompt 大小
```typescript
// 当前: 完整 taxonomy 列表 (~400 tokens)
// 优化: 只传入相关类型 (~100 tokens)
const relevantTypes = inferRelevantTypes(pageContext)
// e.g., 教育表单只需: SCHOOL, DEGREE, MAJOR, GRAD_DATE...
```
**预期提升**: 减少 30% token 消耗

---

## 4. 成本估算

### 4.1 单次求职申请填充成本

| 场景 | 字段数 | LLM 调用 | 成本 |
|-----|-------|---------|------|
| 简单表单 | 10 | 1 次分类 | ~$0.0003 |
| 标准表单 | 25 | 2 次分类 + 1 次标准化 | ~$0.001 |
| 复杂表单 | 50 | 4 次分类 + 2 次标准化 | ~$0.002 |

### 4.2 月度成本估算 (基于使用频率)

| 用户类型 | 申请/月 | 月成本 |
|---------|--------|-------|
| 轻度用户 | 20 | ~$0.02 |
| 中度用户 | 50 | ~$0.05 |
| 重度用户 | 200 | ~$0.20 |

**结论**: 即使重度使用，月成本也低于 $1

---

## 5. 建议优先级

| 优先级 | 优化项 | 预期效果 | 实施难度 |
|-------|-------|---------|---------|
| P0 | 规则优先策略 | 减少 60-80% LLM 调用 | 低 |
| P1 | 预测性预加载 | 感知延迟接近 0 | 中 |
| P1 | 更快模型选择 | 响应时间减半 | 低 |
| P2 | 流式响应 | 减少感知延迟 30% | 中 |
| P2 | Prompt 精简 | 减少 30% token | 低 |
| P3 | 边缘缓存 | 跨会话复用 | 高 |
