import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  // 默认跳转到dashboard
  let next = '/dashboard';

  if (code) {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(
            cookiesToSet: Array<{
              name: string;
              value: string;
              options: CookieOptions;
            }>
          ) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    const forwardedHost = request.headers.get('x-forwarded-host')
    const origin = forwardedHost
        ? `https://${forwardedHost}`
        : requestUrl.origin

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, origin)
      );
    }

    // 登录成功，重定向到特殊页面让客户端读取localStorage
    console.log('Auth successful, redirecting to auth-redirect');
    return NextResponse.redirect(new URL('/auth/redirect', origin));
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const origin = forwardedHost
      ? `https://${forwardedHost}`
      : requestUrl.origin

  return NextResponse.redirect(new URL(next, origin));
}
