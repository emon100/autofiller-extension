import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

async function verifyAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  return adminUser ? user : null;
}

// GET: Search user by email and return credits info
export async function GET(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email')?.trim();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Search user by email
  const { data: { users }, error: userError } = await adminClient.auth.admin.listUsers();
  if (userError) {
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }

  const matchedUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!matchedUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get credits
  const { data: credits } = await adminClient
    .from('credits')
    .select('balance, lifetime_used, updated_at')
    .eq('user_id', matchedUser.id)
    .single();

  // Get active subscription
  const { data: subscription } = await adminClient
    .from('subscriptions')
    .select('plan_id, status, current_period_end')
    .eq('user_id', matchedUser.id)
    .eq('status', 'active')
    .single();

  return NextResponse.json({
    userId: matchedUser.id,
    email: matchedUser.email,
    displayName: matchedUser.user_metadata?.display_name || matchedUser.user_metadata?.full_name || '',
    balance: credits?.balance ?? 0,
    lifetimeUsed: credits?.lifetime_used ?? 0,
    updatedAt: credits?.updated_at,
    subscription: subscription ? {
      planId: subscription.plan_id,
      status: subscription.status,
      expiresAt: subscription.current_period_end,
    } : null,
  });
}

// POST: Set credits for a user
export async function POST(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { userId, newBalance, reason } = body;

  if (!userId || newBalance === undefined || newBalance === null) {
    return NextResponse.json({ error: 'userId and newBalance are required' }, { status: 400 });
  }

  if (typeof newBalance !== 'number' || newBalance < 0) {
    return NextResponse.json({ error: 'newBalance must be a non-negative number' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Get current balance
  const { data: credits } = await adminClient
    .from('credits')
    .select('balance')
    .eq('user_id', userId)
    .single();

  const oldBalance = credits?.balance ?? 0;
  const diff = newBalance - oldBalance;

  // Update credits
  const { error: updateError } = await adminClient
    .from('credits')
    .upsert({
      user_id: userId,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
  }

  // Log transaction
  await adminClient.from('credit_transactions').insert({
    user_id: userId,
    amount: diff,
    type: 'admin_adjustment',
    description: reason || `Admin adjusted credits: ${oldBalance} → ${newBalance}`,
    metadata: { admin_email: admin.email, old_balance: oldBalance },
  });

  return NextResponse.json({
    success: true,
    oldBalance,
    newBalance,
  });
}
