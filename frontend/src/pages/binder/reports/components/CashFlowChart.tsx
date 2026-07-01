import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner, Input, Select, SelectItem } from '@heroui/react';
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
import { getAccounts, type Account } from '../../../../api/accounts';
import { getTags, type Tag } from '../../../../api/tags';
import { formatCurrency, useBinderCurrency } from '../../../../utils/format';
import { usePreferences } from '../../../../hooks/usePreferences';
import { getErrorMessage } from '../../../../utils/toast';
import { ErrorMessage } from '../../../../components/ErrorMessage';

export default function CashFlowChart() {
  const { id } = useParams<{ id: string }>();
  const currency = useBinderCurrency();
  const { numberLocale } = usePreferences();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState('');
  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [data, setData] = useState<CashFlowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getAccounts(id),
      getTags(id),
    ])
      .then(([res, tags]) => {
        setAccounts(res.accounts);
        setTags(tags);
      })
      .catch(() => {});
  }, [id]);

  async function fetchData() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await getCashFlow(id, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        interval,
        accountIds: selectedAccountIds.length > 0 ? selectedAccountIds.join(',') : undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds.join(',') : undefined,
      });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load cash flow data'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id, startDate, endDate, interval, selectedAccountIds, selectedTagIds]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  const formatted = data.length > 0
    ? data.map((r) => ({
        ...r,
        label: formatLabel(r.date, interval),
      }))
    : [];

  return (
    <div>
      <div className="flex items-end gap-2 mb-3 flex-wrap">
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
        <Select
          label="Interval"
          selectedKeys={[interval]}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0];
            if (val) setInterval(String(val) as 'daily' | 'weekly' | 'monthly');
          }}
          className="w-28"
          size="sm"
        >
          <SelectItem key="daily">Daily</SelectItem>
          <SelectItem key="weekly">Weekly</SelectItem>
          <SelectItem key="monthly">Monthly</SelectItem>
        </Select>
        <Select
          label="Accounts"
          placeholder="All accounts"
          selectionMode="multiple"
          selectedKeys={new Set(selectedAccountIds)}
          onSelectionChange={(keys) =>
            setSelectedAccountIds(Array.from(keys).map(String).filter(Boolean))
          }
          className="w-44"
          size="sm"
        >
          {accounts.map((a) => (
            <SelectItem key={a.id}>{a.name}</SelectItem>
          ))}
        </Select>
        <Select
          label="Tags"
          placeholder="All tags"
          selectionMode="multiple"
          selectedKeys={new Set(selectedTagIds)}
          onSelectionChange={(keys) =>
            setSelectedTagIds(Array.from(keys).map(String).filter(Boolean))
          }
          className="w-44"
          size="sm"
        >
          {tags.map((t) => (
            <SelectItem key={t.id} textValue={t.name}>
              <div className="flex items-center gap-2">
                {t.color && (
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                )}
                <span>{t.name}</span>
              </div>
            </SelectItem>
          ))}
        </Select>
      </div>
      {error ? (
        <ErrorMessage message={error} onRetry={fetchData} />
      ) : data.length === 0 ? (
        <p className="text-app-muted text-sm py-16 text-center">No data for this period</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCurrency(v, currency, numberLocale)} />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value) || 0, currency, numberLocale)}
            />
            <Legend />
            <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function formatLabel(dateStr: string, interval: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (interval === 'daily') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (interval === 'weekly') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
