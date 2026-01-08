# 日期转换问题分析与解决方案

## 问题描述

当用户存储的毕业日期是 `2024-05-15` 格式时，无法自动转换为 `<select>` 下拉框中的月份选项（如 "May"）。

## 根本原因

### 1. 月份检测逻辑缺陷

在 `src/transformer/index.ts` 的 `DateTransformer.detectTargetFormat()` 方法中：

```typescript
if (context.widgetSignature.kind === 'select') {
  const options = context.optionsText.join(' ').toLowerCase()
  if (MONTH_NAMES.some(m => options.includes(m.toLowerCase()))) {
    return 'month-name'
  }
}
```

**问题**：`MONTH_NAMES` 只包含完整月份名 `['January', 'February', ...]`

如果 `<select>` 的选项是缩写形式：
```html
<option value="1">Jan</option>
<option value="5">May</option>
```

那么 `"jan feb mar apr may..."` 中不包含 `"january"`，检测失败。

### 2. 缺少月份缩写映射

代码中定义了 `MONTH_SHORT` 但从未使用：
```typescript
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']  // 未使用！
```

### 3. Select 值匹配问题

即使检测到了 `month-name` 格式，`formatDate()` 返回的是完整月份名如 `"May"`。

但如果 select option 的 value 是数字：
```html
<option value="5">May</option>
```

填充时按 value 匹配会失败，因为 `"May" !== "5"`。

## 转换流程图

```
存储值: "2024-05-15"
        ↓
    parseDate()
        ↓
  { year: 2024, month: 5, day: 15 }
        ↓
  detectTargetFormat()
        ↓
  检查 select options:
  - options = "jan feb mar apr may..."
  - MONTH_NAMES.some(m => options.includes(m)) → FALSE ❌
  - 回退到默认 'iso' 格式
        ↓
  formatDate('iso')
        ↓
  输出: "2024-05-15" (未转换！)
```

## 解决方案

### 方案 1：增强 detectTargetFormat() - 支持缩写

修改 `src/transformer/index.ts`：

```typescript
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_PATTERNS = [...MONTH_NAMES, ...MONTH_SHORT]

// 在 detectTargetFormat() 中修改：
if (context.widgetSignature.kind === 'select') {
  const options = context.optionsText.join(' ').toLowerCase()
  
  // 检测完整月份名或缩写
  if (MONTH_PATTERNS.some(m => options.includes(m.toLowerCase()))) {
    return 'month-name'
  }
  
  // 检测数字月份 (1-12)
  if (context.optionsText.some(opt => /^(0?[1-9]|1[0-2])$/.test(opt))) {
    return 'month-number'
  }
  
  if (/^\d{4}$/.test(context.optionsText[0] || '')) {
    return 'year-only'
  }
}
```

### 方案 2：增强 formatDate() - 智能匹配 option

```typescript
private formatDate(date: DateParts, format: string, context?: FieldContext): string {
  const { year, month } = date
  const m = month || 1
  
  if (format === 'month-name' && context?.widgetSignature.kind === 'select') {
    // 尝试匹配 select 中的实际 option
    const options = context.optionsText
    
    // 尝试完整月份名
    const fullName = MONTH_NAMES[m - 1]
    if (options.some(opt => opt.toLowerCase() === fullName.toLowerCase())) {
      return fullName
    }
    
    // 尝试缩写
    const shortName = MONTH_SHORT[m - 1]
    if (options.some(opt => opt.toLowerCase() === shortName.toLowerCase())) {
      return shortName
    }
    
    // 尝试数字
    if (options.includes(String(m)) || options.includes(String(m).padStart(2, '0'))) {
      return String(m)
    }
  }
  
  // 默认返回完整月份名
  return MONTH_NAMES[m - 1] || String(m)
}
```

### 方案 3：在 Executor 中增强 Select 匹配

修改 `src/executor/index.ts` 的 `fillSelect()` 函数：

```typescript
export async function fillSelect(element: HTMLSelectElement, value: string): Promise<FillResult> {
  const normalizedValue = value.toLowerCase().trim()
  
  // 月份特殊处理
  const monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase() === normalizedValue)
  if (monthIndex !== -1) {
    const monthVariants = [
      MONTH_NAMES[monthIndex],           // January
      MONTH_SHORT[monthIndex],           // Jan
      String(monthIndex + 1),            // 1
      String(monthIndex + 1).padStart(2, '0')  // 01
    ]
    
    for (const variant of monthVariants) {
      for (const option of element.options) {
        if (option.value === variant || option.text.toLowerCase() === variant.toLowerCase()) {
          element.value = option.value
          return { success: true, ... }
        }
      }
    }
  }
  
  // 原有匹配逻辑...
}
```

## 手动添加规则步骤

### 步骤 1：修改 transformer/index.ts

```typescript
// 第5行，启用 MONTH_SHORT
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 第134行，修改检测逻辑
if (context.widgetSignature.kind === 'select') {
  const options = context.optionsText.join(' ').toLowerCase()
  const allMonthPatterns = [...MONTH_NAMES, ...MONTH_SHORT]
  if (allMonthPatterns.some(m => options.includes(m.toLowerCase()))) {
    return 'month-name'
  }
  // ...
}

// 第166行，修改格式化逻辑以匹配 select options
case 'month-name':
  // 如果有 context，尝试智能匹配
  if (context?.optionsText) {
    const opts = context.optionsText.map(o => o.toLowerCase())
    const fullName = MONTH_NAMES[m - 1]
    const shortName = MONTH_SHORT[m - 1]
    
    if (opts.includes(fullName.toLowerCase())) return fullName
    if (opts.includes(shortName.toLowerCase())) return shortName
    if (opts.includes(String(m))) return String(m)
  }
  return MONTH_NAMES[m - 1] || String(m)
```

### 步骤 2：更新 transform() 方法签名

```typescript
transform(sourceValue: string, targetContext: FieldContext): string {
  const parsed = this.parseDate(sourceValue)
  if (!parsed) return sourceValue

  const targetFormat = this.detectTargetFormat(targetContext)
  return this.formatDate(parsed, targetFormat, targetContext)  // 传入 context
}
```

### 步骤 3：添加测试用例

在 `tests/unit/transformer.test.ts` 中添加：

```typescript
describe('DateTransformer - month select', () => {
  it('should transform ISO date to full month name in select', () => {
    const context = createMockFieldContext({
      widgetSignature: { kind: 'select', ... },
      optionsText: ['January', 'February', 'March', 'April', 'May', ...]
    })
    expect(transformValue('2024-05-15', Taxonomy.GRAD_DATE, context)).toBe('May')
  })

  it('should transform ISO date to short month name in select', () => {
    const context = createMockFieldContext({
      widgetSignature: { kind: 'select', ... },
      optionsText: ['Jan', 'Feb', 'Mar', 'Apr', 'May', ...]
    })
    expect(transformValue('2024-05-15', Taxonomy.GRAD_DATE, context)).toBe('May')
  })

  it('should transform ISO date to month number in select', () => {
    const context = createMockFieldContext({
      widgetSignature: { kind: 'select', ... },
      optionsText: ['1', '2', '3', '4', '5', ...]
    })
    expect(transformValue('2024-05-15', Taxonomy.GRAD_DATE, context)).toBe('5')
  })
})
```

## 完整修复代码

见 PR: [链接] 或直接运行：

```bash
# 应用修复
git apply docs/patches/fix-month-transform.patch
npm test
```

## 相关文件

| 文件 | 修改内容 |
|------|----------|
| `src/transformer/index.ts` | 增强月份检测和格式化 |
| `src/executor/index.ts` | 增强 select 匹配 |
| `tests/unit/transformer.test.ts` | 添加测试用例 |
