'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Check, Zap, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { openCheckout, PRODUCTS } from '@/lib/paddle';

type BillingCycle = 'monthly' | 'yearly';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  credits: string;
  features: string[];
  popular?: boolean;
  productId: {
    monthly: string;
    yearly: string;
  };
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'One-time purchase',
    monthlyPrice: 9.99,
    yearlyPrice: 9.99,
    credits: '100 credits',
    features: [
      '100 form fills',
      'All ATS platforms',
      'Local data storage',
      'Advanced field recognition',
      'Email support',
    ],
    productId: {
      monthly: PRODUCTS.STARTER,
      yearly: PRODUCTS.STARTER,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'One-time purchase',
    monthlyPrice: 29.99,
    yearlyPrice: 29.99,
    credits: '500 credits',
    features: [
      '500 form fills',
      'All ATS platforms',
      'Local data storage',
      'Advanced field recognition',
      'Priority support',
    ],
    productId: {
      monthly: PRODUCTS.PRO,
      yearly: PRODUCTS.PRO,
    },
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    description: 'Subscription',
    monthlyPrice: 14.99,
    yearlyPrice: 99.99,
    credits: 'Unlimited',
    features: [
      'Unlimited form fills',
      'All ATS platforms',
      'Cloud sync across devices',
      'AI-powered field matching',
      'Priority support',
      'Early access to features',
    ],
    popular: true,
    productId: {
      monthly: PRODUCTS.UNLIMITED_MONTHLY,
      yearly: PRODUCTS.UNLIMITED_YEARLY,
    },
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const initializedRef = useRef(false);

  const supabase = useMemo(() => createClient(), []);

  const handlePurchase = async (plan: Plan, cycle?: BillingCycle) => {
    const effectiveCycle = cycle || billingCycle;

    // Check if user is logged in
    if (!user) {
      window.location.href = `/login?redirect=/pricing&plan=${plan.id}&cycle=${effectiveCycle}`;
      return;
    }

    const priceId =
      effectiveCycle === 'monthly'
        ? plan.productId.monthly
        : plan.productId.yearly;

    await openCheckout({
      priceId,
    });
  };

  useEffect(() => {
    // Only run once
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Check auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({ id: user.id, email: user.email || '' });

        // Check if returning from login with plan selection
        const params = new URLSearchParams(window.location.search);
        const planId = params.get('plan');
        const cycle = params.get('cycle') as BillingCycle | null;

        if (planId && cycle) {
          // Auto-trigger purchase after login
          const selectedPlan = plans.find((p) => p.id === planId);
          if (selectedPlan) {
            setBillingCycle(cycle);
            // Clear URL params first
            window.history.replaceState({}, '', '/pricing');
            // Then trigger checkout
            setTimeout(() => {
              handlePurchase(selectedPlan, cycle);
            }, 500);
          }
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold">AutoFiller</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Start with 20 free credits. Upgrade anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-1 text-xs text-green-600">Save 45%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-3">
          {plans.map((plan) => {
            const price =
              billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
            const isSubscription = plan.id === 'unlimited';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-white p-8 ${
                  plan.popular
                    ? 'border-blue-600 shadow-xl'
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-sm font-medium text-white">
                    Most Popular
                  </div>
                )}

                <h3 className="text-xl font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-gray-600">{plan.description}</p>

                <div className="mt-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ${price}
                  </span>
                  {isSubscription && (
                    <span className="text-gray-600">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                </div>

                <div className="mt-2 text-sm font-medium text-blue-600">
                  {plan.credits}
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 flex-shrink-0 text-blue-600" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePurchase(plan)}
                  className={`mt-8 w-full rounded-lg py-3 font-semibold ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {user ? 'Purchase' : 'Login to Purchase'}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ Link */}
        <div className="mt-16 text-center">
          <p className="text-gray-600">
            Have questions?{' '}
            <Link href="/#faq" className="text-blue-600 hover:underline">
              Check our FAQ
            </Link>{' '}
            or{' '}
            <a
              href="mailto:support@autofiller.app"
              className="text-blue-600 hover:underline"
            >
              contact us
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
