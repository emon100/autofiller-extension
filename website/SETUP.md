# OneFillr Website Setup Guide

## 配置清单

### 1. Supabase配置

#### 1.1 Site URL配置
**位置**: Supabase Dashboard > Authentication > URL Configuration

使用ngrok时需要设置：
```
Site URL: https://your-ngrok-url.ngrok.io
```

本地开发时：
```
Site URL: http://localhost:3000
```

**重要**: 每次ngrok URL改变时都需要更新此设置！

#### 1.2 Redirect URLs
添加以下重定向URL（ngrok和localhost都要添加）:
```
https://your-ngrok-url.ngrok.io/auth/callback
http://localhost:3000/auth/callback
```

#### 1.3 部署Edge Function

```bash
cd supabase
npx supabase functions deploy paddle-webhook
```

设置Edge Function环境变量：
```bash
npx supabase secrets set PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret
```

获取Edge Function URL:
```
https://your-project-id.supabase.co/functions/v1/paddle-webhook
```

### 2. Paddle配置

#### 2.1 Default Payment Link
**位置**: Paddle Dashboard > Settings > Checkout > Default URLs

设置以下URL（使用ngrok时）:
```
Default Success URL: https://your-ngrok-url.ngrok.io/dashboard?checkout=success
Default Cancel URL: https://your-ngrok-url.ngrok.io/pricing
```

本地开发时：
```
Default Success URL: http://localhost:3000/dashboard?checkout=success
Default Cancel URL: http://localhost:3000/pricing
```

#### 2.2 Notification Settings (Webhook)
**位置**: Paddle Dashboard > Developer Tools > Notifications

创建新的Notification Destination:
```
Endpoint URL: https://your-project-id.supabase.co/functions/v1/paddle-webhook
Description: Supabase Edge Function
```

订阅以下事件：
- `transaction.completed` - 用于一次性购买
- `subscription.activated` - 订阅激活
- `subscription.updated` - 订阅更新
- `subscription.canceled` - 订阅取消

获取Webhook Secret并保存到Supabase secrets中。

#### 2.3 Products & Prices
产品和价格现在通过数据库 `products` 表管理，不再使用环境变量。

1. 在 Paddle Dashboard 创建产品和价格
2. 在 Supabase `products` 表中添加记录，包含：
   - `paddle_price_id`: Paddle 的 Price ID (如 `pri_01xxx`)
   - `name`: 产品名称 (如 `Starter`, `Unlimited Monthly`)
   - `price_amount`: 价格（分为单位，如 999 = $9.99）
   - `credits`: 积分数量（订阅计划可为 null）
   - `features`: 功能列表（JSON 数组）
   - `is_active`: 是否在前端显示

3. 使用 `/admin` 页面管理产品（需要 admin 权限）

### 3. 本地环境变量

创建 `website/.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Paddle (sandbox)
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your-sandbox-client-token
PADDLE_API_KEY=your-paddle-api-key
PADDLE_WEBHOOK_SECRET=your-paddle-webhook-secret
```

**注意**: 产品价格 ID 不再需要在环境变量中配置，现在通过数据库 `products` 表管理。

### 4. 数据库迁移

运行SQL迁移脚本创建表结构：
```bash
cd supabase
npx supabase db push
```

或者在Supabase SQL Editor中执行 `migrations/001_initial.sql`

### 5. 使用ngrok测试

#### 5.1 启动ngrok
```bash
ngrok http 3000
```

记录ngrok URL: `https://xxxx-xxxx-xxxx.ngrok.io`

#### 5.2 更新Supabase和Paddle配置
按照第1和第2步更新所有URL配置。

#### 5.3 启动开发服务器
```bash
cd website
npm run dev
```

访问ngrok URL进行测试。

## 常见问题

### Q1: 登录后重定向到localhost而不是ngrok URL
**解决**: 更新Supabase的Site URL为ngrok URL

### Q2: Paddle checkout打开但返回400错误
**解决**:
1. 检查Price ID是否正确
2. 确保设置了Default Payment Link
3. 检查是否传递了customData.userId

### Q3: 支付成功但数据库没有记录
**解决**:
1. 检查Paddle Webhook是否配置正确
2. 检查Edge Function日志: `npx supabase functions logs paddle-webhook`
3. 确认购买时传递了userId

### Q4: Edge Function返回401 Invalid signature
**解决**: 检查PADDLE_WEBHOOK_SECRET是否设置正确

## 测试流程

1. ✅ 启动ngrok和开发服务器
2. ✅ 更新Supabase Site URL
3. ✅ 访问ngrok URL
4. ✅ 使用Google登录
5. ✅ 进入Pricing页面
6. ✅ 点击Purchase按钮
7. ✅ 完成Paddle sandbox支付
8. ✅ 检查Dashboard显示"Payment successful"
9. ✅ 检查Credits余额更新
10. ✅ 检查Supabase `purchases`表有记录

## 部署到生产环境

生产环境配置类似，但需要：
1. 使用真实域名替代ngrok URL
2. 使用Paddle生产环境的Client Token和Price IDs
3. 设置合适的CORS和CSP策略
4. 启用Paddle签名验证

