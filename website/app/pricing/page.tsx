'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Check, Zap, ArrowLeft, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { openCheckout } from '@/lib/paddle';
import { Plan, Product, groupProductsByPlan } from '@/lib/products';

type BillingCycle = 'monthly' | 'yearly';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const supabase = useMemo(() => createClient(), []);

  const handlePurchase = async (plan: Plan, cycle: BillingCycle = billingCycle) => {
    if (!user) {
      window.location.href = `/login?redirect=/pricing&plan=${plan.id}&cycle=${cycle}`;
      return;
    }
    const priceId = cycle === 'monthly' ? plan.monthlyPriceId : plan.yearlyPriceId;
    await openCheckout({ priceId });
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        return data.products ? groupProductsByPlan(data.products) : [];
      } catch {
        return [];
      }
    };

    // 并行加载产品和用户状态
    Promise.all([
      fetchProducts(),
      supabase.auth.getUser()
    ]).then(async ([groupedPlans, { data: { user } }]) => {
      setPlans(groupedPlans);
      setLoading(false);

      if (user) {
        setUser({ id: user.id, email: user.email || '' });

        // 登录后自动触发购买
        const params = new URLSearchParams(window.location.search);
        const planId = params.get('plan');
        const cycle = params.get('cycle') as BillingCycle | null;

        if (planId && cycle) {
          window.history.replaceState({}, '', '/pricing');
          setBillingCycle(cycle);
          const selectedPlan = groupedPlans.find(p => p.id === planId);
          if (selectedPlan) {
            setTimeout(() => handlePurchase(selectedPlan, cycle), 500);
          }
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold">OneFillr</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Choose Your Plan</h1>
          <p className="mt-4 text-lg text-gray-600">Start with 20 free credits. Upgrade anytime.</p>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {(['monthly', 'yearly'] as const).map(cycle => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  billingCycle === cycle ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {cycle === 'monthly' ? 'Monthly' : <>Yearly<span className="ml-1 text-xs text-green-600">Save 45%</span></>}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : plans.length === 0 ? (
          <div className="mt-12 text-center text-gray-600">No plans available. Please check back later.</div>
        ) : (
          <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-3">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-white p-8 ${plan.popular ? 'border-blue-600 shadow-xl' : 'border-gray-200'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-sm font-medium text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{plan.description}</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                  </span>
                  {plan.isSubscription && <span className="text-gray-600">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>}
                </div>
                <div className="mt-2 text-sm font-medium text-blue-600">{plan.credits}</div>
                <ul className="mt-8 space-y-4">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 flex-shrink-0 text-blue-600" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePurchase(plan)}
                  className={`mt-8 w-full rounded-lg py-3 font-semibold ${
                    plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {user ? 'Purchase' : 'Login to Purchase'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <p className="text-gray-600">
            Have questions? <Link href="/#faq" className="text-blue-600 hover:underline">Check our FAQ</Link> or{' '}
            <a href="mailto:support@onefil.help" className="text-blue-600 hover:underline">contact us</a>
          </p>
        </div>
      </main>
    </div>
  );
}
