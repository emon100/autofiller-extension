import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Helper to get user from either cookie session or Bearer token
async function getUserFromRequest(request: Request) {
  // First try cookie-based auth (website)
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (user && !authError) {
    return { user, supabase };
  }

  // Then try Bearer token (extension)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const adminClient = createAdminClient();

    const { data: { user: tokenUser }, error: tokenError } = await adminClient.auth.getUser(token);

    if (tokenUser && !tokenError) {
      return { user: tokenUser, supabase: adminClient };
    }
  }

  return { user: null, supabase: null };
}

export async function GET(request: Request) {
  const { user, supabase } = await getUserFromRequest(request);

  if (!user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get credits
  const { data: credits, error: creditsError } = await supabase
    .from('credits')
    .select('balance, lifetime_used')
    .eq('user_id', user.id)
    .single();

  if (creditsError) {
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }

  // Get active subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, status, current_period_end')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    balance: credits?.balance || 0,
    lifetimeUsed: credits?.lifetime_used || 0,
    subscription: subscription
      ? {
          planId: subscription.plan_id,
          status: subscription.status,
          expiresAt: subscription.current_period_end,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const { user, supabase } = await getUserFromRequest(request);

  if (!user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { amount, type, metadata } = body;

  if (!amount || !type) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Check for active subscription (unlimited)
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (subscription) {
    // Unlimited subscription - log but don't deduct
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: 0,
      type,
      description: `${type} (unlimited subscription)`,
      metadata,
    });

    return NextResponse.json({
      success: true,
      newBalance: -1, // -1 indicates unlimited
    });
  }

  // Get current balance
  const { data: credits, error: creditsError } = await supabase
    .from('credits')
    .select('balance')
    .eq('user_id', user.id)
    .single();

  if (creditsError || !credits) {
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }

  // Check if enough credits
  if (credits.balance < Math.abs(amount)) {
    return NextResponse.json(
      { error: 'Insufficient credits', balance: credits.balance },
      { status: 402 }
    );
  }

  // Deduct credits
  const newBalance = credits.balance - Math.abs(amount);

  const { error: updateError } = await supabase
    .from('credits')
    .update({
      balance: newBalance,
      lifetime_used: supabase.rpc('increment_lifetime_used', {
        amount: Math.abs(amount),
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update credits' },
      { status: 500 }
    );
  }

  // Log transaction
  await supabase.from('credit_transactions').insert({
    user_id: user.id,
    amount: -Math.abs(amount),
    type,
    description: `Used ${Math.abs(amount)} credit(s) for ${type}`,
    metadata,
  });

  return NextResponse.json({
    success: true,
    newBalance,
  });
}
