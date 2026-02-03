-- Webhook日志表（记录所有原始请求）
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  paddle_event_id TEXT UNIQUE,
  raw_body JSONB NOT NULL,
  headers JSONB,
  processed BOOLEAN DEFAULT FALSE,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_paddle_event_id ON public.webhook_logs(paddle_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON public.webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

-- 给purchases表添加唯一约束，防止重复处理
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_paddle_transaction_id'
  ) THEN
    ALTER TABLE public.purchases
    ADD CONSTRAINT unique_paddle_transaction_id UNIQUE (paddle_transaction_id);
  END IF;
END $$;

-- 添加处理状态字段
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'completed', 'failed'));

-- 产品配置表（用于管理产品和价格）
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paddle_product_id TEXT UNIQUE NOT NULL,
  paddle_price_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('one_time', 'subscription')),
  credits INTEGER,
  price_amount INTEGER NOT NULL, -- 以分为单位
  price_currency TEXT DEFAULT 'USD',
  billing_cycle TEXT CHECK (billing_cycle IN ('month', 'year', 'one_time')),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 产品表索引
CREATE INDEX IF NOT EXISTS idx_products_paddle_product_id ON public.products(paddle_product_id);
CREATE INDEX IF NOT EXISTS idx_products_paddle_price_id ON public.products(paddle_price_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_display_order ON public.products(display_order);

-- 管理员表
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS策略
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 管理员检查函数（SECURITY DEFINER绕过RLS自引用循环）
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = check_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Webhook日志只有service role可以访问
DROP POLICY IF EXISTS "Service role can manage webhook_logs" ON public.webhook_logs;
CREATE POLICY "Service role can manage webhook_logs" ON public.webhook_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 产品表：所有人可读活跃产品，管理员可管理
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (public.is_admin(auth.uid()));

-- 管理员表：使用函数避免自引用循环
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users" ON public.admin_users
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage admin_users" ON public.admin_users;
CREATE POLICY "Admins can manage admin_users" ON public.admin_users
  FOR ALL USING (public.is_admin(auth.uid()));

-- 插入默认产品（示例数据）
INSERT INTO public.products (paddle_product_id, paddle_price_id, name, description, type, credits, price_amount, billing_cycle, display_order, features)
VALUES
  ('pro_starter', 'pri_starter', 'Starter', 'One-time purchase', 'one_time', 100, 999, 'one_time', 1,
   '["100 form fills", "All ATS platforms", "Local data storage", "Advanced field recognition", "Email support"]'::jsonb),
  ('pro_pro', 'pri_pro', 'Pro', 'One-time purchase', 'one_time', 500, 2999, 'one_time', 2,
   '["500 form fills", "All ATS platforms", "Local data storage", "Advanced field recognition", "Priority support"]'::jsonb),
  ('pro_unlimited_monthly', 'pri_unlimited_monthly', 'Unlimited Monthly', 'Monthly subscription', 'subscription', NULL, 1499, 'month', 3,
   '["Unlimited form fills", "All ATS platforms", "Cloud sync across devices", "AI-powered field matching", "Priority support", "Early access to features"]'::jsonb),
  ('pro_unlimited_yearly', 'pri_unlimited_yearly', 'Unlimited Yearly', 'Yearly subscription', 'subscription', NULL, 9999, 'year', 4,
   '["Unlimited form fills", "All ATS platforms", "Cloud sync across devices", "AI-powered field matching", "Priority support", "Early access to features"]'::jsonb)
ON CONFLICT (paddle_price_id) DO NOTHING;

-- 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 异步处理webhook的函数（供Edge Function调用）
CREATE OR REPLACE FUNCTION process_paddle_transaction(
  p_webhook_log_id UUID,
  p_user_id UUID,
  p_transaction_id TEXT,
  p_product_id TEXT,
  p_amount_cents INTEGER,
  p_currency TEXT
)
RETURNS JSON AS $$
DECLARE
  v_credits INTEGER;
  v_result JSON;
BEGIN
  -- 标记开始处理
  UPDATE webhook_logs
  SET processing_started_at = NOW()
  WHERE id = p_webhook_log_id;

  -- 查询产品配置获取credits
  SELECT credits INTO v_credits
  FROM products
  WHERE paddle_price_id = p_product_id OR paddle_product_id = p_product_id
  LIMIT 1;

  -- 如果没找到配置，使用默认值
  IF v_credits IS NULL THEN
    -- 尝试从产品ID推断
    IF p_product_id LIKE '%starter%' THEN
      v_credits := 100;
    ELSIF p_product_id LIKE '%pro%' THEN
      v_credits := 500;
    ELSE
      v_credits := 0;
    END IF;
  END IF;

  -- 添加credits（如果是一次性购买）
  IF v_credits > 0 THEN
    -- 使用已存在的add_credits函数或直接更新
    INSERT INTO credits (user_id, balance, lifetime_used)
    VALUES (p_user_id, v_credits, 0)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = credits.balance + v_credits;

    -- 记录交易
    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (p_user_id, v_credits, 'purchase', 'Purchased ' || v_credits || ' credits');
  END IF;

  -- 记录购买（幂等性保证：如果已存在则跳过）
  INSERT INTO purchases (
    user_id,
    paddle_transaction_id,
    product_id,
    amount_cents,
    currency,
    credits_added,
    processing_status
  )
  VALUES (
    p_user_id,
    p_transaction_id,
    p_product_id,
    p_amount_cents,
    p_currency,
    v_credits,
    'completed'
  )
  ON CONFLICT (paddle_transaction_id) DO NOTHING;

  -- 标记完成
  UPDATE webhook_logs
  SET
    processed = TRUE,
    processing_completed_at = NOW()
  WHERE id = p_webhook_log_id;

  v_result := json_build_object(
    'success', true,
    'credits_added', v_credits,
    'user_id', p_user_id
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- 记录错误
  UPDATE webhook_logs
  SET
    error = SQLERRM,
    processing_completed_at = NOW()
  WHERE id = p_webhook_log_id;

  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
