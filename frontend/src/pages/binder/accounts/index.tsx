import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Spinner, Tabs, Tab } from '@heroui/react';
import { PlusIcon, ChevronRightIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { getAccounts, type Account, type CategorySum } from '../../../api/accounts';
import { typeLabels } from '../../../constants/accountTypes';
import { getErrorMessage } from '../../../utils/toast';
import { useBinderCurrency } from '../../../utils/format';
import { usePreferences } from '../../../hooks/usePreferences';
import type { NumberLocale } from '../../../constants/preferences';
import { Money } from '../../../components/Money';

const STORAGE_KEY = 'binder_accounts_view_mode';

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
  const { numberLocale, showMoney, setShowMoney } = usePreferences();

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

  function renderAccountCard(account: Account, animationDelay = '0ms') {
    const balanceNum = parseFloat(account.balance);
    return (
      <Card
        key={account.id}
        isPressable
        onPress={() => navigate(`/binders/${id}/accounts/${account.id}/transactions`)}
        className="bg-surface-secondary transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] animate-fade-in-up animate-fill-both"
        style={{ animationDelay }}
      >
        <CardBody className="flex flex-row items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{account.name}</p>
            <p
              className={`text-lg font-semibold ${balanceNum >= 0 ? 'text-success' : 'text-danger'}`}
            >
              <Money amount={balanceNum} currency={currency} locale={numberLocale} />
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
          <Button
            isIconOnly
            variant="light"
            onPress={() => setShowMoney(!showMoney)}
            aria-label={showMoney ? 'Hide balances' : 'Show balances'}
            className="text-app-muted"
          >
            {showMoney ? <EyeIcon width={20} /> : <EyeSlashIcon width={20} />}
          </Button>
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
        <Card className="mb-4 bg-surface-secondary transition-all duration-200 hover:shadow-md">
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
                <Money
                  amount={accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0)}
                  currency={currency}
                  locale={numberLocale}
                />
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-16 animate-fade-in-up">
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
                      <Money amount={sum} currency={currency} locale={numberLocale} />
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
                  {group.accounts.map((account, j) =>
                    renderAccountCard(account, `${j * 50}ms`),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account, i) =>
              renderAccountCard(account, `${i * 50}ms`),
            )}
          </div>
      )}
    </div>
  );
}
