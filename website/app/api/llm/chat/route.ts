import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'vercel') as 'vercel' | 'openrouter';
const LLM_MODEL = process.env.LLM_MODEL || 'openai/gpt-4o-mini';
const LLM_CHAT_CREDIT_COST = parseInt(process.env.LLM_CHAT_CREDIT_COST || '2', 10);

const getModel = () =>
  LLM_PROVIDER === 'openrouter'
    ? createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY || '' })(LLM_MODEL)
    : gateway(LLM_MODEL);

const MAX_PROMPT_LENGTH = 50000;
const MAX_SYSTEM_LENGTH = 2000;

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const adminClient = createAdminClient();
  const { data: { user }, error: authError } = await adminClient.auth.getUser(authHeader.slice(7));

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  let body: { prompt?: string; systemPrompt?: string; maxTokens?: number; temperature?: number; imageBase64?: string; mimeType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  const { prompt, systemPrompt, maxTokens = 2000, temperature = 0, imageBase64, mimeType } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json({ error: 'prompt required (max 50000 chars)' }, { status: 400, headers: corsHeaders });
  }

  if (systemPrompt && (typeof systemPrompt !== 'string' || systemPrompt.length > MAX_SYSTEM_LENGTH)) {
    return NextResponse.json({ error: 'systemPrompt too long (max 2000 chars)' }, { status: 400, headers: corsHeaders });
  }

  const supabase = adminClient;

  // Check subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const hasUnlimitedPlan = !!subscription;
  let creditsDeducted = false;

  if (!hasUnlimitedPlan) {
    const { data: deductResult, error: deductError } = await supabase
      .rpc('deduct_credits', { p_user_id: user.id, p_amount: LLM_CHAT_CREDIT_COST });

    if (deductError) {
      return NextResponse.json({ error: 'Payment processing failed' }, { status: 500, headers: corsHeaders });
    }

    if (deductResult === -1) {
      const { data: credits } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      return NextResponse.json({
        error: 'Insufficient credits',
        balance: credits?.balance || 0,
        required: LLM_CHAT_CREDIT_COST,
      }, { status: 402, headers: corsHeaders });
    }

    creditsDeducted = true;
  }

  try {
    const { text } = await generateText({
      model: getModel(),
      system: systemPrompt || undefined,
      messages: imageBase64
        ? [{
            role: 'user' as const,
            content: [
              { type: 'image' as const, image: `data:${mimeType || 'image/png'};base64,${imageBase64}` },
              { type: 'text' as const, text: prompt },
            ],
          }]
        : [{ role: 'user' as const, content: prompt }],
      temperature,
      maxOutputTokens: Math.min(maxTokens, 4000),
    });

    if (creditsDeducted) {
      supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: -LLM_CHAT_CREDIT_COST,
        type: imageBase64 ? 'resume_parse' : 'llm_chat',
        description: imageBase64 ? 'Resume image parsing' : 'LLM chat request',
        metadata: { model: LLM_MODEL },
      }).then(() => {});
    }

    return NextResponse.json({ success: true, text }, { headers: corsHeaders });

  } catch (err) {
    if (creditsDeducted) {
      const { error: refundError } = await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: LLM_CHAT_CREDIT_COST });
      if (refundError) {
        console.error('CRITICAL: Refund failed', { userId: user.id, amount: LLM_CHAT_CREDIT_COST });
      }

      supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: LLM_CHAT_CREDIT_COST,
        type: 'refund',
        description: 'Refund for failed LLM chat request',
      }).then(() => {});
    }

    console.error('LLM chat error:', err);
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
