import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Spinner, Button } from '@heroui/react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getSpendingBreakdown, type SpendingRow } from '../../../../api/reports';
import { formatCurrency, useBinderCurrency } from '../../../../utils/format';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#14b8a6',
  '#84cc16', '#f43f5e', '#f59e0b', '#10b981', '#6366f1',
];

export default function SpendingBreakdownChart() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const currency = useBinderCurrency();

  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');

  const [data, setData] = useState<SpendingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getSpendingBreakdown(id, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      transactionType,
    })
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [id, startDate, endDate, transactionType]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  if (data.length === 0) {
    return <p className="text-app-muted text-sm py-16 text-center">No data for this period</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Button
          size="sm"
          variant={transactionType === 'expense' ? 'solid' : 'flat'}
          color="danger"
          onPress={() => setTransactionType('expense')}
        >
          Expenses
        </Button>
        <Button
          size="sm"
          variant={transactionType === 'income' ? 'solid' : 'flat'}
          color="success"
          onPress={() => setTransactionType('income')}
        >
          Income
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="totalAmount"
            nameKey="categoryName"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={50}
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value) || 0, currency)}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
