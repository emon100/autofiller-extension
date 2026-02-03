# Powerleap 设计规范 (Design System)

> 品牌: **Easivolt** | 系统名: **Powerleap**
> 口号: *Ease through smart trading*
> 更新日期: 2026-01-22

---

## 一、设计理念

### 1.1 核心价值观

| 价值 | 描述 |
|------|------|
| **简洁** | 去除冗余，突出核心信息 |
| **专业** | 体现电力交易的专业性与可信度 |
| **高效** | 让用户快速完成任务 |
| **友好** | 亲和力强，降低学习成本 |

### 1.2 设计原则 (基于 [Laws of UX](https://lawsofux.com/))

#### 核心法则

| 法则 | 应用场景 |
|------|---------|
| **Jakob's Law** | 遵循用户熟悉的设计模式，参考主流金融/交易平台布局 |
| **Fitts's Law** | 关键按钮足够大 (min 44px)，常用操作放在易触达位置 |
| **Hick's Law** | 限制选项数量，避免选择过载 (导航项 ≤ 9) |
| **Miller's Law** | 信息分块展示 (7±2 原则)，数据表格分页 |
| **Doherty Threshold** | 页面响应 < 400ms，加载状态及时反馈 |

#### 视觉法则

| 法则 | 应用场景 |
|------|---------|
| **Law of Proximity** | 相关信息靠近放置，卡片内元素紧凑 |
| **Law of Similarity** | 同类元素使用相同样式 (如所有价格用绿/红色) |
| **Law of Common Region** | 使用卡片边框将相关内容分组 |
| **Aesthetic-Usability Effect** | 美观的界面让用户感觉更好用 |
| **Von Restorff Effect** | 重要信息 (如预警、CTA) 使用对比色突出 |

#### 认知法则

| 法则 | 应用场景 |
|------|---------|
| **Peak-End Rule** | 任务完成时给予正向反馈，优化退出体验 |
| **Serial Position Effect** | 重要导航项放在开头和结尾 |
| **Goal-Gradient Effect** | 使用进度条激励用户完成流程 |

---

## 二、配色方案 (亮色主题)

### 2.1 品牌色

Easivolt 品牌以 **蓝色** 为主色，象征：
- 🔵 专业与可信
- 📈 数据驱动
- ✅ 稳定可靠

```
主色调: 天蓝 (Blue)
├── Primary-50:  #eff6ff  (背景/Hover)
├── Primary-100: #dbeafe  (浅色背景)
├── Primary-200: #bfdbfe  (边框/分隔)
├── Primary-300: #93c5fd  (次要元素)
├── Primary-400: #60a5fa  (图标/徽章)
├── Primary-500: #3b82f6  (主按钮)  ← 主色
├── Primary-600: #2563eb  (Hover)
├── Primary-700: #1d4ed8  (Active)
├── Primary-800: #1e40af  (深色文字)
└── Primary-900: #1e3a8a  (最深)
```

### 2.2 语义色

| 用途 | 色值 | 场景 |
|------|------|------|
| **主色/品牌** | `#3b82f6` (Blue-500) | 主按钮、链接、品牌元素 |
| **成功/盈利** | `#22c55e` (Green-500) | 正收益、涨幅、成功提示 |
| **危险/亏损** | `#ef4444` (Red-500) | 负收益、跌幅、错误提示 |
| **警告** | `#f59e0b` (Amber-500) | 预警、注意事项 |
| **信息** | `#8b5cf6` (Purple-500) | 次要信息、实时价格 |
| **中性** | `#64748b` (Slate-500) | 次要文字 |

### 2.3 背景与表面

```css
/* 亮色主题 (与 web/src/index.css 同步) */
--color-background:  #f8fafc;    /* 页面主背景 */
--color-foreground:  #0f172a;    /* 主要文字 */

--color-card:           #ffffff; /* 卡片背景 */
--color-card-foreground: #0f172a;

--color-muted:          #f1f5f9; /* 次级背景 */
--color-muted-foreground: #64748b;

/* 边框 */
--color-border:  #e2e8f0;        /* 默认边框 */
--color-input:   #e2e8f0;        /* 输入框边框 */
--color-ring:    #3b82f6;        /* 聚焦环 */
```

### 2.4 数据可视化色板

```
图表配色 (与 index.css --color-chart-* 同步):
1. --color-chart-1: #3b82f6 - 蓝色 (日前价格)
2. --color-chart-2: #8b5cf6 - 紫色 (实时价格)
3. --color-chart-3: #22c55e - 绿色 (正价差/盈利)
4. --color-chart-4: #f59e0b - 琥珀色 (波动)
5. --color-chart-5: #ef4444 - 红色 (负价差/亏损)

价格专用:
- 日前价格 (DA): #3b82f6 (chart-1 蓝色)
- 实时价格 (RT): #8b5cf6 (chart-2 紫色)
- 价差正值: #22c55e (chart-3 绿色)
- 价差负值: #ef4444 (chart-5 红色)
```

---

## 三、字体排版

### 3.1 字体家族

```css
/* 主字体: Inter (现代无衬线) */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* 数字/代码: JetBrains Mono */
--font-mono: 'JetBrains Mono', 'SF Mono', Monaco, monospace;

/* 中文后备 */
--font-zh: 'PingFang SC', 'Microsoft YaHei', sans-serif;
```

### 3.2 字号系统 (大字号设计)

| 级别 | 字号 | 行高 | 用途 |
|------|------|------|------|
| **Display** | 48px / 3rem | 1.1 | 落地页大标题 |
| **H1** | 36px / 2.25rem | 1.2 | 页面主标题 |
| **H2** | 28px / 1.75rem | 1.3 | 区块标题 |
| **H3** | 22px / 1.375rem | 1.4 | 卡片标题 |
| **H4** | 18px / 1.125rem | 1.4 | 小标题 |
| **Body Large** | 18px / 1.125rem | 1.6 | 重要正文 |
| **Body** | 16px / 1rem | 1.6 | 默认正文 |
| **Body Small** | 14px / 0.875rem | 1.5 | 辅助文字 |
| **Caption** | 12px / 0.75rem | 1.4 | 标签、注释 |

### 3.3 字重

| 字重 | 数值 | 用途 |
|------|------|------|
| Regular | 400 | 正文 |
| Medium | 500 | 标签、按钮 |
| Semibold | 600 | 标题、强调 |
| Bold | 700 | 大标题、数据指标 |

---

## 四、间距系统 (宽松设计)

### 4.1 基础单位

```
基础单位: 4px

间距阶梯:
├── xs:   4px   (0.25rem)
├── sm:   8px   (0.5rem)
├── md:   16px  (1rem)
├── lg:   24px  (1.5rem)   ← 组件内部间距
├── xl:   32px  (2rem)     ← 组件之间间距
├── 2xl:  48px  (3rem)     ← 区块之间间距
├── 3xl:  64px  (4rem)     ← 页面区块
└── 4xl:  96px  (6rem)     ← 落地页大间距
```

### 4.2 组件间距指南

| 场景 | 间距 | 说明 |
|------|------|------|
| **卡片内边距** | 24px (lg) | 宽松呼吸感 |
| **卡片间距** | 24px (lg) | 明确分隔 |
| **表单字段间距** | 24px (lg) | 避免拥挤 |
| **列表项间距** | 16px (md) | 适度紧凑 |
| **段落间距** | 24px (lg) | 阅读舒适 |
| **页面边距** | 32-48px | 根据屏幕宽度 |
| **区块间距** | 48-64px | 明确的视觉分隔 |

### 4.3 响应式间距

```css
/* 移动端 */
@media (max-width: 640px) {
  --page-padding: 16px;
  --card-padding: 16px;
  --section-gap: 32px;
}

/* 平板 */
@media (min-width: 641px) and (max-width: 1024px) {
  --page-padding: 24px;
  --card-padding: 20px;
  --section-gap: 40px;
}

/* 桌面 */
@media (min-width: 1025px) {
  --page-padding: 32px;
  --card-padding: 24px;
  --section-gap: 48px;
}
```

---

## 五、组件规范

### 5.1 按钮

```
尺寸:
├── Small:  h-8  (32px), px-3, text-sm
├── Medium: h-10 (40px), px-4, text-base  ← 默认
├── Large:  h-12 (48px), px-6, text-lg
└── XLarge: h-14 (56px), px-8, text-xl    ← CTA按钮

圆角: 8px (rounded-lg)

变体:
├── Primary:   bg-primary text-primary-foreground
├── Secondary: bg-secondary text-secondary-foreground
├── Outline:   border-2 border-primary text-primary
├── Ghost:     text-primary hover:bg-primary/10
└── Danger:    bg-destructive text-destructive-foreground
```

### 5.2 卡片

```css
.card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-light);
  border-radius: 12px;      /* 圆角增大 */
  padding: 24px;            /* 宽松内边距 */
  box-shadow: 0 1px 3px rgba(0,0,0,0.05),
              0 1px 2px rgba(0,0,0,0.03);
}

.card:hover {
  border-color: var(--border-medium);
  box-shadow: 0 4px 6px rgba(0,0,0,0.05),
              0 2px 4px rgba(0,0,0,0.03);
}

.card-highlighted {
  border-color: var(--primary-200);
  background: linear-gradient(135deg, var(--primary-50), white);
}
```

### 5.3 输入框

```css
.input {
  height: 44px;             /* 触控友好 */
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 16px;          /* 防止iOS缩放 */
  transition: all 0.2s;
}

.input:focus {
  border-color: var(--color-ring);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);  /* primary with opacity */
}
```

### 5.4 统计卡片 (Dashboard)

```css
.stat-card {
  padding: 24px;
  border-radius: 12px;
}

.stat-card .label {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}

.stat-card .value {
  font-size: 32px;          /* 大字号突出数据 */
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.stat-card .change {
  font-size: 14px;
  margin-top: 8px;
}
```

---

## 六、布局系统

### 6.1 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│                    顶部导航栏 (64px)                         │
├─────────┬───────────────────────────────────────────────────┤
│         │                                                   │
│  侧边栏  │              主内容区域                            │
│  (240px) │              padding: 32px                        │
│         │                                                   │
│         │    ┌─────────────────────────────────────┐       │
│  可折叠   │    │            统计卡片区                │       │
│  (64px)  │    │            gap: 24px                │       │
│         │    └─────────────────────────────────────┘       │
│         │                                                   │
│         │    ┌─────────────────────────────────────┐       │
│         │    │            图表区域                  │       │
│         │    │            margin-top: 32px          │       │
│         │    └─────────────────────────────────────┘       │
│         │                                                   │
└─────────┴───────────────────────────────────────────────────┘
```

### 6.2 网格系统

```css
/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 图表网格 */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 32px;
}
```

---

## 七、动效规范

### 7.1 过渡时间

| 类型 | 时长 | 用途 |
|------|------|------|
| 快速 | 100-150ms | 按钮hover、tooltip |
| 标准 | 200-250ms | 下拉菜单、弹窗 |
| 舒适 | 300-400ms | 页面切换、抽屉 |

### 7.2 缓动函数

```css
/* 标准缓动 */
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);

/* 进入 */
--ease-out: cubic-bezier(0, 0, 0.2, 1);

/* 离开 */
--ease-in: cubic-bezier(0.4, 0, 1, 1);

/* 弹性 */
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## 八、图标规范

### 8.1 图标库

推荐使用 **Lucide Icons** (与 shadcn/ui 配套)

```tsx
import { TrendingUp, AlertCircle, Settings } from 'lucide-react'
```

### 8.2 图标尺寸

| 尺寸 | 像素 | 用途 |
|------|------|------|
| xs | 14px | 行内、标签 |
| sm | 16px | 按钮内 |
| md | 20px | 导航项 |
| lg | 24px | 独立图标 |
| xl | 32px | 空状态 |

---

## 九、无障碍设计

### 9.1 对比度

- 正文文字: 至少 4.5:1
- 大标题: 至少 3:1
- 交互元素: 至少 3:1

### 9.2 焦点状态

所有可交互元素必须有清晰的焦点状态：

```css
:focus-visible {
  outline: 2px solid var(--color-ring);  /* #3b82f6 */
  outline-offset: 2px;
}
```

---

## 十、参考资源

- [Laws of UX](https://lawsofux.com/) - UX 设计法则
- [Tailwind CSS](https://tailwindcss.com/) - 样式框架
- [shadcn/ui](https://ui.shadcn.com/) - 组件库
- [Lucide Icons](https://lucide.dev/) - 图标库
- [Inter Font](https://rsms.me/inter/) - 主字体

---

*文档版本: v2.0 | 最后更新: 2026-01-22*
