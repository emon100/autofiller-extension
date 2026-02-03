# AutoFiller 浏览器插件商业化计划

> 文档生成时间: 2025-01
> 状态: 规划中

## 概述

本计划为AutoFiller Chrome扩展（求职表单自动填充工具）制定完整的商业化方案，覆盖官网设计、收费模式、公司注册和推广策略。

---

## 一、官网及新手引导设计

### 1.1 官网架构

```
autofiller.io/
├── /                   # 首页 Landing Page
├── /pricing            # 定价页面
├── /docs               # 文档中心
├── /login              # 登录
├── /dashboard          # 用户控制面板
│   ├── /profile        # 个人资料
│   ├── /usage          # 用量统计
│   └── /billing        # 账单管理
└── /blog               # SEO内容
```

### 1.2 技术栈

| 组件 | 选择 | 理由 |
|------|------|------|
| 框架 | Next.js 14 (App Router) | SSR/SSG，SEO友好，Vercel免费部署 |
| UI | Tailwind + shadcn/ui | 与插件技术栈一致 |
| 动画 | Framer Motion | 专业落地页动效 |
| 后端 | Supabase | Auth + DB + Storage 一体化，免费层充足 |
| 设计 | Pencil MCP | AI辅助前端设计 |

### 1.3 首页设计要点

**Hero区域（首屏）**：
- 标题：「填写一次，自动填充所有求职表单」
- 副标题：「让AI学习你的简历，2秒完成申请」
- 单一CTA：「立即安装 Chrome 扩展 - 免费」
- 社会证明：用户数量/公司Logo
- 内嵌产品演示视频（Remotion制作）

**功能展示区**：
- 三步流程动画：上传简历 → 手动填写一次 → 一键填充所有
- 支持网站Logo展示（Greenhouse, Lever, Workday等）

### 1.4 新手引导流程

**Step 1: 安装后欢迎**
```
选择求职目标: [ ] 英国 [ ] 美国 [ ] 欧洲 [ ] 国内
```

**Step 2: 导入资料**
```
[ ] 上传简历 (PDF/Word)
[ ] 从LinkedIn导入
[ ] 稍后手动填写
```

**Step 3: 首次填充引导**
- 高亮Fill按钮 → 展示Badge含义 → 演示两阶段保存

### 1.5 OAuth登录方案

| 提供商 | 优先级 | 目标用户 |
|--------|--------|----------|
| Google | P0 | 国际用户 |
| LinkedIn | P0 | 求职者核心场景 |
| 微信 | P1 | 国内用户 |
| Apple | P2 | iOS用户 |

**技术实现**：Supabase Auth（Google/LinkedIn/Apple内置）+ 微信自建OAuth

---

## 二、演示视频（Remotion制作）

### 2.1 视频规格
- 时长：30秒（快节奏功能展示）
- 分辨率：1920x1080 (16:9)
- 帧率：60fps
- 风格：录屏风格 + 动态高亮，无旁白

### 2.2 快速功能演示脚本

**纯画面展示，配字幕说明能做什么：**

| 时间 | 画面 | 字幕 |
|------|------|------|
| 0-3秒 | Logo动画入场 | "AutoFiller" |
| 3-8秒 | 上传简历PDF → AI解析动画 → 字段卡片弹出 | "上传简历 → AI自动提取信息" |
| 8-15秒 | 打开Greenhouse申请表 → 点击Fill按钮 → 打字机效果填充全部字段 | "一键填充所有表单字段" |
| 15-20秒 | Badge状态展示（绿色✓已填充）→ Undo按钮演示 | "支持撤销 · 随时修改" |
| 20-25秒 | 切换到Lever网站 → 同样一键填充 | "学习一次 · 到处可用" |
| 25-30秒 | Logo + CTA按钮脉冲 | "免费试用 · Chrome Web Store" |

### 2.3 视觉要点
- 鼠标点击时显示圆形涟漪效果
- 填充时字段边框高亮闪烁
- 使用项目真实的Badge样式（绿色#dcfce7）
- 背景音乐：轻快电子乐（无人声）

### 2.4 实现方式
```bash
# 使用Claude Code Remotion Skill
npx create-video@latest autofiller-demo
npx skills add remotion-dev/skills
# 然后用自然语言描述场景让AI生成
```

---

## 三、收费模式设计

### 3.1 定价模式：使用量计费

**核心计费单位**：
| 操作 | 消耗Credits | 说明 |
|------|------------|------|
| 表单填充 | 1 credit | 每次一键填充消耗1个 |
| 简历解析 | 5 credits | AI解析PDF/Word简历 |
| LLM字段分类 | 0.1 credit | 规则无法识别时调用AI |

**Credits套餐**：
| 套餐 | 价格 | Credits | 单价 | 适合 |
|------|------|---------|------|------|
| **免费试用** | £0 | 20 | - | 新用户体验 |
| **Starter** | £4.99 / ¥39 | 100 | £0.05/次 | 低频求职者 |
| **Pro** | £14.99 / ¥99 | 500 | £0.03/次 | 活跃求职者 |
| **Unlimited月卡** | £9.99/月 / ¥69/月 | 无限 | - | 高频用户 |

### 3.2 成本利润分析

基于 [COST_ANALYSIS.md](./COST_ANALYSIS.md) 的详细成本核算：

```
单次填充成本 (qwen-turbo):
├─ LLM调用: ¥0.0018 (批量10字段)
├─ 30%字段需要LLM: ¥0.0005/次
└─ 填充成本: ≈¥0.001/次

Pro套餐 (¥99 = 500 credits):
├─ LLM成本: 500 × ¥0.001 = ¥0.5
├─ 支付手续费: ¥99 × 5% = ¥4.95
└─ 毛利润: ¥93.55 (94.5%)
```

### 3.3 免费试用策略

**首次安装礼包**：
- 20个免费Credits（约可填充20次表单）
- 有效期：永久（用完即止）
- 目的：让用户完整体验核心价值

### 3.4 国内外双轨支付方案

```
┌─────────────────────────────────────────┐
│         统一订阅管理层 (Supabase)        │
└─────────────────────────────────────────┘
         │                    │
    ┌────┴────┐          ┌────┴────┐
    │ 国际支付  │          │ 国内支付  │
    │ Paddle   │          │ 微信/支付宝│
    │ 或 Stripe│          │          │
    └─────────┘          └─────────┘
```

**Paddle vs Stripe 对比**：

| 维度 | Paddle | Stripe |
|------|--------|--------|
| 角色 | Merchant of Record（代销商） | 支付处理器 |
| 税务合规 | **自动处理全球VAT/GST** | 需自己注册、申报各国税务 |
| 费率 | 5% + $0.50/笔 | 2.9% + $0.30/笔 |
| 退款处理 | Paddle承担 | 你承担 |
| 合同主体 | Paddle是卖方 | 你是卖方 |

**推荐策略**：
- **初创期用Paddle**：省心，不用操心英国VAT、美国各州销售税等
- Paddle的5%费率已包含税务处理成本（否则需要会计费+TaxJar订阅）
- **规模化后（年收入>£50k）再评估**：切Stripe可省费率，但需要会计支持

**国内用户**：微信支付+支付宝（需香港公司或国内代理）

---

## 四、公司注册建议

### 4.1 确定方案：英国Ltd为主

**首发市场：英国**，公司注册路线：

| 阶段 | 时间 | 动作 |
|------|------|------|
| MVP期 | 立即 | 注册英国Ltd（~£50），开Tide银行账户，接入Paddle |
| 增长期 | 6-12月后 | 评估是否注册香港公司进入国内市场 |

### 4.2 英国Ltd vs 香港Ltd

| 维度 | 英国Ltd | 香港Ltd |
|------|---------|---------|
| 设立成本 | ~£50 | ~HK$3000 |
| 年维护 | ~£200 | ~HK$5000 |
| 税率 | 19-25% | 8.25-16.5% |
| 银行开户 | 容易 | 困难 |
| 支付接入 | Stripe/Paddle直接支持 | 需额外申请 |
| 中国市场 | 需代理 | CEPA便利 |

### 4.3 资金回流方案（人在国内）

**Paddle收款流程**：
```
用户付款(GBP/USD/EUR) → Paddle收款 → 扣除5%费用 → 打款到你账户
```

**收款方案对比**：

| 方案 | 流程 | 费用 | 推荐度 |
|------|------|------|--------|
| **Tide + Wise** | Paddle→Tide→Wise换汇→国内银行卡 | ~0.5%汇率费 | ⭐⭐⭐⭐⭐ |
| **Payoneer** | Paddle→Payoneer→国内银行卡 | 1-2% | ⭐⭐⭐ |
| **香港银行** | Paddle→香港账户→汇款国内 | 汇款费 | ⭐⭐⭐ |

**推荐操作步骤**：
1. 注册英国Ltd公司
2. 开Tide数字银行账户（远程开户，不需要去英国）
3. 注册Wise账户，获取英镑收款账户
4. Paddle配置打款到Wise或Tide
5. 需要人民币时，在Wise app换汇转到国内银行卡

### 4.4 支付接入路线

**Phase 1（英国Ltd）**：
- Paddle作为Merchant of Record
- 处理全球VAT/GST
- 支持英镑、美元、欧元

**Phase 2（香港公司后）**：
- 申请微信支付跨境电商资质
- 接入支付宝
- 或使用聚合支付平台（如Ping++）过渡

---

## 五、推广计划

### 5.1 上线前准备（T-4周到T）

| 时间 | 任务 |
|------|------|
| T-4周 | Chrome Web Store开发者账号注册（$5） |
| T-4周 | Product Hunt Ship模式上线（收集早期关注） |
| T-3周 | Landing page上线（含waitlist） |
| T-3周 | Remotion演示视频制作 |
| T-2周 | Beta测试招募（Reddit r/jobsearchhacks, r/cscareerquestions） |
| T-2周 | 准备Product Hunt素材 |
| T-1周 | 收集Beta用户testimonial |

### 5.2 Chrome Web Store优化

```
标题: AutoFiller - AI Job Application Assistant
副标题: Fill job forms in 2 seconds. Learn once, auto-fill everywhere.

截图规范 (1280x800):
1. Hero截图：核心填充动画
2. Side panel界面
3. Before/After对比
4. 支持的网站logos
5. 用户评价
```

### 5.3 Product Hunt发布策略

- 发布日：周二/周三
- 发布时间：太平洋时间00:01（英国早8点）
- 首评论：个人故事 + 技术亮点 + 征求反馈
- 同步推广：Hacker News, Reddit, Twitter/X, LinkedIn

### 5.4 持续增长策略

**每日30分钟营销框架**：
- 周一：内容创作（求职技巧文章）
- 周二：社区互动（Reddit回答问题）
- 周三：用户反馈处理
- 周四：合作拓展（联系求职博主）
- 周五：数据分析

**SEO关键词**：
- "job application autofill"
- "how to fill job forms faster"
- "chrome extension for job search"

---

## 六、实施路线图

| 阶段 | 时间 | 交付物 |
|------|------|--------|
| Phase 1: MVP商业化 | 4周 | 官网Landing Page, Paddle支付, Chrome Store上线 |
| Phase 2: 增强功能 | 4周 | OAuth登录, Dashboard, 用量追踪, 演示视频 |
| Phase 3: 正式Launch | 2周 | Product Hunt发布, 社区推广 |
| Phase 4: 国内市场 | 6周 | 香港公司, 微信支付, 本地化 |

---

## 七、关键文件

实施时需要修改的核心文件：
- `src/storage/index.ts` - 扩展用户认证和订阅存储
- `src/sidepanel/tabs/Settings.tsx` - 添加账户管理、订阅状态
- `src/background/index.ts` - OAuth流程、API通信
- `src/types/index.ts` - 添加User、Subscription、Quota类型

---

## 八、验证方案

1. **官网**：Vercel预览URL测试，移动端响应式检查
2. **支付**：Paddle测试模式验证完整订阅流程
3. **OAuth**：各提供商测试账号验证登录流程
4. **演示视频**：Remotion本地预览 + 导出MP4确认
5. **扩展**：Chrome Web Store私有发布测试

---

## 已确认决策

- **首发市场**：英国优先
- **支付方案**：初创期用Paddle（自动处理税务）
- **收费模式**：使用量计费（Credits套餐）
- **官网开发**：自己开发（Next.js + Pencil MCP辅助设计）
- **演示视频**：30秒快速功能展示，无旁白

---

## 下一步行动

1. 注册英国Ltd公司（~£50）
2. 注册Paddle账户，配置Credits套餐
3. 用Next.js + Pencil搭建官网Landing Page
4. 用Remotion制作30秒演示视频
5. 准备Chrome Web Store上线素材
6. 制定Product Hunt发布计划

---

## 参考资料

- [Chrome Extension Monetization Best Practices](https://www.extensionfast.com/blog/choosing-the-right-payment-model-for-your-chrome-extension)
- [Paddle vs Stripe Comparison](https://whop.com/blog/paddle-vs-stripe/)
- [Product Hunt Launch Strategy](https://www.marketingideas.com/p/how-to-successfully-launch-on-product)
- [UK Company Formation](https://www.opencompanyhongkong.com/company-formation-comparison-hong-kong-vs-uk)
