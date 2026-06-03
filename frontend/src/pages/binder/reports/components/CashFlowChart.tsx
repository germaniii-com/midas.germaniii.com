import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getCashFlow, type CashFlowRow } from '../../../../api/reports';
import { formatCurrency, useBinderCurrency } from '../../../../utils/format';
import { usePreferences } from '../../../../hooks/usePreferences';

export default function CashFlowChart() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const currency = useBinderCurrency();
  const { numberLocale } = usePreferences();

  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const interval = (searchParams.get('interval') || 'monthly') as 'daily' | 'weekly' | 'monthly';
  const accountIds = searchParams.get('accountIds') || undefined;

  const [data, setData] = useState<CashFlowRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCashFlow(id, { startDate: startDate || undefined, endDate: endDate || undefined, interval, accountIds })
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [id, startDate, endDate, interval, accountIds]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  if (data.length === 0) {
    return <p className="text-app-muted text-sm py-16 text-center">No data for this period</p>;
  }

  const formatted = data.map((r) => ({
    ...r,
    label: formatLabel(r.date, interval),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border, #e5e7eb)" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCurrency(v, currency, numberLocale)} />
        <Tooltip
          contentStyle={{ fontSize: 13 }}
          formatter={(value) => formatCurrency(Number(value) || 0, currency, numberLocale)}
        />
        <Legend />
        <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function formatLabel(dateStr: string, interval: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (interval === 'daily') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (interval === 'weekly') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
