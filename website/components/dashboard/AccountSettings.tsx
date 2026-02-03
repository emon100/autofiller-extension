'use client';

import { useState } from 'react';
import { User, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import DeleteAccountDialog from './DeleteAccountDialog';

interface AccountSettingsProps {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

export default function AccountSettings({ user }: AccountSettingsProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const supabase = createClient();

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id);

    if (error) {
      setMessage('Failed to save changes');
    } else {
      setMessage('Changes saved successfully');
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setShowDeleteDialog(false);

    try {
      // 调用 API 删除账户（API 会使用 admin client 删除 auth 用户）
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to delete account');
      }

      console.log('Account deleted successfully');

      // 登出并重定向
      await supabase.auth.signOut();
      window.location.href = '/?deleted=true';

    } catch (error) {
      console.error('Error deleting account:', error);
      alert(`Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support.`);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>

      {/* Profile Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold text-gray-900">Profile</h3>

        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Email cannot be changed
            </p>
          </div>

          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-700"
            >
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.includes('success')
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {message}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || displayName === user.displayName}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Extension Sync */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold text-gray-900">Extension Sync</h3>
        <p className="mt-2 text-sm text-gray-600">
          To sync your account with the Chrome extension:
        </p>
        <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-gray-600">
          <li>Open the AutoFiller extension</li>
          <li>Go to Settings</li>
          <li>Click &quot;Sign in to sync&quot;</li>
          <li>Use the same account you&apos;re logged in with here</li>
        </ol>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-900">Danger Zone</h3>
        <p className="mt-2 text-sm text-red-700">
          Deleting your account will permanently remove all your data and unused
          credits.
        </p>
        <button
          onClick={() => setShowDeleteDialog(true)}
          disabled={deleting}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
          {deleting ? 'Deleting...' : 'Delete Account'}
        </button>
      </div>

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAccount}
        userEmail={user.email}
      />
    </div>
  );
}
