# AutoFiller 上线待办事项清单

## 本地开发环境启动

```bash
# 1. 启动官网 (http://localhost:3000)
cd website && npm run dev

# 2. 构建并加载扩展到Chrome
npm run build
# Chrome -> 扩展程序 -> 开发者模式 -> 加载已解压的扩展程序 -> 选择 dist 目录
```

---

## 待办事项

### 阶段一：Supabase后端配置

- [ ] **1.1 创建Supabase项目**
  - 访问 https://supabase.com/dashboard
  - 创建新项目，选择区域（推荐：新加坡或美西）
  - 等待项目初始化完成

- [ ] **1.2 运行数据库迁移**
  - 打开 Supabase Dashboard -> SQL Editor
  - 复制 `supabase/migrations/001_initial.sql` 内容
  - 运行SQL创建表和函数

- [ ] **1.3 配置OAuth提供商**
  - Dashboard -> Authentication -> Providers
  - 启用 Google OAuth:
    - 创建 Google Cloud Console 项目
    - 配置 OAuth 同意屏幕
    - 创建 OAuth 2.0 客户端 ID
    - 复制 Client ID 和 Secret 到 Supabase
  - 启用 LinkedIn OIDC (可选):
    - 创建 LinkedIn Developer 应用
    - 配置 OAuth 2.0 设置
    - 复制凭据到 Supabase

- [ ] **1.4 配置重定向URL**
  - Dashboard -> Authentication -> URL Configuration
  - Site URL: `https://autofiller.app` (生产) 或 `http://localhost:3000` (开发)
  - Redirect URLs 添加:
    - `https://autofiller.app/auth/callback`
    - `http://localhost:3000/auth/callback`
    - `chrome-extension://YOUR_EXTENSION_ID/auth/callback`

- [ ] **1.5 获取API密钥**
  - Dashboard -> Settings -> API
  - 复制 `anon` key 和 `service_role` key
  - 更新 `website/.env.local`:
    ```
    NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
    SUPABASE_SERVICE_ROLE_KEY=xxx
    NEXT_PUBLIC_MOCK_MODE=false
    ```

---

### 阶段二：Paddle支付配置

- [ ] **2.1 创建Paddle账户**
  - 访问 https://paddle.com
  - 注册 Seller 账户
  - 完成企业验证（需要几个工作日）

- [ ] **2.2 创建产品**
  - Dashboard -> Catalog -> Products
  - 创建以下产品:
    | 产品名 | 类型 | 价格 | Product ID |
    |--------|------|------|------------|
    | Starter Pack | 一次性 | $9.99 | pri_starter |
    | Pro Pack | 一次性 | $29.99 | pri_pro |
    | Unlimited Monthly | 订阅 | $14.99/月 | pri_unlimited_monthly |
    | Unlimited Yearly | 订阅 | $99.99/年 | pri_unlimited_yearly |

- [ ] **2.3 配置Webhook**
  - Dashboard -> Notifications -> Webhooks
  - 添加 Webhook URL: `https://autofiller.app/api/webhook/paddle`
  - 选择事件:
    - `transaction.completed`
    - `subscription.activated`
    - `subscription.updated`
    - `subscription.canceled`
  - 复制 Webhook Secret

- [ ] **2.4 获取API密钥**
  - Dashboard -> Developer Tools -> Authentication
  - 创建 API Key
  - 复制 Client Token 和 API Key
  - 更新 `website/.env.local`:
    ```
    NEXT_PUBLIC_PADDLE_VENDOR_ID=xxx
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=xxx
    PADDLE_API_KEY=xxx
    PADDLE_WEBHOOK_SECRET=xxx
    ```

---

### 阶段三：域名与部署

- [ ] **3.1 购买域名**
  - 推荐: Cloudflare Registrar 或 Namecheap
  - 建议域名: `autofiller.app` 或 `getautofiller.com`

- [ ] **3.2 部署到Vercel**
  ```bash
  cd website
  vercel deploy --prod
  ```
  - 连接 Git 仓库
  - 配置环境变量（从 .env.local 复制）
  - 配置自定义域名

- [ ] **3.3 配置DNS**
  - 添加 Vercel 提供的 DNS 记录
  - 等待 DNS 生效（通常几分钟到几小时）

- [ ] **3.4 更新URL配置**
  - 更新 Supabase Site URL
  - 更新 Paddle Webhook URL
  - 更新扩展中的 API_BASE_URL

---

### 阶段四：Chrome Web Store 发布

- [ ] **4.1 准备发布资料**
  - 详细描述（中英文）
  - 截图 (1280x800 或 640x400)
  - 宣传图片 (440x280)
  - 图标 (128x128)
  - 隐私政策页面 URL

- [ ] **4.2 创建开发者账户**
  - 访问 https://chrome.google.com/webstore/developer/dashboard
  - 支付 $5 注册费

- [ ] **4.3 提交审核**
  - 打包扩展 (dist 目录)
  - 上传到 Chrome Web Store
  - 填写所有必填信息
  - 提交审核（通常1-3个工作日）

- [ ] **4.4 发布后检查**
  - 验证扩展 ID
  - 更新 Supabase 重定向 URL 中的扩展 ID
  - 测试完整流程

---

### 阶段五：上线后验证

- [ ] **5.1 端到端测试**
  - [ ] 用户注册流程
  - [ ] Google OAuth 登录
  - [ ] Credits 购买流程
  - [ ] 扩展与后端同步
  - [ ] 自动填充功能
  - [ ] 右键菜单功能

- [ ] **5.2 监控设置**
  - 配置 Vercel Analytics
  - 配置错误监控 (Sentry 可选)
  - 设置 Supabase 使用量告警

- [ ] **5.3 文档更新**
  - 更新 README
  - 发布使用指南
  - 准备 FAQ 页面

---

## 快速参考

### 本地开发命令

```bash
# 官网开发服务器
cd website && npm run dev

# 扩展构建
npm run build

# 扩展测试
npm test
```

### 环境变量检查清单

```
website/.env.local:
- NEXT_PUBLIC_SUPABASE_URL ✓
- NEXT_PUBLIC_SUPABASE_ANON_KEY ✓
- SUPABASE_SERVICE_ROLE_KEY ✓
- NEXT_PUBLIC_PADDLE_VENDOR_ID ✓
- NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ✓
- PADDLE_API_KEY ✓
- PADDLE_WEBHOOK_SECRET ✓
- NEXT_PUBLIC_SITE_URL ✓
- NEXT_PUBLIC_MOCK_MODE=false ✓
```

### 重要URL

- Supabase Dashboard: https://supabase.com/dashboard
- Paddle Dashboard: https://vendors.paddle.com
- Vercel Dashboard: https://vercel.com/dashboard
- Chrome Web Store Developer: https://chrome.google.com/webstore/developer/dashboard
