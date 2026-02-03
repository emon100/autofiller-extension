'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Mail, Loader2, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { translateAuthError } from '@/lib/auth-utils';
import GoogleIcon from '@/components/auth/GoogleIcon';
import PasswordInput from '@/components/auth/PasswordInput';

type AuthMode = 'login' | 'signup';
type LoginMethod = 'password' | 'otp';
type OtpStage = 'idle' | 'sent' | 'verifying';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [otpStage, setOtpStage] = useState<OtpStage>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();
  const otpInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        const plan = params.get('plan');
        const cycle = params.get('cycle');
        router.push(redirect && plan && cycle ? `${redirect}?plan=${plan}&cycle=${cycle}` : redirect || '/dashboard');
      } else {
        setCheckingAuth(false);
      }
    });
  }, [supabase.auth, router]);

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const resetOtpState = () => {
    setOtpStage('idle');
    setOtpCode('');
    setCooldown(0);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    const plan = params.get('plan');
    const cycle = params.get('cycle');
    if (redirect && plan && cycle) {
      localStorage.setItem('auth_redirect', JSON.stringify({ redirect, plan, cycle }));
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(translateAuthError(error.message));
      setLoading(false);
    }
  };

  const handlePasswordSignup = async () => {
    if (password !== confirmPassword) return setError('两次输入的密码不一致');
    if (password.length < 6) return setError('密码至少需要6位');

    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(translateAuthError(error.message));
    } else {
      setMessage('注册成功！正在登录...');
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) setError(translateAuthError(loginError.message));
      else router.push('/dashboard');
    }
    setLoading(false);
  };

  const handlePasswordLogin = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(translateAuthError(error.message));
    else router.push(new URLSearchParams(window.location.search).get('redirect') || '/dashboard');
    setLoading(false);
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setError(translateAuthError(error.message));
    } else {
      setOtpStage('sent');
      setMessage('登录链接已发送到您的邮箱，请点击链接或输入邮件中的验证码');
      setCooldown(60);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return setError('请输入6位验证码');
    setLoading(true);
    setOtpStage('verifying');
    setError('');
    const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' });
    if (error) {
      setError(translateAuthError(error.message));
      setOtpStage('sent');
    } else {
      router.push(new URLSearchParams(window.location.search).get('redirect') || '/dashboard');
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMethod === 'otp') {
      otpStage === 'idle' ? handleSendOtp() : handleVerifyOtp();
    } else {
      authMode === 'signup' ? handlePasswordSignup() : handlePasswordLogin();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Zap className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">AutoFiller</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-gray-900">
            {authMode === 'login' ? '欢迎回来' : '创建账户'}
          </h1>
          <p className="mt-2 text-gray-600">
            {authMode === 'login' ? '登录管理您的账户和积分' : '注册开始使用自动填充'}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <GoogleIcon />
            Google 登录
          </button>

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-4 text-sm text-gray-500">或</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <div className="mb-4 flex rounded-lg border border-gray-200 p-1">
            {(['login', 'signup'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setAuthMode(mode); if (mode === 'signup') setLoginMethod('password'); resetOtpState(); setError(''); setMessage(''); }}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${authMode === mode ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {mode === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          {authMode === 'login' && (
            <div className="mb-4 flex items-center gap-4 text-sm">
              <span className="text-gray-600">登录方式:</span>
              {([{ method: 'password', icon: KeyRound, label: '密码' }, { method: 'otp', icon: Mail, label: '邮箱链接' }] as const).map(({ method, icon: Icon, label }) => (
                <label key={method} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="loginMethod"
                    checked={loginMethod === method}
                    onChange={() => { setLoginMethod(method); if (method === 'password') resetOtpState(); setError(''); setMessage(''); }}
                    className="text-blue-600"
                  />
                  <Icon className="h-4 w-4" />
                  {label}
                </label>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">邮箱地址</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={otpStage !== 'idle'}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>

            {(loginMethod === 'password' || authMode === 'signup') && (
              <>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">密码</label>
                  <div className="mt-1">
                    <PasswordInput id="password" value={password} onChange={setPassword} />
                  </div>
                </div>
                {authMode === 'signup' && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">确认密码</label>
                    <div className="mt-1">
                      <PasswordInput id="confirmPassword" value={confirmPassword} onChange={setConfirmPassword} />
                    </div>
                  </div>
                )}
              </>
            )}

            {loginMethod === 'otp' && authMode === 'login' && otpStage !== 'idle' && (
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700">验证码（邮件中6位数字）</label>
                  <button type="button" onClick={() => { resetOtpState(); setEmail(''); }} className="text-xs text-blue-600 hover:underline">换个邮箱</button>
                </div>
                <p className="text-xs text-gray-500 mb-2">或直接点击邮件中的登录链接</p>
                <div className="mt-1 flex gap-2">
                  <input
                    ref={otpInputRef}
                    id="otpCode"
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center tracking-widest focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading || cooldown > 0}
                    className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {cooldown > 0 ? `${cooldown}s` : '重新发送'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || (loginMethod === 'password' && !password)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loginMethod === 'otp' && authMode === 'login' ? (otpStage === 'idle' ? '发送登录链接' : '验证登录') : authMode === 'signup' ? '注册' : '登录'}
            </button>
          </form>

          {message && <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
          {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          登录即表示您同意我们的{' '}
          <Link href="/terms" className="text-blue-600 hover:underline">服务条款</Link>{' '}和{' '}
          <Link href="/privacy" className="text-blue-600 hover:underline">隐私政策</Link>
        </p>
      </div>
    </div>
  );
}
