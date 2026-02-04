'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, CheckCircle, Loader2, AlertCircle, Copy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Chrome extension API type declaration
declare const chrome: {
  runtime?: {
    sendMessage: (extensionId: string, message: unknown, callback: (response: { success?: boolean }) => void) => void;
    lastError?: { message: string };
  };
} | undefined;

export default function ExtensionConnectPage() {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'connected' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [tokenData, setTokenData] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuthAndConnect();
  }, []);

  async function checkAuthAndConnect() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatus('unauthenticated');
        return;
      }

      // Get token data for extension
      const response = await fetch('/api/extension/token');
      if (!response.ok) {
        throw new Error('Failed to get token');
      }

      const data = await response.json();
      setTokenData(JSON.stringify(data));

      // Try to send to extension via chrome runtime
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        // Get extension ID from URL params or use default
        const params = new URLSearchParams(window.location.search);
        const extensionId = params.get('extensionId');

        if (extensionId) {
          try {
            chrome.runtime.sendMessage(extensionId, { type: 'AUTH_TOKEN', data }, (response) => {
              if (chrome?.runtime?.lastError) {
                console.log('Extension not available, showing manual copy option');
                setStatus('authenticated');
              } else if (response?.success) {
                setStatus('connected');
              } else {
                setStatus('authenticated');
              }
            });
            return;
          } catch {
            // Extension communication failed, show manual option
          }
        }
      }

      setStatus('authenticated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }

  async function handleCopyToken() {
    try {
      await navigator.clipboard.writeText(tokenData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = tokenData;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleLogin() {
    router.push('/login?redirect=/extension/connect');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Zap className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">OneFillr</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-gray-900">
            Connect Extension
          </h1>
          <p className="mt-2 text-gray-600">
            Link your OneFillr extension to your account
          </p>
        </div>

        {/* Status Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {status === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="mt-4 text-gray-600">Connecting...</p>
            </div>
          )}

          {status === 'unauthenticated' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4">
                <AlertCircle className="h-12 w-12 text-amber-500" />
                <p className="mt-4 text-center text-gray-600">
                  Please sign in to connect your extension
                </p>
              </div>
              <button
                onClick={handleLogin}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
              >
                Sign In
              </button>
            </div>
          )}

          {status === 'authenticated' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="mt-4 text-center font-medium text-gray-900">
                  Account Verified
                </p>
                <p className="mt-2 text-center text-sm text-gray-600">
                  Copy the token below and paste it in your extension settings
                </p>
              </div>

              <div className="relative">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <code className="block overflow-x-auto text-xs text-gray-600 whitespace-pre-wrap break-all max-h-24">
                    {tokenData.slice(0, 100)}...
                  </code>
                </div>
                <button
                  onClick={handleCopyToken}
                  className="absolute right-2 top-2 rounded-md bg-white p-2 shadow-sm border border-gray-200 hover:bg-gray-50"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>

              <button
                onClick={handleCopyToken}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    Copy Token
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-500">
                After copying, go to your OneFillr extension, click Settings, and paste the token
              </p>
            </div>
          )}

          {status === 'connected' && (
            <div className="flex flex-col items-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="mt-4 text-xl font-semibold text-gray-900">
                Connected!
              </p>
              <p className="mt-2 text-center text-gray-600">
                Your extension is now linked to your account.
                You can close this window.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="mt-4 text-center text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Need help?{' '}
          <a href="mailto:support@onefil.help" className="text-blue-600 hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
