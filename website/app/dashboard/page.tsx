import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user's credits
  const { data: credits } = await supabase
    .from('credits')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Fetch recent transactions
  const { data: transactions } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  return (
    <DashboardClient
      user={{
        id: user.id,
        email: user.email || '',
        displayName: user.user_metadata?.full_name || user.email || '',
      }}
      credits={credits || { balance: 20, lifetime_used: 0 }}
      transactions={transactions || []}
      subscription={subscription}
    />
  );
}
