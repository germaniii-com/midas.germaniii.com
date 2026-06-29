import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner, Button, Input } from '@heroui/react';
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
import { getErrorMessage } from '../../../../utils/toast';
import { ErrorMessage } from '../../../../components/ErrorMessage';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#14b8a6',
  '#84cc16', '#f43f5e', '#f59e0b', '#10b981', '#6366f1',
];

export default function SpendingBreakdownChart() {
  const { id } = useParams<{ id: string }>();
  const currency = useBinderCurrency();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');

  const [data, setData] = useState<SpendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchData() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await getSpendingBreakdown(id, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        transactionType,
      });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load spending breakdown'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id, startDate, endDate, transactionType]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div>
      <div className="flex items-end gap-2 mb-3 flex-wrap">
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
      )}
    </div>
  );
}
