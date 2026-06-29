import { useState, useMemo } from 'react';
import { Input } from '@heroui/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';
import { useBinderCurrency, formatCurrency } from '../../../../utils/format';
import { usePreferences } from '../../../../hooks/usePreferences';

export default function InvestmentProjection() {
  const currency = useBinderCurrency();
  const { numberLocale } = usePreferences();

  const [initial, setInitial] = useState('10000');
  const [monthly, setMonthly] = useState('500');
  const [returnRate, setReturnRate] = useState('7');
  const [years, setYears] = useState('10');

  const data = useMemo(() => {
    const p = parseFloat(initial);
    const m = parseFloat(monthly);
    const r = parseFloat(returnRate);
    const y = parseInt(years);

    if (!p || !m || !r || !y || y < 1) return [];

    const monthlyRate = r / 100 / 12;
    const totalMonths = y * 12;

    const result: {
      year: number;
      balance: number;
      contributions: number;
      growth: number;
    }[] = [];

    for (let elapsed = 0; elapsed <= totalMonths; elapsed += 12) {
      const months = Math.min(elapsed, totalMonths);
      const fvInitial = p * Math.pow(1 + monthlyRate, months);
      const fvContributions =
        m * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
      const balance = fvInitial + fvContributions;
      const totalContributions = p + m * months;

      result.push({
        year: Math.max(1, Math.round(months / 12)),
        balance: Math.round(balance * 100) / 100,
        contributions: Math.round(totalContributions * 100) / 100,
        growth: Math.round((balance - totalContributions) * 100) / 100,
      });
    }

    return result;
  }, [initial, monthly, returnRate, years]);

  const lastRow = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Input
          type="number"
          label="Initial Amount"
          value={initial}
          onValueChange={setInitial}
          size="sm"
        />
        <Input
          type="number"
          label="Monthly Contribution"
          value={monthly}
          onValueChange={setMonthly}
          size="sm"
        />
        <Input
          type="number"
          label="Annual Return (%)"
          value={returnRate}
          onValueChange={setReturnRate}
          size="sm"
        />
        <Input
          type="number"
          label="Time Horizon (years)"
          value={years}
          onValueChange={setYears}
          size="sm"
        />
      </div>

      {lastRow && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'var(--color-background)' }}
          >
            <p className="text-xs text-app-muted">Final Value</p>
            <p className="text-lg font-bold">
              {formatCurrency(lastRow.balance, currency, numberLocale)}
            </p>
          </div>
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'var(--color-background)' }}
          >
            <p className="text-xs text-app-muted">Total Contributions</p>
            <p className="text-lg font-bold">
              {formatCurrency(lastRow.contributions, currency, numberLocale)}
            </p>
          </div>
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'var(--color-background)' }}
          >
            <p className="text-xs text-app-muted">Total Growth</p>
            <p className="text-lg font-bold">
              {formatCurrency(lastRow.growth, currency, numberLocale)}
            </p>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => formatCurrency(v, currency, numberLocale)}
            />
            <Tooltip
              formatter={(value) =>
                formatCurrency(Number(value) || 0, currency, numberLocale)
              }
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="contributions"
              stackId="1"
              fill="#3b82f6"
              stroke="#3b82f6"
              name="Contributions"
            />
            <Area
              type="monotone"
              dataKey="growth"
              stackId="1"
              fill="#22c55e"
              stroke="#22c55e"
              name="Growth"
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#1e293b"
              strokeWidth={2}
              dot={false}
              name="Total Balance"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
