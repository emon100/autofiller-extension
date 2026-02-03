# Website Architecture

## Overview

This document describes the technical architecture for AutoFiller's official website and backend systems.

---

## 1. Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Frontend Framework | Next.js 14 (App Router) | SEO + Vercel deployment |
| UI Library | Tailwind CSS + shadcn/ui | Consistency with extension |
| Backend | Supabase | Auth + DB + Edge Functions |
| Payments | Paddle | MoR, automatic tax handling |
| Hosting | Vercel (website) + Supabase (backend) | Generous free tiers |
| i18n | next-intl (prepared) | Multi-language support |

---

## 2. Directory Structure

```
autofiller/
├── src/                    # Chrome extension code
├── public/                 # Extension static assets
├── docs/                   # Documentation (reorganized)
│
├── website/                # Official website (Next.js 14)
│   ├── app/                # App Router
│   │   ├── page.tsx        # Home page
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── credits/
│   │   │   │   └── route.ts
│   │   │   └── webhook/
│   │   │       └── paddle/
│   │   │           └── route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   ├── landing/        # Landing page components
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── Pricing.tsx
│   │   │   └── FAQ.tsx
│   │   └── dashboard/      # Dashboard components
│   │       ├── CreditBalance.tsx
│   │       ├── UsageHistory.tsx
│   │       └── AccountSettings.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts   # Browser client
│   │   │   └── server.ts   # Server client
│   │   └── paddle.ts       # Paddle integration
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
└── supabase/               # Supabase configuration
    ├── migrations/         # Database migrations
    │   └── 001_initial.sql
    ├── functions/          # Edge Functions
    │   ├── webhook-paddle/
    │   │   └── index.ts
    │   └── sync-credits/
    │       └── index.ts
    └── config.toml
```

---

## 3. Database Schema

### 3.1 Tables

#### profiles
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### credits
```sql
CREATE TABLE public.credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance INTEGER DEFAULT 20,      -- Free credits on signup
  lifetime_used INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### credit_transactions
```sql
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  amount INTEGER NOT NULL,         -- Positive=credit, Negative=debit
  type TEXT NOT NULL,              -- 'purchase', 'fill', 'resume_parse', 'bonus'
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### subscriptions
```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  paddle_subscription_id TEXT UNIQUE,
  plan_id TEXT,                    -- 'starter', 'pro', 'unlimited'
  status TEXT,                     -- 'active', 'cancelled', 'past_due'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### purchases
```sql
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  paddle_transaction_id TEXT UNIQUE,
  product_id TEXT,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  credits_added INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own credits" ON public.credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own purchases" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id);
```

### 3.3 Database Triggers

```sql
-- Auto-create profile and credits on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO public.credits (user_id, balance)
  VALUES (NEW.id, 20);  -- 20 free credits

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 20, 'bonus', 'Welcome bonus credits');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 4. Authentication Flow

### 4.1 Supported Providers

- Google OAuth
- LinkedIn OAuth
- Email/Password (magic link optional)

### 4.2 Extension Authentication

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Extension  │───►│   Website   │───►│  Supabase   │
│             │    │   /login    │    │    Auth     │
└─────────────┘    └─────────────┘    └─────────────┘
       │                                     │
       │           OAuth callback            │
       │◄────────────────────────────────────│
       │                                     │
       ▼                                     │
┌─────────────┐                              │
│   Store     │    Session token             │
│   Token     │◄─────────────────────────────│
└─────────────┘
```

### 4.3 Token Storage

```typescript
// Extension stores auth token in chrome.storage.local
interface AuthState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}
```

---

## 5. Credits System

### 5.1 Credit Operations

| Operation | Credits | Description |
|-----------|---------|-------------|
| Form fill | -1 | Auto-fill a job application |
| Resume parse | -2 | Parse uploaded resume |
| Purchase (Starter) | +100 | Buy 100 credits |
| Purchase (Pro) | +500 | Buy 500 credits |
| Subscription | +unlimited | Unlimited while subscribed |
| Referral bonus | +10 | Per referred user signup |

### 5.2 API Endpoints

```typescript
// GET /api/credits - Get current balance
interface CreditsResponse {
  balance: number;
  lifetimeUsed: number;
  subscription?: {
    planId: string;
    status: string;
    expiresAt: string;
  };
}

// POST /api/credits/consume - Consume credits
interface ConsumeRequest {
  amount: number;
  type: 'fill' | 'resume_parse';
  metadata?: Record<string, unknown>;
}

interface ConsumeResponse {
  success: boolean;
  newBalance: number;
  error?: string;
}
```

---

## 6. Payment Integration (Paddle)

### 6.1 Products

| Product ID | Name | Price | Credits |
|------------|------|-------|---------|
| `pri_starter` | Starter Pack | $9.99 | 100 |
| `pri_pro` | Pro Pack | $29.99 | 500 |
| `pri_unlimited_monthly` | Unlimited Monthly | $14.99/mo | Unlimited |
| `pri_unlimited_yearly` | Unlimited Yearly | $99.99/yr | Unlimited |

### 6.2 Webhook Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Paddle    │───►│   Webhook   │───►│  Supabase   │
│   Event     │    │   Handler   │    │   Update    │
└─────────────┘    └─────────────┘    └─────────────┘

Events handled:
- transaction.completed  → Add credits or activate subscription
- subscription.activated → Create/update subscription record
- subscription.cancelled → Mark subscription as cancelled
- subscription.updated   → Update subscription details
```

### 6.3 Webhook Verification

```typescript
import { Paddle } from '@paddle/paddle-node-sdk';

const paddle = new Paddle(process.env.PADDLE_API_KEY!);

export async function POST(request: Request) {
  const signature = request.headers.get('paddle-signature');
  const rawBody = await request.text();

  const event = paddle.webhooks.unmarshal(rawBody, signature!, {
    webhookId: process.env.PADDLE_WEBHOOK_ID!,
  });

  // Process event...
}
```

---

## 7. Extension Integration

### 7.1 API Communication

```typescript
// src/api/client.ts (in extension)
const API_BASE = 'https://autofiller.app/api';

export async function checkCredits(): Promise<CreditsResponse> {
  const token = await getStoredToken();
  const res = await fetch(`${API_BASE}/credits`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export async function consumeCredits(amount: number, type: string) {
  const token = await getStoredToken();
  const res = await fetch(`${API_BASE}/credits/consume`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ amount, type })
  });
  return res.json();
}
```

### 7.2 Settings Page Integration

```typescript
// Settings tab additions
- Login/Logout button
- Current balance display
- "Buy Credits" link to pricing page
- Subscription status (if any)
```

---

## 8. Deployment

### 8.1 Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "cd website && npm run build",
  "outputDirectory": "website/.next",
  "framework": "nextjs"
}
```

### 8.2 Environment Variables

```bash
# website/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=xxx
PADDLE_API_KEY=xxx
PADDLE_WEBHOOK_SECRET=xxx

NEXT_PUBLIC_SITE_URL=https://autofiller.app
```

### 8.3 Supabase Configuration

```toml
# supabase/config.toml
[api]
enabled = true
port = 54321

[auth]
site_url = "https://autofiller.app"
additional_redirect_urls = [
  "https://autofiller.app/auth/callback",
  "chrome-extension://*/auth/callback"
]

[auth.external.google]
enabled = true

[auth.external.linkedin_oidc]
enabled = true
```

---

## 9. Monitoring & Analytics

### 9.1 Error Tracking

- Vercel Analytics (built-in)
- Sentry (optional, for detailed error tracking)

### 9.2 Usage Metrics

- Total signups
- Free to paid conversion rate
- Credit consumption patterns
- Extension MAU
- Revenue (MRR/ARR)

### 9.3 Logging

```typescript
// Structured logging for Edge Functions
console.log(JSON.stringify({
  level: 'info',
  event: 'credit_consumed',
  userId: user.id,
  amount: -1,
  newBalance: 19,
  timestamp: new Date().toISOString()
}));
```

---

## 10. Security Considerations

1. **API Authentication**: All API routes require valid Supabase JWT
2. **Webhook Verification**: Paddle webhooks verified with signature
3. **RLS Enforcement**: Database-level access control
4. **Rate Limiting**: Vercel Edge + Supabase rate limits
5. **CORS**: Restrict to known origins (website + extension)
6. **Sensitive Data**: No PII stored beyond email/name
