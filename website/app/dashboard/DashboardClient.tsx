'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Zap, CreditCard, History, Settings, LogOut, Plus, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CreditBalance from '@/components/dashboard/CreditBalance';
import UsageHistory from '@/components/dashboard/UsageHistory';
import AccountSettings from '@/components/dashboard/AccountSettings';

interface DashboardProps {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  credits: {
    balance: number;
    lifetime_used: number;
  };
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    description: string;
    created_at: string;
  }>;
  subscription: {
    plan_id: string;
    status: string;
    current_period_end: string;
  } | null;
}

type Tab = 'credits' | 'history' | 'settings';

export default function DashboardClient({
  user,
  credits,
  transactions,
  subscription,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('credits');
  const [currentBalance, setCurrentBalance] = useState(credits.balance);
  const [rechargeDelta, setRechargeDelta] = useState<number | null>(null);
  const prevBalanceRef = useRef(credits.balance);
  const supabase = createClient();

  const pollCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/credits');
      if (!res.ok) return;
      const data = await res.json();
      const newBalance = data.balance as number;
      if (newBalance > prevBalanceRef.current) {
        setRechargeDelta(newBalance - prevBalanceRef.current);
        setTimeout(() => setRechargeDelta(null), 5000);
      }
      prevBalanceRef.current = newBalance;
      setCurrentBalance(newBalance);
    } catch {
      // ignore network errors
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'credits') return;
    const id = setInterval(pollCredits, 10_000);
    return () => clearInterval(id);
  }, [activeTab, pollCredits]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const tabs = [
    { id: 'credits' as Tab, label: 'Credits', icon: CreditCard },
    { id: 'history' as Tab, label: 'History', icon: History },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold">1Fillr</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Recharge Banner */}
      {rechargeDelta !== null && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <p className="font-medium">Credits topped up! +{rechargeDelta} credits</p>
            <button
              onClick={() => setRechargeDelta(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Sidebar */}
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}

            <div className="pt-4">
              <Link
                href="/pricing"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Buy Credits
              </Link>
            </div>
          </nav>

          {/* Main Content */}
          <main className="md:col-span-3">
            {activeTab === 'credits' && (
              <CreditBalance
                balance={currentBalance}
                lifetimeUsed={credits.lifetime_used}
                subscription={subscription}
              />
            )}
            {activeTab === 'history' && (
              <UsageHistory transactions={transactions} />
            )}
            {activeTab === 'settings' && (
              <AccountSettings user={user} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
