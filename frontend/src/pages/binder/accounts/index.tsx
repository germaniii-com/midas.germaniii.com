import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner, Tabs, Tab } from '@heroui/react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { getAccounts, type Account, type CategorySum } from '../../../api/accounts';
import { typeLabels } from '../../../constants/accountTypes';

const STORAGE_KEY = 'binder_accounts_view_mode';

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
  const [categorySums, setCategorySums] = useState<CategorySum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'index' | 'grouped'>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'index' || stored === 'grouped' ? stored : 'index';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  async function fetchAccounts() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getAccounts(id);
      setAccounts(data.accounts);
      setCategorySums(data.categorySums);
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

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; accounts: Account[] }>();

    const uncategorized = accounts.filter((a) => a.categories.length === 0);
    if (uncategorized.length > 0) {
      map.set('__uncategorized__', {
        name: 'Uncategorized',
        accounts: uncategorized,
      });
    }

    for (const account of accounts) {
      for (const cat of account.categories) {
        const existing = map.get(cat.id);
        if (existing) {
          existing.accounts.push(account);
        } else {
          map.set(cat.id, { name: cat.name, accounts: [account] });
        }
      }
    }

    return map;
  }, [accounts]);

  function renderAccountCard(account: Account) {
    const balanceNum = parseFloat(account.balance);
    return (
      <div
        key={account.id}
        className="flex cursor-pointer items-center gap-3 rounded-xl border border-app-border bg-app-surface-secondary p-4 transition-colors hover:bg-app-surface/50"
        onClick={() => navigate(`/binders/${id}/accounts/${account.id}/transactions`)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{account.name}</p>
          <p
            className={`text-lg font-semibold ${balanceNum >= 0 ? 'text-success' : 'text-danger'}`}
          >
            {formatBalance(account.balance)}
          </p>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {typeLabels[account.type] || account.type}
          </span>
        </div>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/binders/${id}/accounts/${account.id}/transactions`);
          }}
        ></Button>
      </div>
    );
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
        <div className="flex items-center gap-3">
          <Tabs
            selectedKey={viewMode}
            onSelectionChange={(key) => setViewMode(key as 'index' | 'grouped')}
            variant="underlined"
            size="sm"
          >
            <Tab key="index" title="All" />
            <Tab key="grouped" title="Grouped" />
          </Tabs>
          <Button
            color="primary"
            onPress={() => navigate(`/binders/${id}/accounts/create`)}
            startContent={<PlusIcon width={18} />}
          >
            Add Account
          </Button>
        </div>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {accounts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-app-muted text-lg mb-2">No accounts yet</p>
          <p className="text-app-muted text-sm">Create your first account to start tracking.</p>
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([key, group]) => {
            const sum =
              key === '__uncategorized__'
                ? group.accounts.reduce((acc, a) => acc + parseFloat(a.balance), 0)
                : parseFloat(categorySums.find((s) => s.categoryId === key)?.balance ?? '0');
            return (
              <div key={key}>
                <div className="flex items-baseline gap-2 mb-3">
                  <h2 className="text-lg font-semibold">{group.name}</h2>
                  <span className={`text-sm ${sum < 0 ? 'text-danger' : 'text-app-muted'}`}>
                    {formatBalance(sum.toFixed(2))}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.accounts.map(renderAccountCard)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map(renderAccountCard)}
        </div>
      )}
    </div>
  );
}
