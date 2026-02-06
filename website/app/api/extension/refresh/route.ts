import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(request: Request) {
  let body: { refreshToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  const { refreshToken } = body;
  if (!refreshToken) {
    return NextResponse.json({ error: 'refreshToken required' }, { status: 400, headers: corsHeaders });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session || !data.user) {
    return NextResponse.json({ error: 'Refresh failed. Please sign in again.' }, { status: 401, headers: corsHeaders });
  }

  const { session, user } = data;

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
  }, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
