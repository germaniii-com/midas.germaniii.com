import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@heroui/react';
import { PlusIcon, ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import { getAccount, type Account } from '../../../api/accounts';
import { getTransactions, type Transaction } from '../../../api/transactions';

function formatCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AccountTransactionsPage() {
  const { id, accountId } = useParams<{ id: string; accountId: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !accountId) return;
    setLoading(true);
    Promise.all([
      getAccount(id, accountId),
      getTransactions(id, accountId),
    ])
      .then(([acc, txs]) => {
        setAccount(acc);
        setTransactions(txs);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, [id, accountId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="light"
        onPress={() => navigate(`/binders/${id}/accounts`)}
        startContent={<ArrowLeftIcon width={18} />}
        className="mb-4"
      >
        Back to Accounts
      </Button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {account ? account.name : 'Transactions'}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="light"
            onPress={() => navigate(`/binders/${id}/accounts/${accountId}`)}
            startContent={<PencilIcon width={16} />}
          >
            Edit Account
          </Button>
          <Button
            color="primary"
            onPress={() =>
              navigate(
                `/binders/${id}/transactions/create?accountId=${accountId}`,
              )
            }
            startContent={<PlusIcon width={18} />}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {transactions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-app-muted text-lg mb-2">No transactions yet</p>
          <p className="text-app-muted text-sm">
            Add your first transaction to this account.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-app-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app-border bg-app-surface-secondary text-left text-xs font-medium uppercase text-app-muted">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Payee</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 hidden sm:table-cell" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const amt = parseFloat(tx.amount);
                return (
                  <tr
                    key={tx.id}
                    className={`cursor-pointer sm:cursor-auto border-b border-app-border last:border-b-0 transition-colors ${
                      !tx.isCleared ? 'opacity-40' : ''
                    }`}
                    onClick={(e) => {
                      if (window.innerWidth >= 640) return;
                      navigate(`/binders/${id}/transactions/${tx.id}`);
                    }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-app-muted">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-app-muted">
                      {tx.payeeName || '—'}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums ${
                        amt >= 0 ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {amt >= 0 ? '+' : ''}
                      {formatCurrency(amt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/binders/${id}/transactions/${tx.id}`);
                        }}
                      >
                        <PencilIcon width={15} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
