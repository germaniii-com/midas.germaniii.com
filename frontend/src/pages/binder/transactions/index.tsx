import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/react';
import {
  PlusIcon,
  PencilIcon,
  ArrowLeftIcon,
  CheckIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';
import { getTransactions, updateTransaction, type Transaction } from '../../../api/transactions';
import { getPayees, type Payee } from '../../../api/payees';
import {
  getUpcomingSchedules,
  paySchedule,
  type UpcomingSchedule,
} from '../../../api/payment-schedules';
import { getAccounts, type Account } from '../../../api/accounts';
import { formatDate, useBinderCurrency } from '../../../utils/format';
import { usePreferences } from '../../../hooks/usePreferences';
import { Money } from '../../../components/Money';
import { toastSuccess, toastError, getErrorMessage } from '../../../utils/toast';
import { ErrorMessage } from '../../../components/ErrorMessage';

export default function TransactionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dateFormat, numberLocale } = usePreferences();
  const categoryId = searchParams.get('categoryId');
  const categoryName = searchParams.get('categoryName');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [payees, setPayees] = useState<Payee[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingPayeeTxId, setEditingPayeeTxId] = useState<string | null>(null);
  const [editingDateTxId, setEditingDateTxId] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const currency = useBinderCurrency();
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingSchedule[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function fetchUpcoming() {
    if (!id) return;
    try {
      const [data, accts] = await Promise.all([
        getUpcomingSchedules(id),
        categoryId ? getAccounts(id) : Promise.resolve(null),
      ]);
      if (categoryId && accts) {
        const accountIds = new Set(
          accts.accounts
            .filter((a) => a.categories.some((c) => c.id === categoryId))
            .map((a) => a.id),
        );
        setAllAccounts(accts.accounts);
        setUpcoming(data.filter((u) => accountIds.has(u.schedule.accountId)));
      } else {
        setUpcoming(data);
      }
    } catch {}
  }

  async function handlePaySchedule(scheduleId: string) {
    if (!id) return;
    setPayingId(scheduleId);
    try {
      await paySchedule(id, scheduleId);
      toastSuccess('Payment applied');
      await Promise.all([fetchTransactions(), fetchUpcoming()]);
    } catch {
      toastError('Failed to pay schedule');
      setError('Failed to pay schedule');
    } finally {
      setPayingId(null);
    }
  }

  const runningBalance = useMemo(
    () => transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0),
    [transactions],
  );

  async function fetchTransactions() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getTransactions(id, undefined, categoryId ?? undefined, 50, 0);
      setTransactions(data);
      setHasMore(data.length === 50);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load transactions'));
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!id || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getTransactions(
        id,
        undefined,
        categoryId ?? undefined,
        50,
        transactions.length,
      );
      setTransactions((prev) => [...prev, ...data]);
      setHasMore(data.length === 50);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load more transactions'));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSaveAmount(transactionId: string) {
    if (!id) return;
    const parsed = parseFloat(editingValue);
    if (isNaN(parsed)) {
      setEditingId(null);
      return;
    }
    try {
      const updated = await updateTransaction(id, transactionId, {
        amount: parsed.toFixed(2),
      });
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === transactionId ? { ...tx, amount: updated.amount } : tx)),
      );
      toastSuccess('Amount updated');
    } catch {
      toastError('Failed to update amount');
      setError('Failed to update amount');
    }
    setEditingId(null);
  }

  async function fetchPayees() {
    if (!id) return;
    try {
      const data = await getPayees(id);
      setPayees(data);
    } catch {}
  }

  async function handlePayeeSelect(transactionId: string, payeeId: string | null) {
    if (!id) return;
    try {
      const updated = await updateTransaction(id, transactionId, { payeeId });
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId
            ? {
                ...tx,
                payeeId: updated.payeeId,
                payeeName: payeeId
                  ? (payees.find((p) => p.id === payeeId)?.name ?? tx.payeeName)
                  : null,
              }
            : tx,
        ),
      );
      toastSuccess('Payee updated');
    } catch {
      toastError('Failed to update payee');
      setError('Failed to update payee');
    }
    setEditingPayeeTxId(null);
  }

  async function handleSaveDate(transactionId: string) {
    if (!id) return;
    try {
      const updated = await updateTransaction(id, transactionId, {
        date: editingDateValue,
      });
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === transactionId ? { ...tx, date: updated.date } : tx)),
      );
      toastSuccess('Date updated');
    } catch {
      toastError('Failed to update date');
      setError('Failed to update date');
    }
    setEditingDateTxId(null);
  }

  useEffect(() => {
    fetchTransactions();
    fetchPayees();
    fetchUpcoming();
  }, [id, categoryId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {categoryId && (
        <Button
          variant="light"
          onPress={() => navigate(`/binders/${id}/accounts`)}
          startContent={<ArrowLeftIcon width={18} />}
          className="mb-4"
        >
          Back to Accounts
        </Button>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {categoryName ? `Transactions — ${categoryName}` : 'Transactions'}
          {categoryName && (
            <span
              className={`ml-3 text-lg font-semibold ${
                runningBalance >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              <Money amount={runningBalance} currency={currency} locale={numberLocale} />
            </span>
          )}
        </h1>
        <Button
          color="primary"
          onPress={() =>
            navigate(
              `/binders/${id}/transactions/create${categoryId ? `?categoryId=${categoryId}` : ''}`,
            )
          }
          startContent={<PlusIcon width={18} />}
        >
          Add Transaction
        </Button>
      </div>

      {error && transactions.length === 0 ? (
        <ErrorMessage message={error} onRetry={() => { fetchTransactions(); fetchPayees(); fetchUpcoming(); }} />
      ) : (
        <>
          {error && transactions.length > 0 && (
            <p className="text-danger text-sm mb-4">{error}</p>
          )}

          {upcoming.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Scheduled Payments</h2>
              <div className="hidden sm:block">
                <Table aria-label="Upcoming payments">
                  <TableHeader>
                    <TableColumn key="due">Due</TableColumn>
                    <TableColumn key="schedule">Schedule</TableColumn>
                    <TableColumn key="account">Account</TableColumn>
                    <TableColumn key="payee">Payee</TableColumn>
                    <TableColumn key="amount" align="end">
                      Amount
                    </TableColumn>
                    <TableColumn key="action" hideHeader>
                      Action
                    </TableColumn>
                  </TableHeader>
                  <TableBody>
                    {upcoming.map((u) => {
                      const amt = parseFloat(u.schedule.amount);
                      const statusColors: Record<string, string> = {
                        missed: 'text-danger',
                        overdue: 'text-danger',
                        due_soon: 'text-warning',
                        upcoming: '',
                      };
                      const statusLabels: Record<string, string> = {
                        missed: 'Missed',
                        overdue: 'Overdue',
                        due_soon: 'Due soon',
                        upcoming: 'Upcoming',
                      };
                      const daysText =
                        u.occurrence.daysUntilDue < 0
                          ? `${Math.abs(u.occurrence.daysUntilDue)} day${Math.abs(u.occurrence.daysUntilDue) !== 1 ? 's' : ''} ago`
                          : u.occurrence.daysUntilDue === 0
                            ? 'Today'
                            : `In ${u.occurrence.daysUntilDue} day${u.occurrence.daysUntilDue !== 1 ? 's' : ''}`;

                      return (
                        <TableRow
                          key={`${u.schedule.id}-${u.occurrence.dueDate}`}
                          className="transition-colors duration-150 hover:bg-default-50 dark:hover:bg-white/[0.03]"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-medium ${statusColors[u.occurrence.status] || ''}`}
                              >
                                {formatDate(u.occurrence.dueDate, dateFormat)}
                              </span>
                              <span className={`text-xs ${statusColors[u.occurrence.status] || ''}`}>
                                ({daysText})
                              </span>
                            </div>
                            <span
                              className={`inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                statusColors[u.occurrence.status] || 'text-default-500'
                              }`}
                            >
                              {statusLabels[u.occurrence.status] || ''}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{u.schedule.name}</TableCell>
                          <TableCell>{u.schedule.accountName}</TableCell>
                          <TableCell>{u.schedule.payeeName || '—'}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-danger">
                            -<Money amount={Math.abs(amt)} currency={currency} locale={numberLocale} />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              color="primary"
                              variant="flat"
                              isLoading={payingId === u.schedule.id}
                              isDisabled={payingId !== null}
                              onPress={() => handlePaySchedule(u.schedule.id)}
                              startContent={<CheckIcon width={14} />}
                            >
                              Pay
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-2 sm:hidden">
                {upcoming.map((u) => {
                  const amt = parseFloat(u.schedule.amount);
                  const statusColors: Record<string, string> = {
                    missed: 'text-danger',
                    overdue: 'text-danger',
                    due_soon: 'text-warning',
                    upcoming: '',
                  };
                  const statusLabels: Record<string, string> = {
                    missed: 'Missed',
                    overdue: 'Overdue',
                    due_soon: 'Due soon',
                    upcoming: 'Upcoming',
                  };
                  const daysText =
                    u.occurrence.daysUntilDue < 0
                      ? `${Math.abs(u.occurrence.daysUntilDue)} day${Math.abs(u.occurrence.daysUntilDue) !== 1 ? 's' : ''} ago`
                      : u.occurrence.daysUntilDue === 0
                        ? 'Today'
                        : `In ${u.occurrence.daysUntilDue} day${u.occurrence.daysUntilDue !== 1 ? 's' : ''}`;

                  return (
                    <Card
                      key={`${u.schedule.id}-${u.occurrence.dueDate}`}
                      className="w-full bg-surface-secondary transition-all duration-200"
                    >
                      <CardBody>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{u.schedule.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs ${statusColors[u.occurrence.status] || ''}`}>
                                {formatDate(u.occurrence.dueDate, dateFormat)}
                              </span>
                              <span
                                className={`text-[10px] ${statusColors[u.occurrence.status] || 'text-default-500'}`}
                              >
                                ({daysText})
                              </span>
                            </div>
                            <span
                              className={`inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                statusColors[u.occurrence.status] || 'text-default-500'
                              }`}
                            >
                              {statusLabels[u.occurrence.status] || ''}
                            </span>
                            <p className="text-xs text-default-500 mt-1">
                              {u.schedule.accountName} → {u.schedule.payeeName || '—'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-2">
                            <span className="text-sm font-semibold tabular-nums text-danger">
                              -
                              <Money amount={Math.abs(amt)} currency={currency} locale={numberLocale} />
                            </span>
                            <Button
                              size="sm"
                              color="primary"
                              variant="flat"
                              isLoading={payingId === u.schedule.id}
                              isDisabled={payingId !== null}
                              onPress={() => handlePaySchedule(u.schedule.id)}
                              startContent={<CheckIcon width={14} />}
                            >
                              Pay
                            </Button>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {transactions.length === 0 ? (
            <div className="text-center py-16 animate-fade-in-up">
              <p className="text-app-muted text-lg mb-2">No transactions yet</p>
              <p className="text-app-muted text-sm">Add your first transaction to start tracking.</p>
            </div>
          ) : (
        <>
          <div className="hidden sm:block">
            <Table
              aria-label="Transactions"
              onRowAction={(key) => {
                navigate(`/binders/${id}/transactions/${key}`);
              }}
            >
              <TableHeader>
                <TableColumn key="date">Date</TableColumn>
                <TableColumn key="account">Account</TableColumn>
                <TableColumn key="payee">Payee</TableColumn>
                <TableColumn key="amount" align="end">
                  Amount
                </TableColumn>
                <TableColumn key="actions" hideHeader>
                  Actions
                </TableColumn>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const amt = parseFloat(tx.amount);
                  const isEditing = editingId === tx.id;
                  return (
                    <TableRow
                      key={tx.id}
                      className={`transition-colors duration-150 ${
                        !tx.isCleared
                          ? 'opacity-40'
                          : 'hover:bg-default-50 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <TableCell>
                        {editingDateTxId === tx.id ? (
                          <input
                            type="date"
                            value={editingDateValue}
                            onChange={(e) => setEditingDateValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveDate(tx.id);
                              else if (e.key === 'Escape') setEditingDateTxId(null);
                            }}
                            onBlur={() => setEditingDateTxId(null)}
                            className="rounded border border-primary bg-transparent px-1 py-0.5 text-sm ring-2 ring-primary/20 outline-none transition-all duration-150"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="sm:cursor-pointer transition-colors duration-150 hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDateTxId(tx.id);
                              setEditingDateValue(tx.date);
                            }}
                          >
                            {formatDate(tx.date, dateFormat)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>{tx.accountName}</span>
                          {tx.attachmentCount && tx.attachmentCount > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-xs text-default-400">
                              <PaperClipIcon width={12} />
                              {tx.attachmentCount}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {tx.transferAccountName ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-xs text-default-500 font-medium uppercase tracking-wider">
                              TRANSFER
                            </span>
                            <span className="mx-1 text-default-500">—</span>
                            <span className="font-medium">{tx.transferAccountName}</span>
                          </span>
                        ) : editingPayeeTxId === tx.id ? (
                          <select
                            value={tx.payeeId ?? ''}
                            onChange={(e) => handlePayeeSelect(tx.id, e.target.value || null)}
                            onBlur={() => setEditingPayeeTxId(null)}
                            autoFocus
                            className="max-w-32 rounded border border-primary bg-transparent px-1 py-0.5 text-sm ring-2 ring-primary/20 outline-none transition-all duration-150"
                          >
                            <option value="">—</option>
                            {payees.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className="sm:cursor-pointer transition-colors duration-150 hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPayeeTxId(tx.id);
                            }}
                          >
                            {tx.payeeName || '—'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold tabular-nums ${amt >= 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveAmount(tx.id);
                              } else if (e.key === 'Escape') {
                                setEditingId(null);
                              }
                            }}
                            onBlur={() => setEditingId(null)}
                            className="w-28 rounded border border-primary bg-transparent px-2 py-1 text-right text-sm font-semibold tabular-nums ring-2 ring-primary/20 outline-none transition-all duration-150"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="cursor-pointer sm:cursor-text transition-colors duration-150 hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(tx.id);
                              setEditingValue(tx.amount);
                              requestAnimationFrame(() => inputRef.current?.focus());
                            }}
                          >
                            {amt >= 0 ? '+' : ''}
                            <Money amount={amt} currency={currency} locale={numberLocale} />
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onPress={() => navigate(`/binders/${id}/transactions/${tx.id}`)}
                          className="transition-all duration-150 active:scale-90"
                        >
                          <PencilIcon width={15} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-2 sm:hidden">
            {transactions.map((tx) => {
              const amt = parseFloat(tx.amount);
              return (
                <Card
                  key={tx.id}
                  className={`w-full bg-surface-secondary transition-all duration-200 active:scale-[0.98] ${
                    !tx.isCleared ? 'opacity-40' : 'hover:-translate-y-0.5 hover:shadow-md'
                  }`}
                  isPressable
                  onPress={() => navigate(`/binders/${id}/transactions/${tx.id}`)}
                >
                  <CardBody>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {tx.transferAccountName ? (
                          <div className="text-sm font-medium truncate">
                            <span className="text-xs text-default-500 font-semibold uppercase tracking-wider">
                              TRANSFER{' '}
                            </span>
                            <span className="text-default-500">— </span>
                            {tx.transferAccountName}
                          </div>
                        ) : (
                          <div className="text-sm font-medium truncate">{tx.payeeName || '—'}</div>
                        )}
                        <div className="text-xs text-default-500 mt-0.5">
                          {formatDate(tx.date, dateFormat)}
                        </div>
                        <div className="text-xs text-default-400 mt-0.5">{tx.accountName}</div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span
                          className={`text-sm font-semibold tabular-nums ${amt >= 0 ? 'text-success' : 'text-danger'}`}
                        >
                          {amt >= 0 ? '+' : ''}
                          <Money amount={amt} currency={currency} locale={numberLocale} />
                        </span>
                        {tx.attachmentCount && tx.attachmentCount > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-xs text-default-400 mt-0.5">
                            <PaperClipIcon width={12} />
                            {tx.attachmentCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-6 pb-20 sm:pb-0">
              <Button
                variant="flat"
                color="primary"
                isLoading={loadingMore}
                isDisabled={loadingMore}
                onPress={loadMore}
                className={loadingMore ? 'animate-pulse-subtle' : ''}
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </>
      )}
    </div>
  );
}
