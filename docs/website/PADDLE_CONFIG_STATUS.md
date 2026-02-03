# Paddle配置快速检查清单

## 当前配置状态

### 1. Default Payment Link ✅
```
Domain: prospectively-dusty-juanita.ngrok-free.dev
URL: https://prospectively-dusty-juanita.ngrok-free.dev/pricing
```

**需要确认**:
- [ ] 域名批准状态是否为 "Approved"
- [ ] 如果未批准，需要访问 "Request website approval" 提交审批

---

## 必需的Paddle后台配置

### ✅ 1. Default Payment Link (已设置)
**位置**: Settings > Checkout settings > Default payment link
**当前值**: `https://prospectively-dusty-juanita.ngrok-free.dev/pricing`
**状态**: ⏳ 等待确认域名是否已批准

### ✅ 2. Products & Prices
**位置**: Catalog > Products

确认以下价格ID存在且处于Active状态：
```
□ Starter: pri_01xxx (检查.env.local中的ID)
□ Pro: pri_01yyy
□ Unlimited Monthly: pri_01zzz
□ Unlimited Yearly: pri_01www
```

### ⚠️ 3. Webhook通知 (待配置)
**位置**: Developer tools > Notifications

**创建新的Notification Destination**:
```
Endpoint URL: https://[your-supabase-project].supabase.co/functions/v1/paddle-webhook
Active: Yes
```

**订阅以下事件**:
```
☑ transaction.completed (必需)
☑ subscription.activated (如果有订阅)
☑ subscription.updated (如果有订阅)
☑ subscription.canceled (如果有订阅)
```

**获取Webhook Secret并保存**:
```bash
npx supabase secrets set PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxx
```

---

## ngrok注意事项

### 每次重启ngrok都需要：

1. **更新Paddle配置**:
   - Settings > Checkout settings > Default payment link
   - 改为新的ngrok URL

2. **重新提交域名审批**:
   - Developer tools > Website approval
   - 添加新的ngrok域名
   - 等待批准（sandbox环境通常自动批准）

3. **更新Supabase Site URL**:
   - Supabase Dashboard > Authentication > URL Configuration
   - Site URL改为新的ngrok URL
   - Redirect URLs添加 `https://new-ngrok-url.ngrok.io/auth/callback`

### 建议：使用ngrok固定域名（付费功能）
```bash
# 免费版每次URL都会变
ngrok http 3000

# 付费版可以使用固定域名
ngrok http 3000 --domain=your-fixed-domain.ngrok-free.app
```

---

## 🧪 测试步骤

### 1. 确认域名批准状态
```
Paddle Dashboard > Settings > Checkout settings
检查 Default payment link 旁边是否有 ✅ 标记
```

### 2. 测试checkout流程
```bash
# 1. 确保ngrok在运行
ngrok http 3000

# 2. 访问ngrok URL
open https://prospectively-dusty-juanita.ngrok-free.dev

# 3. 登录并进入pricing页面

# 4. 打开浏览器控制台查看输出

# 5. 点击Purchase按钮
```

### 3. 查看控制台输出
```javascript
// 应该看到类似这样的输出：
{
  "items": [{"priceId": "pri_01xxx"}],
  "customer": {"email": "user@example.com"},
  "customData": {"userId": "uuid-here"},
  "settings": {
    "displayMode": "overlay",
    "successUrl": "https://prospectively-dusty-juanita.ngrok-free.dev/dashboard?checkout=success",
    "closeUrl": "https://prospectively-dusty-juanita.ngrok-free.dev/pricing",
    "allowLogout": false
  }
}
```

### 4. 完成测试支付
```
使用Paddle sandbox测试卡:
卡号: 4242 4242 4242 4242
到期: 12/25 (任意未来日期)
CVV: 123 (任意3位数)
```

### 5. 验证结果
```
□ 支付成功后跳转到 /dashboard?checkout=success
□ 看到绿色的成功提示
□ Credits余额已更新（可能需要刷新）
□ Supabase purchases表有新记录
```

---

## ❌ 如果仍然报错

### 错误: `transaction_default_checkout_url_not_set`
**原因**: 域名未获批准
**解决**:
1. Developer tools > Website approval
2. 提交域名审批
3. Sandbox环境通常会自动批准

### 错误: `Domain not approved`
**原因**: 域名正在等待批准
**解决**: 等待几分钟后重试，或联系Paddle支持加速审批

### 支付成功但无记录
**原因**: Webhook未配置或userId未传递
**检查**:
1. Paddle webhook是否配置正确
2. 控制台显示的customData是否包含userId
3. Supabase函数日志: `npx supabase functions logs paddle-webhook`

---

## 📝 环境变量检查

确认 `website/.env.local` 包含：
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Paddle Sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_xxx
NEXT_PUBLIC_PADDLE_STARTER_PRODUCT_ID=pri_01xxx
NEXT_PUBLIC_PADDLE_PRO_PRODUCT_ID=pri_01yyy
NEXT_PUBLIC_PADDLE_UNLIMITED_MONTHLY_ID=pri_01zzz
NEXT_PUBLIC_PADDLE_UNLIMITED_YEARLY_ID=pri_01www
```

