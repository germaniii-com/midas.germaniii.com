import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@heroui/react';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { getPaymentSchedules, type PaymentSchedule } from '../../../api/payment-schedules';
import { formatCurrency, useBinderCurrency } from '../../../utils/format';

export default function PaymentSchedulesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const currency = useBinderCurrency();

  async function fetchSchedules() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getPaymentSchedules(id);
      setSchedules(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment schedules');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSchedules();
  }, [id]);

  const filtered = showInactive ? schedules : schedules.filter((s) => s.isActive);
  const sorted = [...filtered].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

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

      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="h-4 w-4 rounded border-app-border accent-primary"
        />
        <span className="text-sm text-app-muted">Show inactive</span>
      </label>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-app-muted text-lg mb-2">No payment schedules yet</p>
          <p className="text-app-muted text-sm">Create your first schedule to start tracking recurring payments.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-app-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app-border bg-app-surface-secondary text-left text-xs font-medium uppercase text-app-muted">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Payee</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => {
                const amt = parseFloat(s.amount);
                const absAmt = Math.abs(amt);
                const isExpense = amt <= 0 || true;

                const repeatLabel = `Every ${s.repeatInterval} ${s.repeatType}${s.repeatInterval > 1 ? 's' : ''}`;

                return (
                  <tr
                    key={s.id}
                    className={`border-b border-app-border last:border-b-0 transition-colors ${
                      !s.isActive ? 'opacity-40' : ''
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-medium">{s.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-app-muted">{s.payeeName || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{s.accountName}</td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums ${
                        isExpense ? 'text-danger' : 'text-success'
                      }`}
                    >
                      {isExpense ? '-' : '+'}
                      {formatCurrency(absAmt, currency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-app-muted text-xs">
                      <div>{repeatLabel}</div>
                      <div>from {s.startDate}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {s.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-app-muted/10 px-2 py-0.5 text-xs font-medium text-app-muted">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => navigate(`/binders/${id}/payment-schedules/${s.id}`)}
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
