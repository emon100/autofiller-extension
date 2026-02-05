-- Migration: 003_atomic_deduct
-- Atomic credit deduction function to prevent race conditions

-- Function to atomically deduct credits (returns new balance, or -1 if insufficient)
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE public.credits
  SET
    balance = balance - p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND balance >= p_amount  -- Only deduct if sufficient balance
  RETURNING balance INTO v_new_balance;

  -- Return -1 if no rows updated (insufficient balance)
  IF v_new_balance IS NULL THEN
    RETURN -1;
  END IF;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refund credits (always succeeds)
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE public.credits
  SET
    balance = balance + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  RETURN COALESCE(v_new_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
