'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Zap, Loader2, Mail, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { translateAuthError } from '@/lib/auth-utils';
import GoogleIcon from '@/components/auth/GoogleIcon';
import PasswordInput from '@/components/auth/PasswordInput';

type LoginMethod = 'password' | 'otp';
type OtpStage = 'idle' | 'sent' | 'verifying';

function ExtensionAuthContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [otpStage, setOtpStage] = useState<OtpStage>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const redirectUri = searchParams.get('redirect_uri');

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    if (otpStage === 'sent') otpInputRef.current?.focus();
  }, [otpStage]);

  useEffect(() => {
    if (!redirectUri) {
      setError('Missing redirect_uri parameter');
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) redirectWithToken();
    });
  }, []);

  async function redirectWithToken() {
    if (!redirectUri) return;
    try {
      const response = await fetch('/api/extension/token');
      if (!response.ok) throw new Error('Failed to get token');
      const tokenData = await response.json();
      window.location.href = `${redirectUri}?token=${encodeURIComponent(JSON.stringify(tokenData))}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get token');
    }
  }

  const resetOtpState = () => { setOtpStage('idle'); setOtpCode(''); setCooldown(0); };

  async function handleGoogleLogin() {
    if (!redirectUri) return;
    sessionStorage.setItem('extension_redirect_uri', redirectUri);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/extension/auth/callback` },
    });
    if (error) setError(translateAuthError(error.message));
  }

  async function handlePasswordLogin() {
    if (!redirectUri) return;
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(translateAuthError(error.message)); setLoading(false); }
    else await redirectWithToken();
  }

  async function handleSendOtp() {
    if (!redirectUri) return;
    setLoading(true);
    setError('');
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(translateAuthError(error.message));
    else { setOtpStage('sent'); setMessage('验证码已发送到您的邮箱'); setCooldown(60); }
    setLoading(false);
  }

  async function handleVerifyOtp() {
    if (!redirectUri || otpCode.length !== 6) { setError('请输入6位验证码'); return; }
    setLoading(true);
    setOtpStage('verifying');
    setError('');
    const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' });
    if (error) { setError(translateAuthError(error.message)); setOtpStage('sent'); setLoading(false); }
    else await redirectWithToken();
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMethod === 'otp' ? (otpStage === 'idle' ? handleSendOtp() : handleVerifyOtp()) : handlePasswordLogin();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">1Fillr</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">连接扩展</h1>
          <p className="mt-2 text-sm text-gray-600">登录以同步您的积分</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {error && !redirectUri ? (
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button onClick={() => window.location.reload()} className="text-blue-600 hover:underline">重试</button>
            </div>
          ) : !redirectUri ? (
            <div className="text-center text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />加载中...
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <GoogleIcon />
                Google 登录
              </button>

              <div className="flex items-center">
                <div className="flex-1 border-t border-gray-200" />
                <span className="px-3 text-sm text-gray-500">或</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <div className="flex items-center justify-center gap-4 text-sm">
                {([{ method: 'password', icon: KeyRound, label: '密码' }, { method: 'otp', icon: Mail, label: '验证码' }] as const).map(({ method, icon: Icon, label }) => (
                  <label key={method} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="loginMethod"
                      checked={loginMethod === method}
                      onChange={() => { setLoginMethod(method); if (method === 'password') resetOtpState(); setError(''); }}
                      className="text-blue-600"
                    />
                    <Icon className="h-4 w-4" />
                    {label}
                  </label>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="邮箱地址"
                  required
                  disabled={otpStage !== 'idle'}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                />

                {loginMethod === 'password' && (
                  <PasswordInput value={password} onChange={setPassword} placeholder="密码" className="py-2.5" />
                )}

                {loginMethod === 'otp' && otpStage !== 'idle' && (
                  <div className="flex gap-2">
                    <input
                      ref={otpInputRef}
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="验证码"
                      maxLength={6}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-center tracking-widest focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading || cooldown > 0}
                      className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {cooldown > 0 ? `${cooldown}s` : '重发'}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email || (loginMethod === 'password' && !password)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loginMethod === 'otp' ? (otpStage === 'idle' ? '发送验证码' : '验证登录') : '登录'}
                </button>
              </form>

              {message && <div className="rounded-lg bg-green-50 p-2 text-sm text-green-700">{message}</div>}
              {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</div>}
            </div>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-gray-500">登录成功后此窗口将自动关闭</p>
      </div>
    </div>
  );
}

export default function ExtensionAuthPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
      <ExtensionAuthContent />
    </Suspense>
  );
}
