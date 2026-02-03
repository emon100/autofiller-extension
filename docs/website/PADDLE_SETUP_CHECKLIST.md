# Paddle配置检查清单

## 问题诊断

之前遇到的错误：`transaction_default_checkout_url_not_set`

这个错误表明Paddle需要配置**默认的checkout URL**。有两种解决方案：

### 方案A：在Paddle后台配置（推荐）
### 方案B：在代码中完整传递URL（已实现）

---

## ✅ 必须完成的Paddle后台配置

### 1. 默认Checkout设置

**路径**: Paddle Dashboard > Settings > Checkout settings

需要配置以下URL：

#### Development (使用ngrok时):
```
Default success URL: https://your-ngrok-url.ngrok.io/dashboard?checkout=success
Default close URL: https://your-ngrok-url.ngrok.io/pricing
```

#### Production:
```
Default success URL: https://yourdomain.com/dashboard?checkout=success
Default close URL: https://yourdomain.com/pricing
```

**重要提示**:
- ✅ **必须使用HTTPS** (localhost除外)
- ✅ URL必须是**完整的绝对路径**（包含协议）
- ✅ 每次ngrok URL改变时都要更新这些设置

### 2. 产品和价格配置

**路径**: Paddle Dashboard > Catalog > Products

确认以下信息：

#### 产品列表：
```
□ Starter Pack (一次性购买)
  └─ Price ID: pri_01xxx...
  └─ Amount: $9.99
  └─ Type: One-time

□ Pro Pack (一次性购买)
  └─ Price ID: pri_01yyy...
  └─ Amount: $29.99
  └─ Type: One-time

□ Unlimited Monthly (订阅)
  └─ Price ID: pri_01zzz...
  └─ Amount: $14.99/month
  └─ Type: Recurring

□ Unlimited Yearly (订阅)
  └─ Price ID: pri_01www...
  └─ Amount: $99.99/year
  └─ Type: Recurring
```

将这些Price ID复制到 `.env.local`:
```env
NEXT_PUBLIC_PADDLE_STARTER_PRODUCT_ID=pri_01xxx...
NEXT_PUBLIC_PADDLE_PRO_PRODUCT_ID=pri_01yyy...
NEXT_PUBLIC_PADDLE_UNLIMITED_MONTHLY_ID=pri_01zzz...
NEXT_PUBLIC_PADDLE_UNLIMITED_YEARLY_ID=pri_01www...
```

### 3. Webhook/Notification配置

**路径**: Paddle Dashboard > Developer tools > Notifications

#### 创建新的Notification Destination：

```
Name: Supabase Production Webhook
Description: Webhook for credit sync
Endpoint URL: https://your-project-id.supabase.co/functions/v1/paddle-webhook
Active: ✅ Yes
```

#### 订阅事件：
```
□ transaction.created
□ transaction.updated
☑ transaction.completed (必需 - 用于添加credits)
□ transaction.paid
□ transaction.payment_failed

☑ subscription.activated (必需 - 订阅激活)
☑ subscription.updated (必需 - 订阅更新)
☑ subscription.canceled (必需 - 订阅取消)
□ subscription.past_due
□ subscription.paused
```

#### 测试Webhook：
1. 保存配置后，点击"Test"按钮
2. 选择事件类型 `transaction.completed`
3. 发送测试请求
4. 检查Supabase函数日志：
   ```bash
   npx supabase functions logs paddle-webhook
   ```

#### 保存Webhook Secret：
```bash
# 从Paddle获取Webhook Secret
# 然后保存到Supabase
npx supabase secrets set PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxx
```

### 4. Sandbox环境配置

如果使用Sandbox测试：

**路径**: Paddle Dashboard > Sandbox > Settings

- ✅ 使用Sandbox API Token
- ✅ Sandbox的webhook URL与生产环境相同
- ✅ 使用测试信用卡信息：
  ```
  卡号: 4242 4242 4242 4242
  到期: 任意未来日期
  CVV: 任意3位数
  ```

---

## 📋 代码侧配置（已完成）

### ✅ checkout options包含：

```typescript
{
  items: [{ priceId: 'pri_01xxx' }],
  customer: { email: 'user@example.com' },
  customData: { userId: 'uuid' },
  settings: {
    displayMode: 'overlay',
    successUrl: 'https://xxx.ngrok.io/dashboard?checkout=success',
    closeUrl: 'https://xxx.ngrok.io/pricing',
    allowLogout: false
  }
}
```

---

## 🔍 验证步骤

### 1. 检查Paddle后台配置
```
1. □ 登录 Paddle Dashboard
2. □ Settings > Checkout settings - 确认default URLs已设置
3. □ Catalog > Products - 确认所有价格ID正确
4. □ Developer tools > Notifications - 确认webhook已配置
```

### 2. 检查环境变量
```bash
cd website
cat .env.local

# 应该包含：
# NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=xxx
# NEXT_PUBLIC_PADDLE_STARTER_PRODUCT_ID=pri_01xxx
```

### 3. 测试支付流程
```
1. □ 启动ngrok: ngrok http 3000
2. □ 更新Paddle的Default URLs为ngrok URL
3. □ 打开浏览器控制台
4. □ 点击Purchase按钮
5. □ 查看控制台输出的checkout options
6. □ 完成测试支付
7. □ 检查是否跳转到dashboard?checkout=success
8. □ 检查Supabase purchases表是否有记录
```

---

## 🐛 常见错误排查

### 错误: `transaction_default_checkout_url_not_set`
**原因**: Paddle后台未配置默认checkout URLs
**解决**:
1. 进入 Paddle Dashboard > Settings > Checkout settings
2. 设置 Default success URL 和 Default close URL
3. 保存后重试

### 错误: `Invalid price ID`
**原因**: Price ID不存在或未激活
**解决**:
1. 检查 .env.local 中的Price ID
2. 在Paddle Dashboard > Catalog中确认价格ID存在且active
3. 确认使用的是正确的环境（sandbox vs production）

### 错误: Webhook返回401 Invalid signature
**原因**: Webhook secret不匹配
**解决**:
```bash
# 重新设置secret
npx supabase secrets set PADDLE_WEBHOOK_SECRET=your_correct_secret
```

### 支付成功但数据库无记录
**原因**: Webhook未正确配置或userId未传递
**检查**:
1. Paddle webhook是否订阅了 `transaction.completed`
2. 控制台输出的customData是否包含userId
3. Supabase函数日志: `npx supabase functions logs paddle-webhook`

---

## 📞 需要帮助？

如果以上步骤都正确但仍有问题：

1. **查看浏览器控制台** - 是否有JavaScript错误
2. **查看Paddle日志** - Dashboard > Developer tools > Events
3. **查看Supabase日志** - `npx supabase functions logs paddle-webhook`
4. **检查网络请求** - 浏览器DevTools > Network > XHR

