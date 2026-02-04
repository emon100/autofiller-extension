'use client';

import { useState, useEffect } from 'react';
import { Loader2, Link as LinkIcon, Unlink, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import DeleteAccountDialog from './DeleteAccountDialog';
import GoogleIcon from '@/components/auth/GoogleIcon';
import PasswordInput from '@/components/auth/PasswordInput';

interface Identity {
  id: string;
  provider: string;
  identity_data?: { email?: string };
}

interface AccountSettingsProps {
  user: { id: string; email: string; displayName: string };
}

export default function AccountSettings({ user }: AccountSettingsProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loadingIdentities, setLoadingIdentities] = useState(true);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  const supabase = createClient();

  useEffect(() => { loadIdentities(); }, []);

  async function loadIdentities() {
    setLoadingIdentities(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser?.identities) {
      setIdentities(authUser.identities);
      setHasPassword(authUser.identities.some(i => i.provider === 'email'));
    }
    setLoadingIdentities(false);
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', user.id);
    setMessage(error ? '保存失败' : '保存成功');
    setSaving(false);
  };

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    setMessage('');
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?action=link` },
    });
    if (error) { setMessage(`关联失败: ${error.message}`); setLinkingGoogle(false); }
  };

  const handleUnlinkIdentity = async (identity: Identity) => {
    if (identities.length <= 1) { setMessage('至少需要保留一种登录方式'); return; }
    setUnlinkingId(identity.id);
    setMessage('');
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const fullIdentity = authUser?.identities?.find(i => i.id === identity.id);
    if (!fullIdentity) { setMessage('找不到该身份认证方式'); setUnlinkingId(null); return; }
    const { error } = await supabase.auth.unlinkIdentity(fullIdentity);
    if (error) setMessage(`取消关联失败: ${error.message}`);
    else { setMessage('已取消关联'); await loadIdentities(); }
    setUnlinkingId(null);
  };

  const handleSetPassword = async () => {
    if (newPassword !== confirmNewPassword) { setMessage('两次输入的密码不一致'); return; }
    if (newPassword.length < 6) { setMessage('密码至少需要6位'); return; }
    setSettingPassword(true);
    setMessage('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setMessage(`设置密码失败: ${error.message}`);
    else { setMessage('密码设置成功'); setNewPassword(''); setConfirmNewPassword(''); setShowSetPassword(false); await loadIdentities(); }
    setSettingPassword(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setShowDeleteDialog(false);
    try {
      const response = await fetch('/api/account/delete', { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error || 'Failed to delete account');
      await supabase.auth.signOut();
      window.location.href = '/?deleted=true';
    } catch (error) {
      alert(`删除账户失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setDeleting(false);
    }
  };

  const providerNames: Record<string, string> = { google: 'Google', email: '邮箱密码', linkedin_oidc: 'LinkedIn' };
  const getProviderIcon = (p: string) => p === 'google' ? <GoogleIcon /> : p === 'email' ? <KeyRound className="h-5 w-5 text-gray-600" /> : <LinkIcon className="h-5 w-5 text-gray-600" />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">账户设置</h2>

      {/* Profile */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold text-gray-900">个人信息</h3>
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">邮箱</label>
            <input id="email" type="email" value={user.email} disabled className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-500" />
            <p className="mt-1 text-xs text-gray-500">邮箱不可更改</p>
          </div>
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">显示名称</label>
            <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          {message && <p className={`text-sm ${message.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
          <button onClick={handleSave} disabled={saving || displayName === user.displayName} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}保存更改
          </button>
        </div>
      </div>

      {/* Linked Accounts */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold text-gray-900">关联账户</h3>
        <p className="mt-1 text-sm text-gray-600">管理可用于登录的账户方式</p>
        {loadingIdentities ? (
          <div className="mt-4 flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />加载中...</div>
        ) : (
          <div className="mt-4 space-y-3">
            {identities.map((identity) => (
              <div key={identity.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  {getProviderIcon(identity.provider)}
                  <div>
                    <p className="font-medium text-gray-900">{providerNames[identity.provider] || identity.provider}</p>
                    {identity.identity_data?.email && <p className="text-sm text-gray-500">{identity.identity_data.email}</p>}
                  </div>
                </div>
                {identities.length > 1 && (
                  <button onClick={() => handleUnlinkIdentity(identity)} disabled={unlinkingId === identity.id} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                    {unlinkingId === identity.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}取消关联
                  </button>
                )}
              </div>
            ))}
            {!identities.some(i => i.provider === 'google') && (
              <button onClick={handleLinkGoogle} disabled={linkingGoogle} className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {linkingGoogle ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}关联 Google 账户
              </button>
            )}
            {!hasPassword && !showSetPassword && (
              <button onClick={() => setShowSetPassword(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50">
                <KeyRound className="h-5 w-5" />设置密码
              </button>
            )}
            {showSetPassword && (
              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">新密码</label>
                  <div className="mt-1"><PasswordInput value={newPassword} onChange={setNewPassword} placeholder="至少6位" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">确认密码</label>
                  <div className="mt-1"><PasswordInput value={confirmNewPassword} onChange={setConfirmNewPassword} placeholder="再次输入密码" /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSetPassword} disabled={settingPassword || !newPassword || !confirmNewPassword} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {settingPassword && <Loader2 className="h-4 w-4 animate-spin" />}确认
                  </button>
                  <button onClick={() => { setShowSetPassword(false); setNewPassword(''); setConfirmNewPassword(''); }} className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50">取消</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Extension Sync */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold text-gray-900">扩展同步</h3>
        <p className="mt-2 text-sm text-gray-600">将您的账户与 Chrome 扩展同步：</p>
        <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-gray-600">
          <li>打开 OneFillr 扩展</li>
          <li>进入设置</li>
          <li>点击"登录同步"</li>
          <li>使用与此处相同的账户登录</li>
        </ol>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-900">危险区域</h3>
        <p className="mt-2 text-sm text-red-700">删除账户将永久移除您的所有数据和未使用的积分。</p>
        <button onClick={() => setShowDeleteDialog(true)} disabled={deleting} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
          {deleting && <Loader2 className="h-4 w-4 animate-spin" />}{deleting ? '删除中...' : '删除账户'}
        </button>
      </div>

      <DeleteAccountDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={handleDeleteAccount} userEmail={user.email} />
    </div>
  );
}
