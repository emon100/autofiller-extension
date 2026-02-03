import { CreditCard, Infinity, Calendar } from 'lucide-react';
import Link from 'next/link';

interface CreditBalanceProps {
  balance: number;
  lifetimeUsed: number;
  subscription: {
    plan_id: string;
    status: string;
    current_period_end: string;
  } | null;
}

export default function CreditBalance({
  balance,
  lifetimeUsed,
  subscription,
}: CreditBalanceProps) {
  const isUnlimited = subscription?.status === 'active';
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Your Credits</h2>

      {/* Balance Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Available Credits</p>
            <div className="mt-1 flex items-baseline gap-2">
              {isUnlimited ? (
                <>
                  <Infinity className="h-8 w-8 text-blue-600" />
                  <span className="text-3xl font-bold text-gray-900">
                    Unlimited
                  </span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold text-gray-900">
                    {balance}
                  </span>
                  <span className="text-gray-600">credits</span>
                </>
              )}
            </div>
          </div>
          <div className="rounded-full bg-blue-100 p-4">
            <CreditCard className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {isUnlimited && periodEnd && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Renews on {periodEnd}</span>
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Lifetime Usage</span>
            <span className="font-medium text-gray-900">
              {lifetimeUsed} credits used
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isUnlimited && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="font-semibold text-gray-900">Need more credits?</h3>
          <p className="mt-1 text-sm text-gray-600">
            Purchase additional credits or upgrade to unlimited.
          </p>
          <div className="mt-4 flex gap-4">
            <Link
              href="/pricing"
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Buy Credits
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              View Plans
            </Link>
          </div>
        </div>
      )}

      {/* Usage Tips */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold text-gray-900">Credit Usage</h3>
        <ul className="mt-4 space-y-3 text-sm text-gray-600">
          <li className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
              1
            </span>
            Each form fill uses 1 credit
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
              2
            </span>
            Resume parsing uses 2 credits
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
              0
            </span>
            Learning from manual fills is always free
          </li>
        </ul>
      </div>
    </div>
  );
}
