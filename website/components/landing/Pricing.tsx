'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

interface Product {
  id: string;
  name: string;
  description: string | null;
  type: 'credits' | 'subscription';
  billing_cycle: 'month' | 'year' | 'lifetime' | null;
  credit_amount: number | null;
  price_amount: number;
  features: string[] | null;
}

function groupProductsForDisplay(products: Product[], t: (key: string, params?: Record<string, string | number>) => string) {
  const plans: {
    name: string;
    price: string;
    priceNote: string;
    description: string;
    features: string[];
    cta: string;
    href: string;
    highlighted: boolean;
  }[] = [];

  for (const product of products) {
    // 只显示月付价格
    if (product.billing_cycle === 'year') continue;

    const planName = product.name.split(' ')[0];
    const priceInDollars = product.price_amount / 100;
    const isSubscription = product.type === 'subscription';

    plans.push({
      name: planName,
      price: `$${priceInDollars}`,
      priceNote: isSubscription ? t('pricing.perMonth') : t('pricing.oneTime'),
      description: product.description || (isSubscription ? 'For power users' : 'For active job seekers'),
      features: product.features || [],
      cta: isSubscription ? t('pricing.subscription') : t('pricing.purchase'),
      href: '/pricing',
      highlighted: planName.toLowerCase() === 'unlimited',
    });
  }

  return plans;
}

export default function Pricing() {
  const { t, tArray } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const freePlanFeatures = tArray('pricing.free.features');

  const freePlan = {
    name: t('pricing.free.name'),
    price: '$0',
    priceNote: '',
    description: t('pricing.free.description'),
    features: freePlanFeatures.length > 0 ? freePlanFeatures : ['20 form fills', 'All ATS platforms supported', 'Local data storage', 'Basic field recognition'],
    cta: t('pricing.free.cta'),
    href: '/download',
    highlighted: false,
  };

  const dbPlans = groupProductsForDisplay(products, t);
  const plans = [freePlan, ...dbPlans];

  return (
    <section id="pricing" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t('pricing.title')}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t('pricing.subtitle')}
          </p>
        </div>

        {loading ? (
          <div className="mt-16 text-center text-gray-500">{t('common.loading')}</div>
        ) : (
          <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
            {plans.map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 ${plan.highlighted ? 'border-blue-600 shadow-xl' : 'border-gray-200'}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-sm font-medium text-white">
                    {t('pricing.mostPopular')}
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-gray-600">{plan.description}</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.priceNote && <span className="text-gray-600"> {plan.priceNote}</span>}
                </div>
                <ul className="mt-8 space-y-4">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 flex-shrink-0 text-blue-600" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-8 block w-full rounded-lg py-3 text-center font-semibold ${
                    plan.highlighted ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
