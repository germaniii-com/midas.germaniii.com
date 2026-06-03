import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner, Select, SelectItem, Input, Switch } from '@heroui/react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend,
} from 'recharts';
import { getForecast, type ForecastRow } from '../../../../api/reports';
import { getAccounts, type Account } from '../../../../api/accounts';
import { formatCurrency, useBinderCurrency } from '../../../../utils/format';
import { usePreferences } from '../../../../hooks/usePreferences';

export default function ForecastingChart() {
  const { id } = useParams<{ id: string }>();
  const currency = useBinderCurrency();
  const { numberLocale } = usePreferences();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [baseAccountId, setBaseAccountId] = useState<string>('');
  const [horizonDays, setHorizonDays] = useState(30);
  const [includeDrafts, setIncludeDrafts] = useState(false);

  const [data, setData] = useState<ForecastRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getAccounts(id)
      .then((res) => {
        setAccounts(res.accounts);
        if (!baseAccountId && res.accounts.length > 0) {
          const checking = res.accounts.find((a) => a.type === 'checking');
          setBaseAccountId(checking?.id || res.accounts[0].id);
        }
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id || !baseAccountId) return;
    setLoading(true);
    getForecast(id, {
      accountId: baseAccountId,
      horizonDays,
      includeDrafts,
    })
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [id, baseAccountId, horizonDays, includeDrafts]);

  if (!baseAccountId) {
    return <p className="text-app-muted text-sm py-16 text-center">No accounts available</p>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  if (data.length === 0) {
    return <p className="text-app-muted text-sm py-16 text-center">No forecast data</p>;
  }

  const formatted = data.map((r) => ({
    ...r,
    dateLabel: formatDateLabel(r.date, data.length),
  }));

  const selectedAccountName = accounts.find((a) => a.id === baseAccountId)?.name || '';

  return (
    <div>
      <div className="flex items-end gap-3 mb-3 flex-wrap">
        <Select
          label="Account"
          selectedKeys={[baseAccountId]}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0];
            if (val) setBaseAccountId(String(val));
          }}
          className="w-48"
          size="sm"
        >
          {accounts.map((a) => (
            <SelectItem key={a.id}>{a.name}</SelectItem>
          ))}
        </Select>
        <Input
          type="number"
          label="Days ahead"
          value={String(horizonDays)}
          onValueChange={(v) => setHorizonDays(Math.max(1, parseInt(v) || 30))}
          className="w-24"
          size="sm"
        />
        <Switch
          isSelected={includeDrafts}
          onValueChange={setIncludeDrafts}
          size="sm"
        >
          Include drafts
        </Switch>
      </div>
      <p className="text-xs text-app-muted mb-2">
        Projection for <strong>{selectedAccountName}</strong>
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => formatCurrency(v, currency, numberLocale)}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value) || 0, currency, numberLocale)}
          />
          <Legend />
          <Bar dataKey="scheduledOutflow" fill="#f97316" name="Scheduled Outflow" radius={[2, 2, 0, 0]} />
          <Line
            type="monotone"
            dataKey="projectedBalance"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Projected Balance"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatDateLabel(dateStr: string, total: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (total <= 31) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
