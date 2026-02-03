import { Check } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out AutoFiller',
    features: [
      '20 form fills',
      'All ATS platforms supported',
      'Local data storage',
      'Basic field recognition',
    ],
    cta: 'Get Started',
    href: 'https://chrome.google.com/webstore',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '$9.99',
    priceNote: 'one-time',
    description: 'For active job seekers',
    features: [
      '100 form fills',
      'All ATS platforms supported',
      'Local data storage',
      'Advanced field recognition',
      'Priority support',
    ],
    cta: 'Buy Credits',
    href: '/pricing',
    highlighted: false,
  },
  {
    name: 'Unlimited',
    price: '$14.99',
    priceNote: '/month',
    description: 'For power users and recruiters',
    features: [
      'Unlimited form fills',
      'All ATS platforms supported',
      'Cloud sync across devices',
      'AI-powered field matching',
      'Priority support',
      'Early access to new features',
    ],
    cta: 'Subscribe',
    href: '/pricing',
    highlighted: true,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 ${
                plan.highlighted
                  ? 'border-blue-600 shadow-xl'
                  : 'border-gray-200'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-sm font-medium text-white">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-2 text-gray-600">{plan.description}</p>

              <div className="mt-6">
                <span className="text-4xl font-bold text-gray-900">
                  {plan.price}
                </span>
                {plan.priceNote && (
                  <span className="text-gray-600"> {plan.priceNote}</span>
                )}
              </div>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 text-blue-600" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-8 block w-full rounded-lg py-3 text-center font-semibold ${
                  plan.highlighted
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
