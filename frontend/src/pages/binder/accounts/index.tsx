import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Spinner, Tabs, Tab } from '@heroui/react';
import { PlusIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getAccounts, type Account, type CategorySum } from '../../../api/accounts';
import { typeLabels } from '../../../constants/accountTypes';
import { getErrorMessage } from '../../../utils/toast';
import { formatCurrency, useBinderCurrency } from '../../../utils/format';
import { usePreferences } from '../../../hooks/usePreferences';
import type { NumberLocale } from '../../../constants/preferences';

const STORAGE_KEY = 'binder_accounts_view_mode';

function formatBalance(balance: string, currency: string, locale: NumberLocale = 'en-US'): string {
  return formatCurrency(parseFloat(balance), currency, locale);
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

  const currency = useBinderCurrency();
  const { numberLocale } = usePreferences();

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
      setError(getErrorMessage(err, 'Failed to load accounts'));
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
      <Card
        key={account.id}
        isPressable
        onPress={() => navigate(`/binders/${id}/accounts/${account.id}/transactions`)}
        className="bg-app-surface-secondary"
      >
        <CardBody className="flex flex-row items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{account.name}</p>
            <p
              className={`text-lg font-semibold ${balanceNum >= 0 ? 'text-success' : 'text-danger'}`}
            >
              {formatBalance(account.balance, currency, numberLocale)}
            </p>
            <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {typeLabels[account.type] || account.type}
            </span>
          </div>
        </CardBody>
      </Card>
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
            variant="solid"
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

      {accounts.length > 0 && (
        <Card className="mb-4 bg-app-surface-secondary">
          <CardBody className="flex flex-row items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">All Accounts</p>
              <p
                className={`text-lg font-semibold ${
                  accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0) >= 0
                    ? 'text-success'
                    : 'text-danger'
                }`}
              >
                {formatBalance(
                  accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0).toFixed(2),
                  currency,
                  numberLocale,
                )}
              </p>
            </div>
          </CardBody>
        </Card>
      )}

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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-lg font-semibold">{group.name}</h2>
                    <span className={`text-sm ${sum < 0 ? 'text-danger' : 'text-app-muted'}`}>
                      {formatBalance(sum.toFixed(2), currency, numberLocale)}
                    </span>
                  </div>
                  {key !== '__uncategorized__' && (
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() =>
                        navigate(
                          `/binders/${id}/transactions?categoryId=${key}&categoryName=${encodeURIComponent(group.name)}`,
                        )
                      }
                    >
                      <ChevronRightIcon width={18} />
                    </Button>
                  )}
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
