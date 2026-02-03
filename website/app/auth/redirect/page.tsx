'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthRedirectPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const checkRedirect = () => {
      // 读取localStorage中的redirect信息
      const redirectDataStr = localStorage.getItem('auth_redirect');

      console.log('Auth redirect - attempt:', attempts, 'data:', redirectDataStr);

      if (redirectDataStr) {
        try {
          const { redirect, plan, cycle } = JSON.parse(redirectDataStr);
          console.log('Found redirect data:', { redirect, plan, cycle });

          // 清除localStorage
          localStorage.removeItem('auth_redirect');

          // 重定向到目标页面
          if (redirect && plan && cycle) {
            router.push(`${redirect}?plan=${plan}&cycle=${cycle}`);
            return true;
          }
        } catch (e) {
          console.error('Failed to parse redirect data:', e);
        }
      }

      return false;
    };

    // 立即尝试一次
    if (checkRedirect()) {
      return;
    }

    // 如果没有找到，等待一小段时间后重试（最多3次）
    // 这是为了处理 localStorage 可能还没同步的情况
    if (attempts < 3) {
      const timer = setTimeout(() => {
        setAttempts(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    }

    // 没有redirect信息，跳转到dashboard
    console.log('No redirect data after retries, going to dashboard');
    router.push('/dashboard');
  }, [router, attempts]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
