import { ArrowUpRight, ArrowDownRight, Gift, CreditCard } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

interface UsageHistoryProps {
  transactions: Transaction[];
}

const typeIcons: Record<string, typeof CreditCard> = {
  purchase: CreditCard,
  fill: ArrowDownRight,
  resume_parse: ArrowDownRight,
  bonus: Gift,
};

const typeColors: Record<string, string> = {
  purchase: 'text-green-600 bg-green-100',
  fill: 'text-red-600 bg-red-100',
  resume_parse: 'text-red-600 bg-red-100',
  bonus: 'text-purple-600 bg-purple-100',
};

export default function UsageHistory({ transactions }: UsageHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Usage History</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">No transactions yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Start using AutoFiller to see your usage history
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Usage History</h2>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="divide-y divide-gray-200">
          {transactions.map((transaction) => {
            const Icon = typeIcons[transaction.type] || CreditCard;
            const colorClass = typeColors[transaction.type] || 'text-gray-600 bg-gray-100';
            const isPositive = transaction.amount > 0;

            return (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-2 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {transaction.description || transaction.type}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString(
                        undefined,
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1 font-semibold ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {isPositive ? '+' : ''}
                  {transaction.amount}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
