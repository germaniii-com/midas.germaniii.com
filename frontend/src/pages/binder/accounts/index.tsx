import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@heroui/react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getAccounts, deleteAccount, type Account } from '../../../api/accounts';

const typeLabels: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  'credit-card': 'Credit Card',
  cash: 'Cash',
  investment: 'Investment',
  loan: 'Loan',
  other: 'Other',
};

function formatBalance(balance: string): string {
  const num = parseFloat(balance);
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'auto',
  });
}

export default function AccountsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchAccounts() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getAccounts(id);
      setAccounts(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, [id]);

  async function handleDelete(accountId: string) {
    if (!id) return;
    setDeleting(accountId);
    try {
      await deleteAccount(id, accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <Button
          color="primary"
          onPress={() => navigate(`/binders/${id}/accounts/create`)}
          startContent={<PlusIcon width={18} />}
        >
          Add Account
        </Button>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {accounts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-app-muted text-lg mb-2">No accounts yet</p>
          <p className="text-app-muted text-sm">
            Create your first account to start tracking.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const balanceNum = parseFloat(account.balance);
            return (
              <div
                key={account.id}
                className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface-secondary p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {account.name}
                  </p>
                  <p
                    className={`text-lg font-semibold ${
                      balanceNum >= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {formatBalance(account.balance)}
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {typeLabels[account.type] || account.type}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={() =>
                      navigate(`/binders/${id}/accounts/${account.id}`)
                    }
                  >
                    <PencilIcon width={16} />
                  </Button>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    color="danger"
                    isLoading={deleting === account.id}
                    onPress={() => handleDelete(account.id)}
                  >
                    <TrashIcon width={16} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
