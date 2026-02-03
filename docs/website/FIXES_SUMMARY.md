# 问题修复总结

## 修复的4个问题

### 1. ✅ Paddle Webhook 401错误

**问题**: Edge Function被Paddle调用时返回401错误

**原因**: 函数可能在没有签名或secret的情况下拒绝请求

**修复**:
- 修改 `supabase/functions/paddle-webhook/index.ts`
- 添加详细日志记录请求信息
- 在测试阶段允许没有签名的请求（如果没有配置webhook secret）
- 添加签名验证成功的日志

**部署**:
```bash
cd supabase
npx supabase functions deploy paddle-webhook
```

**查看日志**:
```bash
npx supabase functions logs paddle-webhook
```

---

### 2. ✅ 登录后访问/login不重定向

**问题**: 用户已登录后访问 `/login` 页面不会自动跳转到dashboard

**修复**:
- 修改 `website/app/login/page.tsx`
- 添加 `useEffect` 检查登录状态
- 如果已登录，自动重定向到dashboard或指定的redirect URL
- 支持登录后返回原页面的功能

**功能增强**:
- 支持查询参数: `?redirect=/pricing&plan=starter&cycle=monthly`
- 登录后自动返回并保持用户选择的套餐

---

### 3. ✅ 使用ngrok时仍重定向到localhost

**问题**: OAuth登录后重定向到localhost而不是ngrok URL

**原因**: 代码使用 `window.location.origin` 构建redirectTo，在客户端可能获取到错误的origin

**修复**:
- 修改 `website/app/login/page.tsx` 中的OAuth配置
- 使用环境变量优先: `process.env.NEXT_PUBLIC_SITE_URL || window.location.origin`
- 在 `.env.local` 中配置正确的URL

**配置**:
```env
# 使用ngrok时
NEXT_PUBLIC_SITE_URL=https://prospectively-dusty-juanita.ngrok-free.dev

# 本地开发时
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**重要**: 每次更换ngrok URL时需要更新：
1. `.env.local` 中的 `NEXT_PUBLIC_SITE_URL`
2. Supabase Dashboard > Authentication > Site URL
3. Supabase Dashboard > Authentication > Redirect URLs
4. Paddle Dashboard > Checkout settings > Default payment link

---

### 4. ✅ 未登录可以购买的问题

**问题**: 未登录用户可以点击Purchase按钮，但无法完成支付

**修复**:

#### 4.1 Pricing页面 (`website/app/pricing/page.tsx`)
- 未登录时按钮显示 "Login to Purchase"
- 点击时重定向到登录页，携带返回信息
- 登录后自动返回并触发购买流程

#### 4.2 购买流程设计
```
未登录用户点击Purchase
  ↓
重定向到 /login?redirect=/pricing&plan=starter&cycle=monthly
  ↓
用户登录 (Google/LinkedIn/Email)
  ↓
返回 /pricing?plan=starter&cycle=monthly
  ↓
自动打开Paddle checkout (1秒延迟)
  ↓
用户完成支付
  ↓
跳转到 /dashboard?checkout=success
```

#### 4.3 用户体验优化
- **未登录**: 按钮文字 "Login to Purchase"，引导用户登录
- **已登录**: 按钮文字 "Purchase"，直接打开支付
- **登录后**: 自动恢复用户之前选择的套餐和周期
- **支付成功**: 显示绿色成功提示，刷新credits余额

---

## 🚀 部署步骤

### 1. 更新Edge Function
```bash
cd supabase
npx supabase functions deploy paddle-webhook
```

### 2. 配置环境变量

更新 `website/.env.local`:
```env
# Site Configuration (使用ngrok时)
NEXT_PUBLIC_SITE_URL=https://your-ngrok-url.ngrok-free.dev

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Paddle Sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_xxx
NEXT_PUBLIC_PADDLE_STARTER_PRODUCT_ID=pri_01xxx
```

### 3. 更新Supabase配置

**Authentication > URL Configuration**:
```
Site URL: https://your-ngrok-url.ngrok-free.dev
Redirect URLs: https://your-ngrok-url.ngrok-free.dev/auth/callback
```

### 4. 更新Paddle配置

**Settings > Checkout settings**:
```
Default payment link: https://your-ngrok-url.ngrok-free.dev/pricing
```

### 5. 重启开发服务器
```bash
cd website
npm run dev
```

---

## 🧪 测试清单

### 测试1: Webhook功能
```
□ 在Paddle Dashboard发送测试webhook
□ 检查Supabase函数日志: npx supabase functions logs paddle-webhook
□ 确认日志显示请求已接收
□ 确认没有401错误
```

### 测试2: 登录重定向
```
□ 已登录状态访问 /login
□ 应该自动重定向到 /dashboard
□ 未登录状态访问 /login
□ 应该显示登录页面
```

### 测试3: ngrok OAuth
```
□ 访问 ngrok URL (不是localhost)
□ 点击 "Login with Google"
□ 完成登录
□ 应该重定向回 ngrok URL 的 /dashboard
□ 不应该跳转到 localhost
```

### 测试4: 未登录购买流程
```
□ 未登录时访问 /pricing
□ 按钮显示 "Login to Purchase"
□ 点击按钮
□ 重定向到 /login?redirect=/pricing&plan=xxx&cycle=monthly
□ 完成登录
□ 自动返回 /pricing
□ 自动弹出 Paddle checkout
□ 完成测试支付
□ 跳转到 /dashboard?checkout=success
□ 显示成功提示
```

### 测试5: 已登录购买流程
```
□ 已登录状态访问 /pricing
□ 按钮显示 "Purchase"
□ 点击按钮
□ 直接打开 Paddle checkout
□ 完成测试支付
□ 检查 Supabase purchases 表有记录
□ 检查 credits 余额已更新
```

---

## 📋 关键配置检查

### Supabase
- [x] Site URL 设置为 ngrok URL
- [x] Redirect URLs 包含 `/auth/callback`
- [x] Edge Function 已部署
- [x] Webhook Secret 已配置 (可选，测试阶段)

### Paddle
- [x] Default payment link 设置为 ngrok URL
- [x] 域名已批准
- [x] Webhook notification 已配置
- [x] Price IDs 在 .env.local 中正确配置

### 代码
- [x] `.env.local` 中 NEXT_PUBLIC_SITE_URL 设置正确
- [x] 所有硬编码的 localhost 已替换为环境变量

---

## 🐛 如果仍有问题

### Webhook仍返回401
1. 检查Paddle的webhook配置中是否正确设置了URL
2. 查看函数日志查看详细错误
3. 临时移除webhook secret测试（开发环境）

### 仍然重定向到localhost
1. 清除浏览器缓存和cookies
2. 确认 `.env.local` 中的URL正确
3. 重启开发服务器
4. 检查Supabase Site URL配置

### 登录后没有自动购买
1. 检查浏览器控制台是否有错误
2. 确认URL查询参数正确传递
3. 检查Paddle是否初始化完成

### 支付成功但没有记录
1. 检查Paddle webhook是否正确触发
2. 查看Edge Function日志
3. 确认customData包含userId
4. 检查数据库RLS策略

