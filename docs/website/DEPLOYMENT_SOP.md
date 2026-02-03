# OneFil.help 部署 SOP

> 域名：`onefil.help`
> 主站：`www.onefil.help`
> 最后更新：2026-02-04

---

## 架构概览

```
用户 → CloudFlare (CDN/DNS) → Vercel (Next.js 网站/API)
                            ↓
                      Supabase (Auth/DB)
                            ↓
                      Paddle (支付)
```

---

## 一、DNS 配置 (CloudFlare)

### 1.1 Nameserver 迁移

在 **Namesilo** 将 Nameserver 改为 CloudFlare 提供的：
```
ns1.cloudflare.com
ns2.cloudflare.com
```

### 1.2 DNS Records

| 类型 | 名称 | 内容 | 代理状态 |
|------|------|------|----------|
| CNAME | `@` | `72d0bc00496e5405.vercel-dns-017.com` | ☁️ 已代理 |
| CNAME | `www` | `72d0bc00496e5405.vercel-dns-017.com` | ☁️ 已代理 |

> 注：CNAME 值来自 Vercel，每个项目不同

### 1.3 SSL/TLS 配置

- **SSL/TLS → Overview**: `Full (strict)`
- **Edge Certificates**:
  - Always Use HTTPS: ✅
  - Automatic HTTPS Rewrites: ✅
  - Minimum TLS Version: `TLS 1.2`

### 1.4 Cache Rules

**Rules → Cache Rules → Create Rule**:
```
名称: Bypass Dynamic Routes
条件: (http.request.uri.path starts with "/api") or
      (http.request.uri.path starts with "/auth")
动作: Bypass cache
```

---

## 二、Vercel 配置

### 2.1 项目创建

1. https://vercel.com → Add New Project
2. 导入 GitHub 仓库
3. **Root Directory**: `website`
4. Framework: Next.js (自动检测)

### 2.2 域名配置

**Project Settings → Domains**:
- `www.onefil.help` (主域名)
- `onefil.help` (重定向到 www)

### 2.3 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 Key | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJhbG...` |
| `NEXT_PUBLIC_SITE_URL` | 网站 URL | `https://www.onefil.help` |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Paddle 客户端 Token | `live_xxx` |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | Paddle 环境 | `production` 或 `sandbox` |
| `PADDLE_WEBHOOK_SECRET` | Paddle Webhook 密钥 | `pdl_ntfset_xxx` |
| `LLM_API_KEY` | OpenAI API Key | `sk-xxx` |
| `LLM_MODEL` | LLM 模型 | `gpt-4o-mini` |

---

## 三、Supabase 配置

### 3.1 数据库迁移

确保已执行 migrations：
```bash
cd supabase
supabase db push
# 或在 Dashboard 执行 SQL
```

需要的表：
- `profiles`
- `credits`
- `credit_transactions`
- `subscriptions`
- `purchases`

需要的函数：
- `add_credits(p_user_id, p_amount)`

### 3.2 Authentication 配置

**Dashboard → Authentication → URL Configuration**:

```
Site URL: https://www.onefil.help

Redirect URLs:
- https://www.onefil.help/auth/callback
- https://onefil.help/auth/callback
- chrome-extension://*/auth/callback
```

### 3.3 OAuth Providers

**Google OAuth**:
1. Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Authorized redirect URI: `https://xxx.supabase.co/auth/v1/callback`
4. 复制 Client ID 和 Secret 到 Supabase

---

## 四、Paddle 配置

### 4.1 Webhook 设置

**Developer Tools → Notifications → Webhooks**:

```
Destination URL: https://www.onefil.help/api/webhook/paddle
```

**订阅事件**:
- ✅ `transaction.completed`
- ✅ `subscription.activated`
- ✅ `subscription.updated`
- ✅ `subscription.canceled`

### 4.2 产品配置

确保产品 ID 与代码匹配：

| 产品 | Price ID | Credits |
|------|----------|---------|
| Starter | `pri_starter` | 100 |
| Pro | `pri_pro` | 500 |
| Unlimited Monthly | `pri_unlimited_monthly` | ∞ |
| Unlimited Yearly | `pri_unlimited_yearly` | ∞ |

### 4.3 Checkout 集成

确保 checkout 时传递 `custom_data`:
```javascript
{
  userId: "用户的 Supabase UUID"
}
```

---

## 五、Chrome 扩展配置

### 5.1 API 地址

`src/sidepanel/tabs/Settings.tsx`:
```typescript
const WEBSITE_URL = 'https://www.onefil.help'
```

### 5.2 Manifest 权限

`public/manifest.json` 需要包含：
```json
{
  "host_permissions": [
    "https://www.onefil.help/*"
  ]
}
```

---

## 六、部署检查清单

### 6.1 首次部署

- [ ] CloudFlare Nameserver 已迁移
- [ ] CloudFlare DNS Records 已配置
- [ ] CloudFlare SSL 设置为 Full (strict)
- [ ] CloudFlare Cache Rule 已创建（bypass /api, /auth）
- [ ] Vercel 项目已创建（Root Directory: website）
- [ ] Vercel 域名已添加并验证
- [ ] Vercel 环境变量已配置
- [ ] Supabase 数据库 migrations 已执行
- [ ] Supabase Auth Redirect URLs 已配置
- [ ] Supabase Google OAuth 已配置
- [ ] Paddle Webhook URL 已配置
- [ ] Paddle Webhook 事件已订阅
- [ ] 扩展 WEBSITE_URL 已更新

### 6.2 功能验证

- [ ] 访问 https://www.onefil.help 正常
- [ ] 访问 https://onefil.help 重定向到 www
- [ ] Google 登录正常
- [ ] Dashboard 显示 credits 正常
- [ ] Paddle 支付流程正常
- [ ] Webhook 处理正常（查看 Vercel Logs）
- [ ] 扩展登录正常
- [ ] 扩展 LLM API 调用正常

---

## 七、常见问题排查

### 7.1 Webhook 返回 500

**症状**: Paddle Webhook 返回 `{"error": "Webhook processing failed"}`

**排查**:
1. 检查 Vercel Logs
2. 常见原因：
   - `custom_data` 解析错误（已修复）
   - Supabase 连接失败
   - `add_credits` 函数不存在

### 7.2 OAuth 登录失败

**症状**: Google 登录后跳转错误

**排查**:
1. 检查 Supabase Redirect URLs 是否包含 `https://www.onefil.help/auth/callback`
2. 检查 Google OAuth 的 Authorized redirect URIs

### 7.3 扩展无法连接

**症状**: 扩展登录或 API 调用失败

**排查**:
1. 检查 `WEBSITE_URL` 是否正确
2. 检查扩展的 `host_permissions`
3. 检查 CORS 配置

### 7.4 CloudFlare 缓存问题

**症状**: API 返回旧数据或 POST 请求异常

**排查**:
1. 确认 Cache Rule 已创建
2. 检查请求头中是否有 `cf-cache-status: BYPASS`

---

## 八、回滚方案

### 8.1 Vercel 回滚

1. Vercel Dashboard → Deployments
2. 找到上一个正常的 deployment
3. 点击 "..." → "Promote to Production"

### 8.2 数据库回滚

备份策略：Supabase 自动每日备份（Pro 计划）

---

## 九、监控

### 9.1 Vercel

- **Analytics**: 自动启用
- **Logs**: Functions tab 查看 API 日志

### 9.2 Supabase

- **Dashboard → Logs**: 查看数据库和 Auth 日志

### 9.3 Paddle

- **Developer Tools → Event Logs**: 查看 Webhook 发送记录

---

## 十、联系方式

- 技术支持邮箱: support@onefil.help
- 文档位置: `/docs/website/`
