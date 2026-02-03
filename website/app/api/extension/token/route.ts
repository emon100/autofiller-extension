import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get session token for extension authentication
export async function GET() {
  const supabase = createClient();

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  // Get display name from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + 3600000,
    user: {
      id: user.id,
      email: user.email || '',
      displayName: profile?.display_name || user.email || 'User',
      avatarUrl: profile?.avatar_url,
    },
  });
}
