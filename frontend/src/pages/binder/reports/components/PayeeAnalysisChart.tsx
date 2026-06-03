import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Spinner, Button, Input } from '@heroui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPayeeAnalysis, type PayeeRow } from '../../../../api/reports';
import { formatCurrency, useBinderCurrency } from '../../../../utils/format';

export default function PayeeAnalysisChart() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const currency = useBinderCurrency();

  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const [sortBy, setSortBy] = useState<'amount' | 'count'>('amount');
  const [limit, setLimit] = useState(10);

  const [data, setData] = useState<PayeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPayeeAnalysis(id, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sortBy,
      limit,
    })
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [id, startDate, endDate, sortBy, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-app-muted text-sm py-16 text-center">No data for this period</p>;
  }

  const formatted = data.map((r) => ({
    ...r,
    displayValue: sortBy === 'amount' ? r.totalVolume : r.transactionCount,
    label:
      sortBy === 'amount'
        ? formatCurrency(r.totalVolume, currency)
        : `${r.transactionCount} tx${r.transactionCount !== 1 ? 's' : ''}`,
  }));

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
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
          className="w-24"
          size="sm"
        />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formatted} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border, #e5e7eb)" />
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
    </div>
  );
}
