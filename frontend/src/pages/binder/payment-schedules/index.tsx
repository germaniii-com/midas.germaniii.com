import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner, Checkbox, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { getPaymentSchedules, type PaymentSchedule } from '../../../api/payment-schedules';
import { formatDate, useBinderCurrency } from '../../../utils/format';
import { usePreferences } from '../../../hooks/usePreferences';
import { Money } from '../../../components/Money';
import { getErrorMessage } from '../../../utils/toast';
import { ErrorMessage } from '../../../components/ErrorMessage';

export default function PaymentSchedulesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dateFormat, numberLocale } = usePreferences();
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const currency = useBinderCurrency();

  async function fetchSchedules() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getPaymentSchedules(id, 50, 0, showInactive);
      setSchedules(data);
      setHasMore(data.length === 50);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load payment schedules'));
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!id || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getPaymentSchedules(id, 50, schedules.length, showInactive);
      setSchedules((prev) => [...prev, ...data]);
      setHasMore(data.length === 50);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load more payment schedules'));
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchSchedules();
  }, [id, showInactive]);

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
        <h1 className="text-2xl font-bold">Payment Schedules</h1>
        <Button
          color="primary"
          onPress={() => navigate(`/binders/${id}/payment-schedules/create`)}
          startContent={<PlusIcon width={18} />}
        >
          Add Schedule
        </Button>
      </div>

      <Checkbox isSelected={showInactive} onValueChange={setShowInactive} className="mb-4">
        Show inactive
      </Checkbox>

      {error ? (
        <ErrorMessage message={error} onRetry={fetchSchedules} />
      ) : schedules.length === 0 ? (
        <div className="text-center py-16 animate-fade-in-up">
          <p className="text-app-muted text-lg mb-2">No payment schedules yet</p>
          <p className="text-app-muted text-sm">Create your first schedule to start tracking recurring payments.</p>
        </div>
      ) : (
        <>
          <Table
            aria-label="Payment schedules"
            classNames={{
              td: 'whitespace-nowrap',
            }}
          >
            <TableHeader>
              <TableColumn key="name">Name</TableColumn>
              <TableColumn key="payee">Payee</TableColumn>
              <TableColumn key="account">Account</TableColumn>
              <TableColumn key="amount" align="end">Amount</TableColumn>
              <TableColumn key="schedule">Schedule</TableColumn>
              <TableColumn key="status">Status</TableColumn>
              <TableColumn key="actions" hideHeader>Actions</TableColumn>
            </TableHeader>
            <TableBody>
              {schedules.map((s) => {
                const amt = parseFloat(s.amount);
                const absAmt = Math.abs(amt);
                const isExpense = amt <= 0 || true;

                const repeatLabel = `Every ${s.repeatInterval} ${s.repeatType}${s.repeatInterval > 1 ? 's' : ''}`;

                return (
                  <TableRow
                    key={s.id}
                    className={`transition-colors duration-150 ${
                      !s.isActive ? 'opacity-40' : 'hover:bg-default-50 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.payeeName || '—'}</TableCell>
                    <TableCell>{s.accountName}</TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${isExpense ? 'text-danger' : 'text-success'}`}>
                      {isExpense ? '-' : '+'}
                      <Money amount={absAmt} currency={currency} locale={numberLocale} />
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{repeatLabel}</div>
                      <div>from {formatDate(s.startDate, dateFormat)}</div>
                    </TableCell>
                    <TableCell>
                      {s.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-default/10 px-2 py-0.5 text-xs font-medium text-default-500">
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => navigate(`/binders/${id}/payment-schedules/${s.id}`)}
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
    </div>
  );
}
