'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ExtensionAuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      // Get redirect_uri from session storage
      const redirectUri = sessionStorage.getItem('extension_redirect_uri');
      sessionStorage.removeItem('extension_redirect_uri');

      if (!redirectUri) {
        throw new Error('Missing redirect URI. Please try signing in again from the extension.');
      }

      // Wait for auth state to be ready
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Authentication failed. Please try again.');
      }

      // Get token data
      const response = await fetch('/api/extension/token');
      if (!response.ok) {
        throw new Error('Failed to get authentication token');
      }

      const tokenData = await response.json();
      const encodedToken = encodeURIComponent(JSON.stringify(tokenData));

      setStatus('success');

      // Small delay to show success message
      setTimeout(() => {
        // Redirect to extension callback with token
        window.location.href = `${redirectUri}?token=${encodedToken}`;
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStatus('error');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Completing sign in...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="mt-4 text-gray-900 font-medium">Success!</p>
            <p className="mt-2 text-gray-600">Returning to extension...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="mt-4 text-red-600">{error}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Close this window
            </button>
          </>
        )}
      </div>
    </div>
  );
}
