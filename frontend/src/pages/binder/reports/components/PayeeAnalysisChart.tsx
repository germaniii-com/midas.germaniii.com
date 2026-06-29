import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner, Button, Input } from '@heroui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPayeeAnalysis, type PayeeRow } from '../../../../api/reports';
import { formatCurrency, useBinderCurrency } from '../../../../utils/format';
import { getErrorMessage } from '../../../../utils/toast';
import { ErrorMessage } from '../../../../components/ErrorMessage';

export default function PayeeAnalysisChart() {
  const { id } = useParams<{ id: string }>();
  const currency = useBinderCurrency();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'amount' | 'count'>('amount');
  const [limit, setLimit] = useState(10);

  const [data, setData] = useState<PayeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchData() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await getPayeeAnalysis(id, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        limit,
      });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load payee analysis'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id, startDate, endDate, sortBy, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const formatted = data.length > 0
    ? data.map((r) => ({
        ...r,
        displayValue: sortBy === 'amount' ? r.totalVolume : r.transactionCount,
        label:
          sortBy === 'amount'
            ? formatCurrency(r.totalVolume, currency)
            : `${r.transactionCount} tx${r.transactionCount !== 1 ? 's' : ''}`,
      }))
    : [];

  return (
    <div>
      <div className="flex items-end gap-2 mb-3 flex-wrap">
        <Button
          size="sm"
          variant={sortBy === 'amount' ? 'solid' : 'flat'}
          color="primary"
          onPress={() => setSortBy('amount')}
        >
          By Amount
        </Button>
        <Button
          size="sm"
          variant={sortBy === 'count' ? 'solid' : 'flat'}
          color="primary"
          onPress={() => setSortBy('count')}
        >
          By Frequency
        </Button>
        <Input
          type="number"
          label="Top N"
          value={String(limit)}
          onValueChange={(v) => setLimit(Math.max(1, parseInt(v) || 10))}
          className="w-20"
          size="sm"
        />
        <Input
          label="Start"
          type="date"
          value={startDate}
          onValueChange={setStartDate}
          className="w-36"
          size="sm"
        />
        <Input
          label="End"
          type="date"
          value={endDate}
          onValueChange={setEndDate}
          className="w-36"
          size="sm"
        />
      </div>
      {error ? (
        <ErrorMessage message={error} onRetry={fetchData} />
      ) : data.length === 0 ? (
        <p className="text-app-muted text-sm py-16 text-center">No data for this period</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formatted} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="payeeName" tick={{ fontSize: 12 }} width={90} />
            <Tooltip
              formatter={(_value, _name, props) => {
                const p = props as unknown as { payload: PayeeRow & { label: string } };
                return p.payload.label;
              }}
            />
            <Bar dataKey="displayValue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
